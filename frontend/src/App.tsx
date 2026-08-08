import { useState } from "react";

import { askUntilValid } from "./features/game-setup/askUntilValid";
import { GameSetup } from "./features/game-setup/GameSetup";
import { generateSongs } from "./api/songApi";
import { parsePlayerCount } from "./features/game-setup/parsePlayerCount";
import { parseTextAnswer } from "./features/game-setup/parseTextAnswer";
import { prepareGame } from "./features/game-setup/prepareGame";
import { playVoiceInstruction, playVoiceLine } from "./api/voiceApi";
import { startRound } from "./api/gameApi";
import type { GameRound } from "./types/game";
import type { GameSetupStatus } from "./types/gameSetup";
import type { GameLanguage } from "./types/language";
import { Gameplay } from "./features/gameplay/Gameplay";
import type { StaticVoiceLineKey } from "./types/voice";
import type { ReplaySetup } from "./types/replay";
import { parseMusicPeriod } from "./features/game-setup/parseMusicPeriod";

function App() {
  const [language, setLanguage] = useState<GameLanguage>("hu");
  const [setupStatus, setSetupStatus] = useState<GameSetupStatus>("idle");
  const [startError, setStartError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [players, setPlayers] = useState<number | null>(null);
  const [decade, setDecade] = useState<string | null>(null);
  const [genre, setGenre] = useState<string | null>(null);
  const [generatedSongCount, setGeneratedSongCount] = useState<number | null>(
    null,
  );
  const [gameSessionId, setGameSessionId] = useState<string | null>(null);
  const [currentRound, setCurrentRound] = useState<GameRound | null>(null);

  async function setupGame(
    playerCount: number,
    decadeVoiceLineKey: StaticVoiceLineKey,
  ) {
    const decadeAnswer = await askUntilValid({
      language,
      onStatusChange: setSetupStatus,
      parseAnswer: parseMusicPeriod,
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
      transcriptionContext: "genre",
      voiceLineKey: "ask_genre",
    });

    const trimmedGenre = genreAnswer.value;

    setGenre(trimmedGenre);
    setTranscript(genreAnswer.transcript);
    setSetupStatus("generating");

    const gamePromise = generateSongs({
      decade: trimmedDecade,
      genre: trimmedGenre,
      language,
      players: playerCount,
    }).then((response) => {
      setGeneratedSongCount(response.count);
      setSetupStatus("preparing");

      return prepareGame(response.count);
    });

    const [session] = await Promise.all([
      gamePromise,
      playVoiceLine(language, "explain_rules"),
    ]);

    setGameSessionId(session.id);

    const roundResult = await startRound();
    const startedRound = roundResult.session.currentRound;
    const roundVoice = roundResult.voice;

    if (startedRound === null || roundVoice === null) {
      throw new Error("The first round could not be started.");
    }

    setSetupStatus("speaking");

    await playVoiceInstruction(language, roundVoice);

    setCurrentRound(startedRound);
  }

  async function handleStart() {
    setDecade(null);
    setPlayers(null);
    setStartError(null);
    setTranscript(null);
    setGenre(null);
    setGeneratedSongCount(null);
    setGameSessionId(null);
    setCurrentRound(null);

    try {
      const playerAnswer = await askUntilValid({
        language,
        onStatusChange: setSetupStatus,
        parseAnswer: parsePlayerCount,
        transcriptionContext: "player_count",
        voiceLineKey: "welcome_player_count",
      });

      const parsedPlayers = playerAnswer.value;

      setTranscript(playerAnswer.transcript);
      setPlayers(parsedPlayers);
      await setupGame(parsedPlayers, "ask_decade");
    } catch (error) {
      console.error(error);

      setStartError(
        language === "hu"
          ? "Hiba történt a játék előkészítése közben"
          : "An error occurred while preparing the game.",
      );
    } finally {
      setSetupStatus("idle");
    }
  }

  async function handleReplay(setup: ReplaySetup) {
    setCurrentRound(null);
    setDecade(null);
    setGenre(null);
    setTranscript(null);
    setStartError(null);
    setGeneratedSongCount(null);
    setGameSessionId(null);

    setLanguage(setup.language);
    setPlayers(setup.players);
    try {
      await setupGame(setup.players, "restart_ask_decade");
    } catch (error) {
      console.error(error);

      setStartError(
        setup.language === "hu"
          ? "Hiba történt az új játék előkészítése közben"
          : "An error occurred while preparing the new game.",
      );
    } finally {
      setSetupStatus("idle");
    }
  }

  function handleGameEnd(): void {
    setCurrentRound(null);
    setPlayers(null);
    setDecade(null);
    setGenre(null);
    setTranscript(null);
    setGeneratedSongCount(null);
    setGameSessionId(null);
    setStartError(null);
    setSetupStatus("idle");
  }

  if (currentRound !== null) {
    return (
      <Gameplay
        currentRound={currentRound}
        language={language}
        onGameEnd={handleGameEnd}
        onReplay={handleReplay}
        onRoundChange={setCurrentRound}
      />
    );
  }

  return (
    <GameSetup
      errorMessage={startError}
      language={language}
      onLanguageChange={setLanguage}
      onStart={handleStart}
      setupStatus={setupStatus}
      transcript={transcript}
      players={players}
      decade={decade}
      genre={genre}
      generatedSongCount={generatedSongCount}
      gameSessionId={gameSessionId}
    />
  );
}

export default App;
