import { useState } from "react";
import { SongPlayer } from "./SongPlayer";
import type { SubmitAudioAnswerResponse } from "../../types/answer";
import type { GameplayPhase, GameplayProps } from "../../types/gameplay";
import { recordAndSubmitAnswer } from "./recordAndSubmitAnswer";
import { playVoiceInstruction, playVoiceLine } from "../../api/voiceApi";
import { getGameSummary, startRound } from "../../api/gameApi";
import type { GameSummary } from "../../types/gameSummary";
import { listenForReplayDecision } from "./listenForReplayDecision";

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
  },
};

export function Gameplay({
  currentRound,
  language,
  onReplay,
  onRoundChange,
}: GameplayProps) {
  const text = textByLanguage[language];
  const [answerResponse, setAnswerResponse] =
    useState<SubmitAudioAnswerResponse | null>(null);
  const [gameplayError, setGameplayError] = useState<string | null>(null);
  const [phase, setPhase] = useState<GameplayPhase>("playing");
  const [gameSummary, setGameSummary] = useState<GameSummary | null>(null);

  const youtubeId = currentRound.currentSong.youtubeId;

  async function handleClipComplete() {
    setGameplayError(null);
    setPhase("answering");

    try {
      const response = await recordAndSubmitAnswer();

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
          onComplete={handleClipComplete}
          onError={(message) => setGameplayError(message)}
          startOffset={currentRound.startOffset}
          youtubeId={youtubeId}
        />
      )}

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
