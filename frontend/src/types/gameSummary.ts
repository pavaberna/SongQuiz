import type { GamePlayer } from "./game";

export type GameLeaderboardEntry = {
  id: number;
  score: number;
  rank: number;
};

export type GameSummary = {
  status: "ready" | "in_progress" | "paused" | "finished";
  players: GamePlayer[];
  winnerIds: number[];
  roundsPlayed: number;
  totalRounds: number;
  leaderboard: GameLeaderboardEntry[];
};

export type GameSummaryVoiceInstruction = {
  key: "game_summary";
  params: {
    playerScores: {
      playerId: number;
      score: number;
    }[];
    winnerIds: number[];
  };
};

export type GameSummaryResponse = {
  summary: GameSummary;
  voice: GameSummaryVoiceInstruction;
};
