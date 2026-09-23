/**
 * DEMO ONLY — not the deterministic engine.
 *
 * Phase 0 has no game engine yet. This module builds a plausible initial
 * state from a GameSpec's `setup` steps and lets the Tabletop UI simulate a
 * handful of moves so the renderer feels alive. Every heuristic here
 * (overflow destination, "shore"/"spill" zone detection, legal-move rules)
 * is a simplification that Phase 1's real GameEngine will replace.
 */

import type {
  EntityId,
  EntityInstance,
  GameEvent,
  GameSpec,
  GameState,
  PlayerId,
  ZoneDef,
  ZoneState,
} from "@/lib/game-spec/types";

// ---------------------------------------------------------------------------
// Seeded PRNG (mulberry32) — deterministic, no external deps.
// ---------------------------------------------------------------------------

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleInPlace<T>(arr: T[], rand: () => number) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

// ---------------------------------------------------------------------------
// Zone helpers
// ---------------------------------------------------------------------------

function zoneCapacity(zone: ZoneDef): number | null {
  if (zone.geometry.kind === "row") return zone.geometry.capacity ?? null;
  if (zone.geometry.kind === "grid") return zone.geometry.rows * zone.geometry.cols;
  return null;
}

function emptySlotsFor(zone: ZoneDef): (EntityId | null)[] {
  const cap = zoneCapacity(zone);
  if (zone.geometry.kind === "stack") return [];
  return cap ? new Array(cap).fill(null) : [];
}

/** First private stack zone in the spec — treated as "the bag". */
function findBagZone(spec: GameSpec): ZoneDef | undefined {
  return spec.zones.find((z) => z.geometry.kind === "stack" && z.visibility === "private");
}

/** Shared row zone with no capacity limit — treated as "the shore". */
function findShoreZone(spec: GameSpec): ZoneDef | undefined {
  return (
    spec.zones.find((z) => z.id.includes("shore") && z.owner === "shared" && z.geometry.kind === "row") ??
    spec.zones.find((z) => z.owner === "shared" && z.geometry.kind === "row" && z.geometry.capacity === undefined)
  );
}

/** Player-owned zone used to absorb overflow — prefers an id containing "spill". */
function findSpillZone(spec: GameSpec): ZoneDef | undefined {
  return (
    spec.zones.find((z) => z.owner === "player" && z.id.includes("spill")) ??
    spec.zones.find((z) => z.owner === "player" && z.geometry.kind === "row")
  );
}

/** Player-owned "staircase" row zones (ascending fixed capacity), sorted by capacity. */
function findStaircaseZones(spec: GameSpec): ZoneDef[] {
  return spec.zones
    .filter((z) => z.owner === "player" && z.geometry.kind === "row" && z.geometry.capacity)
    .sort((a, b) => {
      const ca = a.geometry.kind === "row" ? a.geometry.capacity ?? 0 : 0;
      const cb = b.geometry.kind === "row" ? b.geometry.capacity ?? 0 : 0;
      return ca - cb;
    });
}

function getZoneDef(spec: GameSpec, zoneId: string): ZoneDef {
  const z = spec.zones.find((zz) => zz.id === zoneId);
  if (!z) throw new Error(`Unknown zone: ${zoneId}`);
  return z;
}

function findZoneState(state: GameState, zoneId: string, owner: PlayerId | "shared"): ZoneState | undefined {
  return state.zones.find((z) => z.zoneId === zoneId && z.owner === owner);
}

// ---------------------------------------------------------------------------
// State construction
// ---------------------------------------------------------------------------

