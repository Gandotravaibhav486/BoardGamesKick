"use client";

import { useActionState, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { createGame } from "@/app/create/actions";
import { initialCreateGameState, type CreateGameCompileFailure } from "@/app/create/form-state";

const PLAYER_COUNTS = Array.from({ length: 8 }, (_, i) => i + 1);

const RULES_PLACEHOLDER = `Example: Each round, players draft cards from a shared row of five. On your turn, take one card and add it to your tableau. Cards score points based on sets you complete. The game ends after eight rounds, and whoever has the most points wins.`;

const PROGRESS_STAGES: { atMs: number; label: string }[] = [
  { atMs: 0, label: "Reading your rules…" },
  { atMs: 3_000, label: "Mapping mechanics onto the engine…" },
  { atMs: 10_000, label: "Validating the game spec…" },
  { atMs: 25_000, label: "Still working — larger rule sets take longer…" },
];

function CompileProgress() {
  const [stageIndex, setStageIndex] = useState(0);

  useEffect(() => {
    setStageIndex(0);
    const timers = PROGRESS_STAGES.slice(1).map((stage, i) =>
      setTimeout(() => setStageIndex(i + 1), stage.atMs),
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <Card className="border-primary/30 bg-primary/5 p-4">
      <div className="flex items-center gap-3">
        <Loader2 className="size-5 shrink-0 animate-spin text-primary" aria-hidden />
        <p className="text-sm font-medium text-ink" role="status" aria-live="polite">
          {PROGRESS_STAGES[stageIndex].label}
        </p>
      </div>
    </Card>
  );
}

function CompileFailurePanel({ compile }: { compile: CreateGameCompileFailure }) {
  return (
    <Card className="border-error/30 bg-error/5 p-4">
      <h3 className="text-sm font-semibold text-ink">We couldn&apos;t compile this yet</h3>
      <p className="mt-1 text-sm text-ink-muted">
        Edit your description below to address the notes below, then try again.
      </p>
      {compile.unsupportedRules.length > 0 ? (
        <div className="mt-3">
          <p className="text-sm font-medium text-ink">Unsupported rules</p>
          <ul className="mt-1 list-inside list-disc space-y-2 text-sm text-ink-muted">
            {compile.unsupportedRules.map((rule, i) => (
              <li key={i}>
                <span className="font-medium text-ink">{rule.rule}</span> — {rule.reason}
                <br />
                <span className="text-xs">Suggestion: {rule.suggestedClarification}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {compile.issues.length > 0 ? (
        <div className="mt-3">
          <p className="text-sm font-medium text-ink">Issues</p>
          <ul className="mt-1 list-inside list-disc space-y-1 text-sm text-ink-muted">
            {compile.issues.map((issue, i) => (
              <li key={i}>{issue.message}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {compile.coverage.uncovered.length > 0 ? (
        <p className="mt-3 text-xs text-ink-muted">
          {compile.coverage.uncovered.length} sentence(s) from your description were not represented.
        </p>
      ) : null}
    </Card>
  );
}

export function CreateForm() {
  const [state, formAction, isPending] = useActionState(createGame, initialCreateGameState);
  const [pitch, setPitch] = useState(state.values.pitch);

  return (
    <Card className="p-5 sm:p-7">
      <form action={formAction} className="flex flex-col gap-6" noValidate>
        {isPending ? <CompileProgress /> : null}

        {!isPending && state.errors.form ? (
          <p role="alert" className="rounded-md border border-error/30 bg-error/10 p-3 text-sm text-error">
            {state.errors.form}
          </p>
        ) : null}

        {!isPending && state.compile ? <CompileFailurePanel compile={state.compile} /> : null}

        <fieldset disabled={isPending} className="flex flex-col gap-6">
        <Field label="Title" htmlFor="title">
          <Input
            id="title"
            name="title"
            required
            defaultValue={state.values.title}
            aria-describedby={state.errors.title ? "title-error" : undefined}
            aria-invalid={Boolean(state.errors.title)}
          />
          {state.errors.title ? (
            <p id="title-error" className="text-xs text-error">
              {state.errors.title}
            </p>
          ) : null}
        </Field>

        <Field
          label="Short pitch"
          htmlFor="pitch"
          hint={`${pitch.length}/160 characters`}
        >
          <Textarea
            id="pitch"
            name="pitch"
            required
            rows={2}
            maxLength={160}
            defaultValue={state.values.pitch}
            onChange={(e) => setPitch(e.target.value)}
            aria-describedby={state.errors.pitch ? "pitch-error" : undefined}
            aria-invalid={Boolean(state.errors.pitch)}
            placeholder="One sentence that sells the game."
          />
          {state.errors.pitch ? (
            <p id="pitch-error" className="text-xs text-error">
              {state.errors.pitch}
            </p>
          ) : null}
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Min players" htmlFor="playersMin">
            <Select
              id="playersMin"
              name="playersMin"
              defaultValue={state.values.playersMin}
              aria-describedby={state.errors.playersMin ? "playersMin-error" : undefined}
              aria-invalid={Boolean(state.errors.playersMin)}
            >
              {PLAYER_COUNTS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </Select>
            {state.errors.playersMin ? (
              <p id="playersMin-error" className="text-xs text-error">
                {state.errors.playersMin}
              </p>
            ) : null}
          </Field>
          <Field label="Max players" htmlFor="playersMax">
            <Select
              id="playersMax"
              name="playersMax"
              defaultValue={state.values.playersMax}
              aria-describedby={state.errors.playersMax ? "playersMax-error" : undefined}
              aria-invalid={Boolean(state.errors.playersMax)}
            >
              {PLAYER_COUNTS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </Select>
            {state.errors.playersMax ? (
              <p id="playersMax-error" className="text-xs text-error">
                {state.errors.playersMax}
              </p>
            ) : null}
          </Field>
        </div>

        <Field label="Estimated play time (minutes)" htmlFor="estimatedMinutes">
          <Input
            id="estimatedMinutes"
            name="estimatedMinutes"
            type="number"
            min={5}
            max={240}
            required
            defaultValue={state.values.estimatedMinutes}
            aria-describedby={state.errors.estimatedMinutes ? "estimatedMinutes-error" : undefined}
            aria-invalid={Boolean(state.errors.estimatedMinutes)}
          />
          {state.errors.estimatedMinutes ? (
            <p id="estimatedMinutes-error" className="text-xs text-error">
              {state.errors.estimatedMinutes}
            </p>
          ) : null}
        </Field>

        <Field
          label="Game description / rules in natural language"
          htmlFor="rulesText"
          hint="Write at least a few sentences. The compiler reads this to build your Game Spec."
        >
          <Textarea
            id="rulesText"
            name="rulesText"
            required
            rows={10}
            defaultValue={state.values.rulesText}
            placeholder={RULES_PLACEHOLDER}
            aria-describedby={state.errors.rulesText ? "rulesText-error" : undefined}
            aria-invalid={Boolean(state.errors.rulesText)}
          />
          {state.errors.rulesText ? (
            <p id="rulesText-error" className="text-xs text-error">
              {state.errors.rulesText}
            </p>
          ) : null}
        </Field>
        </fieldset>

        <div>
          <Button type="submit" size="lg" disabled={isPending} className="w-full sm:w-auto">
            {isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Compiling rules…
              </>
            ) : (
              "Generate game"
            )}
          </Button>
        </div>
      </form>
    </Card>
  );
}
