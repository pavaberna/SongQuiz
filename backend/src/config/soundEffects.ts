export const soundEffectFiles = {
  answer_correct: [
    "jovalasz.mp3",
    "correct.mp3",
    "tu-tu-du.mp3",
    "szia-lajos.mp3",
    "uwu.mp3",
    "thomas.mp3",
    "right.mp3",
    "dolingo.mp3",
    "yippee.mp3",
  ],
  answer_missing: [
    "nincsvalasz.mp3",
    "nincsvalasz2.mp3",
    "mav-szignal.mp3",
    "areyouthere.mp3",
  ],
  answer_partial: [
    "correct2.mp3",
    "victory.mp3",
    "bad-joke-drums.mp3",
    "undertakers.mp3",
    "meme-finales.mp3",
    "nani.mp3",
    "hehe-shampoo.mp3",
    "dexter.mp3",
    "eren.mp3",
  ],
  answer_perfect: ["tokeletesvalasz.mp3", "ding.mp3"],
  answer_wrong: [
    "rosszvalasz.mp3",
    "nemtalalt.mp3",
    "wrong.mp3",
    "tessek.mp3",
    "sadpianos.mp3",
    "huh-cat.mp3",
    "nope.mp3",
    "wrong2.mp3",
    "error.mp3",
  ],
  intro: ["intro.mp3"],
  microphone_off: ["mikrofonki.mp3"],
  microphone_on: ["mikrofonbe.mp3"],
  results: ["drum-roll.mp3"],
} as const;

export type SoundEffectKey = keyof typeof soundEffectFiles;

export const soundEffectKeys = Object.keys(
  soundEffectFiles,
) as SoundEffectKey[];

export const randomizedSoundEffectKeys: SoundEffectKey[] = [
  "answer_correct",
  "answer_missing",
  "answer_partial",
  "answer_perfect",
  "answer_wrong",
];

export function isRandomizedSoundEffectKey(key: SoundEffectKey): boolean {
  return randomizedSoundEffectKeys.includes(key);
}
