import type { GameLanguage } from "../types/language";
import type { StaticVoiceLineKey } from "../types/voice";
import { API_BASE_URL } from "./apiConfig";

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
