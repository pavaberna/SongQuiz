import { GameLanguage } from "./language";

export type GenerateSongListParams = {
  players: number;
  decade: string;
  genre: string;
  language?: GameLanguage;
};

export type GeneratedSong = {
  artist: string;
  title: string;
  year: number;
  genres: string[];
};

export type StoredSong = GeneratedSong & {
  youtubeId: string | null;
  duration: number | null;
};

export type CurrentSongListFile = {
  generatedAt: string;
  targetSongCount: number;
  generatedSongCount: number;
  request: GenerateSongListParams;
  songs: StoredSong[];
};
