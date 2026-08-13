import { GameLanguage } from "./language";

export type HungarianSongMode =
  | "hungarian_only"
  | "mixed"
  | "foreign_only";

export type SongPopularityTier =
  | "mainstream"
  | "familiar"
  | "discovery";

export type GenerateSongListParams = {
  players: number;
  decade: string;
  genre: string;
  language?: GameLanguage;
  hungarianSongMode: HungarianSongMode;
  songsPerPlayer: number;
};

export type GeneratedSong = {
  artist: string;
  title: string;
  year: number;
  genres: string[];
  popularityTier: SongPopularityTier;
};

export type StoredSong = GeneratedSong & {
  youtubeId: string | null;
  duration: number | null;
  viewCount: number | null;
};

export type CurrentSongListFile = {
  generatedAt: string;
  targetSongCount: number;
  generatedSongCount: number;
  request: GenerateSongListParams;
  songs: StoredSong[];
};
