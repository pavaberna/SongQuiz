import { GoogleGenAI } from "@google/genai";
import {
  SONG_GENERATION_BUFFER_MULTIPLIER,
  MAX_HUNGARIAN_SONG_RATIO,
  MIN_HUNGARIAN_SONG_RATIO,
} from "../config/songRules";
import { buildSongListPrompt } from "../prompts/songListPrompt";
import type { GeneratedSong, GenerateSongListParams } from "../types/song";
import { buildSongListResponseSchema } from "../schemas/songListSchema";
import {
  getPopularityTierCounts,
  shuffleSongs,
} from "./songDiversityService";
import {
  getRequestedGenres,
  matchesEveryRequestedGenre,
} from "./songGenreService";
import { randomUUID } from "node:crypto";

const GEMINI_MODEL = "gemini-3.1-flash-lite";
const CURATION_FOCUSES = [
  "Balance radio hits, fan favourites, and overlooked tracks.",
  "Prefer recognizable songs that are not always the first obvious quiz choice.",
  "Mix commercial hits with credible local, alternative, and cult favourites.",
  "Explore different artists and scenes while preserving Hungarian cultural relevance.",
] as const;

type ExcludedSong = Pick<GeneratedSong, "artist" | "title">;

function getHungarianSongCount(
  totalSongCount: number,
  mode: GenerateSongListParams["hungarianSongMode"],
): number {
  if (mode === "hungarian_only") {
    return totalSongCount;
  }

  if (mode === "foreign_only") {
    return 0;
  }

  const minimumCount = Math.max(
    1,
    Math.round(totalSongCount * MIN_HUNGARIAN_SONG_RATIO),
  );

  const maximumCount = Math.max(
    minimumCount,
    Math.round(totalSongCount * MAX_HUNGARIAN_SONG_RATIO),
  );

  return (
    Math.floor(Math.random() * (maximumCount - minimumCount + 1)) + minimumCount
  );
}

export async function generateSongList(
  params: GenerateSongListParams,
  excludedSongs: ExcludedSong[] = [],
): Promise<GeneratedSong[]> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing.");
  }

  if (!Number.isInteger(params.players) || params.players < 1) {
    throw new Error("Invalid number of players.");
  }

  const targetSongCount = params.players * params.songsPerPlayer;
  const requestedGenres = getRequestedGenres(params.genre);

  const generatedSongCount = Math.ceil(
    targetSongCount * SONG_GENERATION_BUFFER_MULTIPLIER,
  );
  const hungarianSongCount = getHungarianSongCount(
    generatedSongCount,
    params.hungarianSongMode,
  );
  const popularityTierCounts = getPopularityTierCounts(generatedSongCount);
  const curationFocus =
    CURATION_FOCUSES[Math.floor(Math.random() * CURATION_FOCUSES.length)];

  const ai = new GoogleGenAI({ apiKey });
  const prompt = buildSongListPrompt({
    ...params,
    curationFocus,
    excludedSongs,
    generatedSongCount,
    hungarianSongCount,
    popularityTierCounts,
    requestedGenres,
    variationId: randomUUID(),
  });

  console.log(
    `Generating ${generatedSongCount} songs, including ${hungarianSongCount} Hungarian songs, for ${targetSongCount} required playable songs with ${GEMINI_MODEL}...`,
  );

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
    config: {
      responseJsonSchema: buildSongListResponseSchema(generatedSongCount),
      responseMimeType: "application/json",
    },
  });

  const rawText = response.text?.trim();

  if (!rawText) {
    throw new Error("No response from Gemini API.");
  }

  const jsonText = rawText
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  const parsed = JSON.parse(jsonText);

  if (!Array.isArray(parsed)) {
    throw new Error("Gemini response is not a JSON array");
  }

  if (parsed.length !== generatedSongCount) {
    throw new Error(
      `Expected ${generatedSongCount} songs, but got ${parsed.length}`,
    );
  }

  const songs: GeneratedSong[] = parsed.map((item, index) => {
    const song = item as Record<string, unknown>;
    const popularityTier = song.popularityTier;

    if (
      typeof song.artist !== "string" ||
      typeof song.title !== "string" ||
      typeof song.year !== "number" ||
      !Array.isArray(song.genres) ||
      !song.genres.every((genre) => typeof genre === "string") ||
      (popularityTier !== "mainstream" &&
        popularityTier !== "familiar" &&
        popularityTier !== "discovery")
    ) {
      throw new Error(`Invalid song format at index ${index}.`);
    }

    return {
      artist: song.artist,
      title: song.title,
      year: song.year,
      genres: song.genres,
      popularityTier,
    };
  });

  const matchingSongs = songs.filter((song) =>
    matchesEveryRequestedGenre(song.genres, requestedGenres),
  );

  if (matchingSongs.length < targetSongCount) {
    throw new Error(
      `Gemini returned only ${matchingSongs.length} songs matching every requested genre, but ${targetSongCount} are required.`,
    );
  }

  const rejectedSongCount = songs.length - matchingSongs.length;

  if (rejectedSongCount > 0) {
    console.warn(
      `Rejected ${rejectedSongCount} songs that did not match every requested genre: ${requestedGenres.join(", ")}.`,
    );
  }

  return shuffleSongs(matchingSongs);
}
