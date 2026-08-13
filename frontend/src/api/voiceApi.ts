import type { GameLanguage } from "../types/language";
import type { StaticVoiceLineKey, VoiceInstruction } from "../types/voice";
import { API_BASE_URL } from "./apiConfig";
import type { ApiErrorResponse } from "../types/api";
import { apiFetch } from "./apiFetch";

let activeVoiceAudio: HTMLAudioElement | null = null;
let isVoicePlaybackPaused = false;

export function pauseVoicePlayback(): void {
  isVoicePlaybackPaused = true;
  activeVoiceAudio?.pause();
}

export function resumeVoicePlayback(): void {
  isVoicePlaybackPaused = false;

  if (activeVoiceAudio !== null) {
    void activeVoiceAudio.play().catch(() => undefined);
  }
}

function playAudio(
  audio: HTMLAudioElement,
  signal?: AbortSignal,
  onCleanup?: () => void,
): Promise<void> {
  activeVoiceAudio = audio;

  return new Promise<void>((resolve, reject) => {
    function cleanup(): void {
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
      signal?.removeEventListener("abort", handleAbort);

      if (activeVoiceAudio === audio) {
        activeVoiceAudio = null;
      }

      onCleanup?.();
    }

    function handleEnded(): void {
      cleanup();
      resolve();
    }

    function handleError(): void {
      cleanup();
      reject(new Error("The voice line could not be played."));
    }

    function handleAbort(): void {
      audio.pause();
      cleanup();
      reject(new DOMException("Voice playback was cancelled.", "AbortError"));
    }

    audio.addEventListener("ended", handleEnded, { once: true });
    audio.addEventListener("error", handleError, { once: true });
    signal?.addEventListener("abort", handleAbort, { once: true });

    if (signal?.aborted) {
      handleAbort();
      return;
    }

    if (!isVoicePlaybackPaused) {
      audio.play().catch((error: unknown) => {
        cleanup();
        reject(error);
      });
    }
  });
}

export function playVoiceLine(
  language: GameLanguage,
  key: StaticVoiceLineKey,
  signal?: AbortSignal,
): Promise<void> {
  const url = new URL("/api/dev/voice-line-audio", API_BASE_URL);

  url.search = new URLSearchParams({
    key,
    language,
  }).toString();

  const audio = new Audio();
  audio.crossOrigin = "use-credentials";
  audio.src = url.toString();

  return playAudio(audio, signal);
}

export async function playVoiceInstruction(
  language: GameLanguage,
  instruction: VoiceInstruction,
  signal?: AbortSignal,
): Promise<void> {
  const url = new URL("/api/dev/voice-line-audio-preview", API_BASE_URL);

  const response = await apiFetch(url, {
    body: JSON.stringify({
      key: instruction.key,
      params: "params" in instruction ? instruction.params : undefined,
      language,
    }),
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
        `Voice line generation failed with status ${response.status}.`,
    );
  }

  const audioBlob = await response.blob();
  const audioUrl = URL.createObjectURL(audioBlob);
  const audio = new Audio(audioUrl);

  return playAudio(audio, signal, () => URL.revokeObjectURL(audioUrl));
}
