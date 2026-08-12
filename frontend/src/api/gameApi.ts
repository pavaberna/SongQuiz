import type { ApiErrorResponse } from "../types/api";
import type {
  PrepareGameSessionResponse,
  StartRoundResponse,
} from "../types/game";
import type { GameSummaryResponse } from "../types/gameSummary";
import { API_BASE_URL } from "./apiConfig";

export async function prepareGameSession(
  enrichmentLimit: number,
  signal?: AbortSignal,
): Promise<PrepareGameSessionResponse> {
  const url = new URL("/api/dev/prepare-game-session", API_BASE_URL);

  const response = await fetch(url, {
    body: JSON.stringify({ enrichmentLimit }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
    signal,
  });

  if (!response.ok) {
    const errorData = (await response
      .json()
      .catch(() => null)) as ApiErrorResponse | null;

    throw new Error(
      errorData?.error ??
        `Game preparation failed with status ${response.status}.`,
    );
  }

  const data = (await response.json()) as PrepareGameSessionResponse;

  if (typeof data.ready !== "boolean") {
    throw new Error("The game preparation response is invalid.");
  }

  return data;
}

export async function startRound(signal?: AbortSignal): Promise<StartRoundResponse> {
  const url = new URL("/api/dev/start-round", API_BASE_URL);

  const response = await fetch(url, {
    method: "POST",
    signal,
  });

  if (!response.ok) {
    const errorData = (await response
      .json()
      .catch(() => null)) as ApiErrorResponse | null;

    throw new Error(
      errorData?.error ??
        `Starting the round failed with status ${response.status}.`,
    );
  }

  const data = (await response.json()) as StartRoundResponse;

  if (typeof data?.session?.id !== "string") {
    throw new Error("The start round response is invalid.");
  }

  return data;
}

export async function getGameSummary(): Promise<GameSummaryResponse> {
  const url = new URL("/api/dev/game-summary", API_BASE_URL);

  const response = await fetch(url, {
    method: "GET",
  });

  if (!response.ok) {
    const errorData = (await response
      .json()
      .catch(() => null)) as ApiErrorResponse | null;

    throw new Error(errorData?.error ?? "no game summary response");
  }

  const data = (await response.json()) as GameSummaryResponse;

  if (
    !Array.isArray(data?.summary?.leaderboard) ||
    data?.voice?.key !== "game_summary"
  ) {
    throw new Error("The game summary response is invalid.");
  }

  return data;
}
