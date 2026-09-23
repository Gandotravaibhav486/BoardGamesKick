"use client";

import { useMemo, useRef, useState } from "react";
import type { GameSpec } from "@/lib/game-spec/types";
import type { PresentationSpec } from "@/lib/presentation/types";
import {
  createDemoState,
  demoApplyMove,
  demoLegalDestinations,
  demoLegalSources,
  describeEvent,
  mulberry32,
} from "@/lib/engine/demo-runtime";
import { TableArea } from "@/components/renderer/TableArea";
import { PlayerBoard } from "@/components/renderer/PlayerBoard";
import { TurnIndicator } from "@/components/renderer/TurnIndicator";
import { GameLog } from "@/components/renderer/GameLog";
import { ActionBar } from "@/components/renderer/ActionBar";
import { MobileTabs, type MobileTab } from "@/components/renderer/MobileTabs";
import { Badge } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";

const DEMO_PLAYERS = [
  { id: "p1", name: "Mara" },
  { id: "p2", name: "Rowan" },
  { id: "p3", name: "Ines" },
];
const DEMO_SEED = 42;
const HUMAN_ID = "p1";

interface Selection {
  fromZoneId: string;
  entityType: string;
}

interface PendingMove extends Selection {
  toZoneId: string;
}

export interface TabletopProps {
  spec: GameSpec;
  presentation: PresentationSpec;
  gameTitle: string;
  gameId: string;
}

export function Tabletop({ spec, presentation, gameTitle, gameId }: TabletopProps) {
  const [state, setState] = useState(() => createDemoState(spec, DEMO_PLAYERS, DEMO_SEED));
  const [selection, setSelection] = useState<Selection | null>(null);
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [inlineMessage, setInlineMessage] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<MobileTab>("table");
  const aiRand = useRef(mulberry32(DEMO_SEED + 1));

  const stylesByType = useMemo(
    () => Object.fromEntries(presentation.entityStyles.map((s) => [s.entityTypeId, s])),
    [presentation.entityStyles],
  );

  const zoneLabel = (zoneId: string) => {
    const placement = presentation.zonePlacements.find((zp) => zp.zoneId === zoneId);
    if (placement?.label) return placement.label;
    return spec.zones.find((z) => z.id === zoneId)?.name ?? zoneId;
  };

  const isYourTurn = state.turn.activePlayer === HUMAN_ID;

  const destinations = useMemo(() => {
    if (!selection) return undefined;
    return demoLegalDestinations(spec, state, HUMAN_ID, selection.entityType);
  }, [spec, state, selection]);

  function flashMessage(message: string) {
    setInlineMessage(message);
    setTimeout(() => setInlineMessage((cur) => (cur === message ? null : cur)), 2200);
  }

  function handleSelectTile(zoneId: string, entityType: string) {
    if (!isYourTurn || pendingMove) return;
    setSelection({ fromZoneId: zoneId, entityType });
  }

  function handleSelectDestination(zoneId: string) {
    if (!selection) return;
    const dest = destinations?.find((d) => d.zoneId === zoneId);
    if (!dest?.legal) {
      flashMessage(dest?.reason ?? "That row can't take this tile.");
      return;
    }
    setPendingMove({ ...selection, toZoneId: zoneId });
  }

  function commitMove(playerId: string, move: Selection & { toZoneId: string }) {
    const result = demoApplyMove(spec, state, { playerId, ...move });
    setState(result.state);
    setLog((cur) => [...cur, ...result.events.map((e) => describeEvent(e, result.state, spec))]);
  }

  function handleConfirm() {
    if (!pendingMove) return;
    commitMove(HUMAN_ID, pendingMove);
    setSelection(null);
    setPendingMove(null);
  }

  function handleCancel() {
    setSelection(null);
    setPendingMove(null);
  }

  function handleSimulateOpponent() {
    if (isYourTurn) return;
    const activePlayer = state.turn.activePlayer;
    const sources = demoLegalSources(spec, state, presentation);
    if (sources.length === 0) {
      flashMessage("No legal moves available for this player.");
      return;
    }
    const source = sources[Math.floor(aiRand.current() * sources.length)];
    const dests = demoLegalDestinations(spec, state, activePlayer, source.entityType).filter((d) => d.legal);
    const chosen = dests.length > 0 ? dests[Math.floor(aiRand.current() * dests.length)] : undefined;
    if (!chosen) {
      flashMessage(`${activePlayer} has no legal destination right now.`);
      return;
    }
    commitMove(activePlayer, { fromZoneId: source.zoneId, entityType: source.entityType, toZoneId: chosen.zoneId });
  }

  const humanZones = state.zones.filter((z) => z.owner === HUMAN_ID);
  const opponents = DEMO_PLAYERS.filter((p) => p.id !== HUMAN_ID);

  const pendingDescription = pendingMove
    ? (() => {
        const sourceZone = state.zones.find((z) => z.zoneId === pendingMove.fromZoneId && z.owner === "shared");
        const count = sourceZone
          ? sourceZone.slots.filter((id) => id && state.entities[id]?.type === pendingMove.entityType).length
          : 0;
        const typeLabel = stylesByType[pendingMove.entityType]?.label ?? pendingMove.entityType;
        return `Take ${count} ${typeLabel} → ${zoneLabel(pendingMove.toZoneId)}`;
      })()
    : undefined;

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
      pending={pendingDescription ? { description: pendingDescription } : undefined}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
      onSimulateOpponent={handleSimulateOpponent}
      inlineMessage={inlineMessage ?? undefined}
      hint={
        selection
          ? "Choose a highlighted row on your board to place these tiles."
          : "Select a group of tiles from the table to begin."
      }
    />
  );

  const tableArea = (
    <TableArea
      spec={spec}
      presentation={presentation}
      zones={state.zones}
      entities={state.entities}
      styles={stylesByType}
      selectedType={selection?.entityType}
      selectedFromZoneId={selection?.fromZoneId}
      onSelectTile={handleSelectTile}
      canSelect={isYourTurn && !pendingMove}
    />
  );

  const yourBoard = (
    <PlayerBoard
      spec={spec}
      presentation={presentation}
      playerId={HUMAN_ID}
      playerName={DEMO_PLAYERS[0].name}
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
            <div className="min-h-0 flex-1">{tableArea}</div>
            <div className="shrink-0">{yourBoard}</div>
          </main>
          <aside className="flex w-80 shrink-0 flex-col gap-3 overflow-hidden">
            <div className="shrink-0">{actionBar}</div>
            <div className="min-h-0 flex-1">
              <GameLog lines={log} />
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
              <GameLog lines={log} />
            </div>
          )}
        </div>
        <div className="fixed inset-x-0 bottom-16 z-20 px-2">{actionBar}</div>
        <MobileTabs active={mobileTab} onChange={setMobileTab} />
      </div>
    </div>
  );
}
