import { Pause, Play, Square } from "lucide-react";

import { Button } from "../../components/ui/Button";
import type { GameControlsProps } from "../../types/gameControls";

export function GameControls({
  disabled = false,
  isPaused,
  labels,
  onCommand,
}: GameControlsProps) {
  const pauseLabel = isPaused ? labels.resume : labels.pause;

  return (
    <div className="flex w-full max-w-[480px] items-center justify-center gap-3 rounded-2xl border border-neutral-800 bg-neutral-950/85 px-5 py-3 shadow-[0_0_24px_rgba(6,182,212,0.12)] backdrop-blur">
      <Button
        disabled={disabled}
        onClick={() => onCommand(isPaused ? "resume" : "pause")}
        title={pauseLabel}
        variant="secondary"
      >
        {isPaused ? <Play size={20} /> : <Pause size={20} />}
        <span>{pauseLabel}</span>
      </Button>

      <Button
        disabled={disabled}
        onClick={() => onCommand("end")}
        title={labels.stop}
        variant="ghost"
      >
        <Square size={20} />
        <span>{labels.stop}</span>
      </Button>
    </div>
  );
}
