import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import type {
  GeneratedSong,
  GenerateSongListParams,
} from "./geminiMusicCurator";

export type StoredSong = GeneratedSong & {
  youtubeId: string | null;
  duration: number | null;
};

export type CurrentSongListFile = {
  generatedAt: string;
  request: GenerateSongListParams;
  songs: StoredSong[];
};

const runtimeDir = path.join(process.cwd(), "runtime");
const currentSongListPath = path.join(runtimeDir, "current-song-list.json");

export async function saveCurrentSongList(
  request: GenerateSongListParams,
  songs: GeneratedSong[],
): Promise<CurrentSongListFile> {
  await mkdir(runtimeDir, { recursive: true });

  const fileContent: CurrentSongListFile = {
    generatedAt: new Date().toISOString(),
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
