import type { GamePlayer, GameRound } from "./game";

export type AnswerJudgeResult = {
  artistCorrect: boolean;
  perfectMatch: boolean;
  reason: string;
  titleCorrect: boolean;
};

export type AnswerSession = {
  currentRound: GameRound | null;
  id: string;
  players: GamePlayer[];
  status: "in_progress" | "finished";
};

export type SubmitAnswerResult = {
  correctAnswer: {
    artist: string;
    title: string;
  };
  judgeResult: AnswerJudgeResult;
  playerId: number;
  pointsAwarded: number;
  session: AnswerSession;
};

export type AnswerVoiceInstruction = {
  key:
    | "answer_artist_correct"
    | "answer_both_correct"
    | "answer_none_correct"
    | "answer_perfect"
    | "answer_title_correct";
  params: {
    correctArtist: string;
    correctTitle: string;
    points: number;
  };
};

export type SubmitAudioAnswerResponse = {
  result: SubmitAnswerResult;
  transcript: string;
  voice: AnswerVoiceInstruction;
};
