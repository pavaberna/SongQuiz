import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import type {
  CurrentSongListFile,
  GeneratedSong,
  GenerateSongListParams,
} from "../types/song";
import { SONGS_PER_PLAYER } from "../config/songRules";

const runtimeDir = path.join(process.cwd(), "runtime");
const currentSongListPath = path.join(runtimeDir, "current-song-list.json");

export async function saveCurrentSongList(
  request: GenerateSongListParams,
  songs: GeneratedSong[],
): Promise<CurrentSongListFile> {
  await mkdir(runtimeDir, { recursive: true });

  const fileContent: CurrentSongListFile = {
    generatedAt: new Date().toISOString(),
    targetSongCount: request.players * SONGS_PER_PLAYER,
    generatedSongCount: songs.length,
    request,
    songs: songs.map((song) => ({
      ...song,
      youtubeId: null,
      duration: null,
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
  const fileContent = await readFile(currentSongListPath, "utf-8");
  return JSON.parse(fileContent) as CurrentSongListFile;
}
export async function saveCurrentSongListFile(
  fileContent: CurrentSongListFile,
): Promise<CurrentSongListFile> {
  await mkdir(runtimeDir, { recursive: true });

  await writeFile(
    currentSongListPath,
    JSON.stringify(fileContent, null, 2),
    "utf-8",
  );
  return fileContent;
}
