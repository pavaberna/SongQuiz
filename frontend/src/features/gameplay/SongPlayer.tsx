import YouTube, { type YouTubePlayer, type YouTubeProps } from "react-youtube";
import { useEffect, useRef, useState } from "react";
import type { SongPlayerProps } from "../../types/songPlayer";
import { TimedProgressBar } from "../../components/ui/TimedProgressBar";
import { PlayingCoverAnimation } from "./PlayingCoverAnimation";

const AUTOPLAY_CHECK_DELAY_MS = 2000;

export function SongPlayer({
  clipDuration,
  isCovered,
  isPaused,
  onComplete,
  onError,
  startOffset,
  youtubeId,
  manualPlayText,
}: SongPlayerProps) {
  const autoplayTimerRef = useRef<number | null>(null);
  const playerRef = useRef<YouTubePlayer | null>(null);
  const [activePlaybackKey, setActivePlaybackKey] = useState<string | null>(
    null,
  );
  const [manualPlayRequired, setManualPlayRequired] = useState(false);
  const playbackKey = `${youtubeId}:${startOffset}`;

  useEffect(() => {
    return () => {
      if (autoplayTimerRef.current !== null) {
        window.clearTimeout(autoplayTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const player = playerRef.current;

    if (player === null) {
      return;
    }

    if (isPaused) {
      player.pauseVideo();
      return;
    }

    player.playVideo();
  }, [isPaused]);

  const options: YouTubeProps["opts"] = {
    height: "100%",
    width: "100%",
    playerVars: {
      autoplay: 1,
      controls: 0,
      disablekb: 1,
      end: startOffset + clipDuration,
      origin: window.location.origin,
      playsinline: 1,
      start: startOffset,
    },
  };

  const handleReady: YouTubeProps["onReady"] = (event) => {
    playerRef.current = event.target;
    setManualPlayRequired(false);

    autoplayTimerRef.current = window.setTimeout(() => {
      autoplayTimerRef.current = null;
      setManualPlayRequired(true);
    }, AUTOPLAY_CHECK_DELAY_MS);

    event.target.playVideo();
  };

  const handlePlay: YouTubeProps["onPlay"] = () => {
    if (autoplayTimerRef.current !== null) {
      window.clearTimeout(autoplayTimerRef.current);
      autoplayTimerRef.current = null;
    }
    setActivePlaybackKey(playbackKey);
    setManualPlayRequired(false);
  };

  const handleManualPlay = () => {
    if (!manualPlayRequired || playerRef.current === null) {
      return;
    }

    try {
      playerRef.current.seekTo(startOffset, true);
      playerRef.current.playVideo();
    } catch {
      onError("The song could not be started.");
    }
  };

  const handleEnd: YouTubeProps["onEnd"] = () => {
    onComplete();
    if (autoplayTimerRef.current !== null) {
      window.clearTimeout(autoplayTimerRef.current);
      autoplayTimerRef.current = null;
    }
    setManualPlayRequired(false);
  };

  const handleError: YouTubeProps["onError"] = (event) => {
    onError(`YouTube player error: ${event.data}.`);
  };

  return (
    <div className="flex w-full max-w-[480px] flex-col gap-2.5">
      <div className="relative h-[220px] w-full overflow-hidden rounded-[1.25rem] border border-cyan-400/25 bg-black shadow-[0_0_40px_rgba(6,182,212,0.18)] sm:h-[270px]">
        <YouTube
          className="h-full w-full"
          iframeClassName="h-full w-full"
          onReady={handleReady}
          onPlay={handlePlay}
          onEnd={handleEnd}
          onError={handleError}
          opts={options}
          videoId={youtubeId}
        />
        {isCovered && manualPlayRequired && (
          <button
            className="absolute inset-0 z-10"
            onClick={handleManualPlay}
            type="button"
          >
            <PlayingCoverAnimation isPlaying={false} text={manualPlayText} />
          </button>
        )}

        {isCovered && !manualPlayRequired && (
          <div className="absolute inset-0 z-10">
            <PlayingCoverAnimation isPaused={isPaused} isPlaying />
          </div>
        )}
      </div>

      <TimedProgressBar
        durationSeconds={clipDuration}
        isPaused={isPaused}
        isRunning={activePlaybackKey === playbackKey}
      />
    </div>
  );
}
