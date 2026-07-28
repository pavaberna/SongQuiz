import OpenAI, { toFile } from "openai";

type AudioFile = {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
};

export async function transcribeAudio(file: AudioFile): Promise<string> {
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
    model: "gpt-4o-mini-transcribe",
  });

  return transcription.text;
}
