import { transcribeAudio } from "../../api/speechApi";
import { playVoiceLine } from "../../api/voiceApi";
import { recordAudio } from "../../audio/recordAudio";
import type { AskAndTranscribeOptions } from "../../types/gameSetup";

const RECORDING_DURATION_MS = 5000;

export async function askAndTranscribe({
  language,
  onStatusChange,
  transcriptionContext,
  voiceLineKey,
}: AskAndTranscribeOptions): Promise<string> {
  onStatusChange("speaking");
  await playVoiceLine(language, voiceLineKey);

  onStatusChange("recording");
  const audio = await recordAudio(RECORDING_DURATION_MS);

  onStatusChange("transcribing");

  const transcript = await transcribeAudio(audio, {
    context: transcriptionContext,
    language,
  });

  return transcript;
}
