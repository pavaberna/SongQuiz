import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

import { getCurrentUserStorageKey } from "../lib/requestContext";
import type {
  GeneratedSong,
  PlayedSongHistoryEntry,
  SongHistoryFile,
} from "../types/song";

const MAX_SONG_HISTORY_ENTRIES = 100;
const LETTER_OR_NUMBER_PATTERN = /[\p{L}\p{N}]/u;

export type SongReference = Pick<GeneratedSong, "artist" | "title"> & {
  youtubeId?: string | null;
};

function getSongHistoryPaths(): {
  songHistoryPath: string;
  userRuntimeDir: string;
} {
  const userRuntimeDir = path.join(
    process.cwd(),
    "runtime",
    "users",
    getCurrentUserStorageKey(),
  );

  return {
    songHistoryPath: path.join(userRuntimeDir, "song-history.json"),
    userRuntimeDir,
  };
}

export async function readSongHistory(): Promise<PlayedSongHistoryEntry[]> {
  const { songHistoryPath } = getSongHistoryPaths();

  try {
    const content = await readFile(songHistoryPath, "utf-8");
    const parsedContent = JSON.parse(content) as SongHistoryFile;

    return Array.isArray(parsedContent.songs) ? parsedContent.songs : [];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

export async function addSongToHistory(song: SongReference): Promise<void> {
  const { songHistoryPath, userRuntimeDir } = getSongHistoryPaths();
  const history = await readSongHistory();
  const entry: PlayedSongHistoryEntry = {
    artist: song.artist,
    title: song.title,
    youtubeId: song.youtubeId ?? null,
    playedAt: new Date().toISOString(),
  };
  const updatedSongs = [
    ...history.filter(
      (historySong) => !songsHaveSameIdentity(historySong, song),
    ),
    entry,
  ].slice(-MAX_SONG_HISTORY_ENTRIES);
  const fileContent: SongHistoryFile = {
    updatedAt: entry.playedAt,
    songs: updatedSongs,
  };

  await mkdir(userRuntimeDir, { recursive: true });
  await writeFile(
    songHistoryPath,
    JSON.stringify(fileContent, null, 2),
    "utf-8",
  );
}

export function getUniqueSongs<T extends SongReference>(songs: T[]): T[] {
  const uniqueSongs: T[] = [];

  for (const song of songs) {
    if (
      !uniqueSongs.some((savedSong) =>
        songsHaveSameIdentity(savedSong, song),
      )
    ) {
      uniqueSongs.push(song);
    }
  }

  return uniqueSongs;
}

export function partitionSongsByHistory<T extends SongReference>(
  songs: T[],
  history: SongReference[],
): { freshSongs: T[]; recentSongs: T[] } {
  const freshSongs: T[] = [];
  const recentSongs: { historyIndex: number; song: T }[] = [];

  for (const song of songs) {
    const historyIndex = history.findIndex((historySong) =>
      songsHaveSameIdentity(historySong, song),
    );

    if (historyIndex === -1) {
      freshSongs.push(song);
      continue;
    }

    recentSongs.push({ historyIndex, song });
  }

  recentSongs.sort(
    (firstSong, secondSong) => firstSong.historyIndex - secondSong.historyIndex,
  );

  return {
    freshSongs,
    recentSongs: recentSongs.map(({ song }) => song),
  };
}

export function songsHaveSameIdentity(
  firstSong: SongReference,
  secondSong: SongReference,
): boolean {
  if (
    firstSong.youtubeId &&
    secondSong.youtubeId &&
    firstSong.youtubeId === secondSong.youtubeId
  ) {
    return true;
  }

  return (
    normalizeSongIdentityPart(firstSong.artist) ===
      normalizeSongIdentityPart(secondSong.artist) &&
    normalizeSongIdentityPart(firstSong.title) ===
      normalizeSongIdentityPart(secondSong.title)
  );
}

function normalizeSongIdentityPart(value: string): string {
  let normalizedValue = "";
  const removablePunctuation = ["'", "’", "`"];

  for (const character of value.trim().toLowerCase().normalize("NFD")) {
    const characterCode = character.charCodeAt(0);
    const isCombiningMark = characterCode >= 0x0300 && characterCode <= 0x036f;

    if (isCombiningMark) {
      continue;
    }

    if (removablePunctuation.includes(character)) {
      continue;
    }

    normalizedValue += LETTER_OR_NUMBER_PATTERN.test(character)
      ? character
      : " ";
  }

  return normalizedValue.split(" ").filter(Boolean).join(" ");
}
