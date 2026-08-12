import { useRef, useState } from "react";
import { SongPlayer } from "./SongPlayer";
import type { SubmitAudioAnswerResponse } from "../../types/answer";
import type { GameplayPhase, GameplayProps } from "../../types/gameplay";
import { recordAndSubmitAnswer } from "./recordAndSubmitAnswer";
import { playVoiceInstruction } from "../../api/voiceApi";
import { getGameSummary, startRound } from "../../api/gameApi";
import type { GameSummary } from "../../types/gameSummary";
import { sendGameCommand } from "../../api/gameCommandApi";
import type { GameCommand } from "../../types/gameCommand";
import { GameControls } from "./GameControls";
import { saveGameLogEntry } from "../../services/gameLogStore";
import { startPlayAgain } from "../../api/replayApi";
import { AppHeader } from "../../components/layout/AppHeader";
import { GameEndControls } from "./GameEndControls";
import { GameResultsTable } from "./GameResultsTable";

const textByLanguage = {
  hu: {
    listen: "Figyelj!",
    player: "Játékos",
    round: "Kör",
    cover: "Találd el a zenét!",
    manualPlay: "Koppints a zene indításához.",
    answering: "Mondd az előadót és a dal címét!",
    correctAnswer: "Helyes válasz",
    points: "Pontok",
    recognizedAnswer: "Felismert válasz",
    gameOver: "A játék véget ért",
    ranking: "Eredmény",
    winners: "Nyertes játékosok",
    pause: "Szünet",
    resume: "Folytatás",
    stop: "Játék leállítása",
    newGame: "Új játék",
    position: "Helyezés",
    pointUnit: "pont",
    score: "Pontszám",
  },
  en: {
    listen: "Listen!",
    player: "Player",
    round: "Round",
    cover: "Guess the song!",
    manualPlay: "Tap to start the song.",
    answering: "Say the artist and song title!",
    correctAnswer: "Correct answer",
    points: "Points",
    recognizedAnswer: "Recognized answer",
    gameOver: "Game over",
    ranking: "Results",
    winners: "Winners",
    pause: "Pause",
    resume: "Resume",
    stop: "End game",
    newGame: "New game",
    position: "Place",
    pointUnit: "points",
    score: "Score",
  },
};

