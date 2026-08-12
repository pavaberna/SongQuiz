import { transcribeAudio } from "../../api/speechApi";
import { playVoiceLine } from "../../api/voiceApi";
import { recordAudio } from "../../audio/recordAudio";
import type { AskAndTranscribeOptions } from "../../types/gameSetup";

const RECORDING_DURATION_MS = 5000;

export async function askAndTranscribe({
  language,
  onStatusChange,
  signal,
  transcriptionContext,
  voiceLineKey,
}: AskAndTranscribeOptions): Promise<string> {
  onStatusChange("speaking");
  await playVoiceLine(language, voiceLineKey, signal);

  onStatusChange("recording");
  const audio = await recordAudio(RECORDING_DURATION_MS, signal);

  onStatusChange("transcribing");

  const transcript = await transcribeAudio(audio, {
    context: transcriptionContext,
    language,
    signal,
  });

  return transcript;
}
