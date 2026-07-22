import type { StoredSong } from "./song";

export type GamePlayer = {
  id: number;
  score: number;
};

export type GameSong = StoredSong & {
  played: boolean;
};

export type GameSessionStatus = "ready" | "in_progress" | "paused" | "finished";

export type GameSession = {
  id: string;
  createdAt: string;
  status: GameSessionStatus;
  players: GamePlayer[];
  decade: string;
  genre: string;
  currentPlayerIndex: number;
  songs: GameSong[];
  roundNumber: number;
  currentRound: GameRound | null;
};

export type GameRoundStatus = "playing" | "answering" | "scoring" | "completed";

export type GameRound = {
  roundNumber: number;
  currentPlayer: GamePlayer;
  currentSong: GameSong;
  startOffset: number;
  clipDuration: number;
  startedAt: string;
  status: GameRoundStatus;
};
