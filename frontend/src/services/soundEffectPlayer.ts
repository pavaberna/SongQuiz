import {
  fetchSoundEffectFile,
  fetchSoundEffectLibrary,
} from "../api/soundEffectApi";
import type {
  SoundEffectKey,
  SoundEffectLibrary,
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

const activeSounds = new Set<ActiveSound>();
const previousSoundUrlByKey = new Map<SoundEffectKey, string>();
const SILENT_AUDIO_SOURCE =
  "data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQIAAAAAAA==";

let foregroundAudio: HTMLAudioElement | null = null;
let introAudio: HTMLAudioElement | null = null;
let isSoundPlaybackPaused = false;
let soundLibraryPromise: Promise<SoundEffectLibrary> | null = null;

function createAudioElement(): HTMLAudioElement {
  const audio = new Audio();

  audio.preload = "auto";

  return audio;
}

function getForegroundAudio(): HTMLAudioElement {
  foregroundAudio ??= createAudioElement();

  return foregroundAudio;
}

function getIntroAudio(): HTMLAudioElement {
  introAudio ??= createAudioElement();

  return introAudio;
}

function getAudioElement(key: SoundEffectKey): HTMLAudioElement {
  return key === "intro" ? getIntroAudio() : getForegroundAudio();
}

function unlockAudioElement(audio: HTMLAudioElement): void {
  if (!audio.paused) {
    return;
  }

  audio.src = SILENT_AUDIO_SOURCE;
  audio.load();

  void audio
    .play()
    .then(() => {
      if (audio.getAttribute("src") !== SILENT_AUDIO_SOURCE) {
        return;
      }

      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    })
    .catch((error: unknown) => {
      console.error("Failed to unlock sound effect playback.", error);
    });
}

export function unlockSoundEffectPlayback(): void {
  unlockAudioElement(getForegroundAudio());
  unlockAudioElement(getIntroAudio());
}

async function loadSoundEffectLibrary(): Promise<SoundEffectLibrary> {
  const manifest = await fetchSoundEffectLibrary();
  const loadedUrls: string[] = [];

  try {
    const entries = await Promise.all(
      (Object.entries(manifest) as [SoundEffectKey, string[]][]).map(
        async ([key, files]) => {
          const urls = await Promise.all(
            files.map(async (file) => {
              try {
                const audio = await fetchSoundEffectFile(key, file);

                if (audio === null) {
                  return null;
                }

                const url = URL.createObjectURL(audio);

                loadedUrls.push(url);

                return url;
              } catch (error) {
                console.error(
                  `Failed to preload the ${file} sound effect.`,
                  error,
                );
                return null;
              }
            }),
          );

          return [key, urls.filter((url) => url !== null)] as const;
        },
      ),
    );

    return Object.fromEntries(entries) as SoundEffectLibrary;
  } catch (error) {
    loadedUrls.forEach((url) => URL.revokeObjectURL(url));
    throw error;
  }
}

function getSoundEffectLibrary(): Promise<SoundEffectLibrary> {
  soundLibraryPromise ??= loadSoundEffectLibrary().catch((error: unknown) => {
    soundLibraryPromise = null;
    throw error;
  });

  return soundLibraryPromise;
}

function selectSoundUrl(key: SoundEffectKey, urls: string[]): string | null {
  if (urls.length === 0) {
    return null;
  }

  if (!key.startsWith("answer_") || urls.length === 1) {
    return urls[0];
  }

  const previousUrl = previousSoundUrlByKey.get(key);
  const availableUrls = urls.filter((url) => url !== previousUrl);
  const selectedUrl =
    availableUrls[Math.floor(Math.random() * availableUrls.length)];

  previousSoundUrlByKey.set(key, selectedUrl);

  return selectedUrl;
}

async function getSoundSource(key: SoundEffectKey): Promise<SoundSource> {
  const library = await getSoundEffectLibrary();

  return {
    release: () => undefined,
    url: selectSoundUrl(key, library[key]),
  };
}

export async function preloadSoundEffects(): Promise<void> {
  await getSoundEffectLibrary();
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

  const audio = getAudioElement(key);

  for (const activeSound of [...activeSounds]) {
    if (activeSound.audio === audio) {
      activeSound.stop();
    }
  }

  audio.src = source.url;
  audio.load();
  audio.loop = loop;
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

      if (audio.getAttribute("src") === source.url) {
        audio.removeAttribute("src");
        audio.load();
      }

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
