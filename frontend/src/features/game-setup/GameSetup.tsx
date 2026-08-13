import type { ReactNode } from "react";
import {
  Calendar,
  CheckCircle2,
  LoaderCircle,
  Music,
  Users,
} from "lucide-react";

import { AppHeader } from "../../components/layout/AppHeader";
import { ListeningVisualizer } from "../../components/ui/ListeningVisualizer";
import { SpeakingVisualizer } from "../../components/ui/SpeakingVisualizer";
import { StartGameButton } from "../../components/ui/StartGameButton";
import type { GameSetupProps, GameSetupStatus } from "../../types/gameSetup";
import { GameControls } from "../gameplay/GameControls";

const textByLanguage = {
  hu: {
    title: "SONG QUIZ",
    startButton: "Játék indítása",
    playersLabel: "Játékosok",
    decadeLabel: "Évtized",
    genreLabel: "Műfaj",
    recordingStatus: "Hallgatlak...",
    speakingStatus: "A játék beszél...",
    transcribingStatus: "Válasz feldolgozása...",
    preparingStatus: "Játék előkészítése...",
    setupTitle: "Felismert beállítások",
    pause: "Szünet",
    resume: "Folytatás",
    stop: "Stop",
  },
  en: {
    title: "SONG QUIZ",
    startButton: "Start game",
    playersLabel: "Players",
    decadeLabel: "Decade",
    genreLabel: "Genre",
    recordingStatus: "Listening...",
    speakingStatus: "The game is speaking...",
    transcribingStatus: "Processing your answer...",
    preparingStatus: "Preparing game...",
    setupTitle: "Collected settings",
    pause: "Pause",
    resume: "Resume",
    stop: "End game",
  },
};

export function GameSetup({
  decade,
  genre,
  errorMessage,
  isPaused,
  isSetupActive,
  isVoicePlaying,
  language,
  onCommand,
  onLanguageChange,
  onSettingsChange,
  onStart,
  players,
  setupStatus,
  settings,
}: GameSetupProps) {
  const text = textByLanguage[language];
  const isBusy = setupStatus !== "idle";
  const statusTextBySetupStatus: Record<GameSetupStatus, string | null> = {
    generating: text.preparingStatus,
    idle: null,
    preparing: text.preparingStatus,
    recording: text.recordingStatus,
    speaking: text.speakingStatus,
    transcribing: text.transcribingStatus,
  };
  const currentStatusText = statusTextBySetupStatus[setupStatus];
  const isSpeaking = setupStatus === "speaking" || isVoicePlaying;
  const isListening = setupStatus === "recording";
  const hasSetupStarted =
    isSetupActive ||
    players !== null ||
    decade !== null ||
    genre !== null;
  const isInitialScreen = !hasSetupStarted && errorMessage === null;

  return (
    <main className="song-screen flex min-h-0 flex-1 flex-col overflow-hidden px-5 py-5 text-white sm:px-8 sm:py-6">
      <AppHeader
        centerContent={
          hasSetupStarted && errorMessage === null ? (
            <GameControls
              isPaused={isPaused}
              labels={{
                pause: text.pause,
                resume: text.resume,
                stop: text.stop,
              }}
              onCommand={onCommand}
            />
          ) : undefined
        }
        isLanguageLocked={hasSetupStarted}
        isSettingsLocked={hasSetupStarted}
        language={language}
        onHome={() => onCommand("end")}
        onLanguageChange={onLanguageChange}
        onSettingsChange={onSettingsChange}
        settings={settings}
      />

      <section className="song-fade-in relative z-10 mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-9 py-10 text-center">
        {isInitialScreen && (
          <div className="space-y-4">
            <h1 className="text-5xl font-black tracking-tight text-white drop-shadow-[0_0_30px_rgba(217,70,239,0.35)] sm:text-7xl">
              {text.title}
            </h1>
          </div>
        )}

        {isSpeaking ? (
          <SpeakingVisualizer
            isPaused={isPaused}
            label={text.speakingStatus}
          />
        ) : isListening ? (
          <ListeningVisualizer
            isPaused={isPaused}
            label={text.recordingStatus}
          />
        ) : isInitialScreen ? (
          <StartGameButton
            disabled={isBusy}
            label={text.startButton}
            onClick={onStart}
          />
        ) : null}

        {currentStatusText !== null && !isSpeaking && !isListening && (
          <div className="flex items-center gap-3 rounded-full border border-neutral-800 bg-neutral-950/75 px-4 py-2 text-sm font-semibold text-neutral-200 shadow-[0_0_18px_rgba(6,182,212,0.12)]">
            {(setupStatus === "transcribing" ||
              setupStatus === "generating" ||
              setupStatus === "preparing") && (
              <LoaderCircle className="h-4 w-4 animate-spin text-cyan-300" />
            )}
            {currentStatusText}
          </div>
        )}

        {(players !== null || decade !== null || genre !== null) && (
          <div className="w-full max-w-[480px] rounded-panel border border-neutral-800/90 bg-neutral-950/70 p-5 text-left shadow-2xl backdrop-blur">
            <div className="mb-4 flex items-center justify-between border-b border-neutral-800 pb-3">
              <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-neutral-400">
                <CheckCircle2 className="h-4 w-4 text-cyan-300" />
                {text.setupTitle}
              </span>
            </div>

            <div className="flex flex-wrap gap-2.5">
              {players !== null && (
                <SetupChip
                  color="cyan"
                  icon={<Users className="h-4 w-4" />}
                  label={`${text.playersLabel}: ${players}`}
                />
              )}
              {decade !== null && (
                <SetupChip
                  color="fuchsia"
                  icon={<Calendar className="h-4 w-4" />}
                  label={`${text.decadeLabel}: ${decade}`}
                />
              )}
              {genre !== null && (
                <SetupChip
                  color="amber"
                  icon={<Music className="h-4 w-4" />}
                  label={`${text.genreLabel}: ${genre}`}
                />
              )}
            </div>
          </div>
        )}

        {errorMessage && (
          <p className="rounded-control border border-danger/40 bg-danger/10 px-4 py-3 text-danger">
            {errorMessage}
          </p>
        )}

      </section>
    </main>
  );
}

type SetupChipColor = "amber" | "cyan" | "fuchsia";

type SetupChipProps = {
  color: SetupChipColor;
  icon: ReactNode;
  label: string;
};

const setupChipClasses: Record<SetupChipColor, string> = {
  amber: "border-amber-400/50 bg-amber-500/15 text-amber-100",
  cyan: "border-cyan-400/50 bg-cyan-500/15 text-cyan-100",
  fuchsia: "border-fuchsia-400/50 bg-fuchsia-500/15 text-fuchsia-100",
};

function SetupChip({ color, icon, label }: SetupChipProps) {
  return (
    <div
      className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-bold shadow-lg ${setupChipClasses[color]}`}
    >
      {icon}
      <span>{label}</span>
    </div>
  );
}
