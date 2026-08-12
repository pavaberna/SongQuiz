import type { GameCommand } from "./gameCommand";

export type GameControlsLabels = {
  pause: string;
  resume: string;
  stop: string;
};

export type GameControlsProps = {
  disabled?: boolean;
  isPaused: boolean;
  labels: GameControlsLabels;
  onCommand: (command: GameCommand) => void;
};