export function Gameplay({
  currentRound,
  language,
  onGameEnd,
  onReplay,
  onRoundChange,
}: GameplayProps) {
  const text = textByLanguage[language];
  const [answerResponse, setAnswerResponse] =
    useState<SubmitAudioAnswerResponse | null>(null);
  const [gameplayError, setGameplayError] = useState<string | null>(null);
  const [phase, setPhase] = useState<GameplayPhase>("playing");
  const [gameSummary, setGameSummary] = useState<GameSummary | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isCommandPending, setIsCommandPending] = useState(false);

  const answerAbortControllerRef = useRef<AbortController | null>(null);

  const youtubeId = currentRound.currentSong.youtubeId;

  function createAnswerSignal(): AbortSignal {
    answerAbortControllerRef.current?.abort();

    const controller = new AbortController();
    answerAbortControllerRef.current = controller;

    return controller.signal;
  }

  function cancelAnswerRecording(): void {
    answerAbortControllerRef.current?.abort();
    answerAbortControllerRef.current = null;
  }

  function isCancelledError(error: unknown): boolean {
    return (
      error instanceof Error &&
      (error.message === "Audio recording was cancelled." ||
        error.name === "AbortError")
    );
  }

  async function handleControlCommand(command: GameCommand): Promise<void> {
    const previousPausedState = isPaused;

    setGameplayError(null);
    setIsCommandPending(true);

    if (command === "pause" || command === "finish" || command === "end") {
      cancelAnswerRecording();
    }

    if (command === "end") {
      setIsPaused(true);
    }

    try {
      const response = await sendGameCommand(command);
      const completedCommand = response.result.command;

      if (completedCommand === "pause") {
        setIsPaused(true);
        return;
      }

      if (completedCommand === "resume") {
        setIsPaused(false);

        if (phase === "answering") {
          void handleClipComplete();
        }

        return;
      }

      setIsPaused(true);

      if (completedCommand === "finish") {
        await showGameSummary();
        return;
      }

      onGameEnd();
    } catch (error) {
      setIsPaused(previousPausedState);

      const message =
        error instanceof Error
          ? error.message
          : "The game command could not be handled.";

      setGameplayError(message);
    } finally {
      setIsCommandPending(false);
    }
  }

  async function handleClipComplete() {
    setGameplayError(null);
    setPhase("answering");

    try {
      const response = await recordAndSubmitAnswer(createAnswerSignal());

      setAnswerResponse(response);
      saveGameLogEntry({
        createdAt: new Date().toISOString(),
        kind: "answer",
        roundNumber: currentRound.roundNumber,
        playerId: response.result.playerId,
        transcript: response.transcript,
        correctArtist: response.result.correctAnswer.artist,
        correctTitle: response.result.correctAnswer.title,
        pointsAwarded: response.result.pointsAwarded,
        judgeResult: response.result.judgeResult,
      });
      setPhase("result");
      try {
        await playVoiceInstruction(language, response.voice);
      } catch (voiceError) {
        const message =
          voiceError instanceof Error
            ? voiceError.message
            : "The answer voice could not be played.";

        setGameplayError(message);
        return;
      }

      if (response.result.session.status === "finished") {
        await showGameSummary();
        return;
      }

      await startNextRound();
    } catch (error) {
      if (isCancelledError(error)) {
        return;
      }

      const message =
        error instanceof Error ? error.message : "Unknown gameplay error.";

      setGameplayError(message);
      setPhase("error");
    }
  }

  async function startNextRound() {
    const response = await startRound();
    const nextRound = response.session.currentRound;
    const nextRoundVoice = response.voice;

    if (nextRound === null || nextRoundVoice === null) {
      throw new Error("The next round could not be started.");
    }

    await playVoiceInstruction(language, nextRoundVoice);

    setAnswerResponse(null);
    setGameplayError(null);
    setIsPaused(false);
    setPhase("playing");
    onRoundChange(nextRound);
  }

  async function showGameSummary() {
    const response = await getGameSummary();
    setGameSummary(response.summary);
    setPhase("finished");
    await playVoiceInstruction(language, response.voice);
  }

  async function handlePlayAgain(): Promise<void> {
    setGameplayError(null);
    setIsCommandPending(true);

    try {
      const setup = await startPlayAgain();
      await onReplay(setup);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "The new game could not be started.";

      setGameplayError(message);
    } finally {
      setIsCommandPending(false);
    }
  }

  return (
    <main className="song-screen flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-5 text-foreground sm:px-8 sm:py-6">
      <AppHeader
        centerContent={
          phase === "finished" ? (
            <GameEndControls
              disabled={isCommandPending}
              newGameLabel={text.newGame}
              onEnd={() => void handleControlCommand("end")}
              onNewGame={() => void handlePlayAgain()}
              stopLabel={text.stop}
            />
          ) : (
            <GameControls
              disabled={isCommandPending || phase === "result"}
              isPaused={isPaused}
              labels={{
                pause: text.pause,
                resume: text.resume,
                stop: text.stop,
              }}
              onCommand={(command) => void handleControlCommand(command)}
            />
          )
        }
        isLanguageLocked
        language={language}
      />

      <section className="song-fade-in flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-5 self-center py-6">
        {phase !== "finished" && (
          <div className="flex w-full max-w-[480px] flex-col items-center gap-5">
            <div className="flex w-full items-center justify-between rounded-2xl border border-neutral-800 bg-neutral-950/75 px-5 py-3 shadow-[0_0_24px_rgba(217,70,239,0.14)] backdrop-blur">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-cyan-300">
                {text.round}: {currentRound.roundNumber}
              </p>

              <p className="text-sm font-black uppercase tracking-[0.18em] text-fuchsia-300">
                {text.player}: {currentRound.currentPlayer.id}
              </p>
            </div>

            {youtubeId !== null && (
              <SongPlayer
                clipDuration={currentRound.clipDuration}
                coverText={text.cover}
                manualPlayText={text.manualPlay}
                isCovered={phase !== "result"}
                isPaused={isPaused}
                onComplete={handleClipComplete}
                onError={(message) => setGameplayError(message)}
                startOffset={currentRound.startOffset}
                youtubeId={youtubeId}
              />
            )}

          </div>
        )}

        {phase === "answering" && (
          <p className="w-full max-w-[480px] rounded-full border border-fuchsia-400/30 bg-fuchsia-950/30 px-4 py-2 text-center text-sm font-bold uppercase tracking-[0.16em] text-fuchsia-100">
            {text.answering}
          </p>
        )}

        {phase === "result" && answerResponse !== null && (
          <div className="w-full max-w-[480px] rounded-2xl border border-cyan-400/30 bg-neutral-950/80 px-5 py-5 text-center shadow-[0_0_30px_rgba(6,182,212,0.16)] backdrop-blur">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-300">
              {text.correctAnswer}
            </p>

            <p className="mt-2 text-xl font-black text-white">
              {answerResponse.result.correctAnswer.artist} -{" "}
              {answerResponse.result.correctAnswer.title}
            </p>

            <p className="mt-4 text-lg font-black text-amber-300">
              {answerResponse.result.pointsAwarded} {text.points}
            </p>
          </div>
        )}

        {phase === "finished" && gameSummary !== null && (
          <div className="flex w-full max-w-2xl flex-col items-center gap-6">
            <h1 className="bg-gradient-to-r from-fuchsia-300 via-purple-200 to-cyan-300 bg-clip-text text-4xl font-black tracking-tight text-transparent">
              {text.gameOver}
            </h1>

            <GameResultsTable
              entries={gameSummary.leaderboard}
              labels={{
                pointUnit: text.pointUnit,
                player: text.player,
                points: text.score,
                position: text.position,
              }}
            />
          </div>
        )}

        {gameplayError !== null && (
          <p className="text-center text-danger">{gameplayError}</p>
        )}
      </section>
    </main>
  );
}
