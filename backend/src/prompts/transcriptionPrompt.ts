import type { GameLanguage } from "../types/language";
import type { TranscriptionContext } from "../types/speech";

const transcriptionPrompts: Record<
  GameLanguage,
  Record<TranscriptionContext, string>
> = {
  en: {
    decade:
      "Song Quiz setup. The speaker names a music decade or year, such as ten, twenty, 2000, 2010, 2020, eighties, nineties, two thousands, twenty tens, or mixed. Transcribe the number exactly as spoken.",
    genre:
      "Song Quiz setup. The speaker names one or more music genres, such as pop, rock, hip-hop, rap, electronic, jazz, metal, or classical. They may also request any genre with words such as all, any, anything, mixed, or random. Preserve every spoken genre or unrestricted-genre phrase and separate multiple genres with commas.",
    player_count:
      "Song Quiz player count. Possible answers include: alone, one, two, three, four, five, six, seven, eight, nine, ten, up to twenty.",
    song_answer:
      "Song Quiz answer. The speaker may say a music artist and song title in Hungarian or English. Preserve foreign names and English song titles in their original language. Do not rewrite them as similar-sounding words from another language.",
    replay_decision:
      "Song Quiz replay decision. The speaker answers whether they want another game. Expected words include yes, yeah, no, and nope.",
  },
  hu: {
    decade:
      "Song Quiz zenei időszak. Lehetséges válaszok: nyolcvanas, kilencvenes, kétezres, kétezer, kétezer tíz, kétezer húsz, kétezer huszonöt, tízes, húszas vagy vegyes. A kétezer és a kétezer húsz két különböző válasz; a húsz szót ne hagyd el.",
    genre:
      "Song Quiz beállítás. A beszélő egy vagy több zenei műfajt mond, például pop, rock, hiphop, rap, elektronikus zene, jazz, metal vagy klasszikus zene. Azt is mondhatja, hogy minden, bármi, mindegy, összes, vegyes vagy akármi. Minden elhangzó műfajt vagy korlátozás nélküli választ őrizz meg, és több műfajt vesszővel válassz el.",
    player_count:
      "Song Quiz játékosszám. Lehetséges válaszok: egyedül, egy, ketten, kettő, hárman, három, négyen, négy, öten, öt, és így tovább húszig.",
    song_answer:
      "Song Quiz megfejtés. A beszélő magyar vagy angol nyelvű előadót és dalcímet mondhat. Az idegen neveket és az angol dalcímeket az eredeti nyelvükön írd át. Ne alakítsd őket hasonló hangzású magyar szavakká vagy mondattá.",
    replay_decision:
      "Song Quiz újrajátszási döntés. A beszélő arra válaszol, hogy szeretne-e új játékot. Várható szavak: igen, persze és nem.",
  },
};

export function getTranscriptionPrompt(
  language: GameLanguage,
  context: TranscriptionContext,
): string {
  return transcriptionPrompts[language][context];
}
