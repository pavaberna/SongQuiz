const MIN_SUPPORTED_YEAR = 1900;
const CURRENT_YEAR = new Date().getFullYear();

const decadeAliases: Record<string, string> = {
  ötvenes: "1950s",
  otvenes: "1950s",
  fifties: "1950s",

  hatvanas: "1960s",
  sixties: "1960s",

  hetvenes: "1970s",
  seventies: "1970s",

  nyolcvanas: "1980s",
  eighties: "1980s",

  kilencvenes: "1990s",
  nineties: "1990s",

  kétezres: "2000s",
  ketezres: "2000s",
  "two thousands": "2000s",

  tízes: "2010s",
  tizes: "2010s",
  "kétezer tízes": "2010s",
  "ketezer tizes": "2010s",
  "twenty tens": "2010s",

  húszas: "2020s",
  huszas: "2020s",
  "kétezer húszas": "2020s",
  "ketezer huszas": "2020s",
  twenties: "2020s",
  "twenty twenties": "2020s",

  vegyes: "mixed",
  mixed: "mixed",
};

const separators = [
  ".",
  ",",
  "!",
  "?",
  ":",
  ";",
  "-",
  "–",
  "_",
  "(",
  ")",
  "'",
  '"',
];

const decadeSuffixes = ["as", "es", "ös"];

function normalizeTranscript(transcript: string): string[] {
  let normalizedTranscript = transcript.toLocaleLowerCase().trim();

  for (const separator of separators) {
    normalizedTranscript = normalizedTranscript.replaceAll(separator, " ");
  }

  return normalizedTranscript.split(" ").filter(Boolean);
}

function convertShortDecade(shortDecade: number): string | null {
  if (shortDecade % 10 !== 0) {
    return null;
  }

  const fullDecade =
    shortDecade <= 20 ? 2000 + shortDecade : 1900 + shortDecade;

  if (fullDecade > CURRENT_YEAR) {
    return null;
  }

  return `${fullDecade}s`;
}

export function parseMusicPeriod(transcript: string): string | null {
  const words = normalizeTranscript(transcript);

  for (let index = 0; index < words.length; index++) {
    const word = words[index];
    const hasEnglishDecadeSuffix = word.endsWith("s");

    const numericText = hasEnglishDecadeSuffix ? word.slice(0, -1) : word;

    const numericValue = Number(numericText);

    if (!Number.isInteger(numericValue)) {
      continue;
    }

    const nextWord = words[index + 1];
    const hasDecadeSuffix =
      hasEnglishDecadeSuffix ||
      (nextWord !== undefined && decadeSuffixes.includes(nextWord));

    if (numericValue >= MIN_SUPPORTED_YEAR && numericValue <= CURRENT_YEAR) {
      if (hasDecadeSuffix && numericValue % 10 === 0) {
        return `${numericValue}s`;
      }

      return String(numericValue);
    }

    if (numericValue >= 0 && numericValue <= 99) {
      const transcriptOnlyContainsThisNumber = words.length === 1;

      if (!hasDecadeSuffix && !transcriptOnlyContainsThisNumber) {
        continue;
      }

      const decade = convertShortDecade(numericValue);

      if (decade !== null) {
        return decade;
      }
    }
  }

  const normalizedTranscript = words.join(" ");

  for (const [alias, period] of Object.entries(decadeAliases)) {
    if (normalizedTranscript.includes(alias)) {
      return period;
    }
  }

  return null;
}
