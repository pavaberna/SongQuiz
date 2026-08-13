import type { Track } from "@prisma/client";
import { prisma } from "../lib/prisma";
import type { StoredSong } from "../types/song";

export async function findCachedTrackByYoutubeId(
  youtubeId: string,
): Promise<Track | null> {
  return prisma.track.findUnique({
    where: { youtubeId },
  });
}

export async function findCachedTrackBySong(
  artist: string,
  title: string,
): Promise<Track | null> {
  return prisma.track.findFirst({
    where: {
      artist: {
        equals: artist,
        mode: "insensitive",
      },
      title: {
        equals: title,
        mode: "insensitive",
      },
    },
  });
}

export async function findCachedTracksByYearRange(
  minimumYear?: number,
  maximumYear?: number,
): Promise<Track[]> {
  const hasYearRange =
    minimumYear !== undefined && maximumYear !== undefined;

  return prisma.track.findMany({
    where: hasYearRange
      ? {
          year: {
            gte: minimumYear,
            lte: maximumYear,
          },
        }
      : undefined,
  });
}

export async function saveTrackToCache(song: StoredSong): Promise<Track> {
  if (!song.youtubeId || !song.duration) {
    throw new Error("Cannot cache song without youtubeId and duration.");
  }

  const viewCount =
    typeof song.viewCount === "number" ? BigInt(song.viewCount) : undefined;

  const existingSong = await findCachedTrackBySong(song.artist, song.title);

  if (existingSong) {
    return prisma.track.update({
      where: { id: existingSong.id },
      data: {
        title: song.title,
        artist: song.artist,
        year: song.year,
        genres: song.genres,
        duration: song.duration,
        ...(viewCount !== undefined && { viewCount }),
      },
    });
  }

  return prisma.track.upsert({
    where: {
      youtubeId: song.youtubeId,
    },
    update: {
      title: song.title,
      artist: song.artist,
      year: song.year,
      genres: song.genres,
      duration: song.duration,
      ...(viewCount !== undefined && { viewCount }),
    },
    create: {
      youtubeId: song.youtubeId,
      title: song.title,
      artist: song.artist,
      year: song.year,
      genres: song.genres,
      duration: song.duration,
      viewCount: viewCount ?? null,
    },
  });
}
export async function countCachedTracks(): Promise<number> {
  return prisma.track.count();
}
