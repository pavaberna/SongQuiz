import { readCurrentSongList } from "./songListStore";
import { saveTrackToCache } from "./trackRepository";
import { hasPlayableYoutubeData } from "../utils/songValidation";

export type SaveCurrentSongsToCacheResult = {
  totalSongs: number;
  cacheableSongs: number;
  saved: number;
  skipped: number;
  failed: number;
  failures: {
    artist: string;
    title: string;
    error: string;
  }[];
};

export async function saveCurrentSongsToCache(): Promise<SaveCurrentSongsToCacheResult> {
  const songlist = await readCurrentSongList();

  let saved = 0;
  const failures: SaveCurrentSongsToCacheResult["failures"] = [];

  const cacheableSongs = songlist.songs.filter(hasPlayableYoutubeData);

  for (const song of cacheableSongs) {
    try {
      await saveTrackToCache(song);
      saved++;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";

      failures.push({
        artist: song.artist,
        title: song.title,
        error: message,
      });
    }
  }

  return {
    totalSongs: songlist.songs.length,
    cacheableSongs: cacheableSongs.length,
    saved,
    skipped: songlist.songs.length - cacheableSongs.length,
    failed: failures.length,
    failures,
  };
}
