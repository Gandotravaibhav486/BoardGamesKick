"use client";

import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export interface PendingMoveSummary {
  description: string;
}

export interface ActionBarProps {
  isYourTurn: boolean;
  gameOver?: boolean;
  activePlayerName?: string;
  pending?: PendingMoveSummary;
  onConfirm?: () => void;
  onCancel?: () => void;
  hint?: string;
  inlineMessage?: string;
}

export function ActionBar({
  isYourTurn,
  gameOver,
  activePlayerName,
  pending,
  onConfirm,
  onCancel,
  hint,
  inlineMessage,
}: ActionBarProps) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3">
      {gameOver ? (
        <p className="text-sm text-ink-muted">Game over.</p>
      ) : pending ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-medium text-ink">{pending.description}</span>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
            <Button size="sm" onClick={onConfirm}>
              Confirm
            </Button>
          </div>
        </div>
      ) : isYourTurn ? (
        <p className="text-sm text-ink-muted">{hint ?? "Select a group of tiles from the table to begin."}</p>
      ) : (
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-ink-muted" aria-hidden />
          <p className="text-sm text-ink-muted">{activePlayerName ?? "Another player"} is thinking…</p>
        </div>
      )}
      {inlineMessage && <p className="text-xs font-medium text-error">{inlineMessage}</p>}
    </div>
  );
}
