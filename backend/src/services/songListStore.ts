import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { getCurrentUserStorageKey } from "../lib/requestContext";
import type {
  CurrentSongListFile,
  GeneratedSong,
  GenerateSongListParams,
} from "../types/song";

function getSongListPaths(): {
  currentSongListPath: string;
  userRuntimeDir: string;
} {
  const userRuntimeDir = path.join(
    process.cwd(),
    "runtime",
    "users",
    getCurrentUserStorageKey(),
  );

  return {
    currentSongListPath: path.join(userRuntimeDir, "current-song-list.json"),
    userRuntimeDir,
  };
}

export async function saveCurrentSongList(
  request: GenerateSongListParams,
  songs: GeneratedSong[],
): Promise<CurrentSongListFile> {
  const { currentSongListPath, userRuntimeDir } = getSongListPaths();

  await mkdir(userRuntimeDir, { recursive: true });

  const fileContent: CurrentSongListFile = {
    generatedAt: new Date().toISOString(),
    targetSongCount: request.players * request.songsPerPlayer,
    generatedSongCount: songs.length,
    request,
    songs: songs.map((song) => ({
      ...song,
      youtubeId: null,
      duration: null,
      viewCount: null,
    })),
  };

  await writeFile(
    currentSongListPath,
    JSON.stringify(fileContent, null, 2),
    "utf-8",
  );

  return fileContent;
}

export async function readCurrentSongList(): Promise<CurrentSongListFile> {
  const { currentSongListPath } = getSongListPaths();
  const fileContent = await readFile(currentSongListPath, "utf-8");
  return JSON.parse(fileContent) as CurrentSongListFile;
}

export async function readCurrentSongListIfExists(): Promise<CurrentSongListFile | null> {
  try {
    return await readCurrentSongList();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }

    throw error;
  }
}
export async function saveCurrentSongListFile(
  fileContent: CurrentSongListFile,
): Promise<CurrentSongListFile> {
  const { currentSongListPath, userRuntimeDir } = getSongListPaths();

  await mkdir(userRuntimeDir, { recursive: true });

  await writeFile(
    currentSongListPath,
    JSON.stringify(fileContent, null, 2),
    "utf-8",
  );
  return fileContent;
}
