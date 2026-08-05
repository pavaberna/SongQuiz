import type { GameLanguage } from "./language";

export type ReplaySetup = {
  players: number;
  language: GameLanguage;
};

export type ReplayDecisionResult =
  | { decision: "replay"; setup: ReplaySetup }
  | { decision: "end"; result: { deleted: boolean } };

export type ReplayVoiceInstruction = {
  key: "restart_ask_decade" | "game_stopped";
};

export type ReplayDecisionResponse = {
  result: ReplayDecisionResult;
  voice: ReplayVoiceInstruction;
};
