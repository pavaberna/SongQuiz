import OpenAI, { toFile } from "openai";

import { getTranscriptionPrompt } from "../prompts/transcriptionPrompt";
import type { TranscriptionOptions, UploadedAudioFile } from "../types/speech";

export async function transcribeAudio(
  file: UploadedAudioFile,
  options: TranscriptionOptions,
): Promise<string> {
  const baseUrl = process.env.SPEACHES_BASE_URL;
  const apiKey = process.env.SPEACHES_API_KEY;
  const model = process.env.SPEACHES_STT_MODEL;

  if (!baseUrl) {
    throw new Error("SPEACHES_BASE_URL is missing.");
  }

  if (!apiKey) {
    throw new Error("SPEACHES_API_KEY is missing.");
  }

  if (!model) {
    throw new Error("SPEACHES_STT_MODEL is missing.");
  }

  const client = new OpenAI({
    apiKey,
    baseURL: `${baseUrl}/v1`,
  });

  const audioFile = await toFile(file.buffer, file.originalname, {
    type: file.mimetype,
  });

  const transcription = await client.audio.transcriptions.create({
    file: audioFile,
    language: options.language,
    model,
    prompt: getTranscriptionPrompt(options.language, options.context),
  });

  return transcription.text;
}
