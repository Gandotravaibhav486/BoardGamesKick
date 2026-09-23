import type { PlayerState } from "@/lib/game-spec/types";
import { ScoreChip } from "@/components/renderer/ScoreChip";
import { cn } from "@/lib/cn";

export function TurnIndicator({
  players,
  activePlayerId,
  youId,
  round,
}: {
  players: PlayerState[];
  activePlayerId: string;
  youId: string;
  round: number;
}) {
  return (
    <div className="flex items-center gap-3 overflow-x-auto">
      <span className="whitespace-nowrap text-xs font-medium text-ink-muted">Round {round}</span>
      <div className="flex items-center gap-2">
        {players.map((p) => {
          const active = p.id === activePlayerId;
          return (
            <div
              key={p.id}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-2.5 py-1 transition-colors",
                active ? "border-highlight bg-highlight/20 text-ink shadow-sm" : "border-border bg-surface text-ink-muted",
              )}
            >
              <span
                className={cn("h-2 w-2 rounded-full", active ? "bg-highlight" : "bg-border")}
                aria-hidden
              />
              <span className="max-w-24 truncate text-xs font-semibold">
                {p.name}
                {p.id === youId ? " (You)" : ""}
              </span>
              <ScoreChip score={p.score} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
