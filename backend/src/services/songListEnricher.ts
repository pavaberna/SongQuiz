import { readCurrentSongList, saveCurrentSongListFile } from "./songListStore";
import { findYoutubeVideoForSong } from "./youtubeService";
import {
  MIN_PLAYABLE_DURATION_SECONDS,
  MAX_PLAYABLE_DURATION_SECONDS,
} from "../config/songRules";
import type { CurrentSongListFile } from "../types/song";

export type EnrichOneSongResult = {
  updated: boolean;
  song: CurrentSongListFile["songs"][number] | null;
  remainingSongsWithoutYoutubeData: number;
};

export type EnrichSongsResult = {
  totalSongs: number;
  alreadyEnriched: number;
  enriched: number;
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

export async function enrichNextSongWithYoutubeData(): Promise<EnrichOneSongResult> {
  const songList = await readCurrentSongList();

  const songToUpdate = songList.songs.find(
    (song) => !song.youtubeId || !song.duration,
  );

  if (!songToUpdate) {
    return {
      updated: false,
      song: null,
      remainingSongsWithoutYoutubeData: 0,
    };
  }

  const youtubeData = await findYoutubeVideoForSong({
    artist: songToUpdate.artist,
    title: songToUpdate.title,
  });

  songToUpdate.youtubeId = youtubeData.youtubeId;
  songToUpdate.duration = youtubeData.duration;

  await saveCurrentSongListFile(songList);

  const remainingSongsWithoutYoutubeData = songList.songs.filter(
    (song) => !song.youtubeId || !song.duration,
  ).length;

  return {
    updated: true,
    song: songToUpdate,
    remainingSongsWithoutYoutubeData,
  };
}

export async function enrichSongsWithYoutubeData(
  limit: number,
): Promise<EnrichSongsResult> {
  const songlist = await readCurrentSongList();

  let enriched = 0;
  const failures: EnrichSongsResult["failures"] = [];

  const songsToEnrich = songlist.songs.filter(
    (song) => !song.youtubeId || !song.duration,
  );

  for (const song of songsToEnrich.slice(0, limit)) {
    try {
      const youtubeData = await findYoutubeVideoForSong({
        artist: song.artist,
        title: song.title,
      });
      song.youtubeId = youtubeData.youtubeId;
      song.duration = youtubeData.duration;
      enriched++;
      await saveCurrentSongListFile(songlist);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      failures.push({
        artist: song.artist,
        title: song.title,
        error: message,
      });
    }
  }

  const remainingSongsWithoutYoutubeData = songlist.songs.filter(
    (song) => !song.youtubeId || !song.duration,
  ).length;

  return {
    totalSongs: songlist.songs.length,
    alreadyEnriched: songlist.songs.length - songsToEnrich.length,
    enriched,
    failed: failures.length,
    remainingSongsWithoutYoutubeData,
    failures,
  };
}

export async function getSongListReadiness(): Promise<SongListReadinessResult> {
  const songlist = await readCurrentSongList();

  const targetSongCount =
    songlist.targetSongCount ?? songlist.request.players * 10;
  const generatedSongCount =
    songlist.generatedSongCount ?? songlist.songs.length;

  const playableSongCount = songlist.songs.filter(
    (song) =>
      song.youtubeId &&
      song.duration &&
      song.duration >= MIN_PLAYABLE_DURATION_SECONDS &&
      song.duration <= MAX_PLAYABLE_DURATION_SECONDS,
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
