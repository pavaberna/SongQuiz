import { useCallback, useEffect, useRef, useState } from "react";
import { SongPlayer } from "./SongPlayer";
import type { SubmitAudioAnswerResponse } from "../../types/answer";
import type { GameplayPhase, GameplayProps } from "../../types/gameplay";
import { recordAndSubmitAnswer } from "./recordAndSubmitAnswer";
import {
  pauseVoicePlayback,
  playVoiceInstruction,
  playVoiceLine,
  resumeVoicePlayback,
  stopVoicePlayback,
} from "../../api/voiceApi";
import { getGameSummary, startRound } from "../../api/gameApi";
import type { GameSummary } from "../../types/gameSummary";
import { sendGameCommand } from "../../api/gameCommandApi";
import type { GameCommand } from "../../types/gameCommand";
import { GameControls } from "./GameControls";
import {
  saveGameError,
  saveGameLogEntry,
} from "../../services/gameLogStore";
import { startPlayAgain } from "../../api/replayApi";
import { AppHeader } from "../../components/layout/AppHeader";
import { GameEndControls } from "./GameEndControls";
import { GameResultsTable } from "./GameResultsTable";
import { listenForReplayDecision } from "./listenForReplayDecision";
import { getAnswerSoundEffect } from "./getAnswerSoundEffect";
import {
  pauseSoundEffects,
  playSoundEffectSafely,
  resumeSoundEffects,
  stopSoundEffects,
} from "../../services/soundEffectPlayer";
import { MAX_ANSWER_SOUND_EFFECT_DURATION_MS } from "../../config/soundEffects";

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
    stop: "Stop",
    newGame: "Újra",
    position: "Helyezés",
    pointUnit: "pont",
    score: "Pontszám",
    interrupted:
      "A játék megszakadt. A Folytatás gombbal ugyanonnan folytathatod.",
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
    newGame: "Restart",
    position: "Place",
    pointUnit: "points",
    score: "Score",
    interrupted:
      "The game was interrupted. Use Resume to continue from the same point.",
  },
};

