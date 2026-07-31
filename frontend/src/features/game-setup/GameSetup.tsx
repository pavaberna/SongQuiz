import { Play } from "lucide-react";

import { Button } from "../../components/ui/Button";
import { Select } from "../../components/ui/Select";
import type { GameLanguage } from "../../types/language";
import type { GameSetupProps } from "../../types/gameSetup";

const textByLanguage = {
  hu: {
    languageLabel: "Nyelv",
    startButton: "Játék indítása",
    playersLabel: "Játékosok",
    decadeLabel: "Évtized",
    genreLabel: "Műfaj",
    recordingStatus: "Hallgatlak...",
    speakingStatus: "A játék beszél...",
    transcribingStatus: "Válasz feldolgozása...",
    transcriptLabel: "Felismert válasz",
    generatingStatus: "Dalok összeállítása...",
  },
  en: {
    languageLabel: "Language",
    startButton: "Start game",
    playersLabel: "Players",
    decadeLabel: "Decade",
    genreLabel: "Genre",
    recordingStatus: "Listening...",
    speakingStatus: "The game is speaking...",
    transcribingStatus: "Processing your answer...",
    transcriptLabel: "Recognized answer",
    generatingStatus: "Preparing songs...",
  },
};

export function GameSetup({
  decade,
  genre,
  errorMessage,
  language,
  onLanguageChange,
  onStart,
  players,
  setupStatus,
  transcript,
  generatedSongCount,
}: GameSetupProps) {
  const text = textByLanguage[language];
  const isBusy = setupStatus !== "idle";

  return (
    <main className="flex min-h-dvh flex-col px-5 py-5 sm:px-8 sm:py-6">
      <header className="flex justify-end">
        <Select
          id="language"
          label={text.languageLabel}
          value={language}
          onChange={(event) =>
            onLanguageChange(event.currentTarget.value as GameLanguage)
          }
          disabled={isBusy}
        >
          <option value="hu">Magyar</option>
          <option value="en">English</option>
        </Select>
      </header>

      <section className="flex flex-1 flex-col items-center justify-center gap-8">
        <Button disabled={isBusy} onClick={onStart} size="lg">
          <Play size={22} strokeWidth={2.5} />
          {text.startButton}
        </Button>
        {setupStatus === "speaking" && <p>{text.speakingStatus}</p>}
        {setupStatus === "recording" && <p>{text.recordingStatus}</p>}
        {setupStatus === "transcribing" && <p>{text.transcribingStatus}</p>}
        {setupStatus === "generating" && <p>{text.generatingStatus}</p>}
        {transcript && (
          <p>
            {text.transcriptLabel}: {transcript}
          </p>
        )}
        {players !== null && (
          <p>
            {text.playersLabel}: {players}
          </p>
        )}
        {decade && (
          <p>
            {text.decadeLabel}: {decade}
          </p>
        )}
        {genre && (
          <p>
            {text.genreLabel}: {genre}
          </p>
        )}
        {generatedSongCount !== null && (
          <p>Generált dalok: {generatedSongCount}</p>
        )}
        {errorMessage && <p className="text-danger">{errorMessage}</p>}
      </section>
    </main>
  );
}
