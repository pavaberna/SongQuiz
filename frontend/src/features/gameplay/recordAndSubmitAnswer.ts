import {
  submitAudioAnswer,
  submitSkippedAnswer,
} from "../../api/answerApi";
import { recordAudio } from "../../audio/recordAudio";
import {
  ANSWER_MAXIMUM_RECORDING_MS,
  ANSWER_SILENCE_AFTER_SPEECH_MS,
  INITIAL_SPEECH_TIMEOUT_MS,
} from "../../config/audioRecording";
import type { SubmitAudioAnswerResponse } from "../../types/answer";

export async function recordAndSubmitAnswer(
  signal?: AbortSignal,
): Promise<SubmitAudioAnswerResponse> {
  const recording = await recordAudio({
    initialSpeechTimeoutMs: INITIAL_SPEECH_TIMEOUT_MS,
    maximumDurationMs: ANSWER_MAXIMUM_RECORDING_MS,
    playMicrophoneOffSound: false,
    signal,
    silenceAfterSpeechMs: ANSWER_SILENCE_AFTER_SPEECH_MS,
  });

  if (!recording.speechDetected || recording.audio === null) {
    return submitSkippedAnswer(signal);
  }

  return submitAudioAnswer(recording.audio, signal);
}
