const genreSeparators = [",", ";", " es ", " és ", " and ", " + "];

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

export function getRequestedGenres(genreInput: string): string[] {
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
