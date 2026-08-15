import axios from "axios";
import { google } from "googleapis";
import { parse, toSeconds } from "iso8601-duration";
import YouTube from "youtube-sr";
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

const pacificDateFormatter = new Intl.DateTimeFormat("en-CA", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "America/Los_Angeles",
  year: "numeric",
});

let quotaExhaustedDate: string | null = null;

export class YoutubeQuotaExceededError extends Error {
  constructor() {
    super("YouTube search quota is exhausted for today.");
    this.name = "YoutubeQuotaExceededError";
  }
}

export function isYoutubeQuotaExceededError(
  error: unknown,
): error is YoutubeQuotaExceededError {
  return error instanceof YoutubeQuotaExceededError;
}

function isPlayableDuration(duration: number): boolean {
  return (
    duration >= MIN_PLAYABLE_DURATION_SECONDS &&
    duration <= MAX_PLAYABLE_DURATION_SECONDS
  );
}

function parseYoutubeDuration(duration: string): number {
  return toSeconds(parse(duration));
}

function getPacificDateKey(): string {
  return pacificDateFormatter.format(new Date());
}

function isYoutubeQuotaCurrentlyExhausted(): boolean {
  if (quotaExhaustedDate === null) {
    return false;
  }

  if (quotaExhaustedDate !== getPacificDateKey()) {
    quotaExhaustedDate = null;
    return false;
  }

  return true;
}

function isGoogleQuotaExceededError(error: unknown): boolean {
  const googleError = error as {
    code?: number;
    response?: {
      data?: {
        error?: {
          errors?: { reason?: string }[];
        };
      };
      status?: number;
    };
  };
  const status = googleError.response?.status ?? googleError.code;
  const reasons =
    googleError.response?.data?.error?.errors?.map((item) => item.reason) ?? [];

  return (
    status === 403 &&
    reasons.some(
      (reason) => reason === "quotaExceeded" || reason === "dailyLimitExceeded",
    )
  );
}

async function runYoutubeRequest<T>(request: () => Promise<T>): Promise<T> {
  try {
    return await request();
  } catch (error) {
    if (isGoogleQuotaExceededError(error)) {
      quotaExhaustedDate = getPacificDateKey();
      throw new YoutubeQuotaExceededError();
    }

    throw error;
  }
}

export async function findYoutubeVideoForSong(
  params: FindYoutubeVideoParams,
): Promise<YoutubeSongMatch> {
  const query = `${params.artist} ${params.title} official audio`;

  if (isYoutubeQuotaCurrentlyExhausted()) {
    return findYoutubeVideoOrQuotaError(
      params,
      query,
      new YoutubeQuotaExceededError(),
    );
  }

  try {
    return await findYoutubeVideoUsingOfficialApi(params, query);
  } catch (error) {
    if (isYoutubeQuotaExceededError(error)) {
      console.warn(
        "YouTube API quota exhausted, falling back to youtube-sr search.",
      );

      return findYoutubeVideoOrQuotaError(params, query, error);
    }

    throw error;
  }
}

// Keeps the original quota error visible to callers (e.g. to trigger the DB
// cache fallback) whenever the fallback search can't find a match either.
async function findYoutubeVideoOrQuotaError(
  params: FindYoutubeVideoParams,
  query: string,
  quotaError: YoutubeQuotaExceededError,
): Promise<YoutubeSongMatch> {
  try {
    return await findYoutubeVideoUsingFallbackSearch(params, query);
  } catch (fallbackError) {
    console.warn("Fallback YouTube search also failed:", fallbackError);
    throw quotaError;
  }
}