export function createDemoState(
  spec: GameSpec,
  players: { id: PlayerId; name: string }[],
  seed: number,
): GameState {
  const rand = mulberry32(seed);
  const entities: Record<EntityId, EntityInstance> = {};
  const zones: ZoneState[] = [];

  let entityCounter = 0;
  const nextEntityId = (type: string) => `e${entityCounter++}-${type}`;

  // Create zone states: shared zones once, player zones per player.
  for (const zoneDef of spec.zones) {
    if (zoneDef.owner === "shared") {
      zones.push({ zoneId: zoneDef.id, owner: "shared", slots: emptySlotsFor(zoneDef) });
    } else {
      for (const p of players) {
        zones.push({ zoneId: zoneDef.id, owner: p.id, slots: emptySlotsFor(zoneDef) });
      }
    }
  }

  const bagZone = findBagZone(spec);

  function resolveZoneStates(zoneRef: { zone: string } | { anyOf: string[] }, forPlayer?: PlayerId): ZoneState[] {
    const zoneIds = "zone" in zoneRef ? [zoneRef.zone] : zoneRef.anyOf;
    return zoneIds.flatMap((zid) => {
      const def = getZoneDef(spec, zid);
      if (def.owner === "shared") {
        const zs = findZoneState({ zones } as GameState, zid, "shared");
        return zs ? [zs] : [];
      }
      const owner = forPlayer ?? players[0]?.id;
      const zs = findZoneState({ zones } as GameState, zid, owner);
      return zs ? [zs] : [];
    });
  }

  function pushEntities(zoneState: ZoneState, zoneDef: ZoneDef, type: string, count: number) {
    for (let i = 0; i < count; i++) {
      const id = nextEntityId(type);
      entities[id] = { id, type, faceUp: zoneDef.visibility !== "private" };
      const cap = zoneCapacity(zoneDef);
      if (cap === null) {
        zoneState.slots.push(id);
      } else {
        const idx = zoneState.slots.findIndex((s) => s === null);
        if (idx >= 0) zoneState.slots[idx] = id;
        else zoneState.slots.push(id);
      }
    }
  }

  for (const step of spec.setup) {
    if (step.type === "fill") {
      const targets = resolveZoneStates(step.zone);
      const type = step.entityType ?? "";
      const count = typeof step.count === "number" ? step.count : 0;
      for (const t of targets) {
        const def = getZoneDef(spec, t.zoneId);
        pushEntities(t, def, type, count);
      }
    } else if (step.type === "shuffle") {
      const targets = resolveZoneStates(step.zone);
      for (const t of targets) {
        const filled = t.slots.filter((s): s is EntityId => s !== null);
        shuffleInPlace(filled, rand);
        t.slots = t.slots.map(() => null);
        for (let i = 0; i < filled.length; i++) {
          if (i < t.slots.length) t.slots[i] = filled[i];
          else t.slots.push(filled[i]);
        }
      }
    } else if (step.type === "deal") {
      const targets = resolveZoneStates(step.zone);
      const count = typeof step.count === "number" ? step.count : 0;
      const source = bagZone ? findZoneState({ zones } as GameState, bagZone.id, "shared") : undefined;
      for (const t of targets) {
        const def = getZoneDef(spec, t.zoneId);
        for (let i = 0; i < count; i++) {
          let id: EntityId | undefined;
          if (source) {
            const sourceIdx = source.slots.findIndex((s) => s !== null);
            if (sourceIdx >= 0) {
              id = source.slots[sourceIdx] as EntityId;
              source.slots[sourceIdx] = null;
            }
          }
          if (id === undefined) continue;
          const cap = zoneCapacity(def);
          if (cap === null) {
            t.slots.push(id);
          } else {
            const idx = t.slots.findIndex((s) => s === null);
            if (idx >= 0) t.slots[idx] = id;
            else t.slots.push(id);
          }
          if (entities[id]) entities[id] = { ...entities[id], faceUp: def.visibility !== "private" };
        }
      }
    }
  }

  // Compact the bag (remove trailing nulls left by dealing) for a clean count.
  if (bagZone) {
    const bagState = findZoneState({ zones } as GameState, bagZone.id, "shared");
    if (bagState) bagState.slots = bagState.slots.filter((s) => s !== null);
  }

  const playerStates = players.map((p) => ({ id: p.id, name: p.name, resources: {}, score: 0 }));

  return {
    specId: spec.id,
    seed,
    players: playerStates,
    entities,
    zones,
    turn: {
      round: 1,
      activePlayer: players[0]?.id ?? "",
      phaseId: spec.turnStructure.phases[0]?.id ?? "",
      turnNumber: 1,
    },
    status: "in-progress",
  };
}

