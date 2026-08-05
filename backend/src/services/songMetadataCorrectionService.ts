import { GoogleGenAI } from "@google/genai";
import { buildSongMetadataCorrectionPrompt } from "../prompts/songMetadataCorrectionPrompt";
import { songMetadataCorrectionSchema } from "../schemas/songMetadataCorrectionSchema";
import type {
  FindYoutubeVideoParams,
  YoutubeVideoMatch,
} from "../types/youtube";

const GEMINI_MODEL = "gemini-3.1-flash-lite";

export async function correctSongMetadata(
  song: FindYoutubeVideoParams,
  video: YoutubeVideoMatch,
): Promise<FindYoutubeVideoParams> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing.");
  }

  const ai = new GoogleGenAI({ apiKey });
  const prompt = buildSongMetadataCorrectionPrompt(song, video);

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
    config: {
      responseJsonSchema: songMetadataCorrectionSchema,
      responseMimeType: "application/json",
    },
  });

  const rawText = response.text?.trim();

  if (!rawText) {
    throw new Error("No song metadata correction response from Gemini.");
  }

  const parsed = JSON.parse(rawText) as Record<string, unknown>;

  if (
    typeof parsed.artist !== "string" ||
    typeof parsed.title !== "string" ||
    parsed.artist.trim() === "" ||
    parsed.title.trim() === ""
  ) {
    throw new Error("Invalid song metadata correction response from Gemini.");
  }

  return {
    artist: parsed.artist.trim(),
    title: parsed.title.trim(),
  };
}
