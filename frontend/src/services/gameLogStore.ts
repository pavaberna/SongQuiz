import type { GameLogEntry } from "../types/gameLog";

const GAME_LOG_STORAGE_KEY = "song-quiz-game-log";

export function saveGameLogEntry(entry: GameLogEntry): void {
  const currentLog = readGameLog();

  localStorage.setItem(
    GAME_LOG_STORAGE_KEY,
    JSON.stringify([...currentLog, entry]),
  );
}

export function readGameLog(): GameLogEntry[] {
  const rawLog = localStorage.getItem(GAME_LOG_STORAGE_KEY);

  if (rawLog === null) {
    return [];
  }

  try {
    const parsedLog = JSON.parse(rawLog);

    return Array.isArray(parsedLog) ? (parsedLog as GameLogEntry[]) : [];
  } catch {
    return [];
  }
}
