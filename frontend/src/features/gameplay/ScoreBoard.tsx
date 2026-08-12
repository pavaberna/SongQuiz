import type { GamePlayer } from "../../types/game";

type ScoreBoardProps = {
  currentPlayer: GamePlayer;
  label: string;
  pointsLabel: string;
};

export function ScoreBoard({
  currentPlayer,
  label,
  pointsLabel,
}: ScoreBoardProps) {
  return (
    <section>
      <p>
        {label} {currentPlayer.id}
      </p>
      <p>
        {currentPlayer.score} {pointsLabel}
      </p>
    </section>
  );
}
