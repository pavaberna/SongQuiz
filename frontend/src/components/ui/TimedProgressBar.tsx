import type { CSSProperties } from "react";

type TimedProgressBarProps = {
  durationSeconds: number;
  isPaused: boolean;
  isRunning: boolean;
};

export function TimedProgressBar({
  durationSeconds,
  isPaused,
  isRunning,
}: TimedProgressBarProps) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-800/90 shadow-inner">
      <span
        className={`block h-full origin-left bg-gradient-to-r from-fuchsia-500 via-purple-500 to-cyan-400 shadow-[0_0_12px_rgba(217,70,239,0.7)] ${isRunning ? "song-timed-progress" : "scale-x-0"}`}
        style={
          {
            animationDuration: `${durationSeconds}s`,
            animationPlayState: isPaused ? "paused" : "running",
          } as CSSProperties
        }
      />
    </div>
  );
}
