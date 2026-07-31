import type { GameplayProps } from "../../types/gameplay";

const textByLanguage = {
  hu: {
    listen: "Figyelj!",
    player: "Játékos",
    round: "Kör",
  },
  en: {
    listen: "Listen!",
    player: "Player",
    round: "Round",
  },
};

export function Gameplay({ currentRound, language }: GameplayProps) {
  const text = textByLanguage[language];

  return (
    <main>
      <h1>
        {text.round}: {currentRound.roundNumber}
      </h1>

      <p>
        {text.player}: {currentRound.currentPlayer.id}
      </p>

      <p>{text.listen}</p>
    </main>
  );
}