// ---------------------------------------------------------------------------
// Legal moves (demo heuristic)
// ---------------------------------------------------------------------------

export interface DemoSelectable {
  zoneId: string;
  entityType: string;
  count: number;
}

export interface DemoDestination {
  zoneId: string;
  legal: boolean;
  reason?: string;
}

/** Shared "table" zones (rows) with tiles available to draft. */
export function demoLegalSources(
  spec: GameSpec,
  state: GameState,
  presentation: { zonePlacements: { zoneId: string; region: string }[] },
): DemoSelectable[] {
  const tableZoneIds = new Set(
    presentation.zonePlacements.filter((zp) => zp.region === "table").map((zp) => zp.zoneId),
  );
  const out: DemoSelectable[] = [];
  for (const zoneState of state.zones) {
    if (zoneState.owner !== "shared" || !tableZoneIds.has(zoneState.zoneId)) continue;
    const def = spec.zones.find((z) => z.id === zoneState.zoneId);
    if (!def || def.geometry.kind !== "row") continue;
    const counts = new Map<string, number>();
    for (const slot of zoneState.slots) {
      if (!slot) continue;
      const entity = state.entities[slot];
      if (!entity) continue;
      counts.set(entity.type, (counts.get(entity.type) ?? 0) + 1);
    }
    for (const [type, count] of counts) {
      out.push({ zoneId: zoneState.zoneId, entityType: type, count });
    }
  }
  return out;
}

/** Given a chosen (zoneId, entityType), which of this player's row zones can receive it. */
export function demoLegalDestinations(
  spec: GameSpec,
  state: GameState,
  playerId: PlayerId,
  entityType: string,
): DemoDestination[] {
  const staircase = findStaircaseZones(spec);
  const destinations: DemoDestination[] = [];
  for (const zoneDef of staircase) {
    const zs = findZoneState(state, zoneDef.id, playerId);
    if (!zs) continue;
    const nonEmpty = zs.slots.filter((s) => s !== null);
    const occupiedType = nonEmpty.length > 0 ? state.entities[nonEmpty[0] as EntityId]?.type : undefined;
    const full = zs.slots.every((s) => s !== null);
    const compatible = occupiedType === undefined || occupiedType === entityType;
    destinations.push({
      zoneId: zoneDef.id,
      legal: compatible && !full,
      reason: full ? "Row is full" : !compatible ? "Row holds a different type" : undefined,
    });
  }
  return destinations;
}

// ---------------------------------------------------------------------------
// Apply move (demo heuristic)
// ---------------------------------------------------------------------------

