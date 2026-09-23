"use client";

import { Button } from "@/components/ui/button";

export interface PendingMoveSummary {
  description: string;
}

export interface ActionBarProps {
  isYourTurn: boolean;
  pending?: PendingMoveSummary;
  onConfirm?: () => void;
  onCancel?: () => void;
  onSimulateOpponent?: () => void;
  hint?: string;
  inlineMessage?: string;
}

export function ActionBar({
  isYourTurn,
  pending,
  onConfirm,
  onCancel,
  onSimulateOpponent,
  hint,
  inlineMessage,
}: ActionBarProps) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3">
      {pending ? (
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
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-ink-muted">Waiting on another player&apos;s turn.</p>
          <Button size="sm" variant="secondary" onClick={onSimulateOpponent}>
            Simulate opponent turn
          </Button>
        </div>
      )}
      {inlineMessage && <p className="text-xs font-medium text-error">{inlineMessage}</p>}
    </div>
  );
}
