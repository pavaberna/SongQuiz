import { useRef, useState } from "react";

import { askUntilValid } from "./features/game-setup/askUntilValid";
import { GameSetup } from "./features/game-setup/GameSetup";
import { generateSongs } from "./api/songApi";
import { parsePlayerCount } from "./features/game-setup/parsePlayerCount";
import { parseTextAnswer } from "./features/game-setup/parseTextAnswer";
import { prepareGame } from "./features/game-setup/prepareGame";
import {
  pauseVoicePlayback,
  playVoiceInstruction,
  playVoiceLine,
  resumeVoicePlayback,
  stopVoicePlayback,
} from "./api/voiceApi";
import { startRound } from "./api/gameApi";
import type { GameRound } from "./types/game";
import type {
  GameSetupErrorStage,
  GameSetupStatus,
} from "./types/gameSetup";
import type { GameLanguage } from "./types/language";
import { Gameplay } from "./features/gameplay/Gameplay";
import type { StaticVoiceLineKey } from "./types/voice";
import type { ReplaySetup } from "./types/replay";
import { parseMusicPeriod } from "./features/game-setup/parseMusicPeriod";
import type { GameCommand } from "./types/gameCommand";
import { sendGameCommand } from "./api/gameCommandApi";
import { AppLayout } from "./components/layout/AppLayout";
import { DEFAULT_GAME_SETTINGS } from "./config/gameSettings";
import type { GameSettings } from "./types/settings";
import { unlockAudioRecording } from "./audio/recordAudio";
import { saveGameError } from "./services/gameLogStore";
import {
  pauseSoundEffects,
  playSoundEffectSafely,
  preloadSoundEffects,
  resumeSoundEffects,
  stopSoundEffects,
} from "./services/soundEffectPlayer";

function isSetupCancelled(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === "AbortError" ||
      error.message === "Audio recording was cancelled.")
  );
}

class GameSetupError extends Error {
  stage: GameSetupErrorStage;

  constructor(stage: GameSetupErrorStage, cause: unknown) {
    super(cause instanceof Error ? cause.message : "Unknown error.");
    this.name = "GameSetupError";
    this.stage = stage;
  }
}

async function runSetupStep<T>(
  stage: GameSetupErrorStage,
  operation: () => Promise<T>,
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (isSetupCancelled(error)) {
      throw error;
    }

    throw new GameSetupError(stage, error);
  }
}

const setupErrorLabels: Record<
  GameLanguage,
  Record<GameSetupErrorStage, string>
> = {
  hu: {
    decade: "Az évtized bekérése nem sikerült.",
    first_round: "Az első kör elindítása nem sikerült.",
    game_preparation: "A játszható dalok előkészítése nem sikerült.",
    genre: "A műfaj bekérése nem sikerült.",
    player_count: "A játékosok számának bekérése nem sikerült.",
    preparation_voice: "Az előkészítő szöveg lejátszása nem sikerült.",
    round_voice: "Az első kör bemondása nem sikerült.",
    song_generation: "A dalok összeállítása nem sikerült.",
  },
  en: {
    decade: "Getting the decade failed.",
    first_round: "Starting the first round failed.",
    game_preparation: "Preparing playable songs failed.",
    genre: "Getting the genre failed.",
    player_count: "Getting the player count failed.",
    preparation_voice: "Playing the preparation message failed.",
    round_voice: "Announcing the first round failed.",
    song_generation: "Generating the song list failed.",
  },
};

function getSetupErrorMessage(
  error: unknown,
  language: GameLanguage,
): string {
  if (!(error instanceof GameSetupError)) {
    return language === "hu" ? "Ismeretlen hiba történt." : "Unknown error.";
  }

  const label = setupErrorLabels[language][error.stage];
  const detailLabel = language === "hu" ? "Részletek" : "Details";

  return `${label} ${detailLabel}: ${error.message}`;
}

