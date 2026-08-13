import { Play } from "lucide-react";
import type { CSSProperties } from "react";

type Ring = {
  color: string;
  direction: "normal" | "reverse";
  glow: string;
  size: string;
  speed: string;
};

const rings: Ring[] = [
  {
    color: "#06b6d4",
    direction: "normal",
    glow: "rgba(6, 182, 212, 0.7)",
    size: "h-[88%] aspect-square",
    speed: "6s",
  },
  {
    color: "#ec4899",
    direction: "reverse",
    glow: "rgba(236, 72, 153, 0.7)",
    size: "h-[68%] aspect-square",
    speed: "4.5s",
  },
  {
    color: "#f59e0b",
    direction: "normal",
    glow: "rgba(245, 158, 11, 0.7)",
    size: "h-[48%] aspect-square",
    speed: "3s",
  },
  {
    color: "#a855f7",
    direction: "reverse",
    glow: "rgba(168, 85, 247, 0.7)",
    size: "h-[28%] aspect-square",
    speed: "2s",
  },
];

type PlayingCoverAnimationProps = {
  isPaused?: boolean;
  isPlaying: boolean;
  text?: string;
};

export function PlayingCoverAnimation({
  isPaused = false,
  isPlaying,
  text,
}: PlayingCoverAnimationProps) {
  return (
    <div className="relative flex h-full w-full items-center justify-center bg-black">
      <div className="absolute inset-8 rounded-full bg-gradient-to-tr from-cyan-500/10 via-fuchsia-500/10 to-amber-500/10 blur-2xl" />

      {rings.map((ring) => (
        <div
          key={ring.color}
          className={`song-neon-ring absolute rounded-full ${ring.size} ${isPlaying ? "song-ring-spin" : ""}`}
          style={{
            "--song-ring-color": ring.color,
            "--song-ring-glow": ring.glow,
            animationDirection: ring.direction,
            animationDuration: ring.speed,
            animationPlayState: isPaused ? "paused" : "running",
          } as CSSProperties}
        />
      ))}

      <div className="relative z-10 flex flex-col items-center gap-4 text-center text-white">
        {!isPlaying && (
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/15">
            <Play size={34} fill="currentColor" />
          </span>
        )}

        {text && <p className="text-xl font-semibold">{text}</p>}
      </div>
    </div>
  );
}
