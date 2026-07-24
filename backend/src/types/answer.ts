import { GameSession } from "./game";

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

export type SubmitAnswerResult = {
  session: GameSession;
  playerId: number;
  pointsAwarded: number;
  judgeResult: {
    artistCorrect: boolean;
    titleCorrect: boolean;
    perfectMatch: boolean;
    reason: string;
  };
  correctAnswer: {
    artist: string;
    title: string;
  };
};
