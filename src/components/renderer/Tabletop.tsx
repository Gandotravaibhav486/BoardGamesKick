"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { GameSpec, GameState } from "@/lib/game-spec/types";
import type { PresentationSpec } from "@/lib/presentation/types";
import { getEngine, chooseBotAction } from "@/lib/engine/tile-drafting-engine";
import { IllegalActionError, type ApplyResult, type LegalAction } from "@/lib/engine/types";
import { describeEvent, type LogEntry } from "@/components/renderer/describe-event";
import { TableArea } from "@/components/renderer/TableArea";
import { PlayerBoard } from "@/components/renderer/PlayerBoard";
import { TurnIndicator } from "@/components/renderer/TurnIndicator";
import { GameLog } from "@/components/renderer/GameLog";
import { ActionBar } from "@/components/renderer/ActionBar";
import { MobileTabs, type MobileTab } from "@/components/renderer/MobileTabs";
import { Badge } from "@/components/ui/card";
import { Button, ButtonLink } from "@/components/ui/button";

const PLAYERS = [
  { id: "p1", name: "Mara" },
  { id: "p2", name: "Rowan" },
  { id: "p3", name: "Ines" },
];
const HUMAN_ID = "p1";
const BOT_DELAY_MS = 900;

interface Selection {
  fromZoneId: string;
  entityType: string;
}

export interface TabletopProps {
  spec: GameSpec;
  presentation: PresentationSpec;
  gameTitle: string;
  gameId: string;
}

