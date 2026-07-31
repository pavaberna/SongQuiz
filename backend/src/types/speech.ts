import type { GameLanguage } from "./language";

export const transcriptionContexts = [
  "command",
  "decade",
  "genre",
  "player_count",
  "song_answer",
] as const;

export type TranscriptionContext = (typeof transcriptionContexts)[number];

export type TranscriptionOptions = {
  context: TranscriptionContext;
  language: GameLanguage;
};

export type UploadedAudioFile = {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
};
