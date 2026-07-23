import { GoogleGenAI } from "@google/genai";
import {
  SONG_GENERATION_BUFFER_MULTIPLIER,
  SONGS_PER_PLAYER,
} from "../config/songRules";
import { buildSongListPrompt } from "../prompts/songListPrompt";
import type { GeneratedSong, GenerateSongListParams } from "../types/song";

const GEMINI_MODEL = "gemini-3.1-flash-lite";

export async function generateSongList(
  params: GenerateSongListParams,
): Promise<GeneratedSong[]> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing.");
  }

  if (!Number.isInteger(params.players) || params.players < 1) {
    throw new Error("Invalid number of players.");
  }

  const targetSongCount = params.players * SONGS_PER_PLAYER;
  const generatedSongCount = Math.ceil(
    targetSongCount * SONG_GENERATION_BUFFER_MULTIPLIER,
  );

  const ai = new GoogleGenAI({ apiKey });
  const prompt = buildSongListPrompt({
    ...params,
    generatedSongCount,
  });

  console.log(
    `Generating ${generatedSongCount} songs for ${targetSongCount} required playable songs with ${GEMINI_MODEL}...`,
  );

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
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

  return parsed.map((item, index) => {
    const song = item as Record<string, unknown>;
    if (
      typeof song.artist !== "string" ||
      typeof song.title !== "string" ||
      typeof song.year !== "number" ||
      !Array.isArray(song.genres) ||
      !song.genres.every((genre) => typeof genre === "string")
    ) {
      throw new Error(`Invalid song format at index ${index}.`);
    }

    return {
      artist: song.artist,
      title: song.title,
      year: song.year,
      genres: song.genres,
    };
  });
}
