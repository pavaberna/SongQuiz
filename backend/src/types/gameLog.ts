import type { JudgeSongAnswerResult } from "./answer";

export type SetupTranscriptLogEntry = {
  accepted: false;
  context: "player_count" | "decade" | "genre";
  createdAt: string;
  kind: "setup_transcript";
  parsedValue: null;
  transcript: string;
};

export type AnswerLogEntry = {
  correctArtist: string;
  correctTitle: string;
  createdAt: string;
  judgeResult: JudgeSongAnswerResult;
  kind: "answer";
  playerId: number;
  pointsAwarded: number;
  roundNumber: number;
  skipped: boolean;
  transcript: string;
};

export type ReplayDecisionLogEntry = {
  accepted: false;
  createdAt: string;
  decision: null;
  kind: "replay_decision";
  transcript: string;
};

export type ErrorLogEntry = {
  createdAt: string;
  kind: "error";
  message: string;
  method?: string;
  path?: string;
  source: string;
  statusCode?: number;
};

export type GameLogEntry =
  | SetupTranscriptLogEntry
  | AnswerLogEntry
  | ReplayDecisionLogEntry
  | ErrorLogEntry;

export type GameLogUserSummary = {
  email: string;
  entryCount: number;
  lastEntryAt: string | null;
  name: string | null;
  userStorageKey: string;
};
