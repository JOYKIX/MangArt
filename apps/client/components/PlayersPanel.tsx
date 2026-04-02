import { Player } from "@mangart/shared";

export function PlayersPanel({ players }: { players: Player[] }) {
  return (
    <section className="rounded-xl bg-black/30 p-3">
      <h3 className="mb-2 text-lg font-bold">Players</h3>
      <ul className="space-y-1 text-sm">
        {players.map((player) => (
          <li key={player.id} className="flex items-center justify-between rounded bg-black/20 px-2 py-1">
            <span>
              {player.avatar} {player.username} {player.isDrawer ? "✍️" : ""}
            </span>
            <span>{player.score} pts</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
