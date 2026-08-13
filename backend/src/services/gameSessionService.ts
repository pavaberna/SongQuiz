import type {
  GamePlayer,
  GameSong,
  GameSession,
  GameRound,
  GameEvent,
  EndGameResult,
  GameSummary,
  PrepareGameSessionResult,
  GameCommand,
  HandleGameCommandResult,
  GameLeaderboardEntry,
  ReplayGameSetup,
  ReplayDecisionResult,
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
import {
  enrichSongsWithYoutubeData,
  getSongListReadiness,
} from "./songListEnricher";
import {
  CLIP_DURATION_SECONDS,
  CLIP_START_END_MARGIN_SECONDS,
  LONG_VIDEO_THRESHOLD_SECONDS,
  LONG_VIDEO_MIN_START_OFFSET_SECONDS,
} from "../config/songRules";
import { calculateAnswerPoints, judgeSongAnswer } from "./answerJudgeService";
import type {
  JudgeSongAnswerResult,
  SubmitAnswerResult,
} from "../types/answer";
import { selectDiverseGameSongs } from "./songDiversityService";
import { addCachedTracksToCurrentSongList } from "./songCacheFallbackService";

export function createPlayers(playersCount: number): GamePlayer[] {
  const players: GamePlayer[] = [];

  for (let index = 1; index <= playersCount; index++) {
    players.push({ id: index, score: 0 });
  }
  return players;
}

export async function createGameSessionFromCurrentSongList(): Promise<GameSession> {
  const currentSongList = await readCurrentSongList();
  const session: GameSession = {
    id: randomUUID(),
    language: currentSongList.request.language ?? "hu",
    createdAt: new Date().toISOString(),
    status: "ready",
    players: createPlayers(currentSongList.request.players),
    decade: currentSongList.request.decade,
    genre: currentSongList.request.genre,
    currentPlayerIndex: 0,
    songs: selectGameSongs(currentSongList),
    roundNumber: 0,
    currentRound: null,
    rounds: [],
    events: [],
  };

  addGameEvent(session, "game_created", "Game session created");

  await saveCurrentGameSession(session);

  return session;
}

export async function prepareGameSession(
  enrichmentLimit: number,
  useCacheFallback = false,
): Promise<PrepareGameSessionResult> {
  const startedAt = performance.now();
  const readiness = await getSongListReadiness();

  if (readiness.readyToStart) {
    const session = await createGameSessionFromCurrentSongList();
    console.info(
      `[timing] prepare game total=${Math.round(performance.now() - startedAt)}ms enrichment=skipped fallback=false`,
    );
    return {
      ready: true,
      session,
      readiness,
    };
  }

  const requiredEnrichmentCount = Math.min(
    enrichmentLimit,
    readiness.missingPlayableSongCount,
  );
  const enrichment = await enrichSongsWithYoutubeData(
    requiredEnrichmentCount,
  );
  let updatedReadiness = await getSongListReadiness();

  const shouldUseCacheFallback =
    useCacheFallback || enrichment.youtubeQuotaExceeded;

  if (!updatedReadiness.readyToStart && shouldUseCacheFallback) {
    const cacheFallback = await addCachedTracksToCurrentSongList();

    console.log(
      `Cache fallback added ${cacheFallback.added} of ${cacheFallback.missingBeforeFallback} missing songs from ${cacheFallback.matchingCachedTracks} matching cached tracks.`,
    );

    updatedReadiness = await getSongListReadiness();
  }

  if (updatedReadiness.readyToStart) {
    const session = await createGameSessionFromCurrentSongList();

    console.info(
      `[timing] prepare game total=${Math.round(performance.now() - startedAt)}ms enriched=${enrichment.enriched} cache=${enrichment.cacheHits} youtube=${enrichment.youtubeLookups} fallback=${shouldUseCacheFallback}`,
    );

    return {
      ready: true,
      session,
      readiness: updatedReadiness,
    };
  }

  console.info(
    `[timing] prepare game total=${Math.round(performance.now() - startedAt)}ms enriched=${enrichment.enriched} cache=${enrichment.cacheHits} youtube=${enrichment.youtubeLookups} fallback=${shouldUseCacheFallback} ready=false`,
  );

  return {
    ready: false,
    session: null,
    readiness: updatedReadiness,
    enrichment,
  };
}

export async function startNextRound(): Promise<GameSession> {
  const session = await readCurrentGameSession();
  if (session.status === "finished") {
    throw new Error(
      "Cannot start next round because the game is already finished.",
    );
  }

  if (session.status === "paused") {
    throw new Error("Cannot start next round while the game is paused.");
  }

  if (session.currentRound && session.currentRound.status !== "completed") {
    throw new Error(
      "Cannot start next round before completing the current round.",
    );
  }

  const currentSong = session.songs.find((song) => !song.played);
  if (!currentSong) {
    session.status = "finished";
    session.currentRound = null;

    addGameEvent(
      session,
      "game_finished",
      "Game finished because there are no songs left.",
    );

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

  if (!session.rounds) {
    session.rounds = [];
  }

  currentSong.played = true;

  session.roundNumber = nextRoundNumber;
  session.currentRound = round;
  session.status = "in_progress";

  addGameEvent(
    session,
    "round_started",
    `Round ${nextRoundNumber} started for Player ${currentPlayer.id}.`,
  );
  await saveCurrentGameSession(session);

  return session;
}

export async function pauseGame(): Promise<GameSession> {
  const session = await readCurrentGameSession();

  if (session.status === "finished") {
    throw new Error("This game is already finished");
  }

  if (session.status === "paused") {
    return session;
  }

  session.status = "paused";

  addGameEvent(session, "game_paused", "Game paused.");

  await saveCurrentGameSession(session);

  return session;
}

export async function resumeGame(): Promise<GameSession> {
  const session = await readCurrentGameSession();

  if (session.status === "finished") {
    throw new Error("This game is already finished");
  }

  if (session.status !== "paused") {
    throw new Error("Only paused game can be resumed");
  }

  session.status = "in_progress";
  addGameEvent(session, "game_resumed", "Game resumed.");

  await saveCurrentGameSession(session);

  return session;
}

export async function finishGame(): Promise<GameSession> {
  const session = await readCurrentGameSession();

  if (session.status === "finished") {
    return session;
  }
  session.status = "finished";
  if (session.currentRound) {
    session.currentRound.status = "completed";
  }
  addGameEvent(session, "game_finished", "Game finished.");
  await saveCurrentGameSession(session);
  return session;
}

export async function endGame(): Promise<EndGameResult> {
  await deleteCurrentGameSession();

  return { deleted: true };
}

export async function submitAnswer(
  answer: string,
): Promise<SubmitAnswerResult> {
  const session = await readCurrentGameSession();

  if (!session.currentRound) {
    throw new Error("There is no active round.");
  }

  const currentRound = session.currentRound;
  const skipped = isPassAnswer(answer);

  if (session.status === "finished") {
    throw new Error("This game is already finished.");
  }

  if (currentRound.status === "completed") {
    throw new Error("This round is already completed.");
  }

  let judgeResult: JudgeSongAnswerResult;

  if (skipped) {
    judgeResult = {
      artistCorrect: false,
      titleCorrect: false,
      perfectMatch: false,
      reason: "Player skipped the answer.",
    };
  } else {
    judgeResult = await judgeSongAnswer({
      playerAnswer: answer,
      correctArtist: currentRound.currentSong.artist,
      correctTitle: currentRound.currentSong.title,
    });
  }

  const points = calculateAnswerPoints({
    artistCorrect: judgeResult.artistCorrect,
    titleCorrect: judgeResult.titleCorrect,
    perfectMatch: judgeResult.perfectMatch,
    reason: judgeResult.reason,
  });

  const player = session.players.find(
    (player) => player.id === currentRound.currentPlayer.id,
  );

  if (!player) {
    throw new Error("Current player was not found in session.");
  }

  player.score += points;
  currentRound.currentPlayer.score = player.score;
  currentRound.playerAnswer = answer;
  currentRound.pointsAwarded = points;
  currentRound.judgeResult = judgeResult;
  currentRound.completedAt = new Date().toISOString();
  currentRound.status = "completed";
  session.currentPlayerIndex =
    (session.currentPlayerIndex + 1) % session.players.length;

  if (!session.rounds) {
    session.rounds = [];
  }

  session.rounds.push({ ...currentRound });

  addGameEvent(
    session,
    "answer_submitted",
    `Player ${player.id} answered and earned ${points} points.`,
  );

  const allSongsPlayed = session.songs.every((song) => song.played);

  if (allSongsPlayed) {
    session.status = "finished";

    addGameEvent(
      session,
      "game_finished",
      "Game finished because all songs have been played.",
    );
  }

  await saveCurrentGameSession(session);

  return {
    session,
    playerId: player.id,
    pointsAwarded: points,
    skipped,
    judgeResult,
    correctAnswer: {
      artist: currentRound.currentSong.artist,
      title: currentRound.currentSong.title,
    },
  };
}

export async function getGameSummary(): Promise<GameSummary> {
  const session = await readCurrentGameSession();

  const scores = session.players.map((player) => player.score);

  const highestScore = Math.max(...scores);

  const winnerIds = session.players
    .filter((player) => player.score === highestScore)
    .map((player) => player.id);

  const leaderboard = createLeaderboard(session.players);

  return {
    status: session.status,
    players: session.players,
    winnerIds,
    roundsPlayed: session.rounds?.length ?? 0,
    totalRounds: session.songs.length,
    events: session.events ?? [],
    leaderboard,
  };
}

export async function handleGameCommand(
  rawCommand: string,
): Promise<HandleGameCommandResult> {
  const command = normalizeGameCommand(rawCommand);

  if (command === null) {
    throw new Error(`Unknown game command: ${rawCommand}`);
  }

  switch (command) {
    case "pause": {
      const result = await pauseGame();
      return {
        command,
        result,
      };
    }
    case "resume": {
      const result = await resumeGame();
      return {
        command,
        result,
      };
    }
    case "finish": {
      const result = await finishGame();
      return {
        command,
        result,
      };
    }
    case "end": {
      const result = await endGame();
      return {
        command,
        result,
      };
    }
  }
}

export async function prepareReplay(): Promise<ReplayGameSetup> {
  const session = await readCurrentGameSession();

  if (session.status !== "finished") {
    throw new Error("Only a finished game can be replayed.");
  }

  return {
    players: session.players.length,
    language: session.language,
  };
}

export async function handleReplayDecision(
  rawAnswer: string,
): Promise<ReplayDecisionResult> {
  const words = normalizeSpokenWords(rawAnswer);

  const positiveCommands = ["yes", "yeah", "igen", "persze"];
  const negativeCommands = ["no", "nope", "nem"];

  const setup = await prepareReplay();

  if (positiveCommands.some((command) => words.includes(command))) {
    return { decision: "replay", setup };
  }

  if (negativeCommands.some((command) => words.includes(command))) {
    const result = await endGame();
    return { decision: "end", result };
  }

  throw new Error("Unknown replay decision.");
}

// HELPER FUNCTIONS

function calculateStartOffset(durationSeconds: number): number {
  const minStartOffset =
    durationSeconds > LONG_VIDEO_THRESHOLD_SECONDS
      ? LONG_VIDEO_MIN_START_OFFSET_SECONDS
      : 0;

  const maxStartOffset = durationSeconds - CLIP_START_END_MARGIN_SECONDS;

  if (maxStartOffset < minStartOffset) {
    throw new Error(
      `Cannot calculate start offset for duration ${durationSeconds}.`,
    );
  }

  return Math.floor(
    minStartOffset + Math.random() * (maxStartOffset - minStartOffset + 1),
  );
}

function addGameEvent(
  session: GameSession,
  type: GameEvent["type"],
  message: string,
) {
  const event = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    type,
    message,
  };

  if (!session.events) {
    session.events = [];
  }
  session.events.push(event);
}

function normalizeGameCommand(rawCommand: string): GameCommand | null {
  const command = normalizeSpokenWords(rawCommand).join(" ");

  if (
    command === "pause" ||
    command === "stop" ||
    command === "szünet" ||
    command === "állj" ||
    command === "megáll"
  ) {
    return "pause";
  }

  if (
    command === "resume" ||
    command === "continue" ||
    command === "folytatás" ||
    command === "folytasd" ||
    command === "mehet"
  ) {
    return "resume";
  }

  if (command === "finish") {
    return "finish";
  }

  if (
    command === "end" ||
    command === "end game" ||
    command === "quit" ||
    command === "kilépés" ||
    command === "játék vége" ||
    command === "befejezés"
  ) {
    return "end";
  }

  return null;
}

function selectGameSongs(currentSongList: CurrentSongListFile): GameSong[] {
  const playableSongs = currentSongList.songs.filter(hasPlayableYoutubeData);
  if (playableSongs.length < currentSongList.targetSongCount) {
    throw new Error(
      `Not enough playable songs. Required: ${currentSongList.targetSongCount}, available: ${playableSongs.length}.`,
    );
  }
  const gameSongs: GameSong[] = playableSongs.map((song) => ({
    ...song,
    played: false,
  }));

  return selectDiverseGameSongs(
    gameSongs,
    currentSongList.targetSongCount,
  );
}

function isPassAnswer(rawAnswer: string): boolean {
  const answer = normalizeSpokenWords(rawAnswer).join(" ");
  const compactAnswer = answer.replaceAll(" ", "");
  const passCommands = [
    "pass",
    "skip",
    "passz",
    "kihagyom",
    "nem tudom",
    "nemtodon",
    "fogalmam sincs",
    "ötletem sincs",
    "otletem sincs",
    "dont know",
    "don't know",
    "i dont know",
    "i don't know",
  ];

  return passCommands.some((command) => {
    const compactCommand = command.replaceAll(" ", "");

    return (
      answer === command ||
      answer.includes(command) ||
      differsByAtMostOneCharacter(compactAnswer, compactCommand)
    );
  });
}

function differsByAtMostOneCharacter(
  firstText: string,
  secondText: string,
): boolean {
  if (Math.abs(firstText.length - secondText.length) > 1) {
    return false;
  }

  if (firstText.length === secondText.length) {
    let differenceCount = 0;

    for (let index = 0; index < firstText.length; index++) {
      if (firstText[index] !== secondText[index]) {
        differenceCount++;
      }

      if (differenceCount > 1) {
        return false;
      }
    }

    return true;
  }

  const shorterText =
    firstText.length < secondText.length ? firstText : secondText;
  const longerText =
    firstText.length < secondText.length ? secondText : firstText;
  let shorterIndex = 0;
  let longerIndex = 0;
  let skippedCharacterCount = 0;

  while (shorterIndex < shorterText.length && longerIndex < longerText.length) {
    if (shorterText[shorterIndex] === longerText[longerIndex]) {
      shorterIndex++;
      longerIndex++;
      continue;
    }

    skippedCharacterCount++;
    longerIndex++;

    if (skippedCharacterCount > 1) {
      return false;
    }
  }

  return true;
}

function createLeaderboard(players: GamePlayer[]): GameLeaderboardEntry[] {
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  return sortedPlayers.map((player) => {
    const rank =
      sortedPlayers.findIndex(
        (sortedPlayer) => sortedPlayer.score === player.score,
      ) + 1;

    return {
      ...player,
      rank,
    };
  });
}

function normalizeSpokenWords(text: string): string[] {
  let normalizedText = text.trim().toLowerCase();
  const punctuationMarks = [".", ",", "!", "?"];

  for (const mark of punctuationMarks) {
    normalizedText = normalizedText.replaceAll(mark, "");
  }

  return normalizedText.split(" ").filter(Boolean);
}
