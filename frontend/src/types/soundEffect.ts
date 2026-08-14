export type SoundEffectKey =
  | "answer_correct"
  | "answer_missing"
  | "answer_partial"
  | "answer_perfect"
  | "answer_wrong"
  | "intro"
  | "microphone_off"
  | "microphone_on"
  | "results";

export type SoundEffectOptions = {
  loop?: boolean;
  maximumDurationMs?: number;
  signal?: AbortSignal;
  volume?: number;
};

export type SoundEffectLibrary = Record<SoundEffectKey, string[]>;

export type SoundEffectLibraryResponse = {
  soundEffects: SoundEffectLibrary;
};
