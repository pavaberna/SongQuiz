export function parseTextAnswer(transcript: string): string | null {
  const trimmedTranscript = transcript.trim();

  if (trimmedTranscript === "") {
    return null;
  }

  return trimmedTranscript;
}
