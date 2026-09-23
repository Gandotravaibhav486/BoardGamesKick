import { Search, Users, Clock } from "lucide-react";
import { SiteFooter, SiteNav } from "@/components/ui/site-nav";
import { Badge, Card } from "@/components/ui/card";
import { Button, ButtonLink } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listGames, type GameRecord } from "@/lib/store";

function GameCard({ game }: { game: GameRecord }) {
  return (
    <Card className="flex flex-col p-5">
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
      </div>
      <div className="mt-4 flex gap-2">
        <ButtonLink href={`/play/${game.id}`} size="sm" className="flex-1">
          Play
        </ButtonLink>
        <ButtonLink href={`/games/${game.id}`} variant="secondary" size="sm" className="flex-1">
          Details
        </ButtonLink>
      </div>
    </Card>
  );
}

export default async function CommunityPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const q = typeof query.q === "string" ? query.q.trim().toLowerCase() : "";

  const games = listGames();
  const showcase = games.find((g) => g.isShowcase);
  const published = games.filter((g) => g.status === "published" && !g.isShowcase);
  const drafts = games.filter((g) => g.status === "draft");

  const matches = (g: GameRecord) =>
    !q || g.title.toLowerCase().includes(q) || g.pitch.toLowerCase().includes(q);

  const filteredPublished = published.filter(matches);
  const showcaseMatches = showcase ? matches(showcase) : false;

  return (
    <>
      <SiteNav />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            Explore games
          </h1>
          <p className="mt-2 text-ink-muted">
            Browse published prototypes from the community and play them before anyone backs a
            campaign.
          </p>
        </div>

        <form className="mt-6 flex max-w-md gap-2" role="search">
          <label htmlFor="q" className="sr-only">
            Search games
          </label>
          <Input id="q" name="q" defaultValue={q} placeholder="Search by title or pitch" />
          <Button type="submit" variant="secondary" size="md" aria-label="Search">
            <Search className="size-4" aria-hidden />
          </Button>
        </form>

        {showcase && showcaseMatches ? (
          <section className="mt-10">
            <h2 className="text-xl font-semibold text-ink">Featured</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <GameCard game={showcase} />
            </div>
          </section>
        ) : null}

        <section className="mt-10">
          <h2 className="text-xl font-semibold text-ink">All games</h2>
          {filteredPublished.length === 0 ? (
            <Card className="mt-4 p-8 text-center">
              {q ? (
                <>
                  <p className="text-ink">No games match your search.</p>
                  <p className="mt-1 text-sm text-ink-muted">
                    Try a different term, or{" "}
                    <a href="/community" className="text-primary underline">
                      clear the search
                    </a>
                    .
                  </p>
                </>
              ) : (
                <>
                  <p className="text-ink">No community games have been published yet.</p>
                  <p className="mt-1 text-sm text-ink-muted">
                    Be the first:{" "}
                    <a href="/create" className="text-primary underline">
                      create a game
                    </a>{" "}
                    and publish it.
                  </p>
                </>
              )}
            </Card>
          ) : (
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredPublished.map((game) => (
                <GameCard key={game.id} game={game} />
              ))}
            </div>
          )}
        </section>

        {drafts.length > 0 ? (
          <section className="mt-10">
            <h2 className="text-xl font-semibold text-ink">Your drafts</h2>
            <p className="mt-1 text-sm text-ink-muted">
              Drafts are only visible to you until you publish them.
            </p>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {drafts.filter(matches).map((game) => (
                <GameCard key={game.id} game={game} />
              ))}
            </div>
          </section>
        ) : null}
      </main>
      <SiteFooter />
    </>
  );
}
