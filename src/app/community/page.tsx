import { Search } from "lucide-react";
import { SiteFooter, SiteNav } from "@/components/ui/site-nav";
import { Badge, Card } from "@/components/ui/card";
import { Button, ButtonLink } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GamePreview } from "@/components/marketing/game-preview";
import { GameCard } from "@/components/marketing/game-card";
import * as store from "@/lib/store";
import { latestVersion, listGames, type GameRecord } from "@/lib/store";

/**
 * A campaign getter may be added by a concurrent workstream. Read it
 * defensively so this page keeps working whether or not it exists yet,
 * and so we never fabricate funding numbers.
 */
function fundingPercentFor(gameId: string): number | undefined {
  const getter = (store as Record<string, unknown>).getOrCreateCampaign;
  if (typeof getter !== "function") return undefined;
  const campaign = getter(gameId) as
    | { raisedCents?: number; goalCents?: number }
    | null
    | undefined;
  if (!campaign) return undefined;
  const { raisedCents, goalCents } = campaign;
  if (typeof raisedCents !== "number" || typeof goalCents !== "number" || goalCents <= 0) {
    return undefined;
  }
  return Math.min(100, Math.max(0, (raisedCents / goalCents) * 100));
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
          <section className="mt-12">
            <h2 className="text-xl font-semibold text-ink">Featured</h2>
            <Card className="mt-4 grid grid-cols-1 overflow-hidden p-0 md:grid-cols-2">
              <GamePreview
                presentation={latestVersion(showcase).presentation}
                title={showcase.title}
                size="lg"
                className="h-56 w-full md:h-full"
              />
              <div className="flex flex-col justify-center p-6 sm:p-8">
                <Badge tone="primary" className="w-fit">
                  Curated pick
                </Badge>
                <h3 className="mt-3 text-2xl font-semibold text-ink">{showcase.title}</h3>
                <p className="mt-1 text-sm text-ink-muted">by {showcase.designer}</p>
                <p className="mt-3 text-sm text-ink-muted">{showcase.pitch}</p>
                <p className="mt-3 text-sm text-ink-muted">
                  Why we picked it: a tight, public-drafting core that plays fast and rewards
                  reading the table.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge>
                    {showcase.players.min === showcase.players.max
                      ? `${showcase.players.min} players`
                      : `${showcase.players.min}–${showcase.players.max} players`}
                  </Badge>
                  <Badge>{showcase.estimatedMinutes} min</Badge>
                  {(() => {
                    const pct = fundingPercentFor(showcase.id);
                    return typeof pct === "number" ? (
                      <Badge tone="accent">{Math.round(pct)}% funded</Badge>
                    ) : null;
                  })()}
                </div>
                <div className="mt-6 flex gap-2">
                  <ButtonLink href={`/play/${showcase.id}`} className="flex-1">
                    Play now
                  </ButtonLink>
                  <ButtonLink href={`/games/${showcase.id}`} variant="secondary" className="flex-1">
                    Details
                  </ButtonLink>
                </div>
              </div>
            </Card>
          </section>
        ) : null}

        <section className="mt-12">
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
            <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filteredPublished.map((game) => (
                <GameCard key={game.id} game={game} fundingPercent={fundingPercentFor(game.id)} />
              ))}
            </div>
          )}
        </section>

        {drafts.length > 0 ? (
          <section className="mt-12">
            <h2 className="text-xl font-semibold text-ink">Your drafts</h2>
            <p className="mt-1 text-sm text-ink-muted">
              Drafts are only visible to you until you publish them.
            </p>
            <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {drafts.filter(matches).map((game) => (
                <GameCard key={game.id} game={game} fundingPercent={fundingPercentFor(game.id)} />
              ))}
            </div>
          </section>
        ) : null}
      </main>
      <SiteFooter />
    </>
  );
}
