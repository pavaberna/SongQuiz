import { fetchSoundEffect } from "../api/soundEffectApi";
import type {
  SoundEffectKey,
  SoundEffectOptions,
} from "../types/soundEffect";

type ActiveSound = {
  audio: HTMLAudioElement;
  key: SoundEffectKey;
  stop: () => void;
};

type SoundSource = {
  release: () => void;
  url: string | null;
};

const soundUrls = new Map<SoundEffectKey, Promise<string | null>>();
const activeSounds = new Set<ActiveSound>();
let isSoundPlaybackPaused = false;

function isRandomizedSoundEffect(key: SoundEffectKey): boolean {
  return key.startsWith("answer_");
}

function getCachedSoundUrl(key: SoundEffectKey): Promise<string | null> {
  const cachedUrl = soundUrls.get(key);

  if (cachedUrl) {
    return cachedUrl;
  }

  const urlPromise = fetchSoundEffect(key)
    .then((audio) => (audio === null ? null : URL.createObjectURL(audio)))
    .catch((error: unknown) => {
      soundUrls.delete(key);
      throw error;
    });

  soundUrls.set(key, urlPromise);

  return urlPromise;
}

async function getSoundSource(key: SoundEffectKey): Promise<SoundSource> {
  if (isRandomizedSoundEffect(key)) {
    const audio = await fetchSoundEffect(key, true);
    const url = audio === null ? null : URL.createObjectURL(audio);

    return {
      release: () => {
        if (url !== null) {
          URL.revokeObjectURL(url);
        }
      },
      url,
    };
  }

  return {
    release: () => undefined,
    url: await getCachedSoundUrl(key),
  };
}

export async function preloadSoundEffects(
  keys: SoundEffectKey[],
): Promise<void> {
  await Promise.allSettled(
    keys
      .filter((key) => !isRandomizedSoundEffect(key))
      .map((key) => getCachedSoundUrl(key)),
  );
}

export async function playSoundEffect(
  key: SoundEffectKey,
  options: SoundEffectOptions = {},
): Promise<void> {
  const { loop = false, maximumDurationMs, signal, volume = 1 } = options;
  const source = await getSoundSource(key);

  if (signal?.aborted) {
    source.release();
    throw new DOMException("Sound effect playback was cancelled.", "AbortError");
  }

  if (source.url === null) {
    source.release();
    return;
  }

  const audio = new Audio(source.url);

  audio.loop = loop;
  audio.preload = "auto";
  audio.volume = Math.min(1, Math.max(0, volume));

  return new Promise<void>((resolve, reject) => {
    let finished = false;
    let maximumDurationTimer: number | undefined;

    function cleanup(): void {
      if (maximumDurationTimer !== undefined) {
        window.clearTimeout(maximumDurationTimer);
      }

      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
      signal?.removeEventListener("abort", handleAbort);
      activeSounds.delete(activeSound);
      source.release();
    }

    function finish(callback: () => void): void {
      if (finished) {
        return;
      }

      finished = true;
      cleanup();
      callback();
    }

    function handleEnded(): void {
      finish(resolve);
    }

    function handleError(): void {
      finish(() => reject(new Error(`The ${key} sound effect could not be played.`)));
    }

    function handleAbort(): void {
      audio.pause();
      finish(() =>
        reject(
          new DOMException(
            "Sound effect playback was cancelled.",
            "AbortError",
          ),
        ),
      );
    }

    function stop(): void {
      audio.pause();
      audio.currentTime = 0;
      finish(resolve);
    }

    const activeSound: ActiveSound = { audio, key, stop };

    activeSounds.add(activeSound);
    audio.addEventListener("ended", handleEnded, { once: true });
    audio.addEventListener("error", handleError, { once: true });
    signal?.addEventListener("abort", handleAbort, { once: true });

    if (maximumDurationMs !== undefined && maximumDurationMs > 0) {
      maximumDurationTimer = window.setTimeout(stop, maximumDurationMs);
    }

    if (!isSoundPlaybackPaused) {
      void audio.play().catch((error: unknown) => {
        finish(() => reject(error));
      });
    }
  });
}

export async function playSoundEffectSafely(
  key: SoundEffectKey,
  options: SoundEffectOptions = {},
): Promise<void> {
  try {
    await playSoundEffect(key, options);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw error;
    }

    console.error(`Failed to play the ${key} sound effect.`, error);
  }
}

export function pauseSoundEffects(): void {
  isSoundPlaybackPaused = true;

  for (const sound of activeSounds) {
    sound.audio.pause();
  }
}

export function resumeSoundEffects(): void {
  isSoundPlaybackPaused = false;

  for (const sound of activeSounds) {
    void sound.audio.play().catch(() => undefined);
  }
}

export function stopSoundEffects(): void {
  isSoundPlaybackPaused = false;

  for (const sound of [...activeSounds]) {
    sound.stop();
  }
}
