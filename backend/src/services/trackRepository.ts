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

export async function saveTrackToCache(song: StoredSong): Promise<Track> {
  if (!song.youtubeId || !song.duration) {
    throw new Error("Cannot cache song without youtubeId and duration.");
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
    },
    create: {
      youtubeId: song.youtubeId,
      title: song.title,
      artist: song.artist,
      year: song.year,
      genres: song.genres,
      duration: song.duration,
    },
  });
}
export async function countCachedTracks(): Promise<number> {
  return prisma.track.count();
}
