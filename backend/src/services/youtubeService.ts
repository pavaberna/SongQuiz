import { google } from "googleapis";
import { parse, toSeconds } from "iso8601-duration";
import {
  MIN_PLAYABLE_DURATION_SECONDS,
  MAX_PLAYABLE_DURATION_SECONDS,
} from "../config/songRules";
import {
  type FindYoutubeVideoParams,
  type YoutubeSongMatch,
  type YoutubeVideoMatch,
} from "../types/youtube";
import { correctSongMetadata } from "./songMetadataCorrectionService";
import { validateSongVideo } from "./youtubeVideoValidator";

function isPlayableDuration(duration: number): boolean {
  return (
    duration >= MIN_PLAYABLE_DURATION_SECONDS &&
    duration <= MAX_PLAYABLE_DURATION_SECONDS
  );
}

function parseYoutubeDuration(duration: string): number {
  return toSeconds(parse(duration));
}

export async function findYoutubeVideoForSong(
  params: FindYoutubeVideoParams,
): Promise<YoutubeSongMatch> {
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    throw new Error("YOUTUBE_API_KEY is missing.");
  }

  const youtube = google.youtube({
    version: "v3",
    auth: apiKey,
  });

  const query = `${params.artist} ${params.title} official audio`;

  const searchResponse = await youtube.search.list({
    part: ["snippet"],
    q: query,
    maxResults: 5,
    type: ["video"],
    regionCode: "HU",
    relevanceLanguage: "hu",
  });

  const youtubeIds =
    searchResponse.data.items
      ?.map((item) => item.id?.videoId)
      .filter((videoId): videoId is string => Boolean(videoId)) ?? [];

  if (youtubeIds.length === 0) {
    throw new Error(`No YouTube video found for: ${query}`);
  }

  const videoResponse = await youtube.videos.list({
    part: ["contentDetails", "snippet", "status"],
    id: youtubeIds,
  });

  let correctionAttempted = false;

  for (const video of videoResponse.data.items ?? []) {
    const youtubeId = video.id;
    const durationText = video.contentDetails?.duration;
    const videoTitle = video.snippet?.title;
    const channelTitle = video.snippet?.channelTitle;
    const description = (video.snippet?.description ?? "").slice(0, 1000);
    const embeddable = video.status?.embeddable;

    if (
      !youtubeId ||
      !durationText ||
      !videoTitle ||
      !channelTitle ||
      embeddable !== true
    ) {
      continue;
    }

    const duration = parseYoutubeDuration(durationText);

    if (!isPlayableDuration(duration)) {
      continue;
    }

    const videoMatch: YoutubeVideoMatch = {
      youtubeId,
      duration,
      videoTitle,
      channelTitle,
      description,
      embeddable,
    };

    const validation = validateSongVideo(params, videoMatch);

    if (validation.blocked || !validation.artistMatches) {
      continue;
    }

    if (!correctionAttempted) {
      correctionAttempted = true;

      try {
        const correctedSong = await correctSongMetadata(params, videoMatch);

        const correctedValidation = validateSongVideo(
          correctedSong,
          videoMatch,
        );

        if (
          !correctedValidation.blocked &&
          correctedValidation.artistMatches &&
          correctedValidation.titleMatches
        ) {
          return {
            ...videoMatch,
            ...correctedSong,
          };
        }
      } catch (error) {
        console.warn("Song metadata correction failed:", error);
      }
    }

    if (validation.titleMatches) {
      return {
        ...videoMatch,
        ...params,
      };
    }
  }
  throw new Error(`No matching playable YouTube video found for: ${query}`);
}
