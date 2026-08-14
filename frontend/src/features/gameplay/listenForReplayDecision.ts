import { submitReplayDecision } from "../../api/replayApi";
import { transcribeAudio } from "../../api/speechApi";
import { playVoiceLine } from "../../api/voiceApi";
import { recordAudio } from "../../audio/recordAudio";
import {
  INITIAL_SPEECH_TIMEOUT_MS,
  SETUP_MAXIMUM_RECORDING_MS,
  SETUP_SILENCE_AFTER_SPEECH_MS,
} from "../../config/audioRecording";
import type { GameLanguage } from "../../types/language";
import type { ReplayDecisionResponse } from "../../types/replay";
import { saveGameLogEntry } from "../../services/gameLogStore";

export async function listenForReplayDecision(
  language: GameLanguage,
  signal?: AbortSignal,
): Promise<ReplayDecisionResponse> {
  let repeatQuestion = false;

  while (true) {
    if (repeatQuestion) {
      await playVoiceLine(language, "ask_play_again", signal);
    }

    const recording = await recordAudio({
      initialSpeechTimeoutMs: INITIAL_SPEECH_TIMEOUT_MS,
      maximumDurationMs: SETUP_MAXIMUM_RECORDING_MS,
      signal,
      silenceAfterSpeechMs: SETUP_SILENCE_AFTER_SPEECH_MS,
    });

    if (!recording.speechDetected || recording.audio === null) {
      saveGameLogEntry({
        accepted: false,
        createdAt: new Date().toISOString(),
        decision: null,
        kind: "replay_decision",
        transcript: "",
      });

      repeatQuestion = true;
      continue;
    }

    const transcript = await transcribeAudio(recording.audio, {
      context: "replay_decision",
      language,
      signal,
    });

    try {
      const response = await submitReplayDecision(transcript, signal);

      return response;
    } catch (error) {
      if (signal?.aborted) {
        throw error;
      }

      saveGameLogEntry({
        accepted: false,
        createdAt: new Date().toISOString(),
        decision: null,
        kind: "replay_decision",
        transcript,
      });

      repeatQuestion = true;
    }
  }
}
