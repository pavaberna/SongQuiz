import type { GameRound } from "./game";
import type { GameLanguage } from "./language";
import type { ReplaySetup } from "./replay";

export type GameplayProps = {
  currentRound: GameRound;
  language: GameLanguage;
  onGameEnd: () => void;
  onRoundChange: (round: GameRound) => void;
  onReplay: (setup: ReplaySetup) => Promise<void>;
};

export type GameplayPhase =
  | "answering"
  | "error"
  | "playing"
  | "result"
  | "finished";
