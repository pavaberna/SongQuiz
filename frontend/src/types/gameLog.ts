import type { AnswerJudgeResult } from "./answer";

export type GameLogEntry =
  | {
      accepted: false;
      createdAt: string;
      kind: "setup_transcript";
      context: "player_count" | "decade" | "genre";
      transcript: string;
      parsedValue: null;
    }
  | {
      createdAt: string;
      kind: "answer";
      roundNumber: number;
      playerId: number;
      transcript: string;
      correctArtist: string;
      correctTitle: string;
      pointsAwarded: number;
      skipped: boolean;
      judgeResult: AnswerJudgeResult;
    }
  | {
      accepted: false;
      createdAt: string;
      decision: null;
      kind: "replay_decision";
      transcript: string;
    }
  | {
      createdAt: string;
      kind: "error";
      message: string;
      source: string;
    };

export type GameLogUserSummary = {
  email: string;
  entryCount: number;
  lastEntryAt: string | null;
  name: string | null;
  userStorageKey: string;
};
