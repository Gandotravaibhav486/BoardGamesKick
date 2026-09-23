import { ButtonLink } from "@/components/ui/button";
import { Gamepad2 } from "lucide-react";

export function PlayBeforeYouBack() {
  return (
    <section className="bg-ink py-16 text-bg sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid items-center gap-10 lg:grid-cols-[1fr_auto]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-bg/10 px-3 py-1 text-xs font-medium tracking-wide text-bg/80 uppercase">
              <Gamepad2 className="size-3.5" aria-hidden />
              Play before you back
            </div>
            <h2 className="mt-4 max-w-xl text-3xl font-semibold tracking-tight sm:text-4xl">
              Every campaign leads with &ldquo;Play the game,&rdquo; not just a pitch.
            </h2>
            <p className="mt-4 max-w-xl text-bg/70">
              Campaign pages put the playable prototype first and the pledge
              second. Instead of relying on marketing copy and renders, backers
              try the actual digital prototype before deciding to fund the
              physical game.
            </p>
          </div>
          <div className="lg:justify-self-end">
            <ButtonLink href="/play/tidepool" size="lg" variant="primary">
              Try the showcase game
            </ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}
