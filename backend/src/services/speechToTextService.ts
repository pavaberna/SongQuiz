import OpenAI, { toFile } from "openai";

import { getTranscriptionPrompt } from "../prompts/transcriptionPrompt";
import type { TranscriptionOptions, UploadedAudioFile } from "../types/speech";

const SPEECH_TO_TEXT_MODEL = "gpt-4o-transcribe";

export async function transcribeAudio(
  file: UploadedAudioFile,
  options: TranscriptionOptions,
): Promise<string> {
  const startedAt = performance.now();
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is missing.");
  }

  const client = new OpenAI({ apiKey });

  const audioFile = await toFile(file.buffer, file.originalname, {
    type: file.mimetype,
  });

  const languageOptions =
    options.context === "song_answer"
      ? {}
      : { language: options.language };

  const transcription = await client.audio.transcriptions.create({
    file: audioFile,
    ...languageOptions,
    model: SPEECH_TO_TEXT_MODEL,
    prompt: getTranscriptionPrompt(options.language, options.context),
  });

  console.info(
    `[timing] transcription context=${options.context} total=${Math.round(performance.now() - startedAt)}ms`,
  );

  return transcription.text;
}
