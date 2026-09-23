import Link from "next/link";
import { Dices } from "lucide-react";
import { ButtonLink } from "./button";

export function SiteNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-bg/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="grid size-8 place-items-center rounded-md bg-primary text-primary-fg">
            <Dices className="size-4" aria-hidden />
          </span>
          BoardGamesKick
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2" aria-label="Primary">
          <Link
            href="/community"
            className="rounded-md px-3 py-2 text-sm font-medium text-ink-muted hover:bg-surface-2 hover:text-ink"
          >
            Explore
          </Link>
          <ButtonLink href="/create" size="sm">
            Create a game
          </ButtonLink>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border py-8 text-sm text-ink-muted">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>BoardGamesKick — describe it, play it, back it.</p>
        <p>Prototype build. Payments are simulated.</p>
      </div>
    </footer>
  );
}
