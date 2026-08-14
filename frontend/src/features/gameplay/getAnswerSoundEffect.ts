import type { SubmitAudioAnswerResponse } from "../../types/answer";
import type { SoundEffectKey } from "../../types/soundEffect";

export function getAnswerSoundEffect(
  response: SubmitAudioAnswerResponse,
): SoundEffectKey {
  if (response.transcript.trim() === "") {
    return "answer_missing";
  }

  if (response.result.pointsAwarded === 25) {
    return "answer_perfect";
  }

  if (response.result.pointsAwarded === 20) {
    return "answer_correct";
  }

  if (response.result.pointsAwarded === 10) {
    return "answer_partial";
  }

  return "answer_wrong";
}
