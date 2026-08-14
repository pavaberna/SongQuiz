import type { ApiErrorResponse } from "../types/api";
import type {
  GameLogEntry,
  GameLogUserSummary,
} from "../types/gameLog";
import { API_BASE_URL } from "./apiConfig";
import { apiFetch } from "./apiFetch";

type GameLogResponse = {
  count: number;
  entries: GameLogEntry[];
};

type GameLogUsersResponse = {
  users: GameLogUserSummary[];
};

async function throwGameLogError(
  response: Response,
  fallbackMessage: string,
): Promise<never> {
  const errorData = (await response
    .json()
    .catch(() => null)) as ApiErrorResponse | null;

  throw new Error(errorData?.error ?? fallbackMessage);
}

export async function appendGameLogEntry(
  entry: GameLogEntry,
): Promise<void> {
  const url = new URL("/api/dev/test-log", API_BASE_URL);
  const response = await apiFetch(url, {
    body: JSON.stringify({ entry }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });

  if (!response.ok) {
    await throwGameLogError(response, "Saving the test log entry failed.");
  }
}

export async function fetchGameLogUsers(): Promise<GameLogUserSummary[]> {
  const url = new URL("/api/dev/admin/test-logs", API_BASE_URL);
  const response = await apiFetch(url);

  if (!response.ok) {
    await throwGameLogError(response, "Loading the test log users failed.");
  }

  const data = (await response.json()) as GameLogUsersResponse;

  if (!Array.isArray(data.users)) {
    throw new Error("The test log user response is invalid.");
  }

  return data.users;
}

export async function fetchGameLogForUser(
  userStorageKey: string,
): Promise<GameLogResponse> {
  const url = new URL(
    `/api/dev/admin/test-logs/${encodeURIComponent(userStorageKey)}`,
    API_BASE_URL,
  );
  const response = await apiFetch(url);

  if (!response.ok) {
    await throwGameLogError(response, "Loading the test log failed.");
  }

  const data = (await response.json()) as GameLogResponse;

  if (!Array.isArray(data.entries) || typeof data.count !== "number") {
    throw new Error("The test log response is invalid.");
  }

  return data;
}

export async function deleteGameLogForUser(
  userStorageKey: string,
): Promise<void> {
  const url = new URL(
    `/api/dev/admin/test-logs/${encodeURIComponent(userStorageKey)}`,
    API_BASE_URL,
  );
  const response = await apiFetch(url, { method: "DELETE" });

  if (!response.ok) {
    await throwGameLogError(response, "Clearing the test log failed.");
  }
}
