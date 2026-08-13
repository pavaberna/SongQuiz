import type { GameLanguage } from "./language";
import type { GameCommand } from "./gameCommand";
import type { GameSettings } from "./settings";
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
  isPaused: boolean;
  isSetupActive: boolean;
  language: GameLanguage;
  isVoicePlaying: boolean;
  onCommand: (command: GameCommand) => void;
  onLanguageChange: (language: GameLanguage) => void;
  onSettingsChange: (settings: GameSettings) => void;
  onStart: () => void;
  setupStatus: GameSetupStatus;
  transcript: string | null;
  players: number | null;
  decade: string | null;
  genre: string | null;
  settings: GameSettings;
};

export type AskAndTranscribeOptions = {
  language: GameLanguage;
  onStatusChange: (status: GameSetupStatus) => void;
  signal?: AbortSignal;
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
