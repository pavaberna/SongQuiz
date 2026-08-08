import { submitAudioAnswer } from "../../api/answerApi";
import { recordAudio } from "../../audio/recordAudio";
import type { SubmitAudioAnswerResponse } from "../../types/answer";

const ANSWER_RECORDING_DURATION_MS = 8000;

export async function recordAndSubmitAnswer(
  signal?: AbortSignal,
): Promise<SubmitAudioAnswerResponse> {
  const audio = await recordAudio(ANSWER_RECORDING_DURATION_MS, signal);

  return submitAudioAnswer(audio, signal);
}
