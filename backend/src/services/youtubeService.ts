import { google } from "googleapis";
import { parse, toSeconds } from "iso8601-duration";
import {
  MIN_PLAYABLE_DURATION_SECONDS,
  MAX_PLAYABLE_DURATION_SECONDS,
} from "../config/songRules";

export type FindYoutubeVideoParams = {
  artist: string;
  title: string;
};

export type YoutubeVideoMatch = {
  youtubeId: string;
  duration: number;
};

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
): Promise<YoutubeVideoMatch> {
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
    part: ["contentDetails"],
    id: youtubeIds,
  });

  for (const video of videoResponse.data.items ?? []) {
    const youtubeId = video.id;
    const durationText = video.contentDetails?.duration;

    if (!youtubeId || !durationText) {
      continue;
    }

    const duration = parseYoutubeDuration(durationText);

    if (!isPlayableDuration(duration)) {
      continue;
    }

    return {
      youtubeId,
      duration,
    };
  }
  throw new Error(`No playable YouTube video found for: ${query}`);
}
