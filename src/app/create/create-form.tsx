"use client";

import { useActionState, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { createGame } from "@/app/create/actions";
import { initialCreateGameState } from "@/app/create/form-state";

const PLAYER_COUNTS = Array.from({ length: 8 }, (_, i) => i + 1);

const RULES_PLACEHOLDER = `Example: Each round, players draft cards from a shared row of five. On your turn, take one card and add it to your tableau. Cards score points based on sets you complete. The game ends after eight rounds, and whoever has the most points wins.`;

export function CreateForm() {
  const [state, formAction, isPending] = useActionState(createGame, initialCreateGameState);
  const [pitch, setPitch] = useState(state.values.pitch);

  return (
    <Card className="p-5 sm:p-7">
      <form action={formAction} className="flex flex-col gap-6" noValidate>
        {state.errors.form ? (
          <p role="alert" className="rounded-md border border-error/30 bg-error/10 p-3 text-sm text-error">
            {state.errors.form}
          </p>
        ) : null}

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
