import type { GameRound } from "./game";
import type { GameLanguage } from "./language";
import type { ReplaySetup } from "./replay";
import type { GameSettings } from "./settings";

export type GameplayProps = {
  currentRound: GameRound;
  initiallyPaused?: boolean;
  language: GameLanguage;
  onGameEnd: () => void;
  onRoundChange: (round: GameRound) => void;
  onReplay: (setup: ReplaySetup) => Promise<void>;
  onSettingsChange: (settings: GameSettings) => void;
  settings: GameSettings;
};

export type GameplayPhase =
  | "answering"
  | "playing"
  | "result"
  | "finished";
