import type { GameRound } from "./game";

export type GameCommand = "pause" | "resume" | "finish" | "end";

export type GameCommandSession = {
  id: string;
  status: "in_progress" | "paused" | "finished";
  currentRound: GameRound | null;
};

export type GameCommandResult =
  | {
      command: "pause" | "resume" | "finish";
      result: GameCommandSession;
    }
  | {
      command: "end";
      result: {
        deleted: boolean;
      };
    };

export type GameCommandResponse = {
  result: GameCommandResult;
};
