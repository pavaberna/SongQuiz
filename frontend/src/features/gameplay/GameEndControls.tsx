import { RotateCcw, Square } from "lucide-react";

import { Button } from "../../components/ui/Button";

type GameEndControlsProps = {
  disabled: boolean;
  newGameLabel: string;
  onEnd: () => void;
  onNewGame: () => void;
  stopLabel: string;
};

export function GameEndControls({
  disabled,
  newGameLabel,
  onEnd,
  onNewGame,
  stopLabel,
}: GameEndControlsProps) {
  return (
    <div className="flex w-full max-w-[480px] items-center justify-center gap-3 rounded-2xl border border-neutral-800 bg-neutral-950/85 px-5 py-3 shadow-[0_0_24px_rgba(6,182,212,0.12)] backdrop-blur">
      <Button
        className="min-w-0 flex-1"
        disabled={disabled}
        onClick={onEnd}
        title={stopLabel}
        variant="ghost"
      >
        <Square size={20} />
        <span>{stopLabel}</span>
      </Button>

      <Button
        className="min-w-0 flex-1"
        disabled={disabled}
        onClick={onNewGame}
        title={newGameLabel}
        variant="secondary"
      >
        <RotateCcw size={20} />
        <span>{newGameLabel}</span>
      </Button>
    </div>
  );
}
