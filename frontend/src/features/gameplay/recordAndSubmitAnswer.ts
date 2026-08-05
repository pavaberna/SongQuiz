import { submitAudioAnswer } from "../../api/answerApi";
import { recordAudio } from "../../audio/recordAudio";
import type { SubmitAudioAnswerResponse } from "../../types/answer";

const ANSWER_RECORDING_DURATION_MS = 8000;

export async function recordAndSubmitAnswer(): Promise<SubmitAudioAnswerResponse> {
  const audio = await recordAudio(ANSWER_RECORDING_DURATION_MS);

  return submitAudioAnswer(audio);
}
