import { Users, Clock } from "lucide-react";
import { Badge, Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { GamePreview } from "@/components/marketing/game-preview";
import { latestVersion, type GameRecord } from "@/lib/store";

export function GameCard({
  game,
  fundingPercent,
}: {
  game: GameRecord;
  /** 0-100, or undefined if no live campaign data is available for this game */
  fundingPercent?: number;
}) {
  const { presentation } = latestVersion(game);
  return (
    <Card className="flex flex-col overflow-hidden p-0">
      <GamePreview presentation={presentation} title={game.title} className="h-32 w-full" />
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-ink">{game.title}</h3>
          <Badge tone={game.status === "published" ? "success" : "warning"}>
            {game.status === "published" ? "Published" : "Draft"}
          </Badge>
        </div>
        <p className="mt-1 text-xs text-ink-muted">by {game.designer}</p>
        <p className="mt-3 line-clamp-2 text-sm text-ink-muted">{game.pitch}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge>
            <Users className="mr-1 size-3" aria-hidden />
            {game.players.min === game.players.max
              ? `${game.players.min}`
              : `${game.players.min}–${game.players.max}`}
          </Badge>
          <Badge>
            <Clock className="mr-1 size-3" aria-hidden />
            {game.estimatedMinutes} min
          </Badge>
          {typeof fundingPercent === "number" ? (
            <Badge tone="accent">{Math.round(fundingPercent)}% funded</Badge>
          ) : null}
        </div>
        <div className="mt-4 flex gap-2">
          <ButtonLink href={`/play/${game.id}`} size="sm" className="flex-1">
            Play
          </ButtonLink>
          <ButtonLink href={`/games/${game.id}`} variant="secondary" size="sm" className="flex-1">
            Details
          </ButtonLink>
        </div>
      </div>
    </Card>
  );
}
