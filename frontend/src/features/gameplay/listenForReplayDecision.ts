import { submitReplayDecision } from "../../api/replayApi";
import { transcribeAudio } from "../../api/speechApi";
import { recordAudio } from "../../audio/recordAudio";
import type { GameLanguage } from "../../types/language";
import type { ReplayDecisionResponse } from "../../types/replay";

const REPLAY_RECORDING_DURATION_MS = 5000;

export async function listenForReplayDecision(
  language: GameLanguage,
): Promise<ReplayDecisionResponse> {
  const audio = await recordAudio(REPLAY_RECORDING_DURATION_MS);

  const transcript = await transcribeAudio(audio, {
    context: "replay_decision",
    language,
  });

  const response = await submitReplayDecision(transcript);

  return response;
}
