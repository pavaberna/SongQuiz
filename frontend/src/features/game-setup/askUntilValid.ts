import type {
  AskUntilValidOptions,
  ValidSetupAnswer,
} from "../../types/gameSetup";
import { askAndTranscribe } from "./askAndTranscribe";
import { saveGameLogEntry } from "../../services/gameLogStore";

export async function askUntilValid<T extends number | string>({
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

    if (transcript === null) {
      saveGameLogEntry({
        accepted: false,
        context: transcriptionContext,
        createdAt: new Date().toISOString(),
        kind: "setup_transcript",
        parsedValue: null,
        transcript: "",
      });

      currentVoiceLineKey = voiceLineKey;
      continue;
    }

    const value = parseAnswer(transcript);

    if (value !== null) {
      return {
        transcript,
        value,
      };
    }

    saveGameLogEntry({
      accepted: false,
      context: transcriptionContext,
      createdAt: new Date().toISOString(),
      kind: "setup_transcript",
      parsedValue: null,
      transcript,
    });

    currentVoiceLineKey = "setup_retry";
  }
}
