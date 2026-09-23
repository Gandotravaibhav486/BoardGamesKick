"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { cn } from "@/lib/cn";
import { submitFeedbackAction } from "@/app/games/[gameId]/feedback-actions";

const SCORES = [1, 2, 3, 4, 5];

function ScorePicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-ink">{label}</span>
      <div className="flex gap-1.5">
        {SCORES.map((score) => (
          <button
            key={score}
            type="button"
            onClick={() => onChange(score)}
            aria-pressed={value === score}
            className={cn(
              "flex size-9 items-center justify-center rounded-md border border-border text-sm font-medium text-ink-muted transition-colors hover:bg-surface-2",
              value === score && "border-primary bg-primary/10 text-primary",
            )}
          >
            {score}
          </button>
        ))}
      </div>
    </div>
  );
}

export function FeedbackForm({ gameId }: { gameId: string }) {
  const [author, setAuthor] = useState("You");
  const [comment, setComment] = useState("");
  const [funScore, setFunScore] = useState(4);
  const [clarityScore, setClarityScore] = useState(4);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        setSuccess(false);
        const formData = new FormData();
        formData.set("author", author);
        formData.set("comment", comment);
        formData.set("funScore", String(funScore));
        formData.set("clarityScore", String(clarityScore));
        startTransition(async () => {
          const result = await submitFeedbackAction(gameId, formData);
          if (result.error) {
            setError(result.error);
            return;
          }
          setComment("");
          setSuccess(true);
        });
      }}
      className="flex flex-col gap-4"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ScorePicker label="Fun" value={funScore} onChange={setFunScore} />
        <ScorePicker label="Clarity" value={clarityScore} onChange={setClarityScore} />
      </div>
      <Field label="Comment" htmlFor="feedback-comment" hint="At least 10 characters.">
        <Textarea
          id="feedback-comment"
          required
          minLength={10}
          rows={3}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="What worked, what was confusing, what would you change?"
        />
      </Field>
      <Field label="Name" htmlFor="feedback-author">
        <Input
          id="feedback-author"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          maxLength={40}
        />
      </Field>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending} size="sm">
          {isPending ? "Submitting…" : "Submit feedback"}
        </Button>
        {success ? <p className="text-sm text-success">Thanks for the feedback!</p> : null}
        {error ? (
          <p role="alert" className="text-sm text-error">
            {error}
          </p>
        ) : null}
      </div>
    </form>
  );
}
