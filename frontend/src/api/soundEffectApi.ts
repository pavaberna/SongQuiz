import type { ApiErrorResponse } from "../types/api";
import type { SoundEffectKey } from "../types/soundEffect";
import { API_BASE_URL } from "./apiConfig";
import { apiFetch } from "./apiFetch";

export async function fetchSoundEffect(
  key: SoundEffectKey,
  bypassCache = false,
): Promise<Blob | null> {
  const url = new URL("/api/dev/sound-effect-audio", API_BASE_URL);

  url.search = new URLSearchParams({ key }).toString();

  const response = await apiFetch(url, {
    cache: bypassCache ? "no-store" : "default",
  });

  if (response.status === 204) {
    return null;
  }

  if (!response.ok) {
    const errorData = (await response
      .json()
      .catch(() => null)) as ApiErrorResponse | null;

    throw new Error(
      errorData?.error ??
        `Loading the sound effect failed with status ${response.status}.`,
    );
  }

  return response.blob();
}
