import "dotenv/config";

import type { Track } from "@prisma/client";
import { google } from "googleapis";
import { parse, toSeconds } from "iso8601-duration";

import {
  MAX_PLAYABLE_DURATION_SECONDS,
  MIN_PLAYABLE_DURATION_SECONDS,
} from "../config/songRules";
import { prisma } from "../lib/prisma";
import { correctSongMetadata } from "../services/songMetadataCorrectionService";
import { validateSongVideo } from "../services/youtubeVideoValidator";
import type { YoutubeVideoMatch } from "../types/youtube";

const GEMINI_REQUEST_DELAY_MS = 4000;

type RepairResult = "changed" | "unchanged";

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function isPlayableDuration(duration: number): boolean {
  return (
    duration >= MIN_PLAYABLE_DURATION_SECONDS &&
    duration <= MAX_PLAYABLE_DURATION_SECONDS
  );
}

async function getYoutubeVideo(track: Track): Promise<YoutubeVideoMatch> {
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    throw new Error("YOUTUBE_API_KEY is missing.");
  }

  const youtube = google.youtube({
    version: "v3",
    auth: apiKey,
  });

  const response = await youtube.videos.list({
    part: ["contentDetails", "snippet", "statistics", "status"],
    id: [track.youtubeId],
  });

  const video = response.data.items?.[0];

  if (!video) {
    throw new Error("YouTube video no longer exists.");
  }

  const durationText = video.contentDetails?.duration;
  const videoTitle = video.snippet?.title;
  const channelTitle = video.snippet?.channelTitle;
  const description = (video.snippet?.description ?? "").slice(0, 1000);
  const embeddable = video.status?.embeddable;
  const viewCount = Number(video.statistics?.viewCount);

  if (
    !durationText ||
    !videoTitle ||
    !channelTitle ||
    !Number.isSafeInteger(viewCount) ||
    embeddable !== true
  ) {
    throw new Error("YouTube video metadata is incomplete.");
  }

  const duration = toSeconds(parse(durationText));

  if (!isPlayableDuration(duration)) {
    throw new Error(`Invalid video duration: ${duration} seconds.`);
  }

  return {
    youtubeId: track.youtubeId,
    duration,
    videoTitle,
    channelTitle,
    description,
    embeddable,
    viewCount,
  };
}

async function repairTrack(track: Track): Promise<RepairResult> {
  const video = await getYoutubeVideo(track);

  const currentSong = {
    artist: track.artist,
    title: track.title,
  };

  const correctedSong = await correctSongMetadata(currentSong, video);

  const validation = validateSongVideo(correctedSong, video);

  if (
    validation.blocked ||
    !validation.artistMatches ||
    !validation.titleMatches
  ) {
    throw new Error("Corrected metadata did not pass validation.");
  }

  const metadataChanged =
    track.artist !== correctedSong.artist ||
    track.title !== correctedSong.title ||
    track.duration !== video.duration;

  if (!metadataChanged) {
    return "unchanged";
  }

  console.log(`  ${track.artist} - ${track.title}`);
  console.log(`  -> ${correctedSong.artist} - ${correctedSong.title}`);

  await prisma.track.update({
    where: {
      id: track.id,
    },
    data: {
      artist: correctedSong.artist,
      title: correctedSong.title,
      duration: video.duration,
    },
  });

  return "changed";
}

async function main(): Promise<void> {
  const tracks = await prisma.track.findMany({
    orderBy: {
      id: "asc",
    },
  });

  let changed = 0;
  let failed = 0;
  let unchanged = 0;

  console.log(`Checking ${tracks.length} cached tracks...`);

  for (let index = 0; index < tracks.length; index++) {
    const track = tracks[index];

    console.log(
      `[${index + 1}/${tracks.length}] ${track.artist} - ${track.title}`,
    );

    try {
      const result = await repairTrack(track);

      if (result === "changed") {
        changed++;
      } else {
        unchanged++;
      }
    } catch (error) {
      failed++;

      const message = error instanceof Error ? error.message : "Unknown error";

      console.error(`  Failed: ${message}`);
    }

    if (index < tracks.length - 1) {
      await wait(GEMINI_REQUEST_DELAY_MS);
    }
  }

  console.log("");
  console.log("Track metadata repair finished.");
  console.log(`Changed: ${changed}`);
  console.log(`Unchanged: ${unchanged}`);
  console.log(`Failed: ${failed}`);

  if (failed > 0) {
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error("Track metadata repair failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
