import { readCurrentSongList, saveCurrentSongListFile } from "./songListStore";
import { findYoutubeVideoForSong } from "./youtubeService";
import type { CurrentSongListFile } from "../types/song";
import { findCachedTrackBySong, saveTrackToCache } from "./trackRepository";
import { hasPlayableYoutubeData } from "../utils/songValidation";
import { SONGS_PER_PLAYER } from "../config/songRules";

export type EnrichOneSongResult = {
  updated: boolean;
  source: EnrichmentSource | null;
  song: CurrentSongListFile["songs"][number] | null;
  remainingSongsWithoutYoutubeData: number;
};

export type EnrichSongsResult = {
  totalSongs: number;
  alreadyEnriched: number;
  enriched: number;
  cacheHits: number;
  youtubeLookups: number;
  failed: number;
  remainingSongsWithoutYoutubeData: number;
  failures: {
    artist: string;
    title: string;
    error: string;
  }[];
};

export type SongListReadinessResult = {
  targetSongCount: number;
  generatedSongCount: number;
  playableSongCount: number;
  missingPlayableSongCount: number;
  readyToStart: boolean;
};

type EnrichmentSource = "cache" | "youtube";

async function enrichSongWithCacheOrYoutube(
  song: CurrentSongListFile["songs"][number],
): Promise<EnrichmentSource> {
  const cachedTrack = await findCachedTrackBySong(song.artist, song.title);

  if (cachedTrack) {
    song.youtubeId = cachedTrack.youtubeId;
    song.duration = cachedTrack.duration;
    return "cache";
  }

  const youtubeData = await findYoutubeVideoForSong({
    artist: song.artist,
    title: song.title,
  });

  song.artist = youtubeData.artist;
  song.title = youtubeData.title;
  song.youtubeId = youtubeData.youtubeId;
  song.duration = youtubeData.duration;

  await saveTrackToCache(song);

  return "youtube";
}

export async function enrichNextSongWithYoutubeData(): Promise<EnrichOneSongResult> {
  const songList = await readCurrentSongList();

  const songToUpdate = songList.songs.find(
    (song) => !hasPlayableYoutubeData(song),
  );

  if (!songToUpdate) {
    return {
      updated: false,
      source: null,
      song: null,
      remainingSongsWithoutYoutubeData: 0,
    };
  }

  try {
    const source = await enrichSongWithCacheOrYoutube(songToUpdate);

    await saveCurrentSongListFile(songList);

    const remainingSongsWithoutYoutubeData = songList.songs.filter(
      (song) => !hasPlayableYoutubeData(song),
    ).length;

    return {
      updated: true,
      source,
      song: songToUpdate,
      remainingSongsWithoutYoutubeData,
    };
  } catch (error) {
    moveSongToEnd(songList, songToUpdate);
    await saveCurrentSongListFile(songList);

    throw error;
  }
}

export async function enrichSongsWithYoutubeData(
  limit: number,
): Promise<EnrichSongsResult> {
  const songlist = await readCurrentSongList();

  let enriched = 0;
  let cacheHits = 0;
  let youtubeLookups = 0;
  const failures: EnrichSongsResult["failures"] = [];

  const songsToEnrich = songlist.songs.filter(
    (song) => !hasPlayableYoutubeData(song),
  );

  for (const song of songsToEnrich.slice(0, limit)) {
    try {
      const source = await enrichSongWithCacheOrYoutube(song);

      if (source === "cache") {
        cacheHits++;
      }

      if (source === "youtube") {
        youtubeLookups++;
      }

      enriched++;

      await saveCurrentSongListFile(songlist);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      failures.push({
        artist: song.artist,
        title: song.title,
        error: message,
      });

      moveSongToEnd(songlist, song);
      await saveCurrentSongListFile(songlist);
    }
  }

  const remainingSongsWithoutYoutubeData = songlist.songs.filter(
    (song) => !hasPlayableYoutubeData(song),
  ).length;

  return {
    totalSongs: songlist.songs.length,
    alreadyEnriched: songlist.songs.length - songsToEnrich.length,
    enriched,
    cacheHits,
    youtubeLookups,
    failed: failures.length,
    remainingSongsWithoutYoutubeData,
    failures,
  };
}

export async function getSongListReadiness(): Promise<SongListReadinessResult> {
  const songlist = await readCurrentSongList();

  const targetSongCount =
    songlist.targetSongCount ?? songlist.request.players * SONGS_PER_PLAYER;
  const generatedSongCount =
    songlist.generatedSongCount ?? songlist.songs.length;

  const playableSongCount = songlist.songs.filter(
    hasPlayableYoutubeData,
  ).length;

  const missingPlayableSongCount = Math.max(
    targetSongCount - playableSongCount,
    0,
  );

  return {
    targetSongCount,
    generatedSongCount,
    playableSongCount,
    missingPlayableSongCount,
    readyToStart: playableSongCount >= targetSongCount,
  };
}

function moveSongToEnd(
  songList: CurrentSongListFile,
  song: CurrentSongListFile["songs"][number],
): void {
  const songIndex = songList.songs.indexOf(song);

  if (songIndex === -1) {
    return;
  }

  const [failedSong] = songList.songs.splice(songIndex, 1);

  if (failedSong) {
    songList.songs.push(failedSong);
  }
}
