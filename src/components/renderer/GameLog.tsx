"use client";

import { useEffect, useRef } from "react";
import type { LogEntry } from "@/components/renderer/describe-event";
import { cn } from "@/lib/cn";

const toneClass: Record<LogEntry["tone"], string> = {
  positive: "text-warning font-medium",
  negative: "text-error/80",
  neutral: "text-ink",
};

export function GameLog({ entries }: { entries: LogEntry[] }) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [entries.length]);

  return (
    <div className="flex h-full flex-col rounded-lg border border-border bg-surface">
      <div className="border-b border-border px-3 py-2 text-xs font-semibold text-ink-muted">Game log</div>
      <div className="flex-1 overflow-y-auto px-3 py-2 text-xs">
        {entries.length === 0 ? (
          <p className="text-ink-muted">No moves yet.</p>
        ) : (
          <ul className="space-y-1">
            {entries.map((entry) => (
              <li key={entry.id} className={cn("leading-snug", toneClass[entry.tone])}>
                {entry.text}
              </li>
            ))}
          </ul>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
