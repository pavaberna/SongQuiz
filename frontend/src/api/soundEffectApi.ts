import type { ApiErrorResponse } from "../types/api";
import type {
  SoundEffectKey,
  SoundEffectLibrary,
  SoundEffectLibraryResponse,
} from "../types/soundEffect";
import { API_BASE_URL } from "./apiConfig";
import { apiFetch } from "./apiFetch";

export async function fetchSoundEffectFile(
  key: SoundEffectKey,
  file: string,
): Promise<Blob | null> {
  const url = new URL("/api/dev/sound-effect-audio", API_BASE_URL);

  url.search = new URLSearchParams({ file, key }).toString();

  const response = await apiFetch(url);

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

export async function fetchSoundEffectLibrary(): Promise<SoundEffectLibrary> {
  const url = new URL("/api/dev/sound-effects", API_BASE_URL);
  const response = await apiFetch(url);

  if (!response.ok) {
    const errorData = (await response
      .json()
      .catch(() => null)) as ApiErrorResponse | null;

    throw new Error(
      errorData?.error ??
        `Loading the sound effect library failed with status ${response.status}.`,
    );
  }

  const data = (await response.json()) as SoundEffectLibraryResponse;

  return data.soundEffects;
}
