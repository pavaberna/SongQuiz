import type { VoiceLineCatalog } from "./voiceTypes";

const basicOrdinals: Record<number, string> = {
  1: "Első",
  2: "Második",
  3: "Harmadik",
  4: "Negyedik",
  5: "Ötödik",
  6: "Hatodik",
  7: "Hetedik",
  8: "Nyolcadik",
  9: "Kilencedik",
  10: "Tizedik",
};

const exactTensOrdinals: Record<number, string> = {
  20: "Huszadik",
  30: "Harmincadik",
  40: "Negyvenedik",
  50: "Ötvenedik",
  60: "Hatvanadik",
  70: "Hetvenedik",
  80: "Nyolcvanadik",
  90: "Kilencvenedik",
};

const tensPrefixes: Record<number, string> = {
  20: "Huszon",
  30: "Harminc",
  40: "Negyven",
  50: "Ötven",
  60: "Hatvan",
  70: "Hetven",
  80: "Nyolcvan",
  90: "Kilencven",
};

const compoundOrdinals: Record<number, string> = {
  1: "egyedik",
  2: "kettedik",
  3: "harmadik",
  4: "negyedik",
  5: "ötödik",
  6: "hatodik",
  7: "hetedik",
  8: "nyolcadik",
  9: "kilencedik",
};

function formatHungarianOrdinal(roundNumber: number | undefined): string {
  if (
    roundNumber === undefined ||
    !Number.isInteger(roundNumber) ||
    roundNumber < 1 ||
    roundNumber > 100
  ) {
    throw new Error(`Invalid round number: ${roundNumber}.`);
  }

  if (roundNumber === 100) {
    return "Századik";
  }

  const basicOrdinal = basicOrdinals[roundNumber];

  if (basicOrdinal) {
    return basicOrdinal;
  }

  const tens = Math.floor(roundNumber / 10) * 10;
  const units = roundNumber % 10;

  if (units === 0) {
    const exactOrdinal = exactTensOrdinals[tens];

    if (!exactOrdinal) {
      throw new Error(`Unsupported round number: ${roundNumber}.`);
    }

    return exactOrdinal;
  }

  const prefix = roundNumber < 20 ? "Tizen" : tensPrefixes[tens];
  const ending = compoundOrdinals[units];

  if (!prefix || !ending) {
    throw new Error(`Unsupported round number: ${roundNumber}.`);
  }

  return `${prefix}${ending}`;
}

export const huVoiceLines: VoiceLineCatalog = {
  welcome_player_count:
    "Sziasztok! Üdvözöllek a Song Quizben! A játék kezdete előtt add meg, hányan szeretnétek játszani.",
  ask_decade: "Melyik évtizedből szeretnétek a zenéket?",
  ask_genre: "Milyen műfajból legyenek a zenék?",
  explain_rules:
    "A játék egyszerű: minden játékosnak lejátszok egy részletet egy dalból. Amikor a dal véget ért, be kell mondani az előadót és a szám címét. Ha egyik sem jó, 0 pont. Ha csak az egyik jó, 10 pont. Ha mindkettő jó, 20 pont. Ha pedig tökéletes találat van, akkor 25 pont. Készen álltok? Akkor kezdjük!",
  round_started: ({ roundNumber, playerId }) =>
    `${formatHungarianOrdinal(roundNumber)} kör, Player ${playerId}, figyelj és találd el a zenét!`,
  next_player: ({ roundNumber, playerId }) =>
    `${formatHungarianOrdinal(roundNumber)} kör, Player ${playerId}, te következel. Figyelj és találd el a zenét!`,
  answer_none_correct: ({ correctArtist, correctTitle }) =>
    `Sajnos egyik sem talált. A helyes válasz: ${correctArtist}: ${correctTitle}.`,
  answer_artist_correct: ({ correctTitle, points }) =>
    `Gratulálok, az előadót eltaláltad. A helyes számcím ${correctTitle} lett volna. Szereztél ${points} pontot.`,
  answer_title_correct: ({ correctArtist, points }) =>
    `Gratulálok, a számcímet eltaláltad. A helyes előadó ${correctArtist} lett volna. Szereztél ${points} pontot.`,
  answer_both_correct: ({ correctArtist, correctTitle, points }) =>
    `Gratulálok, a válasz helyes. ${points} pontot kapsz. A tökéletes válasz ${correctArtist}: ${correctTitle} lett volna.`,
  answer_perfect: ({ points }) =>
    `Gratulálok! Tökéletes válasz! ${points} pontot kapsz!`,
  game_summary: ({ playerScores, winnerId, winnerIds }) => {
    const scoresText = playerScores
      ?.map((player) => `Player ${player.playerId} pontja: ${player.score}`)
      .join(", ");
    const winners = winnerIds?.length ? winnerIds : winnerId ? [winnerId] : [];
    const winnerText =
      winners.length > 1
        ? `Döntetlen! A nyertesek: ${winners
            .map((id) => `Player ${id}`)
            .join(", ")}`
        : `Player ${winners[0]} nyert! Hurrá!`;

    return `A játék véget ért, ${scoresText}. ${winnerText}`;
  },
  ask_play_again: "Szeretnétek új-játékot-kezdeni?",
  game_paused: "A-játék-szünetel, folytatáshoz-csak-szólj, hogy folytassuk.",
  game_stopped: "A-játék be-lett-fejezve, új-játék-indításához csak szólj.",
  game_resumed: ({ roundNumber, playerId }) =>
    `A-játék-folytatódik. ${formatHungarianOrdinal(roundNumber)} kör, Player ${playerId} következik.`,
  restart_ask_decade:
    "Új-játék-indul. Melyik évtizedből szeretnétek a zenéket?",
  pass_hint:
    "Ha-nem-tudod a választ, akkor-csak-mondd-hogy passz vagy kihagyom.",
  setup_retry: "Nem-értettem, megismételnéd?",
};
