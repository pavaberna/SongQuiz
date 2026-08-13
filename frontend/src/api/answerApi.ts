import type { SubmitAudioAnswerResponse } from "../types/answer";
import type { ApiErrorResponse } from "../types/api";
import { API_BASE_URL } from "./apiConfig";
import { apiFetch } from "./apiFetch";

export async function submitAudioAnswer(
  audio: Blob,
  signal?: AbortSignal,
): Promise<SubmitAudioAnswerResponse> {
  const formData = new FormData();

  formData.append("audio", audio, "answer.webm");

  const url = new URL("/api/dev/submit-audio-answer", API_BASE_URL);

  const response = await apiFetch(url, {
    body: formData,
    method: "POST",
    signal,
  });

  if (!response.ok) {
    const errorData = (await response
      .json()
      .catch(() => null)) as ApiErrorResponse | null;

    throw new Error(
      errorData?.error ??
        `Submitting the audio answer failed with status ${response.status}.`,
    );
  }
  const data = (await response.json()) as SubmitAudioAnswerResponse;

  if (
    typeof data.transcript !== "string" ||
    typeof data.result?.pointsAwarded !== "number" ||
    typeof data.voice?.key !== "string"
  ) {
    throw new Error("The audio answer response is invalid.");
  }

  return data;
}

export async function submitSkippedAnswer(
  signal?: AbortSignal,
): Promise<SubmitAudioAnswerResponse> {
  const url = new URL("/api/dev/submit-answer", API_BASE_URL);
  const response = await apiFetch(url, {
    body: JSON.stringify({ answer: "pass" }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
    signal,
  });

  if (!response.ok) {
    const errorData = (await response
      .json()
      .catch(() => null)) as ApiErrorResponse | null;

    throw new Error(
      errorData?.error ??
        `Submitting the skipped answer failed with status ${response.status}.`,
    );
  }

  const data = (await response.json()) as Omit<
    SubmitAudioAnswerResponse,
    "transcript"
  >;

  if (
    typeof data.result?.pointsAwarded !== "number" ||
    typeof data.voice?.key !== "string"
  ) {
    throw new Error("The skipped answer response is invalid.");
  }

  return {
    ...data,
    transcript: "",
  };
}
