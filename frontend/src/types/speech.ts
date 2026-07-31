import type { GameLanguage } from "./language";

export type TranscriptionContext =
  | "command"
  | "decade"
  | "genre"
  | "player_count"
  | "song_answer";

export type TranscribeAudioOptions = {
  context: TranscriptionContext;
  language: GameLanguage;
};

export type TranscriptionResponse = {
  text: string;
};
