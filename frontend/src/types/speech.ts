import type { GameLanguage } from "./language";

export type TranscriptionContext =
  | "command"
  | "decade"
  | "genre"
  | "player_count"
  | "song_answer"
  | "replay_decision";

export type TranscribeAudioOptions = {
  context: TranscriptionContext;
  language: GameLanguage;
};

export type TranscriptionResponse = {
  text: string;
};
