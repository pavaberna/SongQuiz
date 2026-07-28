export const voiceLineKeys = [
  "welcome_player_count",
  "ask_decade",
  "ask_genre",
  "explain_rules",
  "round_started",
  "next_player",
  "answer_none_correct",
  "answer_artist_correct",
  "answer_title_correct",
  "answer_both_correct",
  "answer_perfect",
  "game_summary",
  "ask_play_again",
  "game_paused",
  "game_stopped",
  "game_resumed",
  "restart_ask_decade",
  "pass_hint",
] as const;

export type VoiceLineKey = (typeof voiceLineKeys)[number];

export type VoiceLinePlayerScore = {
  playerId: number;
  score: number;
};

export type VoiceLineParams = {
  playerId?: number;
  roundNumber?: number;
  points?: number;
  artist?: string;
  title?: string;
  correctArtist?: string;
  correctTitle?: string;
  winnerId?: number;
  winnerIds?: number[];
  playerScores?: VoiceLinePlayerScore[];
};

export const requiredVoiceLineParams: Partial<
  Record<VoiceLineKey, (keyof VoiceLineParams)[]>
> = {
  round_started: ["roundNumber", "playerId"],
  next_player: ["roundNumber", "playerId"],

  answer_none_correct: ["correctArtist", "correctTitle"],
  answer_artist_correct: ["correctTitle", "points"],
  answer_title_correct: ["correctArtist", "points"],
  answer_both_correct: ["correctArtist", "correctTitle", "points"],
  answer_perfect: ["points"],

  game_summary: ["playerScores", "winnerIds"],
  game_resumed: ["roundNumber", "playerId"],
};

export type VoiceLineValue = string | ((params: VoiceLineParams) => string);

export type VoiceLineCatalog = Record<VoiceLineKey, VoiceLineValue>;
