import { useState } from "react";

import { askUntilValid } from "./features/game-setup/askUntilValid";
import { GameSetup } from "./features/game-setup/GameSetup";
import { generateSongs } from "./api/songApi";
import { parsePlayerCount } from "./features/game-setup/parsePlayerCount";
import { parseTextAnswer } from "./features/game-setup/parseTextAnswer";
import { prepareGame } from "./features/game-setup/prepareGame";
import { playRoundVoiceLine, playVoiceLine } from "./api/voiceApi";
import { startRound } from "./api/gameApi";
import type { GameRound } from "./types/game";
import type { GameSetupStatus } from "./types/gameSetup";
import type { GameLanguage } from "./types/language";
import { Gameplay } from "./features/gameplay/Gameplay";

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

      const decadeAnswer = await askUntilValid({
        language,
        onStatusChange: setSetupStatus,
        parseAnswer: parseTextAnswer,
        transcriptionContext: "decade",
        voiceLineKey: "ask_decade",
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
        players: parsedPlayers,
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

      await playRoundVoiceLine(language, roundVoice);

      setCurrentRound(startedRound);
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

  if (currentRound !== null) {
    return <Gameplay currentRound={currentRound} language={language} />;
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
