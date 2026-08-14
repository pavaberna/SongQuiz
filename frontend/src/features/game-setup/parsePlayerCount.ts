const MIN_PLAYERS = 1;
const MAX_PLAYERS = 10;

const playerCountWords: Record<string, number> = {
  agyadu: 1,
  egy: 1,
  egyedül: 1,
  egyetőr: 1,
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

const hungarianAccentReplacements: Record<string, string> = {
  á: "a",
  é: "e",
  í: "i",
  ó: "o",
  ö: "o",
  ő: "o",
  ú: "u",
  ü: "u",
  ű: "u",
};

function removeHungarianAccents(text: string): string {
  let normalizedText = text;

  for (const [accentedCharacter, plainCharacter] of Object.entries(
    hungarianAccentReplacements,
  )) {
    normalizedText = normalizedText.replaceAll(
      accentedCharacter,
      plainCharacter,
    );
  }

  return normalizedText;
}

const normalizedPlayerCountWords = Object.entries(playerCountWords).map(
  ([word, playerCount]) => [removeHungarianAccents(word), playerCount] as const,
);

function differsByAtMostOneCharacter(
  firstText: string,
  secondText: string,
): boolean {
  if (
    Math.abs(firstText.length - secondText.length) > 1 ||
    Math.min(firstText.length, secondText.length) < 4
  ) {
    return false;
  }

  if (firstText.length !== secondText.length) {
    const shorterText =
      firstText.length < secondText.length ? firstText : secondText;
    const longerText =
      firstText.length < secondText.length ? secondText : firstText;
    let shorterIndex = 0;
    let longerIndex = 0;
    let skippedCharacterCount = 0;

    while (
      shorterIndex < shorterText.length &&
      longerIndex < longerText.length
    ) {
      if (shorterText[shorterIndex] === longerText[longerIndex]) {
        shorterIndex++;
        longerIndex++;
        continue;
      }

      skippedCharacterCount++;
      longerIndex++;

      if (skippedCharacterCount > 1) {
        return false;
      }
    }

    return true;
  }

  let differentCharacterCount = 0;

  for (let index = 0; index < firstText.length; index++) {
    if (firstText[index] !== secondText[index]) {
      differentCharacterCount++;
    }

    if (differentCharacterCount > 1) {
      return false;
    }
  }

  return true;
}

export function parsePlayerCount(transcript: string): number | null {
  let normalizedTranscript = removeHungarianAccents(
    transcript.toLocaleLowerCase().trim(),
  );

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

    const wordValue = normalizedPlayerCountWords.find(
      ([numberWord]) => numberWord === word,
    )?.[1];

    if (
      wordValue !== undefined &&
      wordValue >= MIN_PLAYERS &&
      wordValue <= MAX_PLAYERS
    ) {
      return wordValue;
    }
  }

  for (const word of words) {
    const fuzzyMatch = normalizedPlayerCountWords.find(([numberWord]) =>
      differsByAtMostOneCharacter(word, numberWord),
    );

    if (
      fuzzyMatch !== undefined &&
      fuzzyMatch[1] >= MIN_PLAYERS &&
      fuzzyMatch[1] <= MAX_PLAYERS
    ) {
      return fuzzyMatch[1];
    }
  }

  return null;
}
