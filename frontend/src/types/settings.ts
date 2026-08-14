export type HungarianSongMode =
  | "hungarian_only"
  | "mixed"
  | "foreign_only";

export type GameSettings = {
  hungarianSongMode: HungarianSongMode;
  playAnswerSoundEffects: boolean;
  playRules: boolean;
  songsPerPlayer: number;
};
