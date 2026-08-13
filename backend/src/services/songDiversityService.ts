import type { GameSong } from "../types/game";
import type {
  GeneratedSong,
  SongPopularityTier,
} from "../types/song";

const MAINSTREAM_RATIO = 0.35;
const DISCOVERY_RATIO = 0.25;

export type PopularityTierCounts = Record<SongPopularityTier, number>;

export function getPopularityTierCounts(
  totalSongCount: number,
): PopularityTierCounts {
  const mainstream = Math.round(totalSongCount * MAINSTREAM_RATIO);
  const discovery = Math.round(totalSongCount * DISCOVERY_RATIO);

  return {
    mainstream,
    familiar: totalSongCount - mainstream - discovery,
    discovery,
  };
}

export function shuffleSongs<T>(songs: T[]): T[] {
  const shuffledSongs = [...songs];

  for (let index = shuffledSongs.length - 1; index > 0; index--) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    const currentSong = shuffledSongs[index];

    shuffledSongs[index] = shuffledSongs[randomIndex];
    shuffledSongs[randomIndex] = currentSong;
  }

  return shuffledSongs;
}

export function selectDiverseGameSongs(
  songs: GameSong[],
  targetSongCount: number,
): GameSong[] {
  const effectiveTiers = getEffectivePopularityTiers(songs);
  const targetCounts = getPopularityTierCounts(targetSongCount);
  const selectedSongs: GameSong[] = [];
  const selectedSongKeys = new Set<string>();
  const tiers: SongPopularityTier[] = [
    "mainstream",
    "familiar",
    "discovery",
  ];

  for (const tier of tiers) {
    const tierSongs = shuffleSongs(
      songs.filter((song) => effectiveTiers.get(getSongKey(song)) === tier),
    );

    for (const song of tierSongs.slice(0, targetCounts[tier])) {
      selectedSongs.push(song);
      selectedSongKeys.add(getSongKey(song));
    }
  }

  const remainingSongs = shuffleSongs(
    songs.filter((song) => !selectedSongKeys.has(getSongKey(song))),
  );

  selectedSongs.push(
    ...remainingSongs.slice(0, targetSongCount - selectedSongs.length),
  );

  return shuffleSongs(selectedSongs);
}

function getEffectivePopularityTiers(
  songs: GameSong[],
): Map<string, SongPopularityTier> {
  const tiers = new Map<string, SongPopularityTier>();
  const songsWithViews = songs
    .filter(
      (song): song is GameSong & { viewCount: number } =>
        typeof song.viewCount === "number",
    )
    .sort((firstSong, secondSong) => secondSong.viewCount - firstSong.viewCount);
  const viewTierCounts = getPopularityTierCounts(songsWithViews.length);
  const familiarEnd = viewTierCounts.mainstream + viewTierCounts.familiar;

  songsWithViews.forEach((song, index) => {
    if (index < viewTierCounts.mainstream) {
      tiers.set(getSongKey(song), "mainstream");
      return;
    }

    if (index < familiarEnd) {
      tiers.set(getSongKey(song), "familiar");
      return;
    }

    tiers.set(getSongKey(song), "discovery");
  });

  for (const song of songs) {
    const songKey = getSongKey(song);

    if (!tiers.has(songKey)) {
      tiers.set(songKey, getGeneratedPopularityTier(song));
    }
  }

  return tiers;
}

function getSongKey(song: GameSong): string {
  return song.youtubeId ?? `${song.artist}\u0000${song.title}`;
}

function getGeneratedPopularityTier(
  song: GeneratedSong,
): SongPopularityTier {
  if (
    song.popularityTier === "mainstream" ||
    song.popularityTier === "discovery"
  ) {
    return song.popularityTier;
  }

  return "familiar";
}
