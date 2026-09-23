import { Sparkles, PlayCircle, Users, Rocket } from "lucide-react";

const STEPS = [
  {
    icon: Sparkles,
    title: "Create",
    body: "Describe your game's rules, pieces, and win conditions in plain language.",
  },
  {
    icon: PlayCircle,
    title: "Play",
    body: "AI compiles your description into a validated rule spec, playable instantly on the tabletop engine.",
  },
  {
    icon: Users,
    title: "Playtest",
    body: "Publish it to the community, gather feedback, and iterate through new versions.",
  },
  {
    icon: Rocket,
    title: "Back",
    body: "Once the game plays well, take it to crowdfunding for a physical edition.",
  },
];

export function HowItWorks() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
      <div className="max-w-2xl">
        <h2 className="text-3xl font-semibold tracking-tight text-ink">
          How it works
        </h2>
        <p className="mt-3 text-ink-muted">
          From an idea to a physical game, in four steps.
        </p>
      </div>

      <div className="mt-10 grid grid-cols-2 gap-6 lg:grid-cols-4">
        {STEPS.map(({ icon: Icon, title, body }) => (
          <div key={title} className="rounded-lg border border-border bg-surface p-5 shadow-sm">
            <div className="grid size-10 place-items-center rounded-md bg-primary/10 text-primary">
              <Icon className="size-5" aria-hidden />
            </div>
            <h3 className="mt-4 font-semibold text-ink">{title}</h3>
            <p className="mt-2 text-sm text-ink-muted">{body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
