import { ButtonLink } from "@/components/ui/button";

const TILE_ROWS: Array<Array<string>> = [
  ["bg-tile-ember", "bg-tile-sand", "bg-tile-tide", "bg-tile-moss"],
  ["bg-tile-tide", "bg-tile-dusk", "bg-tile-ember", "bg-tile-sand"],
  ["bg-tile-moss", "bg-tile-ember", "bg-tile-sand", "bg-tile-dusk"],
];

const GRID_FILLED = new Set([1, 3, 6, 7, 11, 13, 16, 18, 22]);

export function Hero() {
  return (
    <section className="mx-auto max-w-6xl px-4 pt-12 pb-16 sm:px-6 sm:pt-20 sm:pb-24">
      <div className="grid items-center gap-12 lg:grid-cols-2">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
            Describe your game. Play it today.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-ink-muted">
            BoardGamesKick turns a plain-language game idea into a validated Game
            Spec, then a deterministic engine makes it instantly playable. Publish
            it for the community to playtest, then crowdfund the physical
            edition &mdash; backed by real evidence that the game works.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <ButtonLink href="/create" size="lg">
              Create a game
            </ButtonLink>
            <ButtonLink href="/community" variant="secondary" size="lg">
              Explore games
            </ButtonLink>
          </div>
        </div>

        <div aria-hidden className="relative">
          <div className="rounded-lg bg-felt p-5 shadow-lg sm:p-6">
            <div className="flex flex-col gap-2">
              {TILE_ROWS.map((row, i) => (
                <div key={i} className="flex gap-2">
                  {row.map((color, j) => (
                    <div
                      key={j}
                      className={`size-6 rounded-sm ${color} shadow-sm sm:size-7`}
                    />
                  ))}
                </div>
              ))}
            </div>

            <div className="mt-5 grid grid-cols-5 gap-1.5 rounded-md bg-board p-3">
              {Array.from({ length: 25 }).map((_, i) => (
                <div
                  key={i}
                  className={`aspect-square rounded-[3px] ${
                    GRID_FILLED.has(i) ? "bg-board-ink/80" : "bg-board-line/60"
                  }`}
                />
              ))}
            </div>

            <div className="mt-5 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-highlight" />
                <span className="text-xs text-felt-line">Turn 4</span>
              </div>
              <div className="rounded-full bg-felt-2 px-3 py-1 text-xs font-semibold text-highlight">
                Score 18
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
