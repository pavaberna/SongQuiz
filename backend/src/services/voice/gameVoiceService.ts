import type { SubmitAnswerResult } from "../../types/answer";
import type {
  GameSession,
  GameVoiceInstruction,
  HandleGameCommandResult,
} from "../../types/game";
import type { VoiceLineKey } from "./voiceTypes";

export function createAnswerVoiceInstruction(
  result: SubmitAnswerResult,
): GameVoiceInstruction {
  const { perfectMatch, artistCorrect, titleCorrect } = result.judgeResult;

  let key: VoiceLineKey;

  if (perfectMatch) {
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

  const roundNumber = activeRound?.roundNumber ?? session.roundNumber + 1;

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

export function createGameCommandVoiceInstruction(
  result: HandleGameCommandResult,
): GameVoiceInstruction {
  switch (result.command) {
    case "pause":
      return { key: "game_paused" };

    case "resume":
      return createResumeVoiceInstruction(result.result);

    case "finish":
    case "end":
      return { key: "game_stopped" };
  }
}
