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
} from "./api/voiceApi";
import { startRound } from "./api/gameApi";
import type { GameRound } from "./types/game";
import type { GameSetupStatus } from "./types/gameSetup";
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

function isSetupCancelled(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === "AbortError" ||
      error.message === "Audio recording was cancelled.")
  );
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
  const [gameSessionId, setGameSessionId] = useState<string | null>(null);
  const [currentRound, setCurrentRound] = useState<GameRound | null>(null);
  const setupAbortControllerRef = useRef<AbortController | null>(null);

  async function setupGame(
    playerCount: number,
    decadeVoiceLineKey: StaticVoiceLineKey,
    signal: AbortSignal,
  ) {
    const decadeAnswer = await askUntilValid({
      language,
      onStatusChange: setSetupStatus,
      parseAnswer: parseMusicPeriod,
      signal,
      transcriptionContext: "decade",
      voiceLineKey: decadeVoiceLineKey,
    });

    const trimmedDecade = decadeAnswer.value;

    setDecade(trimmedDecade);
    setTranscript(decadeAnswer.transcript);

    const genreAnswer = await askUntilValid({
      language,
      onStatusChange: setSetupStatus,
      parseAnswer: parseTextAnswer,
      signal,
      transcriptionContext: "genre",
      voiceLineKey: "ask_genre",
    });

    const trimmedGenre = genreAnswer.value;

    setGenre(trimmedGenre);
    setTranscript(genreAnswer.transcript);
    setSetupStatus("generating");

    const gamePromise = generateSongs(
      {
        decade: trimmedDecade,
        genre: trimmedGenre,
        hungarianSongMode: settings.hungarianSongMode,
        language,
        players: playerCount,
        songsPerPlayer: settings.songsPerPlayer,
      },
      signal,
    ).then((response) => {
      setSetupStatus("preparing");

      return prepareGame(response.count, signal);
    });

    const preparationVoiceLineKey: StaticVoiceLineKey = settings.playRules
      ? "explain_rules"
      : "game_starting_soon";

    setIsVoicePlaying(true);

    const preparationVoicePromise = playVoiceLine(
      language,
      preparationVoiceLineKey,
      signal,
    ).finally(() => setIsVoicePlaying(false));

    const [session] = await Promise.all([gamePromise, preparationVoicePromise]);

    setGameSessionId(session.id);

    const roundResult = await startRound(signal);
    const startedRound = roundResult.session.currentRound;
    const roundVoice = roundResult.voice;

    if (startedRound === null || roundVoice === null) {
      throw new Error("The first round could not be started.");
    }

    setSetupStatus("speaking");

    await playVoiceInstruction(language, roundVoice, signal);

    setCurrentRound(startedRound);
  }

  async function handleStart() {
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
    setGameSessionId(null);
    setCurrentRound(null);

    try {
      const playerAnswer = await askUntilValid({
        language,
        onStatusChange: setSetupStatus,
        parseAnswer: parsePlayerCount,
        signal: setupController.signal,
        transcriptionContext: "player_count",
        voiceLineKey: "welcome_player_count",
      });

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

      setStartError(
        language === "hu"
          ? "Hiba történt a játék előkészítése közben"
          : "An error occurred while preparing the game.",
      );
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
    setGameSessionId(null);

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

      setStartError(
        setup.language === "hu"
          ? "Hiba történt az új játék előkészítése közben"
          : "An error occurred while preparing the new game.",
      );
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
      setIsSetupPaused(true);
      return;
    }

    if (command === "resume") {
      resumeVoicePlayback();
      setIsSetupPaused(false);
      return;
    }

    setupAbortControllerRef.current?.abort();

    if (gameSessionId !== null) {
      void sendGameCommand("end").catch((error: unknown) =>
        console.error(error),
      );
    }

    handleGameEnd();
  }

  function handleGameEnd(): void {
    setupAbortControllerRef.current?.abort();
    setupAbortControllerRef.current = null;
    resumeVoicePlayback();
    setCurrentRound(null);
    setPlayers(null);
    setDecade(null);
    setGenre(null);
    setTranscript(null);
    setGameSessionId(null);
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
