import { notFound } from "next/navigation";
import { Users, Clock, Layers, CircleCheck } from "lucide-react";
import { SiteFooter, SiteNav } from "@/components/ui/site-nav";
import { Badge, Card } from "@/components/ui/card";
import { Button, ButtonLink } from "@/components/ui/button";
import { getGame, latestVersion } from "@/lib/store";
import { getCompiler } from "@/lib/compiler/mock-compiler";
import { PublishButton } from "@/app/games/[gameId]/publish-button";

export default async function GameDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ gameId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { gameId } = await params;
  const query = await searchParams;
  const game = getGame(gameId);
  if (!game) notFound();

  const version = latestVersion(game);
  const spec = version.spec;
  const justCompiled = query.compiled === "1";

  const report = justCompiled
    ? await getCompiler().compile({
        title: game.title,
        pitch: game.pitch,
        players: game.players,
        estimatedMinutes: game.estimatedMinutes,
        rulesText: game.rulesText,
      })
    : null;

  return (
    <>
      <SiteNav />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
        {justCompiled && report ? (
          <Card className="mb-8 border-success/30 bg-success/5 p-5 sm:p-6">
            <div className="flex items-center gap-2 text-success">
              <CircleCheck className="size-5" aria-hidden />
              <h2 className="text-lg font-semibold">Your game compiled</h2>
            </div>
            <p className="mt-1 text-sm text-ink-muted">
              It compiled into a playable Game Spec. Review the compiler report below before you
              share it.
            </p>
            <Card className="mt-4 p-4">
              <h3 className="text-sm font-semibold text-ink">Compiler report</h3>
              <div className="mt-3 space-y-4 text-sm">
                <div>
                  <p className="font-medium text-ink">Notes</p>
                  <ul className="mt-1 list-inside list-disc space-y-1 text-ink-muted">
                    {report.issues.map((issue, i) => (
                      <li key={i}>{issue.message}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="font-medium text-ink">Unsupported rules</p>
                  {report.unsupportedRules.length === 0 ? (
                    <p className="mt-1 text-ink-muted">None</p>
                  ) : (
                    <ul className="mt-1 list-inside list-disc space-y-1 text-ink-muted">
                      {report.unsupportedRules.map((rule, i) => (
                        <li key={i}>
                          {rule.rule} — {rule.reason}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <p className="font-medium text-ink">Rules coverage</p>
                  <p className="mt-1 text-ink-muted">
                    {report.coverage.uncovered.length} of your rule sentences are not yet
                    represented in the compiled spec.
                  </p>
                  {report.coverage.uncovered.length > 0 ? (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-sm text-primary">
                        Show sentences
                      </summary>
                      <ul className="mt-2 list-inside list-disc space-y-1 text-ink-muted">
                        {report.coverage.uncovered.map((sentence, i) => (
                          <li key={i}>{sentence}</li>
                        ))}
                      </ul>
                    </details>
                  ) : null}
                </div>
              </div>
            </Card>
          </Card>
        ) : null}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
                {game.title}
              </h1>
              <Badge tone={game.status === "published" ? "success" : "warning"}>
                {game.status === "published" ? "Published" : "Draft"}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-ink-muted">by {game.designer}</p>
            <p className="mt-3 max-w-2xl text-ink">{game.pitch}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge>
                <Users className="mr-1 size-3" aria-hidden />
                {game.players.min === game.players.max
                  ? `${game.players.min} players`
                  : `${game.players.min}–${game.players.max} players`}
              </Badge>
              <Badge>
                <Clock className="mr-1 size-3" aria-hidden />
                {game.estimatedMinutes} min
              </Badge>
              <Badge>
                <Layers className="mr-1 size-3" aria-hidden />
                {game.versions.length} version{game.versions.length === 1 ? "" : "s"}
              </Badge>
            </div>
          </div>
          <div className="flex shrink-0 flex-col gap-2 sm:items-end">
            <div className="flex flex-wrap gap-2">
              <ButtonLink href={`/play/${game.id}`} size="lg">
                Play now
              </ButtonLink>
              <ButtonLink href="/community" variant="secondary" size="lg">
                Back to community
              </ButtonLink>
            </div>
            {game.status === "draft" ? <PublishButton gameId={game.id} /> : null}
          </div>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
          <div className="flex flex-col gap-8">
            <section>
              <h2 className="text-xl font-semibold text-ink">How to play</h2>
              <div className="mt-3 space-y-3 text-sm leading-relaxed text-ink-muted">
                {game.rulesText.split(/\n+/).map((paragraph, i) => (
                  <p key={i}>{paragraph}</p>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-ink">Rule spec summary</h2>
              <Card className="mt-3 p-5">
                <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
                  <div>
                    <dt className="text-ink-muted">Entity types</dt>
                    <dd className="text-lg font-semibold text-ink">{spec.entityTypes.length}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-muted">Zones</dt>
                    <dd className="text-lg font-semibold text-ink">{spec.zones.length}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-muted">Actions</dt>
                    <dd className="text-lg font-semibold text-ink">{spec.actions.length}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-muted">Scoring rules</dt>
                    <dd className="text-lg font-semibold text-ink">{spec.scoring.length}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-muted">Players</dt>
                    <dd className="text-lg font-semibold text-ink">
                      {spec.players.min}–{spec.players.max}
                    </dd>
                  </div>
                </dl>
                <div className="mt-4">
                  <p className="text-sm text-ink-muted">Actions</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {spec.actions.map((action) => (
                      <Badge key={action.id} tone="primary">
                        {action.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              </Card>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-ink">Versions</h2>
              <ul className="mt-3 space-y-3">
                {[...game.versions].reverse().map((v) => (
                  <li key={v.version}>
                    <Card className="p-4">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-ink">Version {v.version}</p>
                        <p className="text-xs text-ink-muted">
                          {new Date(v.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <p className="mt-1 text-sm text-ink-muted">{v.notes}</p>
                    </Card>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <Card className="p-5">
              <h2 className="text-sm font-semibold text-ink">Play before you back</h2>
              <p className="mt-2 text-sm text-ink-muted">
                When this game runs a crowdfunding campaign, backers will be able to play this
                exact version before pledging. That way you know what you&apos;re backing.
              </p>
              <Button variant="secondary" size="sm" disabled className="mt-4 w-full">
                Campaign coming in a later phase
              </Button>
            </Card>
          </aside>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
