import { readCurrentSongList, saveCurrentSongListFile } from "./songListStore";
import {
  findYoutubeVideoForSong,
  isYoutubeQuotaExceededError,
} from "./youtubeService";
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
  youtubeQuotaExceeded: boolean;
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

const ENRICHMENT_CONCURRENCY = 3;

type SongEnrichmentAttempt =
  | {
      source: EnrichmentSource;
      song: CurrentSongListFile["songs"][number];
      success: true;
    }
  | {
      error: string;
      quotaExceeded: boolean;
      song: CurrentSongListFile["songs"][number];
      success: false;
    };

async function enrichSongWithCacheOrYoutube(
  song: CurrentSongListFile["songs"][number],
): Promise<EnrichmentSource> {
  const cachedTrack = await findCachedTrackBySong(song.artist, song.title);

  if (cachedTrack) {
    song.youtubeId = cachedTrack.youtubeId;
    song.duration = cachedTrack.duration;
    song.viewCount =
      cachedTrack.viewCount === null ? null : Number(cachedTrack.viewCount);
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
  song.viewCount = youtubeData.viewCount;

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
  const startedAt = performance.now();
  const songlist = await readCurrentSongList();

  let enriched = 0;
  let cacheHits = 0;
  let youtubeLookups = 0;
  let youtubeQuotaExceeded = false;
  const failures: EnrichSongsResult["failures"] = [];

  const songsToEnrich = songlist.songs.filter(
    (song) => !hasPlayableYoutubeData(song),
  );
  const selectedSongs = songsToEnrich.slice(0, limit);

  for (
    let batchStart = 0;
    batchStart < selectedSongs.length;
    batchStart += ENRICHMENT_CONCURRENCY
  ) {
    const batch = selectedSongs.slice(
      batchStart,
      batchStart + ENRICHMENT_CONCURRENCY,
    );

    const attempts = await Promise.all(
      batch.map(async (song): Promise<SongEnrichmentAttempt> => {
        try {
          const source = await enrichSongWithCacheOrYoutube(song);

          return { song, source, success: true };
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Unknown error";

          return {
            error: message,
            quotaExceeded: isYoutubeQuotaExceededError(error),
            song,
            success: false,
          };
        }
      }),
    );

    for (const attempt of attempts) {
      if (attempt.success) {
        enriched++;

        if (attempt.source === "cache") {
          cacheHits++;
        } else {
          youtubeLookups++;
        }

        continue;
      }

      failures.push({
        artist: attempt.song.artist,
        title: attempt.song.title,
        error: attempt.error,
      });

      if (attempt.quotaExceeded) {
        youtubeQuotaExceeded = true;
      }

      moveSongToEnd(songlist, attempt.song);
    }

    if (youtubeQuotaExceeded) {
      break;
    }
  }

  if (selectedSongs.length > 0) {
    await saveCurrentSongListFile(songlist);
  }

  const remainingSongsWithoutYoutubeData = songlist.songs.filter(
    (song) => !hasPlayableYoutubeData(song),
  ).length;

  console.info(
    `[timing] song enrichment total=${Math.round(performance.now() - startedAt)}ms songs=${selectedSongs.length} cache=${cacheHits} youtube=${youtubeLookups} failed=${failures.length}`,
  );

  return {
    totalSongs: songlist.songs.length,
    alreadyEnriched: songlist.songs.length - songsToEnrich.length,
    enriched,
    cacheHits,
    youtubeLookups,
    failed: failures.length,
    youtubeQuotaExceeded,
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
