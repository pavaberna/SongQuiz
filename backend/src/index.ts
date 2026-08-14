import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { generateSongList } from "./services/geminiMusicCurator";
import {
  readCurrentSongList,
  readCurrentSongListIfExists,
  saveCurrentSongList,
} from "./services/songListStore";
import { findYoutubeVideoForSong } from "./services/youtubeService";
import {
  enrichNextSongWithYoutubeData,
  enrichSongsWithYoutubeData,
  getSongListReadiness,
} from "./services/songListEnricher";
import { saveCurrentSongsToCache } from "./services/trackCacheService";
import { countCachedTracks } from "./services/trackRepository";
import {
  createGameSessionFromCurrentSongList,
  prepareGameSession,
  startNextRound,
  pauseGame,
  resumeGame,
  finishGame,
  endGame,
  submitAnswer,
  getGameSummary,
  handleGameCommand,
  prepareReplay,
  handleReplayDecision,
} from "./services/gameSessionService";
import { readCurrentGameSession } from "./services/gameSessionStore";
import multer from "multer";
import { transcribeAudio } from "./services/speechToTextService";
import { VoiceLineKey, voiceLineKeys } from "./services/voice/voiceTypes";
import { GameLanguage } from "./types/language";
import {
  getVoiceLine,
  getMissingVoiceLineParams,
  voiceLineRequiresParams,
} from "./services/voice/voiceService";
import { generateSpeech } from "./services/textToSpeechService";
import {
  readDynamicVoiceLineAudio,
  readVoiceLineAudio,
  saveDynamicVoiceLineAudio,
  saveVoiceLineAudio,
} from "./services/voice/voiceAudioStore";
import type { VoiceLineParams } from "./services/voice/voiceTypes";
import type { GameVoiceInstruction } from "./types/game";
import {
  createAnswerVoiceInstruction,
  createResumeVoiceInstruction,
} from "./services/voice/gameVoiceService";
import { MAX_PLAYERS, MIN_PLAYERS } from "./config/gameRules";
import {
  MAX_SONGS_PER_PLAYER,
  MIN_SONGS_PER_PLAYER,
  SONGS_PER_PLAYER,
} from "./config/songRules";
import { transcriptionContexts } from "./types/speech";
import type { TranscriptionContext } from "./types/speech";
import type { HungarianSongMode } from "./types/song";
import { shuffleSongs } from "./services/songDiversityService";
import {
  getUniqueSongs,
  readSongHistory,
} from "./services/songHistoryStore";
import {
  authenticateGoogleCredential,
  createAuthSessionToken,
  GoogleAccountNotAllowedError,
} from "./services/authService";
import {
  AUTH_COOKIE_NAME,
  getAuthCookieOptions,
} from "./config/authConfig";
import {
  requireAuth,
  restoreAuthenticatedUserContext,
} from "./middleware/requireAuth";
import { logApiErrors } from "./middleware/logApiErrors";
import {
  appendGameLogEntry,
  clearGameLogForUser,
  readGameLogForUser,
} from "./services/gameLogStore";
import { isGameLogEntry } from "./services/gameLogService";
import { requireAdmin } from "./middleware/requireAdmin";
import { saveUserProfile } from "./services/userProfileStore";
import { getGameLogUserSummaries } from "./services/adminGameLogService";
import {
  isRandomizedSoundEffectKey,
  soundEffectFiles,
  soundEffectKeys,
  type SoundEffectKey,
} from "./config/soundEffects";
import { readSoundEffect } from "./services/soundEffectService";

const app = express();
const PORT = process.env.PORT || 5000;
const allowedFrontendOrigins = (
  process.env.FRONTEND_ORIGIN ?? "http://localhost:5173"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    credentials: true,
    exposedHeaders: ["Server-Timing"],
    origin(origin, callback) {
      if (!origin || allowedFrontendOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("This origin is not allowed by CORS."));
    },
  }),
);
app.use(express.json());
app.use(cookieParser());

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

app.get("/api/health", (req, res) => {
  res.json({ status: "OK", message: "Backend is healthy" });
});

