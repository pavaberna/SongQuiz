import { useState } from "react";

import { askAndTranscribe } from "./features/game-setup/askAndTranscribe";
import { GameSetup } from "./features/game-setup/GameSetup";
import { parsePlayerCount } from "./features/game-setup/parsePlayerCount";
import type { GameSetupStatus } from "./types/gameSetup";
import type { GameLanguage } from "./types/language";
import { generateSongs } from "./api/songApi";

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

  async function handleStart() {
    setDecade(null);
    setPlayers(null);
    setStartError(null);
    setTranscript(null);
    setGenre(null);
    setGeneratedSongCount(null);

    try {
      const playerTranscript = await askAndTranscribe({
        language,
        onStatusChange: setSetupStatus,
        voiceLineKey: "welcome_player_count",
        transcriptionContext: "player_count",
      });

      setTranscript(playerTranscript);

      const parsedPlayers = parsePlayerCount(playerTranscript);

      if (parsedPlayers === null) {
        setStartError(
          language === "hu"
            ? "Nem értettem a játékosok számát. Mondj egy számot 1 és 20 között."
            : "I could not understand the player count. Say a number between 1 and 20.",
        );
        return;
      }

      setPlayers(parsedPlayers);
      setTranscript(null);

      const decadeTranscript = await askAndTranscribe({
        language,
        onStatusChange: setSetupStatus,
        voiceLineKey: "ask_decade",
        transcriptionContext: "decade",
      });

      const trimmedDecade = decadeTranscript.trim();

      if (trimmedDecade === "") {
        setStartError(
          language === "hu"
            ? "Nem értettem az évtizedet."
            : "I could not understand the decade.",
        );
        return;
      }

      setDecade(trimmedDecade);
      setTranscript(null);

      const genreTranscript = await askAndTranscribe({
        language,
        onStatusChange: setSetupStatus,
        voiceLineKey: "ask_genre",
        transcriptionContext: "genre",
      });

      const trimmedGenre = genreTranscript.trim();

      if (trimmedGenre === "") {
        setStartError(
          language === "hu"
            ? "Nem értettem a műfajt."
            : "I could not understand the genre.",
        );
        return;
      }

      setGenre(trimmedGenre);
      setTranscript(genreTranscript);
      setSetupStatus("generating");

      const response = await generateSongs({
        decade: trimmedDecade,
        genre: trimmedGenre,
        language,
        players: parsedPlayers,
      });

      setGeneratedSongCount(response.count);
    } catch (error) {
      console.error(error);

      setStartError(
        language === "hu"
          ? "Nem sikerült feldolgozni a hangot."
          : "The audio could not be processed.",
      );
    } finally {
      setSetupStatus("idle");
    }
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
    />
  );
}

export default App;
