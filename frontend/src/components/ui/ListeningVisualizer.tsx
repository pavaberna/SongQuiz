type ListeningVisualizerProps = {
  isPaused?: boolean;
  label: string;
};

export function ListeningVisualizer({
  isPaused = false,
  label,
}: ListeningVisualizerProps) {
  return (
    <div
      className={`flex flex-col items-center gap-5 ${isPaused ? "song-visualizer-paused" : ""}`}
    >
      <div className="flex h-24 items-center justify-center gap-3">
        <span className="song-listening-dot" />
        <span className="song-listening-dot" />
        <span className="song-listening-dot" />
      </div>

      <p className="rounded-full border border-purple-400/40 bg-purple-950/50 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-purple-200 shadow-[0_0_16px_rgba(168,85,247,0.3)]">
        {label}
      </p>
    </div>
  );
}
