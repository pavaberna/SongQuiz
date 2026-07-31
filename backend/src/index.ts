import "dotenv/config";
import express from "express";
import cors from "cors";
import { generateSongList } from "./services/geminiMusicCurator";
import {
  readCurrentSongList,
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
  handleWakeCommand,
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
  readVoiceLineAudio,
  saveVoiceLineAudio,
} from "./services/voice/voiceAudioStore";
import type { VoiceLineParams } from "./services/voice/voiceTypes";
import type { GameVoiceInstruction } from "./types/game";
import {
  createAnswerVoiceInstruction,
  createGameCommandVoiceInstruction,
  createResumeVoiceInstruction,
} from "./services/voice/gameVoiceService";
import { MAX_PLAYERS, MIN_PLAYERS } from "./config/gameRules";
import { transcriptionContexts } from "./types/speech";
import type { TranscriptionContext } from "./types/speech";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

app.get("/api/health", (req, res) => {
  res.json({ status: "OK", message: "Backend is healthy" });
});

app.post("/api/dev/gemini-songs", async (req, res) => {
  try {
    const players = Number(req.body.players);

    const decade =
      typeof req.body.decade === "string" ? req.body.decade.trim() : "";
    const genre =
      typeof req.body.genre === "string" ? req.body.genre.trim() : "";
    const rawLanguage =
      typeof req.body.language === "string" ? req.body.language.trim() : "hu";

    if (rawLanguage !== "hu" && rawLanguage !== "en") {
      res.status(400).json({ error: "language must be 'hu' or 'en'." });
      return;
    }

    const language = rawLanguage;

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

    const request = { players, decade, genre, language };
    const songs = await generateSongList(request);
    const savedSongList = await saveCurrentSongList(request, songs);

    res.json({
      count: savedSongList.songs.length,
      file: "runtime/current-song-list.json",
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
    const result = await prepareGameSession(enrichmentLimit);

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
          session.currentRound.roundNumber === 1
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
    const voice = createGameCommandVoiceInstruction(result);

    res.json({ result, voice });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

app.post("/api/dev/wake-command", async (req, res) => {
  try {
    const transcript =
      typeof req.body.transcript === "string" ? req.body.transcript.trim() : "";

    if (transcript === "") {
      res.status(400).json({ error: "transcript is required" });
      return;
    }

    const result = await handleWakeCommand(transcript);
    const voice = createGameCommandVoiceInstruction(result);

    res.json({ result, voice });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

app.post(
  "/api/dev/transcribe-audio",
  upload.single("audio"),
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
  async (req, res) => {
    try {
      const file = req.file;

      if (!file) {
        res.status(400).json({ error: "audio file is required" });
        return;
      }

      const session = await readCurrentGameSession();

      const text = await transcribeAudio(file, {
        context: "song_answer",
        language: session.language,
      });

      const result = await submitAnswer(text);

      const voice = createAnswerVoiceInstruction(result);

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

    const speech = await generateSpeech(text);

    res.setHeader("Content-Type", speech.contentType);
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
