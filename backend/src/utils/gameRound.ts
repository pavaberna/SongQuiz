import type { GameSession } from "../types/game";

export function getNextRoundNumber(
  session: Pick<GameSession, "players" | "rounds">,
): number {
  if (session.players.length === 0) {
    throw new Error("Cannot calculate a round without players.");
  }

  const completedTurns = session.rounds?.length ?? 0;

  return Math.floor(completedTurns / session.players.length) + 1;
}
