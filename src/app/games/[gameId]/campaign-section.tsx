"use client";

import { useMemo, useState, useTransition } from "react";
import { Gamepad2, Eye, HandCoins, ArrowRight, Users, CalendarClock } from "lucide-react";
import { Card, Badge } from "@/components/ui/card";
import { Button, ButtonLink } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import { cn } from "@/lib/cn";
import { backGameAction } from "@/app/games/[gameId]/campaign-actions";
import type { Campaign, RewardTier } from "@/lib/store";

function formatCents(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function daysRemaining(deadline: string): number {
  const ms = new Date(deadline).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

export function PlayBeforeYouBackBand({ gameId }: { gameId: string }) {
  const steps = [
    { icon: Gamepad2, label: "Play", detail: "Try the exact ruleset in the browser" },
    { icon: Eye, label: "Understand", detail: "See how it feels before you pledge" },
    { icon: HandCoins, label: "Back", detail: "Choose a reward and confirm" },
  ];
  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-surface to-surface p-6 sm:p-7">
      <h2 className="text-xl font-semibold text-ink sm:text-2xl">Play before you back</h2>
      <p className="mt-2 max-w-xl text-sm text-ink-muted">
        Every campaign on BoardGamesKick ships with a playable prototype. Try the real ruleset
        first, then decide whether it earns your pledge.
      </p>
      <div className="mt-6 flex flex-wrap items-center gap-3 sm:gap-4">
        {steps.map((step, i) => (
          <div key={step.label} className="flex items-center gap-3 sm:gap-4">
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="flex size-12 items-center justify-center rounded-full border border-primary/30 bg-surface text-primary shadow-sm">
                <step.icon className="size-5" aria-hidden />
              </div>
              <div>
                <p className="text-sm font-semibold text-ink">{step.label}</p>
                <p className="max-w-[9rem] text-xs text-ink-muted">{step.detail}</p>
              </div>
            </div>
            {i < steps.length - 1 ? (
              <ArrowRight className="size-5 shrink-0 text-ink-muted/50" aria-hidden />
            ) : null}
          </div>
        ))}
      </div>
      <ButtonLink href={`/play/${gameId}?from=campaign`} size="lg" className="mt-6 w-full sm:w-auto">
        Play the game
      </ButtonLink>
    </Card>
  );
}

function TierRow({
  tier,
  selected,
  onSelect,
}: {
  tier: RewardTier;
  selected: boolean;
  onSelect: () => void;
}) {
  const soldOut = tier.limited !== undefined && tier.claimed >= tier.limited;
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-md border border-border p-3 transition-colors",
        selected && "border-primary bg-primary/5",
        soldOut && "cursor-not-allowed opacity-60",
      )}
    >
      <input
        type="radio"
        name="tierId"
        value={tier.id}
        checked={selected}
        disabled={soldOut}
        onChange={onSelect}
        className="mt-1 accent-primary"
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="font-medium text-ink">{tier.title}</p>
          <p className="text-sm font-semibold text-ink">{formatCents(tier.amountCents)}</p>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-ink-muted">{tier.description}</p>
        <p className="mt-1 text-xs text-ink-muted">
          {soldOut
            ? "Sold out"
            : tier.limited !== undefined
              ? `${tier.claimed} of ${tier.limited} claimed`
              : `${tier.claimed} backed`}
        </p>
      </div>
    </label>
  );
}

