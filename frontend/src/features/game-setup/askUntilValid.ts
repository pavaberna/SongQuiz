import type {
  AskUntilValidOptions,
  ValidSetupAnswer,
} from "../../types/gameSetup";
import { askAndTranscribe } from "./askAndTranscribe";

export async function askUntilValid<T>({
  language,
  onStatusChange,
  parseAnswer,
  signal,
  transcriptionContext,
  voiceLineKey,
}: AskUntilValidOptions<T>): Promise<ValidSetupAnswer<T>> {
  let currentVoiceLineKey = voiceLineKey;

  while (true) {
    const transcript = await askAndTranscribe({
      language,
      onStatusChange,
      signal,
      transcriptionContext,
      voiceLineKey: currentVoiceLineKey,
    });

    const value = parseAnswer(transcript);

    if (value !== null) {
      return {
        transcript,
        value,
      };
    }

    currentVoiceLineKey = "setup_retry";
  }
}
