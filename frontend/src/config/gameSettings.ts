import type { GameSettings } from "../types/settings";

export const MIN_SONGS_PER_PLAYER = 3;
export const MAX_SONGS_PER_PLAYER = 10;

export const DEFAULT_GAME_SETTINGS: GameSettings = {
  hungarianSongMode: "mixed",
  playRules: true,
  songsPerPlayer: 5,
};
