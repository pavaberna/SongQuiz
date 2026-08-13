export type HungarianSongMode =
  | "hungarian_only"
  | "mixed"
  | "foreign_only";

export type GameSettings = {
  hungarianSongMode: HungarianSongMode;
  playRules: boolean;
  songsPerPlayer: number;
};
