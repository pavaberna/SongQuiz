export type RecordAudioOptions = {
  initialSpeechTimeoutMs: number;
  maximumDurationMs: number;
  playMicrophoneOffSound?: boolean;
  signal?: AbortSignal;
  silenceAfterSpeechMs: number;
};

export type AudioRecordingResult = {
  audio: Blob | null;
  speechDetected: boolean;
};
