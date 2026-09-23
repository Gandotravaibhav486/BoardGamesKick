"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { publishGame } from "@/app/create/actions";

export function PublishButton({ gameId }: { gameId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-start gap-2">
      <Button
        variant="secondary"
        disabled={isPending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await publishGame(gameId);
            if (result.error) setError(result.error);
          });
        }}
      >
        {isPending ? "Publishing…" : "Publish to community"}
      </Button>
      {error ? (
        <p role="alert" className="text-xs text-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