export function Tabletop({ spec, presentation, gameTitle, gameId }: TabletopProps) {
  const engine = useMemo(() => getEngine(spec), [spec]);
  const [seed, setSeed] = useState(() => 42);

  const [state, setState] = useState<GameState>(() => engine.initialize(spec, PLAYERS, seed).state);
  const [log, setLog] = useState<LogEntry[]>(() => {
    const init = engine.initialize(spec, PLAYERS, seed);
    return init.events
      .map((e) => describeEvent(e, init.state, spec))
      .filter((e): e is LogEntry => e !== null);
  });

  const [selection, setSelection] = useState<Selection | null>(null);
  const [pendingAction, setPendingAction] = useState<LegalAction | null>(null);
  const [inlineMessage, setInlineMessage] = useState<string | null>(null);
  const [roundBanner, setRoundBanner] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<MobileTab>("table");

  const botRngRef = useRef(state.rngState);
  const inlineTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const bannerTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const stylesByType = useMemo(
    () => Object.fromEntries(presentation.entityStyles.map((s) => [s.entityTypeId, s])),
    [presentation.entityStyles],
  );

  const isGameOver = state.status === "finished";
  const isYourTurn = !isGameOver && state.turn.activePlayer === HUMAN_ID;

  const legalActions = useMemo(
    () => (state.status === "in-progress" ? engine.getLegalActions(spec, state, HUMAN_ID) : []),
    [engine, spec, state],
  );

  function flashMessage(message: string) {
    setInlineMessage(message);
    clearTimeout(inlineTimeoutRef.current);
    inlineTimeoutRef.current = setTimeout(() => setInlineMessage((cur) => (cur === message ? null : cur)), 2200);
  }

  function showRoundBanner(text: string) {
    setRoundBanner(text);
    clearTimeout(bannerTimeoutRef.current);
    bannerTimeoutRef.current = setTimeout(() => setRoundBanner(null), 2500);
  }

  function applyResult(result: ApplyResult) {
    setState(result.state);
    const entries = result.events
      .map((e) => describeEvent(e, result.state, spec))
      .filter((e): e is LogEntry => e !== null);
    if (entries.length > 0) setLog((cur) => [...cur, ...entries]);
    const roundEnded = result.events.find((e) => e.type === "ROUND_ENDED");
    if (roundEnded && roundEnded.type === "ROUND_ENDED") {
      showRoundBanner(`Round ${roundEnded.round} complete.`);
    }
  }

  const destinations = useMemo(() => {
    if (!selection) return undefined;
    const legalForSelection = legalActions.filter(
      (a) => a.selections.from === selection.fromZoneId && a.selections.tileType === selection.entityType,
    );
    const legalToZoneIds = new Set(legalForSelection.map((a) => a.selections.to));
    const rowZoneDefs = spec.zones.filter((z) => z.owner === "player" && z.geometry.kind === "row");
    return rowZoneDefs.map((zoneDef) => {
      if (legalToZoneIds.has(zoneDef.id)) return { zoneId: zoneDef.id, legal: true as const };
      const zoneState = state.zones.find((z) => z.zoneId === zoneDef.id && z.owner === HUMAN_ID);
      const nonEmpty = (zoneState?.slots.filter((s): s is string => s !== null)) ?? [];
      const occupiedType = nonEmpty.length > 0 ? state.entities[nonEmpty[0]]?.type : undefined;
      const capacity = zoneDef.geometry.kind === "row" ? zoneDef.geometry.capacity : undefined;
      const full = capacity !== undefined && nonEmpty.length >= capacity;
      const reason = full
        ? "Row is full"
        : occupiedType && occupiedType !== selection.entityType
          ? "Row already holds a different type"
          : "Not a legal move right now";
      return { zoneId: zoneDef.id, legal: false as const, reason };
    });
  }, [selection, legalActions, spec, state]);

  function handleSelectTile(zoneId: string, entityType: string) {
    if (!isYourTurn || pendingAction) return;
    const hasLegalSource = legalActions.some(
      (a) => a.selections.from === zoneId && a.selections.tileType === entityType,
    );
    if (!hasLegalSource) return;
    setSelection({ fromZoneId: zoneId, entityType });
  }

  function handleSelectDestination(zoneId: string) {
    if (!selection) return;
    const dest = destinations?.find((d) => d.zoneId === zoneId);
    if (!dest || !dest.legal) {
      flashMessage((dest && "reason" in dest ? dest.reason : undefined) ?? "That row can't take this tile.");
      return;
    }
    const action = legalActions.find(
      (a) =>
        a.selections.from === selection.fromZoneId &&
        a.selections.tileType === selection.entityType &&
        a.selections.to === zoneId,
    );
    if (!action) {
      flashMessage("That move is no longer legal.");
      return;
    }
    setPendingAction(action);
  }

  function handleConfirm() {
    if (!pendingAction) return;
    try {
      const result = engine.applyAction(spec, state, {
        actionId: pendingAction.actionId,
        playerId: HUMAN_ID,
        selections: pendingAction.selections,
      });
      applyResult(result);
    } catch (err) {
      flashMessage(err instanceof IllegalActionError ? err.message : "That move is no longer legal.");
    }
    setSelection(null);
    setPendingAction(null);
  }

  function handleCancel() {
    setSelection(null);
    setPendingAction(null);
  }

  function handlePlayAgain() {
    const newSeed = seed + 1;
    setSeed(newSeed);
    const init = engine.initialize(spec, PLAYERS, newSeed);
    setState(init.state);
    botRngRef.current = init.state.rngState;
    setLog(init.events.map((e) => describeEvent(e, init.state, spec)).filter((e): e is LogEntry => e !== null));
    setSelection(null);
    setPendingAction(null);
    setRoundBanner(null);
    setInlineMessage(null);
  }

  // Auto-play opponent turns. Cancellation guards against double-apply under StrictMode.
  useEffect(() => {
    if (state.status !== "in-progress") return;
    if (state.turn.activePlayer === HUMAN_ID) return;
    const activePlayer = state.turn.activePlayer;
    let cancelled = false;
    const timer = setTimeout(() => {
      if (cancelled) return;
      const { action, rngState } = chooseBotAction(spec, state, activePlayer, botRngRef.current);
      botRngRef.current = rngState;
      if (!action) return;
      try {
        const result = engine.applyAction(spec, state, {
          actionId: action.actionId,
          playerId: activePlayer,
          selections: action.selections,
        });
        applyResult(result);
      } catch {
        // Bot proposed a stale move; state will re-render and effect will retry.
      }
    }, BOT_DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, spec, engine]);

  useEffect(() => {
    return () => {
      clearTimeout(inlineTimeoutRef.current);
      clearTimeout(bannerTimeoutRef.current);
    };
  }, []);

  const humanZones = state.zones.filter((z) => z.owner === HUMAN_ID);
  const opponents = PLAYERS.filter((p) => p.id !== HUMAN_ID);
  const activePlayerName = PLAYERS.find((p) => p.id === state.turn.activePlayer)?.name;

  const sortedFinal = useMemo(
    () => [...state.players].sort((a, b) => b.score - a.score),
    [state.players],
  );
  const winnerIds = new Set(state.winnerIds ?? []);

  const topBar = (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-surface px-3 py-2">
      <div className="flex items-center gap-2 min-w-0">
        <span className="truncate text-sm font-semibold text-ink">{gameTitle}</span>
        <Badge tone="accent">Prototype</Badge>
      </div>
      <TurnIndicator players={state.players} activePlayerId={state.turn.activePlayer} youId={HUMAN_ID} round={state.turn.round} />
      <div className="flex items-center gap-1 text-xs">
        <ButtonLink href={`/games/${gameId}`} variant="ghost" size="sm" className="hidden sm:inline-flex">
          Back to game page
        </ButtonLink>
        <ButtonLink href="/community" variant="ghost" size="sm">
          Exit
        </ButtonLink>
      </div>
    </div>
  );

  const actionBar = (
    <ActionBar
      isYourTurn={isYourTurn}
      gameOver={isGameOver}
      activePlayerName={activePlayerName}
      pending={pendingAction ? { description: pendingAction.description } : undefined}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
      inlineMessage={inlineMessage ?? undefined}
      hint={
        selection
          ? "Choose a highlighted row on your board to place these tiles."
          : "Select a group of tiles from the table to begin."
      }
    />
  );

  const tableArea = (
    <div className="relative min-h-0 flex-1">
      <TableArea
        spec={spec}
        presentation={presentation}
        zones={state.zones}
        entities={state.entities}
        styles={stylesByType}
        selectedType={selection?.entityType}
        selectedFromZoneId={selection?.fromZoneId}
        onSelectTile={handleSelectTile}
        canSelect={isYourTurn && !pendingAction}
      />
      {roundBanner && !isGameOver && (
        <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center">
          <div className="rounded-full bg-ink/90 px-4 py-1.5 text-sm font-medium text-white shadow-lg">
            {roundBanner}
          </div>
        </div>
      )}
      {isGameOver && (
        <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-lg border border-border bg-surface p-5 shadow-xl">
            <h2 className="text-lg font-semibold text-ink">Game over</h2>
            <ul className="mt-3 space-y-1.5">
              {sortedFinal.map((p) => (
                <li
                  key={p.id}
                  className={`flex items-center justify-between rounded-md px-2 py-1 text-sm ${
                    winnerIds.has(p.id) ? "bg-highlight/20 font-semibold text-ink" : "text-ink-muted"
                  }`}
                >
                  <span>
                    {p.name}
                    {winnerIds.has(p.id) ? " • winner" : ""}
                  </span>
                  <span>{p.score}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex gap-2">
              <Button size="sm" onClick={handlePlayAgain}>
                Play again
              </Button>
              <ButtonLink href={`/games/${gameId}`} variant="secondary" size="sm">
                Back to game page
              </ButtonLink>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const yourBoard = (
    <PlayerBoard
      spec={spec}
      presentation={presentation}
      playerId={HUMAN_ID}
      playerName={PLAYERS[0].name}
      score={state.players.find((p) => p.id === HUMAN_ID)?.score ?? 0}
      zones={humanZones}
      entities={state.entities}
      styles={stylesByType}
      isActive={state.turn.activePlayer === HUMAN_ID}
      isYou
      selectedType={selection?.entityType}
      selectedFromZoneId={selection?.fromZoneId}
      destinations={destinations}
      onSelectDestination={handleSelectDestination}
    />
  );

  const opponentBoards = opponents.map((p) => (
    <PlayerBoard
      key={p.id}
      spec={spec}
      presentation={presentation}
      playerId={p.id}
      playerName={p.name}
      score={state.players.find((pl) => pl.id === p.id)?.score ?? 0}
      zones={state.zones.filter((z) => z.owner === p.id)}
      entities={state.entities}
      styles={stylesByType}
      isActive={state.turn.activePlayer === p.id}
      isYou={false}
      compact
    />
  ));

  return (
    <div className="min-h-screen bg-bg">
      {/* Desktop layout */}
      <div className="hidden h-screen flex-col overflow-hidden lg:flex">
        {topBar}
        <div className="flex flex-1 gap-3 overflow-hidden p-3">
          <aside className="flex w-56 shrink-0 flex-col gap-2 overflow-y-auto">{opponentBoards}</aside>
          <main className="flex flex-1 flex-col gap-3 overflow-hidden">
            {tableArea}
            <div className="shrink-0">{yourBoard}</div>
          </main>
          <aside className="flex w-80 shrink-0 flex-col gap-3 overflow-hidden">
            <div className="shrink-0">{actionBar}</div>
            <div className="min-h-0 flex-1">
              <GameLog entries={log} />
            </div>
          </aside>
        </div>
      </div>

      {/* Mobile layout */}
      <div className="flex min-h-screen flex-col pb-32 lg:hidden">
        <div className="sticky top-0 z-10">{topBar}</div>
        <div className="flex-1 p-3">
          {mobileTab === "table" && <div className="min-h-[50vh]">{tableArea}</div>}
          {mobileTab === "my-area" && yourBoard}
          {mobileTab === "opponents" && <div className="flex flex-col gap-2">{opponentBoards}</div>}
          {mobileTab === "log" && (
            <div className="h-[60vh]">
              <GameLog entries={log} />
            </div>
          )}
        </div>
        <div className="fixed inset-x-0 bottom-16 z-20 px-2">{actionBar}</div>
        <MobileTabs active={mobileTab} onChange={setMobileTab} />
      </div>
    </div>
  );
}
