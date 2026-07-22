import { mkdir, readFile, rm, writeFile } from "fs/promises";
import path from "path";
import type { GameSession } from "../types/game";

const runtimeDir = path.join(process.cwd(), "runtime");
const currentGameSessionPath = path.join(
  runtimeDir,
  "current-game-session.json",
);

export async function saveCurrentGameSession(
  session: GameSession,
): Promise<GameSession> {
  await mkdir(runtimeDir, { recursive: true });
  await writeFile(
    currentGameSessionPath,
    JSON.stringify(session, null, 2),
    "utf-8",
  );
  return session;
}

export async function readCurrentGameSession(): Promise<GameSession> {
  const fileContent = await readFile(currentGameSessionPath, "utf-8");
  return JSON.parse(fileContent) as GameSession;
}

export async function deleteCurrentGameSession(): Promise<void> {
  await rm(currentGameSessionPath, { force: true });
}
