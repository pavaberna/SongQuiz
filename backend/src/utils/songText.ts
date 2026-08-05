const textSeparators = [
  ".",
  ",",
  "!",
  "?",
  ":",
  ";",
  "-",
  "_",
  "(",
  ")",
  "[",
  "]",
  "{",
  "}",
  "'",
  '"',
  "/",
  "\\",
  "|",
  "&",
  "+",
  "\n",
  "\r",
  "\t",
];

export function splitSongText(text: string): string[] {
  let normalizedText = text.toLocaleLowerCase().trim();

  for (const separator of textSeparators) {
    normalizedText = normalizedText.replaceAll(separator, " ");
  }

  return normalizedText.split(" ").filter((word) => word !== "");
}
