"use client";

import { useState, useTransition } from "react";
import { ThumbsUp } from "lucide-react";
import { cn } from "@/lib/cn";
import { upvoteFeedbackAction } from "@/app/games/[gameId]/feedback-actions";

export function FeedbackUpvoteButton({
  id,
  gameId,
  upvotes,
}: {
  id: string;
  gameId: string;
  upvotes: number;
}) {
  const [count, setCount] = useState(upvotes);
  const [voted, setVoted] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending || voted}
      onClick={() => {
        setCount((c) => c + 1);
        setVoted(true);
        startTransition(async () => {
          await upvoteFeedbackAction(id, gameId);
        });
      }}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs font-medium text-ink-muted transition-colors hover:bg-surface-2 disabled:cursor-default",
        voted && "border-primary/30 bg-primary/10 text-primary",
      )}
    >
      <ThumbsUp className="size-3.5" aria-hidden />
      {count}
    </button>
  );
}