export function Gameplay({
  currentRound,
  initiallyPaused = false,
  language,
  onGameEnd,
  onReplay,
  onRoundChange,
  onSettingsChange,
  settings,
}: GameplayProps) {
  const text = textByLanguage[language];
  const [answerResponse, setAnswerResponse] =
    useState<SubmitAudioAnswerResponse | null>(null);
  const [gameplayError, setGameplayError] = useState<string | null>(null);
  const [phase, setPhase] = useState<GameplayPhase>(
    currentRound.status === "completed" ? "result" : "playing",
  );
  const [gameSummary, setGameSummary] = useState<GameSummary | null>(null);
  const [isPaused, setIsPaused] = useState(initiallyPaused);
  const [isCommandPending, setIsCommandPending] = useState(false);

  const activePlaybackIdRef = useRef<string | null>(null);
  const answerAbortControllerRef = useRef<AbortController | null>(null);
  const answerResponseRef = useRef<SubmitAudioAnswerResponse | null>(null);
  const answeringPlaybackIdRef = useRef<string | null>(null);
  const replayAbortControllerRef = useRef<AbortController | null>(null);

  const youtubeId = currentRound.currentSong.youtubeId;
  const playbackId = [
    currentRound.roundNumber,
    currentRound.currentPlayer.id,
    youtubeId,
    currentRound.startOffset,
  ].join(":");
  activePlaybackIdRef.current = playbackId;

  const pauseGameplay = useCallback((message: string): void => {
    answerAbortControllerRef.current?.abort();
    answerAbortControllerRef.current = null;
    answeringPlaybackIdRef.current = null;
    replayAbortControllerRef.current?.abort();
    replayAbortControllerRef.current = null;
    pauseVoicePlayback();
    pauseSoundEffects();
    setGameplayError(message);
    setIsPaused(true);
  }, []);

  useEffect(() => {
    if (phase === "finished" || isPaused) {
      return;
    }

    function handleInterruption(): void {
      pauseGameplay(text.interrupted);

      void sendGameCommand("pause", { keepalive: true }).catch(
        (error: unknown) => {
          console.error(
            "The game was paused locally, but the server could not be reached.",
            error,
          );
        },
      );
    }

    function handleVisibilityChange(): void {
      if (document.visibilityState === "hidden") {
        handleInterruption();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("offline", handleInterruption);
    window.addEventListener("pagehide", handleInterruption);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("offline", handleInterruption);
      window.removeEventListener("pagehide", handleInterruption);
    };
  }, [isPaused, pauseGameplay, phase, text.interrupted]);

  function createAnswerSignal(): AbortSignal {
    answerAbortControllerRef.current?.abort();

    const controller = new AbortController();
    answerAbortControllerRef.current = controller;

    return controller.signal;
  }

  function cancelAnswerRecording(): void {
    answerAbortControllerRef.current?.abort();
    answerAbortControllerRef.current = null;
    answeringPlaybackIdRef.current = null;
  }

  function cancelReplayDecision(): void {
    replayAbortControllerRef.current?.abort();
    replayAbortControllerRef.current = null;
  }

  function handleGameplayFailure(error: unknown): void {
    const message =
      error instanceof Error ? error.message : "Unknown gameplay error.";

    saveGameError(error, "gameplay");

    pauseGameplay(`${message} ${text.interrupted}`);

    void sendGameCommand("pause").catch((pauseError: unknown) => {
      console.error("The server-side game could not be paused.", pauseError);
    });
  }

  async function handleHome(): Promise<void> {
    cancelAnswerRecording();
    cancelReplayDecision();
    stopVoicePlayback();
    stopSoundEffects();
    setIsCommandPending(true);

    try {
      await sendGameCommand("end");
    } catch (error) {
      console.error("Failed to end the current game.", error);
    } finally {
      setIsCommandPending(false);
      onGameEnd();
    }
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
      cancelReplayDecision();
      setIsPaused(true);
    }

    try {
      const response = await sendGameCommand(command);
      const completedCommand = response.result.command;

      if (completedCommand === "pause") {
        pauseVoicePlayback();
        pauseSoundEffects();
        setIsPaused(true);
        return;
      }

      if (completedCommand === "resume") {
        resumeVoicePlayback();
        resumeSoundEffects();
        setIsPaused(false);

        if (phase === "answering") {
          void handleClipComplete(playbackId, true);
        }

        if (phase === "result") {
          const pendingAnswer = answerResponseRef.current;
          const continuation =
            pendingAnswer === null
              ? startNextRound()
              : continueAfterAnswer(pendingAnswer, createAnswerSignal());

          void continuation.catch((error: unknown) => {
            if (!isCancelledError(error)) {
              handleGameplayFailure(error);
            }
          });
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
      handleGameplayFailure(error);
    } finally {
      setIsCommandPending(false);
    }
  }

  async function handleClipComplete(
    completedPlaybackId: string,
    isResumingAnswer = false,
  ) {
    const expectedPhase = isResumingAnswer ? "answering" : "playing";

    if (
      completedPlaybackId !== activePlaybackIdRef.current ||
      answeringPlaybackIdRef.current === completedPlaybackId ||
      phase !== expectedPhase ||
      (!isResumingAnswer && isPaused)
    ) {
      return;
    }

    answeringPlaybackIdRef.current = completedPlaybackId;
    setGameplayError(null);
    setPhase("answering");

    try {
      const answerSignal = createAnswerSignal();
      const response = await recordAndSubmitAnswer(answerSignal);

      answerResponseRef.current = response;
      setAnswerResponse(response);
      if (!response.result.judgeResult.perfectMatch) {
        saveGameLogEntry({
          createdAt: new Date().toISOString(),
          kind: "answer",
          roundNumber: currentRound.roundNumber,
          playerId: response.result.playerId,
          transcript: response.transcript,
          correctArtist: response.result.correctAnswer.artist,
          correctTitle: response.result.correctAnswer.title,
          pointsAwarded: response.result.pointsAwarded,
          skipped: response.result.skipped,
          judgeResult: response.result.judgeResult,
        });
      }
      setPhase("result");

      await continueAfterAnswer(response, answerSignal);
    } catch (error) {
      if (isCancelledError(error)) {
        return;
      }

      handleGameplayFailure(error);
    }
  }

  async function continueAfterAnswer(
    response: SubmitAudioAnswerResponse,
    signal: AbortSignal,
  ): Promise<void> {
    if (settings.playAnswerSoundEffects) {
      await playSoundEffectSafely(getAnswerSoundEffect(response), {
        maximumDurationMs: MAX_ANSWER_SOUND_EFFECT_DURATION_MS,
        signal,
      });
    }

    await playVoiceInstruction(language, response.voice, signal);

    if (response.result.session.status === "finished") {
      await showGameSummary();
      return;
    }

    await startNextRound();
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
    answerResponseRef.current = null;
    setGameplayError(null);
    setIsPaused(false);
    setPhase("playing");
    onRoundChange(nextRound);
  }

  async function showGameSummary() {
    cancelReplayDecision();

    const replayController = new AbortController();
    replayAbortControllerRef.current = replayController;

    const response = await getGameSummary();
    setGameSummary(response.summary);
    setPhase("finished");

    try {
      await playVoiceInstruction(
        language,
        response.voice,
        replayController.signal,
      );
      await playVoiceLine(
        language,
        "ask_play_again",
        replayController.signal,
      );

      const replayResponse = await listenForReplayDecision(
        language,
        replayController.signal,
      );

      if (replayResponse.result.decision === "replay") {
        await onReplay(replayResponse.result.setup);
        return;
      }

      await playVoiceLine(
        language,
        replayResponse.voice.key,
        replayController.signal,
      );
      onGameEnd();
    } catch (error) {
      if (!isCancelledError(error)) {
        handleGameplayFailure(error);
      }
    } finally {
      if (replayAbortControllerRef.current === replayController) {
        replayAbortControllerRef.current = null;
      }
    }
  }

  async function handlePlayAgain(): Promise<void> {
    cancelReplayDecision();
    setGameplayError(null);
    setIsCommandPending(true);

    try {
      const setup = await startPlayAgain();
      await onReplay(setup);
    } catch (error) {
      handleGameplayFailure(error);
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
              disabled={
                isCommandPending || (phase === "result" && !isPaused)
              }
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
        isSettingsLocked={phase !== "finished"}
        language={language}
        onHome={() => void handleHome()}
        onSettingsChange={onSettingsChange}
        settings={settings}
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
                isPaused={isPaused || phase !== "playing"}
                onComplete={handleClipComplete}
                onError={(message) => handleGameplayFailure(new Error(message))}
                playbackId={playbackId}
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
          <p className="w-full max-w-[480px] rounded-control border border-danger/40 bg-danger/10 px-5 py-4 text-center text-danger">
            {gameplayError}
          </p>
        )}
      </section>
    </main>
  );
}
