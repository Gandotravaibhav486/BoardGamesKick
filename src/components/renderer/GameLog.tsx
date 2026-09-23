"use client";

import { useEffect, useRef } from "react";

export function GameLog({ lines }: { lines: string[] }) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [lines.length]);

  return (
    <div className="flex h-full flex-col rounded-lg border border-border bg-surface">
      <div className="border-b border-border px-3 py-2 text-xs font-semibold text-ink-muted">Game log</div>
      <div className="flex-1 overflow-y-auto px-3 py-2 text-xs text-ink">
        {lines.length === 0 ? (
          <p className="text-ink-muted">No moves yet.</p>
        ) : (
          <ul className="space-y-1">
            {lines.map((line, idx) => (
              <li key={idx} className="leading-snug">
                {line}
              </li>
            ))}
          </ul>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
