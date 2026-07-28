import OpenAI from "openai";
import { TEXT_TO_SPEECH_INSTRUCTIONS } from "../prompts/textToSpeechPrompt";

export type TextToSpeechResult = {
  audioBuffer: Buffer;
  contentType: string;
};

export async function generateSpeech(
  text: string,
): Promise<TextToSpeechResult> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is missing.");
  }

  const client = new OpenAI({
    apiKey,
    timeout: 30_000,
  });
  const response = await client.audio.speech.create({
    model: "gpt-4o-mini-tts",
    voice: "cedar",
    input: text,
    instructions: TEXT_TO_SPEECH_INSTRUCTIONS,
    response_format: "mp3",
    speed: 1.15,
  });

  const arrayBuffer = await response.arrayBuffer();
  const audioBuffer = Buffer.from(arrayBuffer);

  return {
    audioBuffer,
    contentType: "audio/mpeg",
  };
}
