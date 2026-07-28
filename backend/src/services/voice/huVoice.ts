import type { VoiceLineCatalog } from "./voiceTypes";

export const huVoiceLines: VoiceLineCatalog = {
  welcome_player_count:
    "Sziasztok! Üdvözöllek a Song Quizben! A játék kezdete előtt add meg, hányan szeretnétek játszani.",
  ask_decade: "Melyik évtizedből szeretnétek a zenéket?",
  ask_genre: "Milyen műfajból legyenek a zenék?",
  explain_rules:
    "A játék egyszerű: minden játékosnak lejátszok egy részletet egy dalból. Amikor a dal véget ért, be kell mondani az előadót és a szám címét. Ha egyik sem jó, 0 pont. Ha csak az egyik jó, 10 pont. Ha mindkettő jó, 20 pont. Ha pedig tökéletes találat van, akkor 25 pont. Készen álltok? Akkor kezdjük!",
  round_started: ({ roundNumber, playerId }) =>
    `${roundNumber}. kör, Player ${playerId}, figyelj és találd el a zenét!`,
  next_player: ({ roundNumber, playerId }) =>
    `${roundNumber}. kör, Player ${playerId}, te következel. Figyelj és találd el a zenét!`,
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
  ask_play_again: "Szeretnétek új játékot kezdeni?",
  game_paused: "A játék szünetel, folytatáshoz csak szólj, hogy folytassuk.",
  game_stopped: "A játék be lett fejezve, új játék indításához csak szólj.",
  game_resumed: ({ roundNumber, playerId }) =>
    `A játék folytatódik. ${roundNumber}. kör, Player ${playerId} következik.`,
  restart_ask_decade:
    "Új játék indul. Melyik évtizedből szeretnétek a zenéket?",
  pass_hint:
    "Ha nem tudod a választ, akkor csak mondd, hogy passz vagy kihagyom.",
};
