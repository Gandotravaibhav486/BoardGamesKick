import { ButtonLink } from "@/components/ui/button";

export function FinalCta() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
      <div className="rounded-lg border border-border bg-surface-2 px-6 py-12 text-center shadow-sm sm:px-12">
        <h2 className="text-3xl font-semibold tracking-tight text-ink">
          Ready to bring your game to the table?
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-ink-muted">
          Start with a description, or see what other designers are building
          and playtesting right now.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <ButtonLink href="/create" size="lg">
            Create a game
          </ButtonLink>
          <ButtonLink href="/community" variant="secondary" size="lg">
            Explore games
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
