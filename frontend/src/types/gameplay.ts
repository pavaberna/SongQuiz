import type { GameRound } from "./game";
import type { GameLanguage } from "./language";

export type GameplayProps = {
  currentRound: GameRound;
  language: GameLanguage;
};
