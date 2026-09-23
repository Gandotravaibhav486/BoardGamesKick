"use client";

import { cn } from "@/lib/cn";

export type MobileTab = "my-area" | "table" | "opponents" | "log";

const tabs: { id: MobileTab; label: string }[] = [
  { id: "my-area", label: "My Area" },
  { id: "table", label: "Table" },
  { id: "opponents", label: "Opponents" },
  { id: "log", label: "Log" },
];

export function MobileTabs({ active, onChange }: { active: MobileTab; onChange: (tab: MobileTab) => void }) {
  return (
    <div
      role="tablist"
      aria-label="Tabletop sections"
      className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      {tabs.map((tab) => {
        const selected = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(tab.id)}
            className={cn(
              "flex min-h-11 items-center justify-center px-2 py-3 text-xs font-medium transition-colors",
              selected ? "text-primary" : "text-ink-muted",
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
