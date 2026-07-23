export type JudgeSongAnswerParams = {
  playerAnswer: string;
  correctArtist: string;
  correctTitle: string;
};

export type JudgeSongAnswerResult = {
  artistCorrect: boolean;
  titleCorrect: boolean;
  perfectMatch: boolean;
  reason: string;
};
