import { Pause, Play, Square } from "lucide-react";

import { Button } from "../../components/ui/Button";
import type { GameControlsProps } from "../../types/gameControls";

export function GameControls({
  disabled = false,
  isPaused,
  onCommand,
}: GameControlsProps) {
  return (
    <div className="flex gap-3">
      <Button
        disabled={disabled}
        onClick={() => onCommand(isPaused ? "resume" : "pause")}
        variant="secondary"
      >
        {isPaused ? <Play size={18} /> : <Pause size={18} />}
        {isPaused ? "Folytatás" : "Szünet"}
      </Button>

      <Button
        disabled={disabled}
        onClick={() => onCommand("end")}
        variant="ghost"
      >
        <Square size={18} />
        Játék leállítása
      </Button>
    </div>
  );
}
