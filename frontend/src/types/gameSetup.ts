import type { GameLanguage } from "./language";
import type { TranscriptionContext } from "./speech";
import type { StaticVoiceLineKey } from "./voice";

export type GameSetupStatus =
  | "idle"
  | "speaking"
  | "recording"
  | "transcribing"
  | "generating"
  | "preparing";

export type GameSetupProps = {
  errorMessage: string | null;
  language: GameLanguage;
  onLanguageChange: (language: GameLanguage) => void;
  onStart: () => void;
  setupStatus: GameSetupStatus;
  transcript: string | null;
  players: number | null;
  decade: string | null;
  genre: string | null;
  generatedSongCount: number | null;
  gameSessionId: string | null;
};

export type AskAndTranscribeOptions = {
  language: GameLanguage;
  onStatusChange: (status: GameSetupStatus) => void;
  voiceLineKey: StaticVoiceLineKey;
  transcriptionContext: TranscriptionContext;
};

export type AskUntilValidOptions<T> = AskAndTranscribeOptions & {
  parseAnswer: (transcript: string) => T | null;
};

export type ValidSetupAnswer<T> = {
  transcript: string;
  value: T;
};
