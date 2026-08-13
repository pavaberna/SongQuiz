const MIN_SUPPORTED_YEAR = 1900;
const CURRENT_YEAR = new Date().getFullYear();

const decadeAliases: Record<string, string> = {
  harminc: "1930s",
  harmincas: "1930s",
  thirties: "1930s",
  thirty: "1930s",

  negyven: "1940s",
  negyvenes: "1940s",
  forties: "1940s",
  forty: "1940s",

  ötven: "1950s",
  ötvenes: "1950s",
  otvenes: "1950s",
  fifties: "1950s",
  fifty: "1950s",

  hatvan: "1960s",
  hatvanas: "1960s",
  sixties: "1960s",
  sixty: "1960s",

  hetven: "1970s",
  hetvenes: "1970s",
  seventies: "1970s",
  seventy: "1970s",

  nyolcvan: "1980s",
  nyolcvanas: "1980s",
  eighties: "1980s",
  eighty: "1980s",

  kilencven: "1990s",
  kilencvenes: "1990s",
  nineties: "1990s",
  ninety: "1990s",

  nulla: "2000s",
  zero: "2000s",
  kétezer: "2000s",
  kétezres: "2000s",
  ketezres: "2000s",
  "two thousand": "2000s",
  "two thousands": "2000s",

  tíz: "2010s",
  tiz: "2010s",
  tízes: "2010s",
  tizes: "2010s",
  "kétezer tíz": "2010s",
  "ketezer tiz": "2010s",
  "kétezer tízes": "2010s",
  "ketezer tizes": "2010s",
  ten: "2010s",
  "twenty tens": "2010s",

  húsz: "2020s",
  husz: "2020s",
  húszas: "2020s",
  huszas: "2020s",
  "kétezer húsz": "2020s",
  "ketezer husz": "2020s",
  "kétezer húszas": "2020s",
  "ketezer huszas": "2020s",
  twenty: "2020s",
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

const decadeSuffixes = ["as", "es", "os"];

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

function normalizeTranscript(transcript: string): string[] {
  let normalizedTranscript = removeHungarianAccents(
    transcript.toLocaleLowerCase().trim(),
  );

  for (const separator of separators) {
    normalizedTranscript = normalizedTranscript.replaceAll(separator, " ");
  }

  return normalizedTranscript
    .split(" ")
    .filter((word) => word.length > 1);
}

function differsByAtMostOneCharacter(
  firstText: string,
  secondText: string,
): boolean {
  if (Math.abs(firstText.length - secondText.length) > 1) {
    return false;
  }

  if (firstText.length === secondText.length) {
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

  const shorterText =
    firstText.length < secondText.length ? firstText : secondText;
  const longerText =
    firstText.length < secondText.length ? secondText : firstText;
  let shorterIndex = 0;
  let longerIndex = 0;
  let skippedCharacterCount = 0;

  while (shorterIndex < shorterText.length && longerIndex < longerText.length) {
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

    const isAmbiguousNumericTwoThousand =
      numericValue === 2000 && words.length === 1;

    if (isAmbiguousNumericTwoThousand) {
      return null;
    }

    const nextWord = words[index + 1];
    const hasDecadeSuffix =
      hasEnglishDecadeSuffix ||
      (nextWord !== undefined && decadeSuffixes.includes(nextWord));

    if (numericValue >= MIN_SUPPORTED_YEAR && numericValue <= CURRENT_YEAR) {
      if (numericValue % 10 === 0) {
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

  const normalizedAliases = Object.entries(decadeAliases)
    .map(([alias, period]) => ({
      alias: normalizeTranscript(alias).join(" "),
      period,
    }))
    .sort(
      (firstAlias, secondAlias) =>
        secondAlias.alias.length - firstAlias.alias.length,
    );
  const paddedTranscript = ` ${normalizedTranscript} `;

  for (const { alias, period } of normalizedAliases) {
    if (paddedTranscript.includes(` ${alias} `)) {
      return period;
    }
  }

  for (const { alias, period } of normalizedAliases) {
    if (alias.length < 5 || alias.includes(" ")) {
      continue;
    }

    if (words.some((word) => differsByAtMostOneCharacter(word, alias))) {
      return period;
    }
  }

  return null;
}
