import { FileJson2, ShieldCheck, LayoutGrid } from "lucide-react";

const POINTS = [
  {
    icon: FileJson2,
    title: "Structured rule data, not code",
    body: "The AI produces a structured Game Spec of rules, components, and win conditions. It never generates or executes arbitrary code.",
  },
  {
    icon: ShieldCheck,
    title: "Validated before it's playable",
    body: "Every spec is checked for consistency and completeness before it can be played by anyone.",
  },
  {
    icon: LayoutGrid,
    title: "One engine, every game",
    body: "The same generic tabletop engine renders every game on the platform from its spec.",
  },
];

export function Trust() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
      <div className="max-w-2xl">
        <h2 className="text-3xl font-semibold tracking-tight text-ink">
          Built on a rules engine, not generated code
        </h2>
      </div>
      <div className="mt-10 grid gap-8 sm:grid-cols-3">
        {POINTS.map(({ icon: Icon, title, body }) => (
          <div key={title}>
            <Icon className="size-6 text-accent" aria-hidden />
            <h3 className="mt-3 font-semibold text-ink">{title}</h3>
            <p className="mt-2 text-sm text-ink-muted">{body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
