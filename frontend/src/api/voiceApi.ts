import type { GameLanguage } from "../types/language";
import type { StaticVoiceLineKey, VoiceInstruction } from "../types/voice";
import { API_BASE_URL } from "./apiConfig";
import type { ApiErrorResponse } from "../types/api";

export function playVoiceLine(
  language: GameLanguage,
  key: StaticVoiceLineKey,
): Promise<void> {
  const url = new URL("/api/dev/voice-line-audio", API_BASE_URL);

  url.search = new URLSearchParams({
    key,
    language,
  }).toString();

  const audio = new Audio(url.toString());

  return new Promise<void>((resolve, reject) => {
    audio.addEventListener("ended", () => resolve(), { once: true });

    audio.addEventListener(
      "error",
      () => reject(new Error("The voice line could not be played.")),
      { once: true },
    );

    audio.play().catch(reject);
  });
}

export async function playVoiceInstruction(
  language: GameLanguage,
  instruction: VoiceInstruction,
): Promise<void> {
  const url = new URL("/api/dev/voice-line-audio-preview", API_BASE_URL);

  const response = await fetch(url, {
    body: JSON.stringify({
      key: instruction.key,
      params: "params" in instruction ? instruction.params : undefined,
      language,
    }),
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
        `Voice line generation failed with status ${response.status}.`,
    );
  }

  const audioBlob = await response.blob();
  const audioUrl = URL.createObjectURL(audioBlob);
  const audio = new Audio(audioUrl);

  return new Promise<void>((resolve, reject) => {
    audio.addEventListener(
      "ended",
      () => {
        URL.revokeObjectURL(audioUrl);
        resolve();
      },
      { once: true },
    );

    audio.addEventListener(
      "error",
      () => {
        URL.revokeObjectURL(audioUrl);
        reject(new Error("The voice instruction could not be played."));
      },
      { once: true },
    );
    audio.play().catch((error) => {
      URL.revokeObjectURL(audioUrl);
      reject(error);
    });
  });
}
