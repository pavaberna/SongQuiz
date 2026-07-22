import type {
  GamePlayer,
  GameSong,
  GameSession,
  GameRound,
} from "../types/game";
import { readCurrentSongList } from "./songListStore";
import { hasPlayableYoutubeData } from "../utils/songValidation";
import type { CurrentSongListFile } from "../types/song";
import {
  saveCurrentGameSession,
  readCurrentGameSession,
  deleteCurrentGameSession,
} from "./gameSessionStore";
import { randomUUID } from "node:crypto";
import type {
  EnrichSongsResult,
  SongListReadinessResult,
} from "./songListEnricher";
import {
  enrichSongsWithYoutubeData,
  getSongListReadiness,
} from "./songListEnricher";
import {
  CLIP_DURATION_SECONDS,
  LONG_VIDEO_THRESHOLD_SECONDS,
  LONG_VIDEO_MIN_START_OFFSET_SECONDS,
} from "../config/songRules";

export type PrepareGameSessionResult =
  | {
      ready: true;
      session: GameSession;
      readiness: SongListReadinessResult;
    }
  | {
      ready: false;
      session: null;
      readiness: SongListReadinessResult;
      enrichment: EnrichSongsResult;
    };

type EndGameResult = { deleted: boolean };

export function createPlayers(playersCount: number): GamePlayer[] {
  const players: GamePlayer[] = [];

  for (let index = 1; index <= playersCount; index++) {
    players.push({ id: index, score: 0 });
  }
  return players;
}

function selectGameSongs(currentSongList: CurrentSongListFile): GameSong[] {
  const playableSongs = currentSongList.songs.filter(hasPlayableYoutubeData);
  if (playableSongs.length < currentSongList.targetSongCount) {
    throw new Error(
      `Not enough playable songs. Required: ${currentSongList.targetSongCount}, available: ${playableSongs.length}.`,
    );
  }
  const selectedSongs = playableSongs.slice(0, currentSongList.targetSongCount);
  const gameSongs: GameSong[] = selectedSongs.map((song) => ({
    ...song,
    played: false,
  }));
  return gameSongs;
}

export async function createGameSessionFromCurrentSongList(): Promise<GameSession> {
  const currentSongList = await readCurrentSongList();
  const session: GameSession = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    status: "ready",
    players: createPlayers(currentSongList.request.players),
    decade: currentSongList.request.decade,
    genre: currentSongList.request.genre,
    currentPlayerIndex: 0,
    songs: selectGameSongs(currentSongList),
    roundNumber: 0,
    currentRound: null,
  };

  await saveCurrentGameSession(session);

  return session;
}

export async function prepareGameSession(
  enrichmentLimit: number,
): Promise<PrepareGameSessionResult> {
  const readiness = await getSongListReadiness();

  if (readiness.readyToStart) {
    const session = await createGameSessionFromCurrentSongList();
    return {
      ready: true,
      session,
      readiness,
    };
  }

  const enrichment = await enrichSongsWithYoutubeData(enrichmentLimit);
  const updatedReadiness = await getSongListReadiness();

  if (updatedReadiness.readyToStart) {
    const session = await createGameSessionFromCurrentSongList();

    return {
      ready: true,
      session,
      readiness: updatedReadiness,
    };
  }

  return {
    ready: false,
    session: null,
    readiness: updatedReadiness,
    enrichment,
  };
}

function calculateStartOffset(durationSeconds: number): number {
  const minStartOffset =
    durationSeconds > LONG_VIDEO_THRESHOLD_SECONDS
      ? LONG_VIDEO_MIN_START_OFFSET_SECONDS
      : 0;

  const maxStartOffset = durationSeconds - CLIP_DURATION_SECONDS;

  if (maxStartOffset < minStartOffset) {
    throw new Error(
      `Cannot calculate start offset for duration ${durationSeconds}.`,
    );
  }

  return Math.floor(
    minStartOffset + Math.random() * (maxStartOffset - minStartOffset + 1),
  );
}

export async function startNextRound(): Promise<GameSession> {
  const session = await readCurrentGameSession();
  if (session.status === "finished") {
    throw new Error(
      "Cannot start next round because the game is already finished.",
    );
  }
  const currentSong = session.songs.find((song) => !song.played);
  if (!currentSong) {
    session.status = "finished";
    session.currentRound = null;

    await saveCurrentGameSession(session);
    return session;
  }

  const currentPlayer = session.players[session.currentPlayerIndex];

  if (!currentPlayer) {
    throw new Error(
      `Invalid currentPlayerIndex: ${session.currentPlayerIndex}.`,
    );
  }

  const duration = currentSong.duration;

  if (typeof duration !== "number") {
    throw new Error("Song duration is not a number.");
  }

  const calculatedStartOffset = calculateStartOffset(duration);

  const nextRoundNumber = session.roundNumber + 1;

  const round: GameRound = {
    roundNumber: nextRoundNumber,
    currentPlayer,
    currentSong: { ...currentSong },
    startOffset: calculatedStartOffset,
    clipDuration: CLIP_DURATION_SECONDS,
    startedAt: new Date().toISOString(),
    status: "playing",
  };

  currentSong.played = true;

  session.roundNumber = nextRoundNumber;
  session.currentRound = round;
  session.status = "in_progress";
  session.currentPlayerIndex =
    (session.currentPlayerIndex + 1) % session.players.length;

  await saveCurrentGameSession(session);

  return session;
}

export async function pauseGame(): Promise<GameSession> {
  const currentSession = await readCurrentGameSession();

  if (currentSession.status === "finished") {
    throw new Error("This game is already finished");
  }
  currentSession.status = "paused";
  await saveCurrentGameSession(currentSession);

  return currentSession;
}

export async function resumeGame(): Promise<GameSession> {
  const currentSession = await readCurrentGameSession();

  if (currentSession.status === "finished") {
    throw new Error("This game is already finished");
  }

  if (currentSession.status !== "paused") {
    throw new Error("Only paused game can be resumed");
  }

  currentSession.status = "in_progress";

  await saveCurrentGameSession(currentSession);

  return currentSession;
}

export async function finishGame(): Promise<GameSession> {
  const currentSession = await readCurrentGameSession();

  if (currentSession.status === "finished") {
    return currentSession;
  }
  currentSession.status = "finished";
  if (currentSession.currentRound) {
    currentSession.currentRound.status = "completed";
  }

  await saveCurrentGameSession(currentSession);
  return currentSession;
}

export async function endGame(): Promise<EndGameResult> {
  await deleteCurrentGameSession();

  return { deleted: true };
}
