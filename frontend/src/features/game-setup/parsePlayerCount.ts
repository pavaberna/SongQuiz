const MIN_PLAYERS = 1;
const MAX_PLAYERS = 20;

const playerCountWords: Record<string, number> = {
  egy: 1,
  egyedül: 1,
  one: 1,
  két: 2,
  ketten: 2,
  kettő: 2,
  two: 2,
  három: 3,
  hárman: 3,
  three: 3,
  four: 4,
  négy: 4,
  négyen: 4,
  five: 5,
  öt: 5,
  öten: 5,
  hat: 6,
  hatan: 6,
  six: 6,
  hét: 7,
  heten: 7,
  seven: 7,
  eight: 8,
  nyolc: 8,
  nyolcan: 8,
  kilenc: 9,
  kilencen: 9,
  nine: 9,
  ten: 10,
  tíz: 10,
  tízen: 10,
  eleven: 11,
  tizenegy: 11,
  tizenkét: 12,
  tizenkettő: 12,
  tizenketten: 12,
  twelve: 12,
  thirteen: 13,
  tizenhárom: 13,
  tizenhárman: 13,
  fourteen: 14,
  tizennégy: 14,
  tizennégyen: 14,
  fifteen: 15,
  tizenöt: 15,
  tizenöten: 15,
  sixteen: 16,
  tizenhat: 16,
  tizenhatan: 16,
  seventeen: 17,
  tizenhét: 17,
  tizenheten: 17,
  eighteen: 18,
  tizennyolc: 18,
  tizennyolcan: 18,
  nineteen: 19,
  tizenkilenc: 19,
  tizenkilencen: 19,
  twenty: 20,
  húsz: 20,
  húszan: 20,
};

const punctuationMarks = [".", ",", "!", "?", ":", ";", "-", "(", ")"];

export function parsePlayerCount(transcript: string): number | null {
  let normalizedTranscript = transcript.toLocaleLowerCase().trim();

  for (const punctuation of punctuationMarks) {
    normalizedTranscript = normalizedTranscript.replaceAll(punctuation, " ");
  }

  const words = normalizedTranscript.split(" ").filter(Boolean);

  for (const word of words) {
    const numericValue = Number(word);

    if (
      Number.isInteger(numericValue) &&
      numericValue >= MIN_PLAYERS &&
      numericValue <= MAX_PLAYERS
    ) {
      return numericValue;
    }

    const wordValue = playerCountWords[word];

    if (wordValue !== undefined) {
      return wordValue;
    }
  }

  return null;
}
