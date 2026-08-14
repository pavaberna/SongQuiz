import type {
  GameLogEntry,
  GameLogUserSummary,
} from "../types/gameLog";
import {
  appendGameLogEntry,
  deleteGameLogForUser,
  fetchGameLogForUser,
  fetchGameLogUsers,
} from "../api/gameLogApi";

export function saveGameLogEntry(entry: GameLogEntry): void {
  void appendGameLogEntry(entry).catch((error: unknown) => {
    console.error("Failed to save a test log entry.", error);
  });
}

type GameErrorDetails = {
  componentStack?: string;
};

export function saveGameError(
  error: unknown,
  source: string,
  details: GameErrorDetails = {},
): void {
  const message = error instanceof Error ? error.message : String(error);

  saveGameLogEntry({
    ...details,
    createdAt: new Date().toISOString(),
    kind: "error",
    message,
    source,
    ...(error instanceof Error && error.stack ? { stack: error.stack } : {}),
    userAgent: navigator.userAgent,
  });
}

export async function clearGameLog(userStorageKey: string): Promise<void> {
  await deleteGameLogForUser(userStorageKey);
}

export async function downloadGameLog(
  user: GameLogUserSummary,
): Promise<void> {
  const response = await fetchGameLogForUser(user.userStorageKey);
  const file = new Blob([JSON.stringify(response.entries, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");

  link.href = url;
  link.download = `song-quiz-log-${user.email}-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export async function readGameLogUsers(): Promise<GameLogUserSummary[]> {
  return fetchGameLogUsers();
}
