import type { GameLeaderboardEntry } from "../../types/gameSummary";

type GameResultsTableProps = {
  entries: GameLeaderboardEntry[];
  labels: {
    pointUnit: string;
    player: string;
    points: string;
    position: string;
  };
};

export function GameResultsTable({
  entries,
  labels,
}: GameResultsTableProps) {
  const rankedPlayers = [...entries].sort(
    (firstPlayer, secondPlayer) =>
      secondPlayer.score - firstPlayer.score ||
      firstPlayer.id - secondPlayer.id,
  );

  return (
    <div className="w-full max-w-[480px] overflow-hidden rounded-panel border border-fuchsia-400/40 bg-gradient-to-br from-fuchsia-700/80 via-purple-800/80 to-violet-950/90 shadow-[0_0_36px_rgba(217,70,239,0.28)] backdrop-blur">
      <table className="w-full border-collapse text-left text-white">
        <thead className="border-b border-white/20 bg-black/20 text-xs uppercase tracking-[0.14em] text-fuchsia-100">
          <tr>
            <th className="px-5 py-4 font-bold">{labels.position}</th>
            <th className="px-5 py-4 font-bold">{labels.player}</th>
            <th className="px-5 py-4 text-right font-bold">
              {labels.points}
            </th>
          </tr>
        </thead>

        <tbody>
          {rankedPlayers.map((player) => (
            <tr
              className="border-b border-white/10 last:border-b-0 odd:bg-white/5"
              key={player.id}
            >
              <td className="px-5 py-4 text-lg font-black">{player.rank}.</td>
              <td className="px-5 py-4 font-bold">
                {labels.player} {player.id}
              </td>
              <td className="px-5 py-4 text-right font-black">
                {player.score} {labels.pointUnit}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
