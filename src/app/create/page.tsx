import { SiteFooter, SiteNav } from "@/components/ui/site-nav";
import { Card } from "@/components/ui/card";
import { CreateForm } from "@/app/create/create-form";

export const metadata = {
  title: "Create a game — BoardGamesKick",
};

const pipeline = [
  { step: "Rules", detail: "You describe the game in plain language." },
  { step: "AI compiler", detail: "Turns your description into structured data." },
  { step: "Game Spec", detail: "A machine-readable rules document." },
  { step: "Validation", detail: "Checked for consistency before it's playable." },
  { step: "Playable prototype", detail: "Open it in the tabletop and try it." },
];

export default function CreatePage() {
  return (
    <>
      <SiteNav />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
        <div className="mb-8 max-w-2xl">
          <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            Create a game
          </h1>
          <p className="mt-2 text-ink-muted">
            Describe your game in plain language. The compiler turns it into a structured spec
            you can immediately play.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
          <CreateForm />
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <Card className="p-5">
              <h2 className="text-sm font-semibold text-ink">What happens next</h2>
              <ol className="mt-4 space-y-4">
                {pipeline.map((item, i) => (
                  <li key={item.step} className="flex gap-3">
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-ink">{item.step}</p>
                      <p className="text-xs text-ink-muted">{item.detail}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <p className="mt-5 rounded-md border border-warning/30 bg-warning/10 p-3 text-xs text-ink-muted">
                Honest note: in this build the compiler is a prototype. Every submission is
                reshaped into the Tidepool showcase ruleset so you can see the pipeline end to
                end. Real AI compilation of your own rules text arrives in a later phase.
              </p>
            </Card>
          </aside>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
