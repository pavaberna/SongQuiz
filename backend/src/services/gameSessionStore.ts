import { mkdir, readFile, rm, writeFile } from "fs/promises";
import path from "path";
import { getCurrentUserStorageKey } from "../lib/requestContext";
import type { GameSession } from "../types/game";

function getGameSessionPaths(): {
  currentGameSessionPath: string;
  userRuntimeDir: string;
} {
  const userRuntimeDir = path.join(
    process.cwd(),
    "runtime",
    "users",
    getCurrentUserStorageKey(),
  );

  return {
    currentGameSessionPath: path.join(
      userRuntimeDir,
      "current-game-session.json",
    ),
    userRuntimeDir,
  };
}

export async function saveCurrentGameSession(
  session: GameSession,
): Promise<GameSession> {
  const { currentGameSessionPath, userRuntimeDir } = getGameSessionPaths();

  await mkdir(userRuntimeDir, { recursive: true });
  await writeFile(
    currentGameSessionPath,
    JSON.stringify(session, null, 2),
    "utf-8",
  );
  return session;
}

export async function readCurrentGameSession(): Promise<GameSession> {
  const { currentGameSessionPath } = getGameSessionPaths();
  const fileContent = await readFile(currentGameSessionPath, "utf-8");
  const session = JSON.parse(fileContent) as GameSession;

  if (!session.language) {
    session.language = "hu";
  }

  return session;
}

export async function deleteCurrentGameSession(): Promise<void> {
  const { currentGameSessionPath } = getGameSessionPaths();
  await rm(currentGameSessionPath, { force: true });
}