export function CampaignCard({
  gameId,
  gameTitle,
  campaign,
}: {
  gameId: string;
  gameTitle: string;
  campaign: Campaign;
}) {
  const raisedCents = useMemo(
    () => campaign.backers.reduce((sum, b) => sum + b.amountCents, 0),
    [campaign.backers],
  );
  const pct = Math.min(100, Math.round((raisedCents / campaign.goalCents) * 100));
  const days = daysRemaining(campaign.deadline);

  const [showForm, setShowForm] = useState(false);
  const [selectedTierId, setSelectedTierId] = useState<string | null>(null);
  const [backerName, setBackerName] = useState("You");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ tier: RewardTier } | null>(null);

  const selectedTier = campaign.rewardTiers.find((t) => t.id === selectedTierId) ?? null;

  function handleConfirm() {
    if (!selectedTier) {
      setError("Choose a reward tier to back this game.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await backGameAction(gameId, selectedTier.id, backerName);
      if (result.error) {
        setError(result.error);
        return;
      }
      setSuccess({ tier: selectedTier });
    });
  }

  return (
    <section id="campaign">
      <Card className="p-5 sm:p-6">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-ink">Fund {gameTitle}</h2>
          <Badge tone={campaign.status === "funded" ? "success" : "primary"}>
            {campaign.status === "funded" ? "Funded" : "Live"}
          </Badge>
        </div>
        <p className="mt-1 text-xs text-ink-muted">
          Simulated crowdfunding demo — no real payments
        </p>

        <div className="mt-5">
          <div className="flex items-baseline justify-between text-sm">
            <p className="font-semibold text-ink">
              {formatCents(raisedCents)} <span className="font-normal text-ink-muted">of {formatCents(campaign.goalCents)}</span>
            </p>
            <p className="text-ink-muted">{pct}%</p>
          </div>
          <div
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-surface-2"
          >
            <div
              className="h-full rounded-full bg-primary transition-[width]"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-ink-muted">
            <span className="inline-flex items-center gap-1">
              <Users className="size-3.5" aria-hidden />
              {campaign.backers.length} backer{campaign.backers.length === 1 ? "" : "s"}
            </span>
            <span className="inline-flex items-center gap-1">
              <CalendarClock className="size-3.5" aria-hidden />
              {days > 0 ? `${days} day${days === 1 ? "" : "s"} left` : "Campaign ended"}
            </span>
          </div>
        </div>

        <div className="mt-5 space-y-3 text-sm leading-relaxed text-ink-muted">
          {campaign.story.split("\n\n").map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>

        <div className="mt-6">
          <h3 className="text-sm font-semibold text-ink">Reward tiers</h3>
          <div className="mt-3 space-y-2">
            {campaign.rewardTiers.map((tier) => (
              <TierRow
                key={tier.id}
                tier={tier}
                selected={selectedTierId === tier.id}
                onSelect={() => {
                  setSelectedTierId(tier.id);
                  setShowForm(true);
                  setSuccess(null);
                  setError(null);
                }}
              />
            ))}
          </div>
        </div>

        {success ? (
          <Card className="mt-5 border-success/30 bg-success/5 p-4">
            <p className="text-sm font-medium text-ink">
              You&apos;ve backed {gameTitle} for {formatCents(success.tier.amountCents)} —{" "}
              {success.tier.title}. This is a simulated pledge; no payment was processed.
            </p>
          </Card>
        ) : (
          <div className="mt-6">
            {!showForm ? (
              <Button className="w-full" onClick={() => setShowForm(true)}>
                Back this game
              </Button>
            ) : (
              <Card className="p-4">
                <p className="text-sm font-semibold text-ink">Confirm your backing</p>
                <p className="mt-1 text-xs text-ink-muted">
                  {selectedTier
                    ? `Selected: ${selectedTier.title} (${formatCents(selectedTier.amountCents)})`
                    : "Select a reward tier above."}
                </p>
                <Field label="Backer name" htmlFor="backer-name" className="mt-3">
                  <Input
                    id="backer-name"
                    value={backerName}
                    onChange={(e) => setBackerName(e.target.value)}
                    maxLength={40}
                  />
                </Field>
                {error ? (
                  <p role="alert" className="mt-2 text-xs text-error">
                    {error}
                  </p>
                ) : null}
                <div className="mt-3 flex gap-2">
                  <Button onClick={handleConfirm} disabled={isPending || !selectedTier}>
                    {isPending ? "Confirming…" : "Confirm backing (simulated)"}
                  </Button>
                  <Button variant="ghost" onClick={() => setShowForm(false)} disabled={isPending}>
                    Cancel
                  </Button>
                </div>
              </Card>
            )}
          </div>
        )}
      </Card>
    </section>
  );
}
