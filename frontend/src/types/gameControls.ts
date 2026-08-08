import type { GameCommand } from "./gameCommand";

export type GameControlsProps = {
  disabled?: boolean;
  isPaused: boolean;
  onCommand: (command: GameCommand) => void;
};
