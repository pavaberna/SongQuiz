export type RecordAudioOptions = {
  initialSpeechTimeoutMs: number;
  maximumDurationMs: number;
  signal?: AbortSignal;
  silenceAfterSpeechMs: number;
};

export type AudioRecordingResult = {
  audio: Blob | null;
  speechDetected: boolean;
};
