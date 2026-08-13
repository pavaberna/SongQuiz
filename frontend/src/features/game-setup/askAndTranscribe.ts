import { transcribeAudio } from "../../api/speechApi";
import { playVoiceLine } from "../../api/voiceApi";
import { recordAudio } from "../../audio/recordAudio";
import {
  INITIAL_SPEECH_TIMEOUT_MS,
  SETUP_MAXIMUM_RECORDING_MS,
  SETUP_SILENCE_AFTER_SPEECH_MS,
} from "../../config/audioRecording";
import type { AskAndTranscribeOptions } from "../../types/gameSetup";

export async function askAndTranscribe({
  language,
  onStatusChange,
  signal,
  transcriptionContext,
  voiceLineKey,
}: AskAndTranscribeOptions): Promise<string | null> {
  onStatusChange("speaking");
  await playVoiceLine(language, voiceLineKey, signal);

  onStatusChange("recording");
  const recording = await recordAudio({
    initialSpeechTimeoutMs: INITIAL_SPEECH_TIMEOUT_MS,
    maximumDurationMs: SETUP_MAXIMUM_RECORDING_MS,
    signal,
    silenceAfterSpeechMs: SETUP_SILENCE_AFTER_SPEECH_MS,
  });

  if (!recording.speechDetected || recording.audio === null) {
    return null;
  }

  onStatusChange("transcribing");

  const transcript = await transcribeAudio(recording.audio, {
    context: transcriptionContext,
    language,
    signal,
  });

  return transcript;
}
