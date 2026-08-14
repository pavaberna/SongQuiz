import { mkdir, readFile, rm, writeFile } from "fs/promises";
import path from "path";

import { getCurrentUserStorageKey } from "../lib/requestContext";
import type { GameLogEntry } from "../types/gameLog";

const MAX_GAME_LOG_ENTRIES = 1000;
const pendingWrites = new Map<string, Promise<void>>();
const validStorageKeyCharacters = "0123456789abcdef";

function isValidUserStorageKey(userStorageKey: string): boolean {
  return (
    userStorageKey.length === 64 &&
    [...userStorageKey].every((character) =>
      validStorageKeyCharacters.includes(character),
    )
  );
}

function getGameLogPathsForUser(userStorageKey: string): {
  gameLogPath: string;
  userRuntimeDir: string;
} {
  if (!isValidUserStorageKey(userStorageKey)) {
    throw new Error("The user storage key is invalid.");
  }

  const userRuntimeDir = path.join(
    process.cwd(),
    "runtime",
    "users",
    userStorageKey,
  );

  return {
    gameLogPath: path.join(userRuntimeDir, "test-log.json"),
    userRuntimeDir,
  };
}

function getGameLogPaths(): {
  gameLogPath: string;
  userRuntimeDir: string;
} {
  return getGameLogPathsForUser(getCurrentUserStorageKey());
}

async function readGameLogFile(gameLogPath: string): Promise<GameLogEntry[]> {
  try {
    const content = await readFile(gameLogPath, "utf-8");
    const parsedContent: unknown = JSON.parse(content);

    return Array.isArray(parsedContent)
      ? (parsedContent as GameLogEntry[])
      : [];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

function enqueueWrite(
  gameLogPath: string,
  operation: () => Promise<void>,
): Promise<void> {
  const previousWrite = pendingWrites.get(gameLogPath) ?? Promise.resolve();
  const currentWrite = previousWrite.catch(() => undefined).then(operation);

  pendingWrites.set(gameLogPath, currentWrite);
  void currentWrite.then(
    () => {
      if (pendingWrites.get(gameLogPath) === currentWrite) {
        pendingWrites.delete(gameLogPath);
      }
    },
    () => {
      if (pendingWrites.get(gameLogPath) === currentWrite) {
        pendingWrites.delete(gameLogPath);
      }
    },
  );

  return currentWrite;
}

export async function appendGameLogEntry(
  entry: GameLogEntry,
): Promise<void> {
  const { gameLogPath, userRuntimeDir } = getGameLogPaths();

  await enqueueWrite(gameLogPath, async () => {
    const currentLog = await readGameLogFile(gameLogPath);
    const updatedLog = [...currentLog, entry].slice(-MAX_GAME_LOG_ENTRIES);

    await mkdir(userRuntimeDir, { recursive: true });
    await writeFile(gameLogPath, JSON.stringify(updatedLog, null, 2), "utf-8");
  });
}

export async function readGameLog(): Promise<GameLogEntry[]> {
  return readGameLogForUser(getCurrentUserStorageKey());
}

export async function readGameLogForUser(
  userStorageKey: string,
): Promise<GameLogEntry[]> {
  const { gameLogPath } = getGameLogPathsForUser(userStorageKey);
  const pendingWrite = pendingWrites.get(gameLogPath);

  if (pendingWrite) {
    await pendingWrite;
  }

  return readGameLogFile(gameLogPath);
}

export async function clearGameLog(): Promise<void> {
  return clearGameLogForUser(getCurrentUserStorageKey());
}

export async function clearGameLogForUser(
  userStorageKey: string,
): Promise<void> {
  const { gameLogPath } = getGameLogPathsForUser(userStorageKey);

  await enqueueWrite(gameLogPath, () => rm(gameLogPath, { force: true }));
}
