import type { GameLanguage } from "./language";

export type GenerateSongRequest = {
  decade: string;
  genre: string;
  language: GameLanguage;
  players: number;
};

export type GenerateSongResponse = {
  count: number;
  file: string;
};
