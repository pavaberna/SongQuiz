import type { StoredSong } from "./song";
import type { JudgeSongAnswerResult } from "./answer";
import {
  EnrichSongsResult,
  SongListReadinessResult,
} from "../services/songListEnricher";

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
  rounds: GameRound[];
  events: GameEvent[];
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
  playerAnswer?: string;
  pointsAwarded?: number;
  judgeResult?: JudgeSongAnswerResult;
  completedAt?: string;
};

export type GameEvent = {
  id: string;
  createdAt: string;
  type:
    | "game_created"
    | "round_started"
    | "answer_submitted"
    | "game_paused"
    | "game_resumed"
    | "game_finished";
  message: string;
};

export type PrepareGameSessionResult =
  | {
      ready: true;
      session: GameSession;
      readiness: SongListReadinessResult;
    }
  | {
      ready: false;
      session: null;
      readiness: SongListReadinessResult;
      enrichment: EnrichSongsResult;
    };

export type EndGameResult = { deleted: boolean };

export type GameSummary = {
  status: GameSessionStatus;
  players: GamePlayer[];
  winnerIds: number[];
  roundsPlayed: number;
  totalRounds: number;
  events: GameEvent[];
};

export type GameCommand = "pause" | "resume" | "finish" | "end";

export type HandleGameCommandResult = {
  command: GameCommand;
  result: GameSession | EndGameResult;
};