function App() {
  const [language, setLanguage] = useState<GameLanguage>("hu");
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_GAME_SETTINGS);
  const [setupStatus, setSetupStatus] = useState<GameSetupStatus>("idle");
  const [isSetupActive, setIsSetupActive] = useState(false);
  const [isSetupPaused, setIsSetupPaused] = useState(false);
  const [isVoicePlaying, setIsVoicePlaying] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [players, setPlayers] = useState<number | null>(null);
  const [decade, setDecade] = useState<string | null>(null);
  const [genre, setGenre] = useState<string | null>(null);
  const [currentRound, setCurrentRound] = useState<GameRound | null>(null);
  const setupAbortControllerRef = useRef<AbortController | null>(null);

  async function handleSetupFailure(
    error: unknown,
    errorLanguage: GameLanguage,
  ): Promise<void> {
    saveGameError(error, "game_setup");
    setupAbortControllerRef.current?.abort();
    stopVoicePlayback();
    stopSoundEffects();

    try {
      await sendGameCommand("end");
    } catch (cleanupError) {
      console.error("Failed to delete the current game after an error.", cleanupError);
    }

    setCurrentRound(null);
    setPlayers(null);
    setDecade(null);
    setGenre(null);
    setTranscript(null);
    setIsSetupPaused(false);
    setIsVoicePlaying(false);
    setStartError(getSetupErrorMessage(error, errorLanguage));
  }

  async function setupGame(
    playerCount: number,
    decadeVoiceLineKey: StaticVoiceLineKey,
    signal: AbortSignal,
  ) {
    const decadeAnswer = await runSetupStep("decade", () =>
      askUntilValid({
        language,
        onStatusChange: setSetupStatus,
        parseAnswer: parseMusicPeriod,
        signal,
        transcriptionContext: "decade",
        voiceLineKey: decadeVoiceLineKey,
      }),
    );

    const trimmedDecade = decadeAnswer.value;

    setDecade(trimmedDecade);
    setTranscript(decadeAnswer.transcript);

    const genreAnswer = await runSetupStep("genre", () =>
      askUntilValid({
        language,
        onStatusChange: setSetupStatus,
        parseAnswer: parseTextAnswer,
        signal,
        transcriptionContext: "genre",
        voiceLineKey: "ask_genre",
      }),
    );

    const trimmedGenre = genreAnswer.value;

    setGenre(trimmedGenre);
    setTranscript(genreAnswer.transcript);
    setSetupStatus("generating");

    const gamePromise = runSetupStep("song_generation", () =>
      generateSongs(
        {
          decade: trimmedDecade,
          genre: trimmedGenre,
          hungarianSongMode: settings.hungarianSongMode,
          language,
          players: playerCount,
          songsPerPlayer: settings.songsPerPlayer,
        },
        signal,
      ),
    ).then((response) => {
      setSetupStatus("preparing");

      return runSetupStep("game_preparation", () =>
        prepareGame(response.count, signal),
      );
    });

    const preparationVoiceLineKey: StaticVoiceLineKey = settings.playRules
      ? "explain_rules"
      : "game_starting_soon";

    setIsVoicePlaying(true);

    const preparationVoicePromise = runSetupStep("preparation_voice", () =>
      playVoiceLine(language, preparationVoiceLineKey, signal),
    ).finally(() => setIsVoicePlaying(false));

    if (settings.playRules) {
      await Promise.all([gamePromise, preparationVoicePromise]);
    } else {
      const introController = new AbortController();
      const stopIntro = () => introController.abort();

      signal.addEventListener("abort", stopIntro, { once: true });

      const introPromise = preparationVoicePromise
        .then(() =>
          playSoundEffectSafely("intro", {
            loop: true,
            signal: introController.signal,
            volume: 0.24,
          }),
        )
        .catch((error: unknown) => {
          if (!(error instanceof Error && error.name === "AbortError")) {
            throw error;
          }
        });

      try {
        await Promise.all([gamePromise, preparationVoicePromise]);
      } finally {
        stopIntro();
        signal.removeEventListener("abort", stopIntro);
        await introPromise;
      }
    }

    const roundResult = await runSetupStep("first_round", () =>
      startRound(signal),
    );
    const startedRound = roundResult.session.currentRound;
    const roundVoice = roundResult.voice;

    if (startedRound === null || roundVoice === null) {
      throw new GameSetupError(
        "first_round",
        new Error("The first round response did not contain a playable round."),
      );
    }

    setSetupStatus("speaking");

    await runSetupStep("round_voice", () =>
      playVoiceInstruction(language, roundVoice, signal),
    );

    setCurrentRound(startedRound);
  }

  async function handleStart() {
    unlockAudioRecording();
    void preloadSoundEffects([
      "microphone_off",
      "microphone_on",
    ]);

    const setupController = new AbortController();
    setupAbortControllerRef.current?.abort();
    setupAbortControllerRef.current = setupController;
    setIsSetupActive(true);
    setIsSetupPaused(false);
    resumeVoicePlayback();
    setDecade(null);
    setPlayers(null);
    setStartError(null);
    setTranscript(null);
    setGenre(null);
    setCurrentRound(null);

    try {
      const playerAnswer = await runSetupStep("player_count", () =>
        askUntilValid({
          language,
          onStatusChange: setSetupStatus,
          parseAnswer: parsePlayerCount,
          signal: setupController.signal,
          transcriptionContext: "player_count",
          voiceLineKey: "welcome_player_count",
        }),
      );

      const parsedPlayers = playerAnswer.value;

      setTranscript(playerAnswer.transcript);
      setPlayers(parsedPlayers);
      await setupGame(
        parsedPlayers,
        "ask_decade",
        setupController.signal,
      );
    } catch (error) {
      if (isSetupCancelled(error)) {
        return;
      }

      console.error(error);

      await handleSetupFailure(error, language);
    } finally {
      if (setupAbortControllerRef.current === setupController) {
        setupAbortControllerRef.current = null;
      }

      setIsSetupActive(false);
      setIsSetupPaused(false);
      setSetupStatus("idle");
      resumeVoicePlayback();
    }
  }

  async function handleReplay(setup: ReplaySetup) {
    const setupController = new AbortController();
    setupAbortControllerRef.current?.abort();
    setupAbortControllerRef.current = setupController;
    setIsSetupActive(true);
    setIsSetupPaused(false);
    resumeVoicePlayback();
    setCurrentRound(null);
    setDecade(null);
    setGenre(null);
    setTranscript(null);
    setStartError(null);

    setLanguage(setup.language);
    setPlayers(setup.players);
    try {
      await setupGame(
        setup.players,
        "restart_ask_decade",
        setupController.signal,
      );
    } catch (error) {
      if (isSetupCancelled(error)) {
        return;
      }

      console.error(error);

      await handleSetupFailure(error, setup.language);
    } finally {
      if (setupAbortControllerRef.current === setupController) {
        setupAbortControllerRef.current = null;
      }

      setIsSetupActive(false);
      setIsSetupPaused(false);
      setSetupStatus("idle");
      resumeVoicePlayback();
    }
  }

  function handleSetupCommand(command: GameCommand): void {
    if (command === "pause") {
      pauseVoicePlayback();
      pauseSoundEffects();
      setIsSetupPaused(true);
      return;
    }

    if (command === "resume") {
      resumeVoicePlayback();
      resumeSoundEffects();
      setIsSetupPaused(false);
      return;
    }

    setupAbortControllerRef.current?.abort();
    stopVoicePlayback();
    stopSoundEffects();

    void sendGameCommand("end").catch((error: unknown) =>
      console.error(error),
    );

    handleGameEnd();
  }

  function handleGameEnd(): void {
    setupAbortControllerRef.current?.abort();
    setupAbortControllerRef.current = null;
    stopVoicePlayback();
    stopSoundEffects();
    setCurrentRound(null);
    setPlayers(null);
    setDecade(null);
    setGenre(null);
    setTranscript(null);
    setStartError(null);
    setSetupStatus("idle");
    setIsSetupActive(false);
    setIsSetupPaused(false);
    setIsVoicePlaying(false);
  }

  return (
    <AppLayout language={language}>
      {currentRound !== null ? (
        <Gameplay
          currentRound={currentRound}
          language={language}
          onGameEnd={handleGameEnd}
          onReplay={handleReplay}
          onRoundChange={setCurrentRound}
          onSettingsChange={setSettings}
          settings={settings}
        />
      ) : (
        <GameSetup
          errorMessage={startError}
          isPaused={isSetupPaused}
          isSetupActive={isSetupActive}
          isVoicePlaying={isVoicePlaying}
          language={language}
          onCommand={handleSetupCommand}
          onLanguageChange={setLanguage}
          onSettingsChange={setSettings}
          onStart={handleStart}
          setupStatus={setupStatus}
          transcript={transcript}
          players={players}
          decade={decade}
          genre={genre}
          settings={settings}
        />
      )}
    </AppLayout>
  );
}

export default App;
