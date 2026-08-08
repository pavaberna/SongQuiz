import { useRef, useState } from "react";
import { SongPlayer } from "./SongPlayer";
import type { SubmitAudioAnswerResponse } from "../../types/answer";
import type { GameplayPhase, GameplayProps } from "../../types/gameplay";
import { recordAndSubmitAnswer } from "./recordAndSubmitAnswer";
import { playVoiceInstruction, playVoiceLine } from "../../api/voiceApi";
import { getGameSummary, startRound } from "../../api/gameApi";
import type { GameSummary } from "../../types/gameSummary";
import { listenForReplayDecision } from "./listenForReplayDecision";
import { sendGameCommand } from "../../api/gameCommandApi";
import type { GameCommand } from "../../types/gameCommand";
import { GameControls } from "./GameControls";

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
    setGameplayError(null);
    setIsCommandPending(true);

    if (command === "pause" || command === "finish" || command === "end") {
      cancelAnswerRecording();
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
    await playVoiceLine(language, "ask_play_again");
    const replayResponse = await listenForReplayDecision(language);

    if (replayResponse.result.decision === "replay") {
      await onReplay(replayResponse.result.setup);
      return;
    }
    await playVoiceLine(language, replayResponse.voice.key);
  }

  return (
    <main>
      <h1>
        {text.round}: {currentRound.roundNumber}
      </h1>

      <p>
        {text.player}: {currentRound.currentPlayer.id}
      </p>

      <p>{text.listen}</p>

      {youtubeId !== null && phase !== "finished" && (
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

      <div className="flex gap-3">
        <GameControls
          disabled={
            isCommandPending || phase === "result" || phase === "finished"
          }
          isPaused={isPaused}
          onCommand={(command) => void handleControlCommand(command)}
        />
      </div>

      {phase === "answering" && <p>{text.answering}</p>}

      {phase === "result" && answerResponse !== null && (
        <div>
          <p>
            {text.recognizedAnswer}: {answerResponse.transcript}
          </p>

          <p>
            {text.correctAnswer}: {answerResponse.result.correctAnswer.artist} -{" "}
            {answerResponse.result.correctAnswer.title}
          </p>

          <p>
            {text.points}: {answerResponse.result.pointsAwarded}
          </p>
        </div>
      )}
      {phase === "finished" && gameSummary !== null && (
        <div>
          <h2>{text.gameOver}</h2>
          <h3>{text.ranking}</h3>

          {gameSummary.leaderboard.map((player) => (
            <p key={player.id}>
              {player.rank}. {text.player} {player.id}: {player.score}{" "}
              {text.points}
            </p>
          ))}

          <p>
            {text.winners}: {gameSummary.winnerIds.join(", ")}
          </p>
        </div>
      )}
      {gameplayError !== null && <p>{gameplayError}</p>}
    </main>
  );
}
