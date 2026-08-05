import type { AnswerVoiceInstruction } from "./answer";
import type { RoundVoiceInstruction } from "./game";
import type { GameSummaryVoiceInstruction } from "./gameSummary";

export type StaticVoiceLineKey =
  | "welcome_player_count"
  | "ask_decade"
  | "ask_genre"
  | "explain_rules"
  | "setup_retry"
  | "ask_play_again"
  | "restart_ask_decade"
  | "game_stopped";

export type VoiceInstruction =
  | AnswerVoiceInstruction
  | RoundVoiceInstruction
  | GameSummaryVoiceInstruction;
