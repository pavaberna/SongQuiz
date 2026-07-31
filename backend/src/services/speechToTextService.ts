import OpenAI, { toFile } from "openai";

import { getTranscriptionPrompt } from "../prompts/transcriptionPrompt";
import type { TranscriptionOptions, UploadedAudioFile } from "../types/speech";

export async function transcribeAudio(
  file: UploadedAudioFile,
  options: TranscriptionOptions,
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is missing.");
  }

  const client = new OpenAI({ apiKey });

  const audioFile = await toFile(file.buffer, file.originalname, {
    type: file.mimetype,
  });

  const transcription = await client.audio.transcriptions.create({
    file: audioFile,
    language: options.language,
    model: "gpt-4o-mini-transcribe",
    prompt: getTranscriptionPrompt(options.language, options.context),
  });

  return transcription.text;
}
