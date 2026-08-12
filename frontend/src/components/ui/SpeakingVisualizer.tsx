type SpeakingVisualizerProps = {
  isPaused?: boolean;
  label: string;
};

export function SpeakingVisualizer({
  isPaused = false,
  label,
}: SpeakingVisualizerProps) {
  return (
    <div
      className={`flex flex-col items-center gap-5 ${isPaused ? "song-visualizer-paused" : ""}`}
    >
      <div className="relative flex h-40 w-40 items-center justify-center">
        <div className="absolute h-40 w-40 animate-ping rounded-full bg-white/20" />
        <div className="absolute h-32 w-32 animate-pulse rounded-full bg-white/40 blur-md" />

        <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-white shadow-[0_0_50px_rgba(255,255,255,0.9)]">
          <div className="flex items-center gap-1">
            <span className="song-voice-bar h-8" />
            <span className="song-voice-bar h-12" />
            <span className="song-voice-bar h-6" />
            <span className="song-voice-bar h-10" />
          </div>
        </div>
      </div>

      <p className="rounded-full border border-white/30 bg-white/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-white shadow-[0_0_12px_rgba(255,255,255,0.25)]">
        {label}
      </p>
    </div>
  );
}
