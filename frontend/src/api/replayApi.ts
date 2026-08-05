import type { ApiErrorResponse } from "../types/api";
import type { ReplayDecisionResponse } from "../types/replay";
import { API_BASE_URL } from "./apiConfig";

export async function submitReplayDecision(
  answer: string,
): Promise<ReplayDecisionResponse> {
  const url = new URL("/api/dev/replay-decision", API_BASE_URL);

  const response = await fetch(url, {
    body: JSON.stringify({ answer }),
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorData = (await response
      .json()
      .catch(() => null)) as ApiErrorResponse | null;

    throw new Error(
      errorData?.error ??
        `Submitting the replay decision failed with status ${response.status}.`,
    );
  }

  const data = (await response.json()) as ReplayDecisionResponse;

  if (
    (data.result.decision !== "replay" && data.result.decision !== "end") ||
    (data.voice.key !== "restart_ask_decade" &&
      data.voice.key !== "game_stopped")
  ) {
    throw new Error("The replay decision response is invalid.");
  }

  return data;
}
