import {
  MIN_PLAYABLE_DURATION_SECONDS,
  MAX_PLAYABLE_DURATION_SECONDS,
} from "../config/songRules";
import type { StoredSong } from "../types/song";

export function hasPlayableYoutubeData(song: StoredSong): boolean {
  const youtubeId = song.youtubeId;
  const duration = song.duration;

  const hasYoutubeId = typeof youtubeId === "string" && youtubeId.length > 0;

  if (typeof duration !== "number") {
    return false;
  }

  return (
    hasYoutubeId &&
    duration >= MIN_PLAYABLE_DURATION_SECONDS &&
    duration <= MAX_PLAYABLE_DURATION_SECONDS
  );
}
