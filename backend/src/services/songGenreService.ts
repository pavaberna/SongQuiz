const genreSeparators = [",", ";", " es ", " és ", " and ", " + "];
const anyGenreWords = new Set([
  "akarmi",
  "akármi",
  "all",
  "any",
  "anything",
  "barmi",
  "barmilyen",
  "bármi",
  "bármilyen",
  "everything",
  "mindegy",
  "minden",
  "mindenfele",
  "mindenféle",
  "mixed",
  "osszes",
  "összes",
  "random",
  "vegyes",
]);

function normalizeGenre(genre: string): string {
  return genre
    .trim()
    .toLocaleLowerCase("hu-HU")
    .replaceAll(".", "")
    .replaceAll("!", "")
    .replaceAll("?", "")
    .replaceAll("-", "")
    .replaceAll("_", "")
    .replaceAll(" ", "");
}

export function isAnyGenreRequest(genreInput: string): boolean {
  const normalizedInput = genreInput
    .trim()
    .toLocaleLowerCase("hu-HU")
    .replaceAll(".", " ")
    .replaceAll(",", " ")
    .replaceAll(";", " ")
    .replaceAll("!", " ")
    .replaceAll("?", " ")
    .replaceAll("-", " ")
    .replaceAll("_", " ");
  const words = normalizedInput.split(" ").filter(Boolean);

  return words.some((word) => anyGenreWords.has(word));
}

export function getRequestedGenres(genreInput: string): string[] {
  if (isAnyGenreRequest(genreInput)) {
    return [];
  }

  let separatedGenres = ` ${genreInput.trim().toLocaleLowerCase("hu-HU")} `;

  for (const separator of genreSeparators) {
    separatedGenres = separatedGenres.replaceAll(separator, "|");
  }

  const genres = separatedGenres
    .split("|")
    .map((genre) =>
      genre
        .trim()
        .replaceAll(".", "")
        .replaceAll("!", "")
        .replaceAll("?", ""),
    )
    .filter((genre) => genre.length > 0);

  return [...new Set(genres)];
}

export function matchesEveryRequestedGenre(
  songGenres: string[],
  requestedGenres: string[],
): boolean {
  const normalizedSongGenres = songGenres.map(normalizeGenre);

  return requestedGenres.every((requestedGenre) => {
    const normalizedRequestedGenre = normalizeGenre(requestedGenre);

    return normalizedSongGenres.some(
      (songGenre) =>
        songGenre.includes(normalizedRequestedGenre) ||
        normalizedRequestedGenre.includes(songGenre),
    );
  });
}
