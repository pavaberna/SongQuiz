import type { ApiErrorResponse } from "../types/api";
import type {
  GameCommand,
  GameCommandResponse,
} from "../types/gameCommand";
import { API_BASE_URL } from "./apiConfig";

export async function sendGameCommand(
  command: GameCommand,
): Promise<GameCommandResponse> {
  const url = new URL("/api/dev/game-command", API_BASE_URL);

  const response = await fetch(url, {
    body: JSON.stringify({ command }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    const errorData = (await response
      .json()
      .catch(() => null)) as ApiErrorResponse | null;

    throw new Error(
      errorData?.error ??
        `Game command failed with status ${response.status}.`,
    );
  }

  return (await response.json()) as GameCommandResponse;
}
