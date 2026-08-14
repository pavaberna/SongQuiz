import { SPEECH_LEVEL_THRESHOLD } from "../config/audioRecording";
import type {
  AudioRecordingResult,
  RecordAudioOptions,
} from "../types/audio";
import { playSoundEffectSafely } from "../services/soundEffectPlayer";

const AUDIO_MIME_TYPE = "audio/webm";
let recordingAudioContext: AudioContext | null = null;

function getRecordingAudioContext(): AudioContext {
  if (
    recordingAudioContext === null ||
    recordingAudioContext.state === "closed"
  ) {
    recordingAudioContext = new AudioContext();
  }

  return recordingAudioContext;
}

export function unlockAudioRecording(): void {
  const audioContext = getRecordingAudioContext();

  if (audioContext.state === "suspended") {
    void audioContext.resume().catch(() => undefined);
  }
}

export async function recordAudio(
  options: RecordAudioOptions,
): Promise<AudioRecordingResult> {
  const {
    initialSpeechTimeoutMs,
    maximumDurationMs,
    playMicrophoneOffSound = true,
    signal,
    silenceAfterSpeechMs,
  } = options;

  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Audio recording is not supported by this browser.");
  }

  if (
    typeof MediaRecorder === "undefined" ||
    !MediaRecorder.isTypeSupported(AUDIO_MIME_TYPE)
  ) {
    throw new Error("WebM audio recording is not supported.");
  }

  if (signal?.aborted) {
    throw new Error("Audio recording was cancelled.");
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: true,
  });

  try {
    await playSoundEffectSafely("microphone_on", { signal });

    const chunks: Blob[] = [];
    const recorder = new MediaRecorder(stream, {
      mimeType: AUDIO_MIME_TYPE,
    });
    const audioContext = getRecordingAudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    const audioSamples = new Uint8Array(analyser.fftSize);

    source.connect(analyser);

    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }

    return await new Promise<AudioRecordingResult>((resolve, reject) => {
      let animationFrameId: number | null = null;
      let speechDetected = false;
      let lastSpeechAt: number | null = null;
      const recordingStartedAt = performance.now();

      function stopRecorder(): void {
        if (recorder.state !== "inactive") {
          recorder.stop();
        }
      }

      function handleAbort(): void {
        stopRecorder();
      }

      function cleanUp(): void {
        if (animationFrameId !== null) {
          window.cancelAnimationFrame(animationFrameId);
        }

        signal?.removeEventListener("abort", handleAbort);
        source.disconnect();
        analyser.disconnect();
      }

      function getCurrentAudioLevel(): number {
        analyser.getByteTimeDomainData(audioSamples);

        let squaredSampleTotal = 0;

        for (const sample of audioSamples) {
          const centeredSample = (sample - 128) / 128;
          squaredSampleTotal += centeredSample * centeredSample;
        }

        return Math.sqrt(squaredSampleTotal / audioSamples.length);
      }

      function monitorAudio(): void {
        const currentTime = performance.now();
        const elapsedTime = currentTime - recordingStartedAt;
        const currentAudioLevel = getCurrentAudioLevel();

        if (currentAudioLevel >= SPEECH_LEVEL_THRESHOLD) {
          speechDetected = true;
          lastSpeechAt = currentTime;
        }

        const initialSpeechTimeExpired =
          !speechDetected && elapsedTime >= initialSpeechTimeoutMs;
        const silenceAfterSpeechExpired =
          speechDetected &&
          lastSpeechAt !== null &&
          currentTime - lastSpeechAt >= silenceAfterSpeechMs;
        const maximumDurationExpired = elapsedTime >= maximumDurationMs;

        if (
          initialSpeechTimeExpired ||
          silenceAfterSpeechExpired ||
          maximumDurationExpired
        ) {
          stopRecorder();
          return;
        }

        animationFrameId = window.requestAnimationFrame(monitorAudio);
      }

      recorder.addEventListener("dataavailable", (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      });

      recorder.addEventListener(
        "stop",
        () => {
          cleanUp();

          if (signal?.aborted) {
            reject(new Error("Audio recording was cancelled."));
            return;
          }

          if (!speechDetected) {
            resolve({ audio: null, speechDetected: false });
            return;
          }

          if (chunks.length === 0) {
            reject(new Error("No audio was recorded."));
            return;
          }

          resolve({
            audio: new Blob(chunks, { type: AUDIO_MIME_TYPE }),
            speechDetected: true,
          });
        },
        { once: true },
      );

      recorder.addEventListener(
        "error",
        () => {
          cleanUp();
          reject(new Error("Audio recording failed."));
        },
        { once: true },
      );

      recorder.start();
      animationFrameId = window.requestAnimationFrame(monitorAudio);

      signal?.addEventListener("abort", handleAbort, {
        once: true,
      });

      if (signal?.aborted) {
        handleAbort();
        return;
      }
    });
  } finally {
    stream.getTracks().forEach((track) => track.stop());

    if (playMicrophoneOffSound) {
      await playSoundEffectSafely("microphone_off");
    }
  }
}
