import type { ApiErrorResponse } from "../types/api";
import type {
  TranscribeAudioOptions,
  TranscriptionResponse,
} from "../types/speech";
import { API_BASE_URL } from "./apiConfig";

export async function transcribeAudio(
  audio: Blob,
  options: TranscribeAudioOptions,
): Promise<string> {
  const formData = new FormData();

  formData.append("audio", audio, "recording.webm");
  formData.append("context", options.context);
  formData.append("language", options.language);

  const url = new URL("/api/dev/transcribe-audio", API_BASE_URL);

  const response = await fetch(url, {
    body: formData,
    method: "POST",
    signal: options.signal,
  });

  if (!response.ok) {
    const errorData = (await response
      .json()
      .catch(() => null)) as ApiErrorResponse | null;
    throw new Error(
      errorData?.error ??
        `Transcription failed with status ${response.status}.`,
    );
  }

  const data = (await response.json()) as TranscriptionResponse;

  if (typeof data.text !== "string") {
    throw new Error("The transcription response is invalid.");
  }

  return data.text;
}