export function demoApplyMove(
  spec: GameSpec,
  state: GameState,
  move: { playerId: PlayerId; fromZoneId: string; entityType: string; toZoneId: string },
): { state: GameState; events: GameEvent[] } {
  const events: GameEvent[] = [];
  const zones = state.zones.map((z) => ({ ...z, slots: [...z.slots] }));
  const findZ = (zoneId: string, owner: PlayerId | "shared") =>
    zones.find((z) => z.zoneId === zoneId && z.owner === owner);

  const source = findZ(move.fromZoneId, "shared");
  const destDef = getZoneDef(spec, move.toZoneId);
  const dest = findZ(move.toZoneId, move.playerId);
  if (!source || !dest) return { state, events };

  const matching: EntityId[] = [];
  const rest: EntityId[] = [];
  for (let i = 0; i < source.slots.length; i++) {
    const id = source.slots[i];
    if (!id) continue;
    const entity = state.entities[id];
    if (entity?.type === move.entityType) matching.push(id);
    else rest.push(id);
  }
  // Clear the source zone; non-matching tiles slide to the shore if one exists.
  source.slots = source.slots.map(() => null);

  const shoreDef = findShoreZone(spec);
  if (shoreDef && shoreDef.id !== move.fromZoneId) {
    const shore = findZ(shoreDef.id, "shared");
    if (shore) {
      for (const id of rest) {
        shore.slots.push(id);
        events.push({ type: "ENTITY_MOVED", entityId: id, from: source.zoneId, to: shore.zoneId });
      }
    }
  } else {
    // No shore: leave remaining tiles in place.
    for (const id of rest) {
      const idx = source.slots.findIndex((s) => s === null);
      if (idx >= 0) source.slots[idx] = id;
      else source.slots.push(id);
    }
  }

  // Place matching tiles into destination, overflow to spill zone.
  const destCap = zoneCapacity(destDef);
  const destEmptyCount = destCap === null ? Infinity : dest.slots.filter((s) => s === null).length;
  const toPlace = matching.slice(0, destEmptyCount === Infinity ? matching.length : destEmptyCount);
  const overflow = matching.slice(toPlace.length);

  for (const id of toPlace) {
    const idx = dest.slots.findIndex((s) => s === null);
    if (idx >= 0) dest.slots[idx] = id;
    else dest.slots.push(id);
    events.push({ type: "ENTITY_MOVED", entityId: id, from: source.zoneId, to: dest.zoneId });
  }

  const spillDef = findSpillZone(spec);
  if (overflow.length > 0 && spillDef) {
    const spill = findZ(spillDef.id, move.playerId);
    if (spill) {
      for (const id of overflow) {
        spill.slots.push(id);
        events.push({ type: "ENTITY_MOVED", entityId: id, from: source.zoneId, to: spill.zoneId });
      }
    }
  }

  events.push({ type: "ACTION_CONFIRMED", actionId: "demo-take", playerId: move.playerId });

  const playerIds = state.players.map((p) => p.id);
  const currentIdx = playerIds.indexOf(state.turn.activePlayer);
  const nextIdx = (currentIdx + 1) % playerIds.length;
  const nextPlayer = playerIds[nextIdx];
  const wrapped = nextIdx <= currentIdx;

  const turn = {
    round: wrapped ? state.turn.round + 1 : state.turn.round,
    activePlayer: nextPlayer,
    phaseId: state.turn.phaseId,
    turnNumber: state.turn.turnNumber + 1,
  };
  events.push({ type: "TURN_STARTED", playerId: nextPlayer, turnNumber: turn.turnNumber });

  return { state: { ...state, zones, turn }, events };
}

export function describeEvent(event: GameEvent, state: GameState, spec?: GameSpec): string {
  const zoneName = (id: string) => spec?.zones.find((z) => z.id === id)?.name ?? id;
  switch (event.type) {
    case "GAME_STARTED":
      return "Game started.";
    case "ROUND_STARTED":
      return `Round ${event.round} started.`;
    case "TURN_STARTED": {
      const p = state.players.find((pl) => pl.id === event.playerId);
      return `${p?.name ?? event.playerId}'s turn.`;
    }
    case "ACTION_CONFIRMED": {
      const p = state.players.find((pl) => pl.id === event.playerId);
      return `${p?.name ?? event.playerId} confirmed a move.`;
    }
    case "ENTITY_MOVED":
      return `Moved ${state.entities[event.entityId]?.type ?? "a piece"} from ${zoneName(event.from)} to ${zoneName(event.to)}.`;
    case "RESOURCE_CHANGED":
      return `${event.playerId} ${event.delta >= 0 ? "gained" : "lost"} ${Math.abs(event.delta)} ${event.resource}.`;
    case "SCORE_CHANGED":
      return `${event.playerId} scored ${event.delta >= 0 ? "+" : ""}${event.delta}.`;
    case "DICE_ROLLED":
      return `${event.playerId} rolled ${event.values.join(", ")}.`;
    case "CARD_DRAWN":
      return `${event.playerId} drew a card.`;
    case "GAME_ENDED":
      return `Game ended. Winner: ${event.winnerIds.join(", ")}.`;
    default:
      return "Something happened.";
  }
}