async function findYoutubeVideoUsingOfficialApi(
  params: FindYoutubeVideoParams,
  query: string,
): Promise<YoutubeSongMatch> {
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    throw new Error("YOUTUBE_API_KEY is missing.");
  }

  const youtube = google.youtube({
    version: "v3",
    auth: apiKey,
  });

  const searchResponse = await runYoutubeRequest(() =>
    youtube.search.list({
      part: ["snippet"],
      q: query,
      maxResults: 5,
      type: ["video"],
      regionCode: "HU",
      relevanceLanguage: "hu",
    }),
  );

  const youtubeIds =
    searchResponse.data.items
      ?.map((item) => item.id?.videoId)
      .filter((videoId): videoId is string => Boolean(videoId)) ?? [];

  if (youtubeIds.length === 0) {
    throw new Error(`No YouTube video found for: ${query}`);
  }

  const videoResponse = await runYoutubeRequest(() =>
    youtube.videos.list({
      part: ["contentDetails", "snippet", "statistics", "status"],
      id: youtubeIds,
    }),
  );

  const videoMatches: YoutubeVideoMatch[] = [];

  for (const video of videoResponse.data.items ?? []) {
    const youtubeId = video.id;
    const durationText = video.contentDetails?.duration;
    const videoTitle = video.snippet?.title;
    const channelTitle = video.snippet?.channelTitle;
    const description = (video.snippet?.description ?? "").slice(0, 1000);
    const embeddable = video.status?.embeddable;
    const viewCount = Number(video.statistics?.viewCount);

    if (
      !youtubeId ||
      !durationText ||
      !videoTitle ||
      !channelTitle ||
      !Number.isSafeInteger(viewCount) ||
      embeddable !== true
    ) {
      continue;
    }

    const duration = parseYoutubeDuration(durationText);

    if (!isPlayableDuration(duration)) {
      continue;
    }

    videoMatches.push({
      youtubeId,
      duration,
      videoTitle,
      channelTitle,
      description,
      embeddable,
      viewCount,
    });
  }

  return selectMatchingVideo(params, videoMatches, query);
}

async function findYoutubeVideoUsingFallbackSearch(
  params: FindYoutubeVideoParams,
  query: string,
): Promise<YoutubeSongMatch> {
  const searchResults = await YouTube.search(query, {
    limit: 8,
    type: "video",
  });

  const videoMatches: YoutubeVideoMatch[] = [];

  for (const video of searchResults) {
    const youtubeId = video.id;
    const videoTitle = video.title;
    const channelTitle = video.channel?.name;
    const viewCount = video.views;

    if (
      !youtubeId ||
      !videoTitle ||
      !channelTitle ||
      video.duration == null ||
      !Number.isSafeInteger(viewCount)
    ) {
      continue;
    }

    const duration = Math.round(video.duration / 1000);

    if (!isPlayableDuration(duration)) {
      continue;
    }

    videoMatches.push({
      youtubeId,
      duration,
      videoTitle,
      channelTitle,
      description: (video.description ?? "").slice(0, 1000),
      embeddable: true,
      viewCount,
    });
  }

  return selectMatchingVideo(
    params,
    videoMatches,
    query,
    isYoutubeVideoEmbeddable,
  );
}

export async function isYoutubeVideoEmbeddable(
  youtubeId: string,
): Promise<boolean> {
  try {
    await axios.get("https://www.youtube.com/oembed", {
      params: {
        format: "json",
        url: `https://www.youtube.com/watch?v=${youtubeId}`,
      },
      timeout: 5000,
    });

    return true;
  } catch {
    return false;
  }
}

async function selectMatchingVideo(
  params: FindYoutubeVideoParams,
  videoMatches: YoutubeVideoMatch[],
  query: string,
  verifyEmbeddable?: (youtubeId: string) => Promise<boolean>,
): Promise<YoutubeSongMatch> {
  let correctionAttempted = false;

  for (const videoMatch of videoMatches) {
    const validation = validateSongVideo(params, videoMatch);

    if (validation.blocked || !validation.artistMatches) {
      continue;
    }

    if (verifyEmbeddable && !(await verifyEmbeddable(videoMatch.youtubeId))) {
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
