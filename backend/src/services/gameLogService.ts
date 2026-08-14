import type { GameLogEntry } from "../types/gameLog";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function hasCommonFields(entry: Record<string, unknown>): boolean {
  return (
    typeof entry.createdAt === "string" &&
    typeof entry.kind === "string"
  );
}

function isFailedSetupTranscript(
  entry: Record<string, unknown>,
): boolean {
  return (
    entry.kind === "setup_transcript" &&
    entry.accepted === false &&
    (entry.context === "player_count" ||
      entry.context === "decade" ||
      entry.context === "genre") &&
    entry.parsedValue === null &&
    typeof entry.transcript === "string"
  );
}

function isNonPerfectAnswer(entry: Record<string, unknown>): boolean {
  if (!isObject(entry.judgeResult)) {
    return false;
  }

  return (
    entry.kind === "answer" &&
    typeof entry.correctArtist === "string" &&
    typeof entry.correctTitle === "string" &&
    typeof entry.playerId === "number" &&
    typeof entry.pointsAwarded === "number" &&
    typeof entry.roundNumber === "number" &&
    typeof entry.skipped === "boolean" &&
    typeof entry.transcript === "string" &&
    typeof entry.judgeResult.artistCorrect === "boolean" &&
    typeof entry.judgeResult.titleCorrect === "boolean" &&
    entry.judgeResult.perfectMatch === false &&
    typeof entry.judgeResult.reason === "string"
  );
}

function isFailedReplayDecision(entry: Record<string, unknown>): boolean {
  return (
    entry.kind === "replay_decision" &&
    entry.accepted === false &&
    entry.decision === null &&
    typeof entry.transcript === "string"
  );
}

function isFrontendError(entry: Record<string, unknown>): boolean {
  return (
    entry.kind === "error" &&
    typeof entry.message === "string" &&
    entry.message.length > 0 &&
    typeof entry.source === "string" &&
    entry.source.length > 0 &&
    (entry.componentStack === undefined ||
      typeof entry.componentStack === "string") &&
    (entry.stack === undefined || typeof entry.stack === "string") &&
    (entry.userAgent === undefined || typeof entry.userAgent === "string")
  );
}

export function isGameLogEntry(value: unknown): value is GameLogEntry {
  if (!isObject(value) || !hasCommonFields(value)) {
    return false;
  }

  return (
    isFailedSetupTranscript(value) ||
    isNonPerfectAnswer(value) ||
    isFailedReplayDecision(value) ||
    isFrontendError(value)
  );
}
