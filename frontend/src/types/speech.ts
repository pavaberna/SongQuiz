import type { GameLanguage } from "./language";

export type TranscriptionContext =
  | "decade"
  | "genre"
  | "player_count"
  | "song_answer"
  | "replay_decision";

export type TranscribeAudioOptions = {
  context: TranscriptionContext;
  language: GameLanguage;
  signal?: AbortSignal;
};

export type TranscriptionResponse = {
  text: string;
};
