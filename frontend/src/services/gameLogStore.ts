import type { GameLogEntry } from "../types/gameLog";

const GAME_LOG_STORAGE_KEY = "song-quiz-game-log";
const MAX_GAME_LOG_ENTRIES = 1000;

export function saveGameLogEntry(entry: GameLogEntry): void {
  const currentLog = readGameLog();

  localStorage.setItem(
    GAME_LOG_STORAGE_KEY,
    JSON.stringify([...currentLog, entry].slice(-MAX_GAME_LOG_ENTRIES)),
  );
}

export function clearGameLog(): void {
  localStorage.removeItem(GAME_LOG_STORAGE_KEY);
}

export function downloadGameLog(): void {
  const log = readGameLog();
  const file = new Blob([JSON.stringify(log, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");

  link.href = url;
  link.download = `song-quiz-log-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
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
