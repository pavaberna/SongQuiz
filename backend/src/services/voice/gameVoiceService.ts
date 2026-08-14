import type { SubmitAnswerResult } from "../../types/answer";
import type {
  GameSession,
  GameVoiceInstruction,
} from "../../types/game";
import { getNextRoundNumber } from "../../utils/gameRound";
import type { VoiceLineKey } from "./voiceTypes";

export function createAnswerVoiceInstruction(
  result: SubmitAnswerResult,
): GameVoiceInstruction {
  const { perfectMatch, artistCorrect, titleCorrect } = result.judgeResult;

  let key: VoiceLineKey;

  if (result.skipped) {
    key = "answer_skipped";
  } else if (perfectMatch) {
    key = "answer_perfect";
  } else if (artistCorrect && titleCorrect) {
    key = "answer_both_correct";
  } else if (artistCorrect) {
    key = "answer_artist_correct";
  } else if (titleCorrect) {
    key = "answer_title_correct";
  } else {
    key = "answer_none_correct";
  }
  return {
    key,
    params: {
      points: result.pointsAwarded,
      correctArtist: result.correctAnswer.artist,
      correctTitle: result.correctAnswer.title,
    },
  };
}

export function createResumeVoiceInstruction(
  session: GameSession,
): GameVoiceInstruction {
  const activeRound =
    session.currentRound?.status === "completed" ? null : session.currentRound;

  const roundNumber = activeRound?.roundNumber ?? getNextRoundNumber(session);

  const playerId =
    activeRound?.currentPlayer.id ??
    session.players[session.currentPlayerIndex]?.id;

  if (typeof playerId !== "number") {
    throw new Error("The next player was not found.");
  }

  return {
    key: "game_resumed",
    params: {
      roundNumber,
      playerId,
    },
  };
}

