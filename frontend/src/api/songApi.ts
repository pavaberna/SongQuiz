import type { ApiErrorResponse } from "../types/api";
import type { GenerateSongRequest, GenerateSongResponse } from "../types/song";
import { API_BASE_URL } from "./apiConfig";
import { apiFetch } from "./apiFetch";

export async function generateSongs(
  request: GenerateSongRequest,
  signal?: AbortSignal,
): Promise<GenerateSongResponse> {
  const url = new URL("/api/dev/gemini-songs", API_BASE_URL);

  const response = await apiFetch(url, {
    body: JSON.stringify(request),
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
        `Song generation failed with status ${response.status}.`,
    );
  }

  const data = (await response.json()) as GenerateSongResponse;

  if (typeof data.count !== "number" || typeof data.file !== "string") {
    throw new Error("The song generation response is invalid.");
  }

  return data;
}
