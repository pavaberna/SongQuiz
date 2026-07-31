import type { GameLanguage } from "../types/language";
import type { TranscriptionContext } from "../types/speech";

const transcriptionPrompts: Record<
  GameLanguage,
  Record<TranscriptionContext, string>
> = {
  en: {
    command:
      "Song Quiz voice command. Expected words include Arise, pause, resume, finish, and end game.",
    decade:
      "Song Quiz setup. The speaker names a music decade, such as eighties, nineties, two thousands, twenty tens, or mixed.",
    genre:
      "Song Quiz setup. The speaker names a music genre, such as pop, rock, hip-hop, rap, electronic, jazz, metal, or classical.",
    player_count:
      "Song Quiz setup. The speaker says a player count between one and twenty.",
    song_answer:
      "Song Quiz answer. The speaker may name a music artist and a song title. Preserve names and titles accurately.",
  },
  hu: {
    command:
      "Song Quiz hangparancs. Várható szavak: Arise, szünet, folytatás, folytasd és befejezés.",
    decade:
      "Song Quiz beállítás. A beszélő zenei évtizedet mond, például nyolcvanas, kilencvenes, kétezres, kétezer-tízes évek vagy vegyes.",
    genre:
      "Song Quiz beállítás. A beszélő zenei műfajt mond, például pop, rock, hiphop, rap, elektronikus zene, jazz, metal vagy klasszikus zene.",
    player_count:
      "Song Quiz beállítás. A beszélő egy és húsz közötti játékosszámot mond.",
    song_answer:
      "Song Quiz megfejtés. A beszélő egy zenei előadót és egy dalcímet mondhat. Az előadó- és dalcímneveket pontosan írd át.",
  },
};

export function getTranscriptionPrompt(
  language: GameLanguage,
  context: TranscriptionContext,
): string {
  return transcriptionPrompts[language][context];
}
