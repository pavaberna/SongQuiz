import {
  FindYoutubeVideoParams,
  YoutubeVideoMatch,
  YoutubeVideoValidation,
} from "../types/youtube";
import { splitSongText } from "../utils/songText";

const ignoredArtistWords = [
  "and",
  "feat",
  "featuring",
  "ft",
  "vs",
  "with",
  "x",
];

const blockedVideoWords = [
  "cover",
  "karaoke",
  "reaction",
  "slowed",
  "nightcore",
  "instrumental",
  "tutorial",
  "sped",
  "live",
  "acoustic",
  "extended",
  "remix",
];

const songTextCollator = new Intl.Collator(undefined, {
  sensitivity: "base",
  usage: "search",
});

function wordsAreEqual(firstWord: string, secondWord: string): boolean {
  return songTextCollator.compare(firstWord, secondWord) === 0;
}

function includesWord(words: string[], expectedWord: string): boolean {
  return words.some((word) => wordsAreEqual(word, expectedWord));
}

function containsAllWords(
  sourceText: string,
  expectedText: string,
  ignoredWords: string[] = [],
): boolean {
  const sourceWords = splitSongText(sourceText);
  const expectedWords = splitSongText(expectedText);

  const relevantExpectedWords = expectedWords.filter(
    (expectedWord) => !includesWord(ignoredWords, expectedWord),
  );

  if (relevantExpectedWords.length === 0) {
    return false;
  }

  return relevantExpectedWords.every((expectedWord) =>
    sourceWords.some((sourceWord) => wordsAreEqual(sourceWord, expectedWord)),
  );
}

function hasBlockedVideoWord(videoTitle: string, songTitle: string): boolean {
  const videoWords = splitSongText(videoTitle);
  const songWords = splitSongText(songTitle);

  return blockedVideoWords.some(
    (blockedWord) =>
      includesWord(videoWords, blockedWord) &&
      !includesWord(songWords, blockedWord),
  );
}

export function validateSongVideo(
  song: FindYoutubeVideoParams,
  video: YoutubeVideoMatch,
): YoutubeVideoValidation {
  const blocked = hasBlockedVideoWord(video.videoTitle, song.title);

  const videoEvidence = [
    video.videoTitle,
    video.channelTitle,
    video.description,
  ].join(" ");

  const artistMatches = containsAllWords(
    videoEvidence,
    song.artist,
    ignoredArtistWords,
  );

  const titleMatches = containsAllWords(video.videoTitle, song.title);

  return {
    artistMatches,
    titleMatches,
    blocked,
  };
}
