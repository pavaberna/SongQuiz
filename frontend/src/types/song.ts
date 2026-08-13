import type { GameLanguage } from "./language";
import type { HungarianSongMode } from "./settings";

export type GenerateSongRequest = {
  decade: string;
  genre: string;
  language: GameLanguage;
  players: number;
  hungarianSongMode: HungarianSongMode;
  songsPerPlayer: number;
};

export type GenerateSongResponse = {
  count: number;
  file: string;
};