app.post("/api/auth/google", async (req, res) => {
  try {
    const credential =
      typeof req.body.credential === "string" ? req.body.credential : "";

    if (!credential) {
      res.status(400).json({ error: "Google credential is required." });
      return;
    }

    const user = await authenticateGoogleCredential(credential);
    const sessionToken = createAuthSessionToken(user);

    await saveUserProfile(user);
    res.cookie(AUTH_COOKIE_NAME, sessionToken, getAuthCookieOptions());
    res.json({ user });
  } catch (error) {
    if (error instanceof GoogleAccountNotAllowedError) {
      res.status(403).json({ error: error.message });
      return;
    }

    console.warn("Google authentication failed:", error);
    res.status(401).json({ error: "Google authentication failed." });
  }
});

app.get("/api/auth/me", requireAuth, async (_req, res) => {
  try {
    await saveUserProfile(res.locals.authUser);
    res.json({ user: res.locals.authUser });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

app.post("/api/auth/logout", (req, res) => {
  const cookieOptions = getAuthCookieOptions();

  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: cookieOptions.httpOnly,
    path: cookieOptions.path,
    sameSite: cookieOptions.sameSite,
    secure: cookieOptions.secure,
  });
  res.status(204).send();
});

app.use("/api/dev", requireAuth, logApiErrors);

app.get("/api/dev/admin/test-logs", requireAdmin, async (_req, res) => {
  try {
    const users = await getGameLogUserSummaries();

    res.json({ users });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

app.post("/api/dev/test-log", async (req, res) => {
  try {
    if (!isGameLogEntry(req.body.entry)) {
      res.status(400).json({ error: "The test log entry is invalid." });
      return;
    }

    await appendGameLogEntry(req.body.entry);
    res.status(204).send();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

app.get("/api/dev/sound-effect-audio", async (req, res) => {
  try {
    const key = req.query.key;
    const requestedFile = req.query.file;

    if (
      typeof key !== "string" ||
      !soundEffectKeys.includes(key as SoundEffectKey)
    ) {
      res.status(400).json({ error: "Invalid sound effect key." });
      return;
    }

    const soundEffectKey = key as SoundEffectKey;

    if (
      requestedFile !== undefined &&
      (typeof requestedFile !== "string" ||
        !(soundEffectFiles[soundEffectKey] as readonly string[]).includes(
          requestedFile,
        ))
    ) {
      res.status(400).json({ error: "Invalid sound effect file." });
      return;
    }

    const audio = await readSoundEffect(soundEffectKey, requestedFile);

    res.setHeader(
      "Cache-Control",
      requestedFile === undefined && isRandomizedSoundEffectKey(soundEffectKey)
        ? "no-store"
        : "private, max-age=86400",
    );
    res.setHeader("Content-Type", "audio/mpeg");
    res.send(audio);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      if (req.query.key === "intro") {
        res.status(204).send();
        return;
      }

      res.status(404).json({ error: "The sound effect is not available." });
      return;
    }

    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

app.get("/api/dev/sound-effects", (_req, res) => {
  res.setHeader("Cache-Control", "private, no-cache");
  res.json({ soundEffects: soundEffectFiles });
});

app.get(
  "/api/dev/admin/test-logs/:userStorageKey",
  requireAdmin,
  async (req, res) => {
    try {
      const userStorageKey = req.params.userStorageKey;

      if (typeof userStorageKey !== "string") {
        res.status(400).json({ error: "The user storage key is required." });
        return;
      }

      const entries = await readGameLogForUser(userStorageKey);

      res.json({ count: entries.length, entries });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ error: message });
    }
  },
);

app.delete(
  "/api/dev/admin/test-logs/:userStorageKey",
  requireAdmin,
  async (req, res) => {
    try {
      const userStorageKey = req.params.userStorageKey;

      if (typeof userStorageKey !== "string") {
        res.status(400).json({ error: "The user storage key is required." });
        return;
      }

      await clearGameLogForUser(userStorageKey);
      res.status(204).send();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ error: message });
    }
  },
);

app.post("/api/dev/gemini-songs", async (req, res) => {
  try {
    const players = Number(req.body.players);

    const decade =
      typeof req.body.decade === "string" ? req.body.decade.trim() : "";
    const genre =
      typeof req.body.genre === "string" ? req.body.genre.trim() : "";
    const rawLanguage =
      typeof req.body.language === "string" ? req.body.language.trim() : "hu";
    const songsPerPlayer = Number(
      req.body.songsPerPlayer ?? SONGS_PER_PLAYER,
    );
    const rawHungarianSongMode =
      typeof req.body.hungarianSongMode === "string"
        ? req.body.hungarianSongMode.trim()
        : "mixed";

    if (rawLanguage !== "hu" && rawLanguage !== "en") {
      res.status(400).json({ error: "language must be 'hu' or 'en'." });
      return;
    }

    const language = rawLanguage;

    if (
      !Number.isInteger(songsPerPlayer) ||
      songsPerPlayer < MIN_SONGS_PER_PLAYER ||
      songsPerPlayer > MAX_SONGS_PER_PLAYER
    ) {
      res.status(400).json({
        error: `songsPerPlayer must be an integer between ${MIN_SONGS_PER_PLAYER} and ${MAX_SONGS_PER_PLAYER}.`,
      });
      return;
    }

    const hungarianSongModes: HungarianSongMode[] = [
      "hungarian_only",
      "mixed",
      "foreign_only",
    ];

    if (
      !hungarianSongModes.includes(
        rawHungarianSongMode as HungarianSongMode,
      )
    ) {
      res.status(400).json({ error: "Invalid hungarianSongMode." });
      return;
    }

    const hungarianSongMode = rawHungarianSongMode as HungarianSongMode;

    if (
      !Number.isInteger(players) ||
      players < MIN_PLAYERS ||
      players > MAX_PLAYERS
    ) {
      res.status(400).json({
        error: `players must be an integer between ${MIN_PLAYERS} and ${MAX_PLAYERS}.`,
      });
      return;
    }

    if (!decade || !genre) {
      res.status(400).json({ error: "decade and genre are required." });
      return;
    }

    const request = {
      players,
      decade,
      genre,
      language,
      hungarianSongMode,
      songsPerPlayer,
    };
    const previousSongList = await readCurrentSongListIfExists();
    const previousSongs = previousSongList?.songs ?? [];
    const songHistory = await readSongHistory();
    const excludedSongs = getUniqueSongs([
      ...songHistory,
      ...shuffleSongs(previousSongs).slice(0, 40),
    ]);
    const songs = await generateSongList(request, excludedSongs);
    const savedSongList = await saveCurrentSongList(request, songs);

    res.json({
      count: savedSongList.songs.length,
      file: "runtime/users/current-song-list.json",
      data: savedSongList,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

app.get("/api/dev/current-songs", async (req, res) => {
  try {
    const savedSongList = await readCurrentSongList();
    res.json(savedSongList);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(404).json({ error: message });
  }
});

app.post("/api/dev/youtube-song", async (req, res) => {
  try {
    const artist =
      typeof req.body.artist === "string" ? req.body.artist.trim() : "";
    const title =
      typeof req.body.title === "string" ? req.body.title.trim() : "";

    if (!artist || !title) {
      res.status(400).json({ error: "artist and title are required" });
      return;
    }

    const video = await findYoutubeVideoForSong({ artist, title });

    res.json(video);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

app.post("/api/dev/enrich-next-song", async (req, res) => {
  try {
    const result = await enrichNextSongWithYoutubeData();
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

app.post("/api/dev/enrich-songs", async (req, res) => {
  try {
    const limit = Number(req.body.limit ?? 3);

    if (!Number.isInteger(limit) || limit < 1 || limit > 10) {
      res
        .status(400)
        .json({ error: "limit must be an integer between 1 and 10" });
      return;
    }
    const result = await enrichSongsWithYoutubeData(limit);
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

app.get("/api/dev/song-list-readiness", async (req, res) => {
  try {
    const songListReadiness = await getSongListReadiness();

    res.json(songListReadiness);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

app.post("/api/dev/save-current-songs-to-cache", async (req, res) => {
  try {
    const beforeCount = await countCachedTracks();
    const result = await saveCurrentSongsToCache();
    const afterCount = await countCachedTracks();

    res.json({
      beforeCount,
      afterCount,
      upserted: result.saved,
      ...result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

app.post("/api/dev/create-game-session", async (req, res) => {
  try {
    const createdGame = await createGameSessionFromCurrentSongList();
    res.json(createdGame);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

app.post("/api/dev/prepare-game-session", async (req, res) => {
  try {
    const enrichmentLimit = Number(req.body.enrichmentLimit ?? 10);
    const useCacheFallback = req.body.useCacheFallback === true;

    if (
      !Number.isInteger(enrichmentLimit) ||
      enrichmentLimit < 1 ||
      enrichmentLimit > 10
    ) {
      res.status(400).json({
        error: "enrichmentLimit must be an integer between 1 and 10.",
      });
      return;
    }
    const result = await prepareGameSession(
      enrichmentLimit,
      useCacheFallback,
    );

    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

app.post("/api/dev/start-round", async (req, res) => {
  try {
    const session = await startNextRound();

    let voice: GameVoiceInstruction | null = null;

    if (session.currentRound) {
      voice = {
        key:
          session.currentPlayerIndex === 0
            ? "round_started"
            : "next_player",
        params: {
          roundNumber: session.currentRound.roundNumber,
          playerId: session.currentRound.currentPlayer.id,
        },
      };
    }

    res.json({ session, voice });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

app.get("/api/dev/current-game-session", async (req, res) => {
  try {
    const session = await readCurrentGameSession();
    res.json(session);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      res.status(404).json({ error: "There is no current game session." });
      return;
    }

    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

app.post("/api/dev/pause-game", async (req, res) => {
  try {
    const session = await pauseGame();
    const voice: GameVoiceInstruction = {
      key: "game_paused",
    };
    res.json({ session, voice });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

app.post("/api/dev/resume-game", async (req, res) => {
  try {
    const session = await resumeGame();

    const voice = createResumeVoiceInstruction(session);

    res.json({ session, voice });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

app.post("/api/dev/finish-game", async (req, res) => {
  try {
    const session = await finishGame();

    const voice: GameVoiceInstruction = {
      key: "game_stopped",
    };

    res.json({ session, voice });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

app.post("/api/dev/end-game", async (req, res) => {
  try {
    const session = await endGame();
    res.json(session);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

app.post("/api/dev/submit-answer", async (req, res) => {
  try {
    const answer =
      typeof req.body.answer === "string" ? req.body.answer.trim() : "";

    if (!answer) {
      res.status(400).json({ error: "answer is required" });
      return;
    }

    const result = await submitAnswer(answer);

    const voice = createAnswerVoiceInstruction(result);

    res.json({ result, voice });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

app.get("/api/dev/game-summary", async (req, res) => {
  try {
    const summary = await getGameSummary();

    const voice: GameVoiceInstruction = {
      key: "game_summary",
      params: {
        playerScores: summary.leaderboard.map((player) => ({
          playerId: player.id,
          score: player.score,
        })),
        winnerIds: summary.winnerIds,
      },
    };

    res.json({ summary, voice });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

app.post("/api/dev/game-command", async (req, res) => {
  try {
    const command =
      typeof req.body.command === "string" ? req.body.command.trim() : "";

    if (command === "") {
      res.status(400).json({ error: "command is required" });
      return;
    }

    const result = await handleGameCommand(command);

    res.json({ result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

app.post(
  "/api/dev/transcribe-audio",
  upload.single("audio"),
  restoreAuthenticatedUserContext,
  async (req, res) => {
    try {
      const file = req.file;

      if (!file) {
        res.status(400).json({ error: "audio file is required" });
        return;
      }

      const rawContext =
        typeof req.body.context === "string" ? req.body.context.trim() : "";

      const rawLanguage =
        typeof req.body.language === "string" ? req.body.language.trim() : "";

      if (rawLanguage !== "hu" && rawLanguage !== "en") {
        res.status(400).json({ error: "language must be 'hu' or 'en'." });
        return;
      }

      if (!transcriptionContexts.includes(rawContext as TranscriptionContext)) {
        res.status(400).json({ error: "Invalid transcription context." });
        return;
      }

      const context = rawContext as TranscriptionContext;
      const language = rawLanguage;

      const text = await transcribeAudio(file, {
        context,
        language,
      });

      res.json({ text });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ error: message });
    }
  },
);

app.post(
  "/api/dev/submit-audio-answer",
  upload.single("audio"),
  restoreAuthenticatedUserContext,
  async (req, res) => {
    const startedAt = performance.now();

    try {
      const file = req.file;

      if (!file) {
        res.status(400).json({ error: "audio file is required" });
        return;
      }

      const session = await readCurrentGameSession();

      const transcriptionStartedAt = performance.now();
      const text = await transcribeAudio(file, {
        context: "song_answer",
        language: session.language,
      });
      const transcriptionMs = performance.now() - transcriptionStartedAt;

      const answerStartedAt = performance.now();
      const result = await submitAnswer(text);
      const answerMs = performance.now() - answerStartedAt;

      const voice = createAnswerVoiceInstruction(result);

      res.setHeader(
        "Server-Timing",
        `transcription;dur=${transcriptionMs.toFixed(1)}, judge;dur=${answerMs.toFixed(1)}`,
      );

      console.info(
        `[timing] submit audio answer total=${Math.round(performance.now() - startedAt)}ms transcription=${Math.round(transcriptionMs)}ms answer=${Math.round(answerMs)}ms skipped=${result.skipped}`,
      );

      res.json({ transcript: text, result, voice });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ error: message });
    }
  },
);

app.get("/api/dev/voice-line", async (req, res) => {
  try {
    const language = req.query.language;
    const key = req.query.key;

    if (language !== "hu" && language !== "en") {
      res.status(400).json({ error: "language must be 'hu' or 'en'." });
      return;
    }

    if (typeof key !== "string") {
      res.status(400).json({ error: "key is required." });
      return;
    }

    if (!voiceLineKeys.includes(key as VoiceLineKey)) {
      res.status(400).json({ error: "Invalid voice line key." });
      return;
    }

    const checkedLanguage: GameLanguage = language;
    const checkedKey = key as VoiceLineKey;

    if (voiceLineRequiresParams(checkedKey)) {
      res.status(400).json({
        error: "This voice line requires params. Use the POST endpoint.",
      });
      return;
    }

    const text = getVoiceLine(checkedLanguage, checkedKey);

    res.json({
      language: checkedLanguage,
      key: checkedKey,
      text,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

app.get("/api/dev/voice-line-audio", async (req, res) => {
  try {
    const language = req.query.language;
    const key = req.query.key;

    if (language !== "hu" && language !== "en") {
      res.status(400).json({ error: "language must be 'hu' or 'en'." });
      return;
    }

    if (typeof key !== "string") {
      res.status(400).json({ error: "key is required." });
      return;
    }

    if (!voiceLineKeys.includes(key as VoiceLineKey)) {
      res.status(400).json({ error: "Invalid voice line key." });
      return;
    }

    const checkedLanguage: GameLanguage = language;
    const checkedKey = key as VoiceLineKey;

    if (voiceLineRequiresParams(checkedKey)) {
      res.status(400).json({
        error: "This voice line requires params. Use the POST endpoint.",
      });
      return;
    }

    const cachedAudio = await readVoiceLineAudio(checkedLanguage, checkedKey);

    if (cachedAudio) {
      res.setHeader("Content-Type", "audio/mpeg");
      res.setHeader("X-Voice-Cache", "HIT");
      res.send(cachedAudio);
      return;
    }

    const text = getVoiceLine(checkedLanguage, checkedKey);
    const speech = await generateSpeech(text);

    await saveVoiceLineAudio(checkedLanguage, checkedKey, speech.audioBuffer);

    res.setHeader("Content-Type", speech.contentType);
    res.setHeader("X-Voice-Cache", "MISS");
    res.send(speech.audioBuffer);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

app.post("/api/dev/voice-line-preview", async (req, res) => {
  try {
    const language =
      typeof req.body.language === "string" ? req.body.language.trim() : "";

    const key = typeof req.body.key === "string" ? req.body.key.trim() : "";

    if (language !== "hu" && language !== "en") {
      res.status(400).json({ error: "language must be 'hu' or 'en'." });
      return;
    }

    const checkedLanguage: GameLanguage = language;

    if (!voiceLineKeys.includes(key as VoiceLineKey)) {
      res.status(400).json({ error: "Invalid voice line key." });
      return;
    }

    const checkedKey = key as VoiceLineKey;

    const params: VoiceLineParams =
      req.body.params &&
      typeof req.body.params === "object" &&
      !Array.isArray(req.body.params)
        ? req.body.params
        : {};

    const missingParams = getMissingVoiceLineParams(checkedKey, params);

    if (missingParams.length > 0) {
      res.status(400).json({
        error: "Required voice line parameters are missing.",
        missingParams,
      });
      return;
    }

    const text = getVoiceLine(checkedLanguage, checkedKey, params);

    res.json({ language: checkedLanguage, key: checkedKey, params, text });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

app.post("/api/dev/voice-line-audio-preview", async (req, res) => {
  try {
    const language =
      typeof req.body.language === "string" ? req.body.language.trim() : "";

    const key = typeof req.body.key === "string" ? req.body.key.trim() : "";

    if (language !== "hu" && language !== "en") {
      res.status(400).json({ error: "language must be 'hu' or 'en'." });
      return;
    }

    const checkedLanguage: GameLanguage = language;

    if (!voiceLineKeys.includes(key as VoiceLineKey)) {
      res.status(400).json({ error: "Invalid voice line key." });
      return;
    }

    const checkedKey = key as VoiceLineKey;

    const params: VoiceLineParams =
      req.body.params &&
      typeof req.body.params === "object" &&
      !Array.isArray(req.body.params)
        ? req.body.params
        : {};

    const missingParams = getMissingVoiceLineParams(checkedKey, params);

    if (missingParams.length > 0) {
      res.status(400).json({
        error: "Required voice line parameters are missing.",
        missingParams,
      });
      return;
    }

    const text = getVoiceLine(checkedLanguage, checkedKey, params);

    const startedAt = performance.now();
    const cachedAudio = await readDynamicVoiceLineAudio(
      checkedLanguage,
      text,
    );

    if (cachedAudio) {
      console.info(
        `[timing] tts key=${checkedKey} total=${Math.round(performance.now() - startedAt)}ms cache=HIT`,
      );
      res.setHeader("Content-Type", "audio/mpeg");
      res.setHeader("X-Voice-Cache", "HIT");
      res.send(cachedAudio);
      return;
    }

    const speech = await generateSpeech(text);

    await saveDynamicVoiceLineAudio(
      checkedLanguage,
      text,
      speech.audioBuffer,
    );

    console.info(
      `[timing] tts key=${checkedKey} total=${Math.round(performance.now() - startedAt)}ms cache=MISS`,
    );

    res.setHeader("Content-Type", speech.contentType);
    res.setHeader("X-Voice-Cache", "MISS");
    res.send(speech.audioBuffer);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

app.post("/api/dev/play-again", async (req, res) => {
  try {
    const setup = await prepareReplay();

    const voice: GameVoiceInstruction = {
      key: "restart_ask_decade",
    };

    res.json({ setup, voice });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

app.post("/api/dev/replay-decision", async (req, res) => {
  try {
    const answer =
      typeof req.body.answer === "string" ? req.body.answer.trim() : "";

    if (!answer) {
      res.status(400).json({ error: "answer is required" });
      return;
    }

    const result = await handleReplayDecision(answer);

    const voice: GameVoiceInstruction = {
      key: result.decision === "replay" ? "restart_ask_decade" : "game_stopped",
    };

    res.json({ result, voice });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

app.listen(PORT, () => {
  console.log(`SongQuiz backend is successfully running on port: ${PORT}`);
});
