import type { AnswerJudgeResult } from "./answer";

export type GameLogEntry =
  | {
      accepted: boolean;
      createdAt: string;
      kind: "setup_transcript";
      context: "player_count" | "decade" | "genre";
      transcript: string;
      parsedValue: number | string | null;
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
      accepted: boolean;
      createdAt: string;
      decision: "replay" | "end" | null;
      kind: "replay_decision";
      transcript: string;
    };
