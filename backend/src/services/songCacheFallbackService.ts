import type { Track } from "@prisma/client";

import type { CurrentSongListFile, StoredSong } from "../types/song";
import { hasPlayableYoutubeData } from "../utils/songValidation";
import { matchesEveryRequestedGenre, getRequestedGenres } from "./songGenreService";
import { shuffleSongs } from "./songDiversityService";
import {
  readCurrentSongList,
  saveCurrentSongListFile,
} from "./songListStore";
import { findCachedTracksByYearRange } from "./trackRepository";

export type CacheFallbackResult = {
  added: number;
  missingBeforeFallback: number;
  matchingCachedTracks: number;
};

export async function addCachedTracksToCurrentSongList(): Promise<CacheFallbackResult> {
  const songList = await readCurrentSongList();
  const playableSongCount = songList.songs.filter(
    hasPlayableYoutubeData,
  ).length;
  const missingBeforeFallback = Math.max(
    songList.targetSongCount - playableSongCount,
    0,
  );

  if (missingBeforeFallback === 0) {
    return {
      added: 0,
      missingBeforeFallback,
      matchingCachedTracks: 0,
    };
  }

  const yearRange = getYearRange(songList.request.decade);
  const cachedTracks = await findCachedTracksByYearRange(
    yearRange.minimumYear,
    yearRange.maximumYear,
  );
  const requestedGenres = getRequestedGenres(songList.request.genre);
  const existingYoutubeIds = new Set(
    songList.songs
      .map((song) => song.youtubeId)
      .filter((youtubeId): youtubeId is string => youtubeId !== null),
  );

  const matchingCachedSongs = cachedTracks
    .filter(
      (track) =>
        !existingYoutubeIds.has(track.youtubeId) &&
        matchesEveryRequestedGenre(track.genres, requestedGenres),
    )
    .map(trackToStoredSong)
    .filter(hasPlayableYoutubeData);
  const fallbackSongs = shuffleSongs(matchingCachedSongs).slice(
    0,
    missingBeforeFallback,
  );

  songList.songs.push(...fallbackSongs);
  songList.generatedSongCount = songList.songs.length;

  await saveCurrentSongListFile(songList);

  return {
    added: fallbackSongs.length,
    missingBeforeFallback,
    matchingCachedTracks: matchingCachedSongs.length,
  };
}

function getYearRange(
  musicPeriod: string,
): { minimumYear?: number; maximumYear?: number } {
  if (musicPeriod === "mixed") {
    return {};
  }

  if (musicPeriod.endsWith("s")) {
    const decadeStart = Number(musicPeriod.slice(0, -1));

    if (Number.isInteger(decadeStart)) {
      return {
        minimumYear: decadeStart,
        maximumYear: decadeStart + 9,
      };
    }
  }

  const exactYear = Number(musicPeriod);

  if (Number.isInteger(exactYear)) {
    return {
      minimumYear: exactYear,
      maximumYear: exactYear,
    };
  }

  return {};
}

function trackToStoredSong(track: Track): StoredSong {
  return {
    artist: track.artist,
    duration: track.duration,
    genres: track.genres,
    popularityTier: "familiar",
    title: track.title,
    viewCount: track.viewCount === null ? null : Number(track.viewCount),
    year: track.year,
    youtubeId: track.youtubeId,
  };
}
