import type { VoiceLineCatalog } from "./voiceTypes";

export const enVoiceLines: VoiceLineCatalog = {
  welcome_player_count:
    "Hi everyone! Welcome to Song Quiz! Before the game starts, tell me how many players will play.",
  ask_decade: "Which decade would you like the songs to be from?",
  ask_genre: "Which genre should the songs be from?",
  explain_rules:
    "The game is simple: I will play each player a short part of a song. When the song ends, say the artist and the song title. If neither is correct, you get 0 points. If one is correct, you get 10 points. If both are correct, you get 20 points. If it is a perfect answer, you get 25 points. Are you ready? Let's start!",
  round_started: ({ roundNumber, playerId }) =>
    `Round ${roundNumber}, Player ${playerId}, listen carefully and guess the song!`,
  next_player: ({ roundNumber, playerId }) =>
    `Round ${roundNumber}, Player ${playerId}, you're up. Listen carefully and guess the song!`,
  answer_none_correct: ({ correctArtist, correctTitle }) =>
    `Unfortunately, neither answer was correct. The correct answer was: ${correctArtist}: ${correctTitle}.`,
  answer_artist_correct: ({ correctTitle, points }) =>
    `Congratulations, you guessed the artist. The correct song title was ${correctTitle}. You scored ${points} points.`,
  answer_title_correct: ({ correctArtist, points }) =>
    `Congratulations, you guessed the song title. The correct artist was ${correctArtist}. You scored ${points} points.`,
  answer_both_correct: ({ correctArtist, correctTitle, points }) =>
    `Congratulations, your answer is correct. You get ${points} points. The perfect answer would have been ${correctArtist}: ${correctTitle}.`,
  answer_perfect: ({ points }) =>
    `Congratulations! Perfect answer! You get ${points} points!`,
  game_summary: ({ playerScores, winnerId, winnerIds }) => {
    const scoresText = playerScores
      ?.map((player) => `Player ${player.playerId} scored ${player.score}`)
      .join(", ");
    const winners = winnerIds?.length ? winnerIds : winnerId ? [winnerId] : [];
    const winnerText =
      winners.length > 1
        ? `It's a tie! The winners are ${winners
            .map((id) => `Player ${id}`)
            .join(", ")}`
        : `Player ${winners[0]} wins! Hooray!`;

    return `The game is over, ${scoresText}. ${winnerText}`;
  },
  ask_play_again: "Would you like to start a new game?",
  game_paused:
    "The game is paused. To continue, just tell me that we should continue.",
  game_stopped: "The game has been stopped. To start a new game, just tell me.",
  game_resumed: ({ roundNumber, playerId }) =>
    `The game continues. Round ${roundNumber}, Player ${playerId} is next.`,
  restart_ask_decade:
    "A new game is starting. Which decade would you like the songs to be from?",
  pass_hint: "If you do not know the answer, just say pass or skip.",
  setup_retry: "I didn't understand. Could you repeat that?",
};
