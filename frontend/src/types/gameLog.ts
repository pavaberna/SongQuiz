import type { AnswerJudgeResult } from "./answer";

export type GameLogEntry =
  | {
      createdAt: string;
      kind: "setup_transcript";
      context: "player_count" | "decade" | "genre";
      transcript: string;
      parsedValue: number | string;
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
      judgeResult: AnswerJudgeResult;
    };
