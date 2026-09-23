import { STARTING_MARKER_TYPE } from "@/lib/game-spec/tile-drafting";
import type {
  ActionIntent,
  EntityId,
  EntityInstance,
  GameEvent,
  GameSpec,
  GameState,
  PlayerId,
  TileDraftingParams,
  ZoneDef,
  ZoneRef,
  ZoneRole,
  ZoneState,
} from "@/lib/game-spec/types";
import {
  IllegalActionError,
  type ApplyResult,
  type GameEngine,
  type GameResult,
  type LegalAction,
} from "./types";

// ---------------------------------------------------------------------------
// Seeded PRNG (mulberry32). All engine randomness flows through state.rngState.
// ---------------------------------------------------------------------------

export function nextRandom(state: number): { value: number; state: number } {
  const a = (state + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return { value: ((t ^ (t >>> 14)) >>> 0) / 4294967296, state: a >>> 0 };
}

export function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    const r = nextRandom(s);
    s = r.state;
    return r.value;
  };
}

function shuffleWithRng<T>(items: T[], rngState: number): { items: T[]; rngState: number } {
  const out = [...items];
  let s = rngState;
  for (let i = out.length - 1; i > 0; i--) {
    const r = nextRandom(s);
    s = r.state;
    const j = Math.floor(r.value * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return { items: out, rngState: s };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const DRAFT_PHASE = "draft";
const BUILD_PHASE = "build";
const TAKE_FROM_POOL = "take-from-pool";
const TAKE_FROM_OVERFLOW = "take-from-overflow";

type Owner = PlayerId | "shared";

interface ZoneLoc {
  def: ZoneDef;
  owner: Owner;
}

interface Ctx {
  spec: GameSpec;
  state: GameState;
  events: GameEvent[];
}

function params(spec: GameSpec): TileDraftingParams {
  return spec.mechanics.params;
}

function defsByRole(spec: GameSpec, role: ZoneRole): ZoneDef[] {
  return spec.zones.filter((z) => z.role === role);
}

function defByRole(spec: GameSpec, role: ZoneRole): ZoneDef {
  const def = defsByRole(spec, role)[0];
  if (!def) throw new Error(`Spec "${spec.id}" has no zone with role "${role}"`);
  return def;
}

function defById(spec: GameSpec, id: string): ZoneDef {
  const def = spec.zones.find((z) => z.id === id);
  if (!def) throw new Error(`Spec "${spec.id}" has no zone "${id}"`);
  return def;
}

function locOf(def: ZoneDef, playerId: PlayerId): ZoneLoc {
  return { def, owner: def.owner === "shared" ? "shared" : playerId };
}

function sharedLoc(spec: GameSpec, role: ZoneRole): ZoneLoc {
  return { def: defByRole(spec, role), owner: "shared" };
}

function zoneOf(state: GameState, loc: ZoneLoc): ZoneState {
  const z = state.zones.find((s) => s.zoneId === loc.def.id && s.owner === loc.owner);
  if (!z) throw new Error(`No zone state for "${loc.def.id}" (${loc.owner})`);
  return z;
}

/** Fixed zones keep a constant slot array (null = empty); others grow and shrink. */
function isFixed(def: ZoneDef): boolean {
  return def.geometry.kind === "grid" || (def.geometry.kind === "row" && def.geometry.capacity !== undefined);
}

function initialSlots(def: ZoneDef): null[] {
  const g = def.geometry;
  if (g.kind === "grid") return Array<null>(g.rows * g.cols).fill(null);
  if (g.kind === "row" && g.capacity !== undefined) return Array<null>(g.capacity).fill(null);
  return [];
}

function idsIn(z: ZoneState): EntityId[] {
  return z.slots.filter((s): s is EntityId => s !== null);
}

function typeOf(state: GameState, id: EntityId): string {
  return state.entities[id].type;
}

function isMarker(state: GameState, id: EntityId): boolean {
  return typeOf(state, id) === STARTING_MARKER_TYPE;
}

function tileIdsIn(state: GameState, z: ZoneState): EntityId[] {
  return idsIn(z).filter((id) => !isMarker(state, id));
}

function freeSlots(def: ZoneDef, z: ZoneState): number {
  return isFixed(def) ? z.slots.filter((s) => s === null).length : Number.POSITIVE_INFINITY;
}

function entityTypeName(spec: GameSpec, type: string): string {
  return spec.entityTypes.find((t) => t.id === type)?.name ?? type;
}

function detach(state: GameState, loc: ZoneLoc, id: EntityId): void {
  const z = zoneOf(state, loc);
  const i = z.slots.indexOf(id);
  if (i < 0) throw new Error(`Entity "${id}" is not in zone "${loc.def.id}"`);
  if (isFixed(loc.def)) z.slots[i] = null;
  else z.slots.splice(i, 1);
}

/** Places an entity; returns the slot used, or null if the (fixed) target slot is unavailable. */
function attach(state: GameState, loc: ZoneLoc, id: EntityId, slot?: number): number | null {
  const z = zoneOf(state, loc);
  if (!isFixed(loc.def)) {
    z.slots.push(id);
    return z.slots.length - 1;
  }
  const target = slot ?? z.slots.indexOf(null);
  if (target < 0 || target >= z.slots.length || z.slots[target] !== null) return null;
  z.slots[target] = id;
  return target;
}

function canAttach(state: GameState, loc: ZoneLoc, slot?: number): boolean {
  if (!isFixed(loc.def)) return true;
  const z = zoneOf(state, loc);
  const target = slot ?? z.slots.indexOf(null);
  return target >= 0 && target < z.slots.length && z.slots[target] === null;
}

/** Moves an entity and logs ENTITY_MOVED. Returns false (no-op) if the destination is full. */
function move(ctx: Ctx, id: EntityId, from: ZoneLoc, to: ZoneLoc, slot?: number): boolean {
  if (!canAttach(ctx.state, to, slot)) return false;
  detach(ctx.state, from, id);
  const placed = attach(ctx.state, to, id, slot);
  ctx.events.push({
    type: "ENTITY_MOVED",
    entityId: id,
    entityType: typeOf(ctx.state, id),
    from: from.def.id,
    fromOwner: from.owner,
    to: to.def.id,
    toOwner: to.owner,
    toSlot: placed ?? undefined,
  });
  return true;
}

/** Penalty zone (lowest free slot first), else the discard stack. */
function spill(ctx: Ctx, id: EntityId, from: ZoneLoc, playerId: PlayerId): void {
  const penalty = locOf(defByRole(ctx.spec, "penalty"), playerId);
  if (!move(ctx, id, from, penalty)) move(ctx, id, from, sharedLoc(ctx.spec, "discard"));
}

function penaltyAt(spec: GameSpec, index: number): number {
  const schedule = params(spec).spillPenalties;
  if (schedule.length === 0) return 0;
  return schedule[Math.min(index, schedule.length - 1)];
}

/** Column in the mosaic row where `type` would go, or null if not placeable there. */
function mosaicColumn(state: GameState, mosaic: ZoneLoc, rowIndex: number, type: string): number | null {
  const g = mosaic.def.geometry;
  if (g.kind !== "grid" || rowIndex >= g.rows) return null;
  const z = zoneOf(state, mosaic);
  const cell = (c: number) => z.slots[rowIndex * g.cols + c];
  const pattern = mosaic.def.cellPattern?.[rowIndex];
  if (pattern) {
    const c = pattern.indexOf(type);
    return c >= 0 && c < g.cols && cell(c) === null ? c : null;
  }
  // No pattern: a type may appear once per row, in any free cell.
  for (let c = 0; c < g.cols; c++) {
    const id = cell(c);
    if (id !== null && typeOf(state, id) === type) return null;
  }
  for (let c = 0; c < g.cols; c++) if (cell(c) === null) return c;
  return null;
}

function rowAccepts(state: GameState, row: ZoneLoc, type: string): boolean {
  const z = zoneOf(state, row);
  if (freeSlots(row.def, z) === 0) return false;
  return idsIn(z).every((id) => typeOf(state, id) === type);
}

function legalDestinations(spec: GameSpec, state: GameState, playerId: PlayerId, type: string): ZoneDef[] {
  const mosaic = locOf(defByRole(spec, "mosaic"), playerId);
  const rows = defsByRole(spec, "collection-row").filter(
    (row, i) => rowAccepts(state, locOf(row, playerId), type) && mosaicColumn(state, mosaic, i, type) !== null,
  );
  return [...rows, defByRole(spec, "penalty")];
}

function distinctTileTypes(spec: GameSpec, state: GameState, ids: EntityId[]): string[] {
  const present = new Set(ids.map((id) => typeOf(state, id)));
  return spec.entityTypes.map((t) => t.id).filter((t) => present.has(t));
}

function describeTake(spec: GameSpec, count: number, type: string, from: ZoneDef, to: ZoneDef): string {
  const name = entityTypeName(spec, type);
  return `Take ${count} ${count === 1 ? name : `${name}s`} from ${from.name} → ${to.name}`;
}

function actionName(spec: GameSpec, actionId: string): string {
  return spec.actions.find((a) => a.id === actionId)?.name ?? actionId;
}

function sameSelections(a: Record<string, string>, b: Record<string, string>): boolean {
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  return ka.length === kb.length && ka.every((k) => a[k] === b[k]);
}

function nextPlayerId(state: GameState, current: PlayerId): PlayerId {
  const i = state.players.findIndex((p) => p.id === current);
  return state.players[(i + 1) % state.players.length].id;
}

function startTurn(ctx: Ctx, playerId: PlayerId, increment: boolean): void {
  ctx.state.turn.activePlayer = playerId;
  if (increment) ctx.state.turn.turnNumber += 1;
  ctx.events.push({ type: "TURN_STARTED", playerId, turnNumber: ctx.state.turn.turnNumber });
}

function addScore(ctx: Ctx, playerId: PlayerId, delta: number, reason: string): void {
  const player = ctx.state.players.find((p) => p.id === playerId);
  if (!player || delta === 0) return;
  const total = Math.max(0, player.score + delta);
  const applied = total - player.score;
  if (applied === 0) return;
  player.score = total;
  ctx.events.push({ type: "SCORE_CHANGED", playerId, delta: applied, total, reason });
}

function findEntityLoc(spec: GameSpec, state: GameState, id: EntityId): ZoneLoc | null {
  const z = state.zones.find((s) => s.slots.includes(id));
  return z ? { def: defById(spec, z.zoneId), owner: z.owner } : null;
}

function tablesEmpty(spec: GameSpec, state: GameState): boolean {
  return [...defsByRole(spec, "pool"), defByRole(spec, "overflow")].every(
    (def) => tileIdsIn(state, zoneOf(state, { def, owner: "shared" })).length === 0,
  );
}

// ---------------------------------------------------------------------------
// Mosaic analysis
// ---------------------------------------------------------------------------

interface MosaicGrid {
  rows: number;
  cols: number;
  slots: (EntityId | null)[];
}

function mosaicGrid(spec: GameSpec, state: GameState, playerId: PlayerId): MosaicGrid {
  const loc = locOf(defByRole(spec, "mosaic"), playerId);
  const g = loc.def.geometry;
  if (g.kind !== "grid") throw new Error("Mosaic zone must be a grid");
  return { rows: g.rows, cols: g.cols, slots: zoneOf(state, loc).slots };
}

function filledAt(m: MosaicGrid, r: number, c: number): boolean {
  return r >= 0 && r < m.rows && c >= 0 && c < m.cols && m.slots[r * m.cols + c] !== null;
}

function placementScore(m: MosaicGrid, r: number, c: number, mode: "adjacency" | "flat"): number {
  if (mode === "flat") return 1;
  const run = (dr: number, dc: number) => {
    let n = 0;
    for (let rr = r + dr, cc = c + dc; filledAt(m, rr, cc); rr += dr, cc += dc) n++;
    return n;
  };
  const h = 1 + run(0, -1) + run(0, 1);
  const v = 1 + run(-1, 0) + run(1, 0);
  if (h === 1 && v === 1) return 1;
  return (h > 1 ? h : 0) + (v > 1 ? v : 0);
}

function completedRowCount(m: MosaicGrid): number {
  let n = 0;
  for (let r = 0; r < m.rows; r++) {
    if (Array.from({ length: m.cols }, (_, c) => filledAt(m, r, c)).every(Boolean)) n++;
  }
  return n;
}

function completedColumnCount(m: MosaicGrid): number {
  let n = 0;
  for (let c = 0; c < m.cols; c++) {
    if (Array.from({ length: m.rows }, (_, r) => filledAt(m, r, c)).every(Boolean)) n++;
  }
  return n;
}

function completedSetCount(spec: GameSpec, state: GameState, m: MosaicGrid): number {
  const counts = new Map<string, number>();
  for (const id of m.slots) {
    if (id !== null) counts.set(typeOf(state, id), (counts.get(typeOf(state, id)) ?? 0) + 1);
  }
  return spec.entityTypes.filter((t) => t.id !== STARTING_MARKER_TYPE && (counts.get(t.id) ?? 0) >= m.rows)
    .length;
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

function resolveRef(spec: GameSpec, state: GameState, ref: ZoneRef): ZoneLoc[] {
  if ("anyOf" in ref) return ref.anyOf.flatMap((zone) => resolveRef(spec, state, { zone }));
  const def = defById(spec, ref.zone);
  if (def.owner === "shared") return [{ def, owner: "shared" }];
  const specific = state.players.find((p) => p.id === ref.owner);
  return specific ? [locOf(def, specific.id)] : state.players.map((p) => locOf(def, p.id));
}

function shuffleZone(ctx: Ctx, loc: ZoneLoc): void {
  const z = zoneOf(ctx.state, loc);
  const positions = z.slots.flatMap((s, i) => (s === null ? [] : [i]));
  const { items, rngState } = shuffleWithRng(idsIn(z), ctx.state.rngState);
  ctx.state.rngState = rngState;
  positions.forEach((pos, i) => (z.slots[pos] = items[i]));
}

function topOf(z: ZoneState): EntityId | undefined {
  return idsIn(z).at(-1);
}

function runSetup(ctx: Ctx): void {
  const { spec, state } = ctx;
  const unplaced = new Map<string, EntityId[]>();
  const counters = new Map<string, number>();
  const create = (type: string): EntityId => {
    const n = (counters.get(type) ?? 0) + 1;
    counters.set(type, n);
    const id = `${type}-${n}`;
    state.entities[id] = { id, type, faceUp: true };
    return id;
  };
  for (const t of spec.entityTypes) {
    unplaced.set(t.id, Array.from({ length: t.count }, () => create(t.id)));
  }
  const supply = sharedLoc(spec, "supply");

  for (const step of spec.setup) {
    for (const loc of resolveRef(spec, state, step.zone)) {
      if (step.type === "fill" && step.entityType) {
        const queue = unplaced.get(step.entityType) ?? [];
        const count = step.count === undefined || step.count === "all" ? queue.length : step.count;
        for (let i = 0; i < count; i++) {
          const id = queue.shift() ?? create(step.entityType);
          if (attach(state, loc, id) === null) break;
        }
        unplaced.set(step.entityType, queue);
      } else if (step.type === "shuffle") {
        shuffleZone(ctx, loc);
      } else if (step.type === "deal") {
        const count = step.count === undefined || step.count === "all" ? Infinity : step.count;
        for (let i = 0; i < count; i++) {
          const id = topOf(zoneOf(state, supply));
          if (id === undefined || !canAttach(state, loc)) break;
          detach(state, supply, id);
          attach(state, loc, id);
        }
      }
    }
  }

  // Anything the setup didn't place: marker to the overflow, tiles into the supply.
  let addedToSupply = false;
  for (const [type, ids] of unplaced) {
    for (const id of ids) {
      if (type === STARTING_MARKER_TYPE) attach(state, sharedLoc(spec, "overflow"), id);
      else {
        attach(state, supply, id);
        addedToSupply = true;
      }
    }
  }
  if (addedToSupply) shuffleZone(ctx, supply);
}

// ---------------------------------------------------------------------------
// Round resolution
// ---------------------------------------------------------------------------

function buildForPlayer(ctx: Ctx, playerId: PlayerId): void {
  const { spec, state } = ctx;
  const mosaic = locOf(defByRole(spec, "mosaic"), playerId);
  const discard = sharedLoc(spec, "discard");
  const mode = params(spec).scoring.placement;

  defsByRole(spec, "collection-row").forEach((rowDef, rowIndex) => {
    const row = locOf(rowDef, playerId);
    const z = zoneOf(state, row);
    if (!isFixed(rowDef) || z.slots.length === 0 || z.slots.includes(null)) return;
    const ids = idsIn(z);
    const placed = ids[ids.length - 1];
    const type = typeOf(state, placed);
    const col = mosaicColumn(state, mosaic, rowIndex, type);
    let rest = ids;
    if (col !== null) {
      const m = mosaicGrid(spec, state, playerId);
      move(ctx, placed, row, mosaic, rowIndex * m.cols + col);
      const points = placementScore(mosaicGrid(spec, state, playerId), rowIndex, col, mode);
      addScore(ctx, playerId, points, `Placed ${entityTypeName(spec, type)} in ${mosaic.def.name}`);
      rest = ids.slice(0, -1);
    }
    for (const id of rest) move(ctx, id, row, discard);
  });
}

function resolvePenalty(ctx: Ctx, playerId: PlayerId): void {
  const { spec, state } = ctx;
  const penalty = locOf(defByRole(spec, "penalty"), playerId);
  const z = zoneOf(state, penalty);
  const total = z.slots.reduce<number>((sum, id, i) => (id === null ? sum : sum + penaltyAt(spec, i)), 0);
  addScore(ctx, playerId, total, "Spill penalty");
  for (const id of idsIn(z)) {
    move(ctx, id, penalty, isMarker(state, id) ? sharedLoc(spec, "overflow") : sharedLoc(spec, "discard"));
  }
}

function returnMarker(ctx: Ctx): void {
  const overflow = sharedLoc(ctx.spec, "overflow");
  for (const entity of Object.values(ctx.state.entities)) {
    if (entity.type !== STARTING_MARKER_TYPE) continue;
    const loc = findEntityLoc(ctx.spec, ctx.state, entity.id);
    if (loc && loc.def.id !== overflow.def.id) move(ctx, entity.id, loc, overflow);
  }
}

function endConditionMet(spec: GameSpec, state: GameState): boolean {
  const ec = params(spec).endCondition;
  if (ec.type === "rounds") return state.turn.round >= ec.rounds;
  return state.players.some((p) => completedRowCount(mosaicGrid(spec, state, p.id)) > 0);
}

function finishGame(ctx: Ctx): void {
  const { spec, state } = ctx;
  const bonus = params(spec).scoring;
  for (const p of state.players) {
    const m = mosaicGrid(spec, state, p.id);
    const rows = completedRowCount(m);
    const cols = completedColumnCount(m);
    const sets = completedSetCount(spec, state, m);
    addScore(ctx, p.id, rows * bonus.completedRowBonus, `Completed rows bonus (${rows} × ${bonus.completedRowBonus})`);
    addScore(ctx, p.id, cols * bonus.completedColumnBonus, `Completed columns bonus (${cols} × ${bonus.completedColumnBonus})`);
    addScore(ctx, p.id, sets * bonus.completedSetBonus, `Completed sets bonus (${sets} × ${bonus.completedSetBonus})`);
  }
  const best = Math.max(...state.players.map((p) => p.score));
  let leaders = state.players.filter((p) => p.score === best);
  if (leaders.length > 1) {
    const rowsOf = (id: PlayerId) => completedRowCount(mosaicGrid(spec, state, id));
    const mostRows = Math.max(...leaders.map((p) => rowsOf(p.id)));
    leaders = leaders.filter((p) => rowsOf(p.id) === mostRows);
  }
  state.status = "finished";
  state.winnerIds = leaders.map((p) => p.id);
  ctx.events.push({ type: "GAME_ENDED", winnerIds: state.winnerIds });
}

/** Moves the discard (minus the marker) back into the supply and shuffles it. */
function recycleDiscard(ctx: Ctx): void {
  const discard = sharedLoc(ctx.spec, "discard");
  const supply = sharedLoc(ctx.spec, "supply");
  for (const id of tileIdsIn(ctx.state, zoneOf(ctx.state, discard))) move(ctx, id, discard, supply);
  shuffleZone(ctx, supply);
}

function drawFromSupply(ctx: Ctx): EntityId | null {
  const supply = sharedLoc(ctx.spec, "supply");
  if (tileIdsIn(ctx.state, zoneOf(ctx.state, supply)).length === 0) recycleDiscard(ctx);
  const tiles = tileIdsIn(ctx.state, zoneOf(ctx.state, supply));
  return tiles.at(-1) ?? null;
}

function refillPools(ctx: Ctx): void {
  const supply = sharedLoc(ctx.spec, "supply");
  const capacity = params(ctx.spec).poolCapacity;
  for (const def of defsByRole(ctx.spec, "pool")) {
    const pool: ZoneLoc = { def, owner: "shared" };
    const z = zoneOf(ctx.state, pool);
    const needed = isFixed(def) ? freeSlots(def, z) : capacity - z.slots.length;
    for (let i = 0; i < needed; i++) {
      const id = drawFromSupply(ctx);
      if (id === null) return;
      move(ctx, id, supply, pool);
    }
  }
}

function startNextRound(ctx: Ctx): void {
  const { state } = ctx;
  state.turn.round += 1;
  ctx.events.push({ type: "ROUND_STARTED", round: state.turn.round });
  refillPools(ctx);
  if (tablesEmpty(ctx.spec, state)) {
    finishGame(ctx);
    return;
  }
  const starter = state.turn.nextStartingPlayer ?? state.players[0].id;
  delete state.turn.nextStartingPlayer;
  state.turn.phaseId = DRAFT_PHASE;
  ctx.events.push({ type: "PHASE_STARTED", phaseId: DRAFT_PHASE });
  startTurn(ctx, starter, true);
}

function endRound(ctx: Ctx): void {
  const { state } = ctx;
  state.turn.phaseId = BUILD_PHASE;
  ctx.events.push({ type: "PHASE_STARTED", phaseId: BUILD_PHASE });
  for (const p of state.players) {
    buildForPlayer(ctx, p.id);
    resolvePenalty(ctx, p.id);
  }
  returnMarker(ctx);
  ctx.events.push({ type: "ROUND_ENDED", round: state.turn.round });
  if (endConditionMet(ctx.spec, state)) finishGame(ctx);
  else startNextRound(ctx);
}

function performTake(ctx: Ctx, playerId: PlayerId, action: LegalAction): void {
  const { spec, state } = ctx;
  const { from, to, tileType } = action.selections;
  const source: ZoneLoc = { def: defById(spec, from), owner: "shared" };
  const dest = locOf(defById(spec, to), playerId);
  const taken = tileIdsIn(state, zoneOf(state, source)).filter((id) => typeOf(state, id) === tileType);

  // The marker is taken first so it always occupies a penalty slot.
  if (source.def.role === "overflow" && params(spec).startingMarker) {
    const marker = idsIn(zoneOf(state, source)).find((id) => isMarker(state, id));
    if (marker) {
      spill(ctx, marker, source, playerId);
      state.turn.nextStartingPlayer = playerId;
    }
  }

  for (const id of taken) {
    if (dest.def.role === "penalty") {
      spill(ctx, id, source, playerId);
      continue;
    }
    // Right-aligned: fill the highest-index empty slot first.
    const slot = isFixed(dest.def) ? zoneOf(state, dest).slots.lastIndexOf(null) : undefined;
    if (slot === -1 || !move(ctx, id, source, dest, slot)) spill(ctx, id, source, playerId);
  }

  if (source.def.role === "pool") {
    const overflow = sharedLoc(spec, "overflow");
    for (const id of idsIn(zoneOf(state, source))) move(ctx, id, source, overflow);
  }
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

function initialize(spec: GameSpec, players: { id: PlayerId; name: string }[], seed: number): ApplyResult {
  if (players.length < spec.players.min || players.length > spec.players.max) {
    throw new Error(
      `${spec.name} needs ${spec.players.min}–${spec.players.max} players; got ${players.length}`,
    );
  }
  if (new Set(players.map((p) => p.id)).size !== players.length) throw new Error("Player ids must be unique");

  const zones: ZoneState[] = spec.zones.flatMap((def) =>
    def.owner === "shared"
      ? [{ zoneId: def.id, owner: "shared" as const, slots: initialSlots(def) }]
      : players.map((p) => ({ zoneId: def.id, owner: p.id, slots: initialSlots(def) })),
  );
  const state: GameState = {
    specId: spec.id,
    seed,
    rngState: seed >>> 0,
    players: players.map((p) => ({
      id: p.id,
      name: p.name,
      resources: Object.fromEntries(spec.resources.map((r) => [r.id, r.initial])),
      score: 0,
    })),
    entities: {},
    zones,
    turn: { round: 1, activePlayer: players[0].id, phaseId: DRAFT_PHASE, turnNumber: 1 },
    status: "setup",
  };
  const ctx: Ctx = { spec, state, events: [] };
  runSetup(ctx);
  state.status = "in-progress";
  ctx.events.push(
    { type: "GAME_STARTED", specId: spec.id, seed },
    { type: "ROUND_STARTED", round: 1 },
    { type: "PHASE_STARTED", phaseId: DRAFT_PHASE },
  );
  startTurn(ctx, players[0].id, false);
  return { state, events: ctx.events };
}

function getLegalActions(spec: GameSpec, state: GameState, playerId: PlayerId): LegalAction[] {
  if (state.status !== "in-progress" || state.turn.phaseId !== DRAFT_PHASE) return [];
  if (state.turn.activePlayer !== playerId) return [];
  const sources = [
    ...defsByRole(spec, "pool").map((def) => ({ def, actionId: TAKE_FROM_POOL })),
    ...defsByRole(spec, "overflow").map((def) => ({ def, actionId: TAKE_FROM_OVERFLOW })),
  ];
  const actions: LegalAction[] = [];
  for (const { def, actionId } of sources) {
    const tiles = tileIdsIn(state, zoneOf(state, { def, owner: "shared" }));
    for (const tileType of distinctTileTypes(spec, state, tiles)) {
      const count = tiles.filter((id) => typeOf(state, id) === tileType).length;
      for (const dest of legalDestinations(spec, state, playerId, tileType)) {
        actions.push({
          actionId,
          name: actionName(spec, actionId),
          description: describeTake(spec, count, tileType, def, dest),
          selections: { from: def.id, tileType, to: dest.id },
        });
      }
    }
  }
  return actions;
}

function applyAction(spec: GameSpec, state: GameState, intent: ActionIntent): ApplyResult {
  if (state.status !== "in-progress") throw new IllegalActionError("The game is not in progress");
  if (intent.playerId !== state.turn.activePlayer) {
    throw new IllegalActionError(`It is not ${intent.playerId}'s turn (active: ${state.turn.activePlayer})`);
  }
  const match = getLegalActions(spec, state, intent.playerId).find(
    (a) => a.actionId === intent.actionId && sameSelections(a.selections, intent.selections),
  );
  if (!match) {
    throw new IllegalActionError(
      `Action "${intent.actionId}" with ${JSON.stringify(intent.selections)} is not legal for ${intent.playerId}`,
    );
  }

  const ctx: Ctx = { spec, state: structuredClone(state), events: [] };
  performTake(ctx, intent.playerId, match);
  ctx.events.push({
    type: "ACTION_CONFIRMED",
    actionId: match.actionId,
    playerId: intent.playerId,
    description: match.description,
  });
  if (tablesEmpty(spec, ctx.state)) endRound(ctx);
  else startTurn(ctx, nextPlayerId(ctx.state, intent.playerId), true);
  return { state: ctx.state, events: ctx.events };
}

function getResult(_spec: GameSpec, state: GameState): GameResult {
  return {
    finished: state.status === "finished",
    winnerIds: state.winnerIds ?? [],
    finalScores: Object.fromEntries(state.players.map((p) => [p.id, p.score])),
  };
}

function viewFor(spec: GameSpec, state: GameState, viewer: PlayerId): GameState {
  const view = structuredClone(state);
  for (const z of view.zones) {
    const def = defById(spec, z.zoneId);
    const hidden = def.visibility === "private" || (def.visibility === "owner" && z.owner !== viewer);
    if (!hidden) continue;
    for (const id of idsIn(z)) {
      const redacted: EntityInstance = { id, type: "hidden", faceUp: false };
      view.entities[id] = redacted;
    }
  }
  return view;
}

export const tileDraftingEngine: GameEngine = {
  initialize,
  getLegalActions,
  applyAction,
  getResult,
  viewFor,
};

export function getEngine(spec: GameSpec): GameEngine {
  const archetype: string = spec.mechanics.archetype;
  switch (archetype) {
    case "tile-drafting":
      return tileDraftingEngine;
    default:
      throw new Error(`Unsupported game archetype "${archetype}"`);
  }
}

// ---------------------------------------------------------------------------
// Bot
// ---------------------------------------------------------------------------

/** 3 = exactly fills a row, 2 = fits without spilling, 1 = row with spill, 0 = straight to penalty. */
function botPreference(spec: GameSpec, state: GameState, playerId: PlayerId, action: LegalAction): number {
  const { from, to, tileType } = action.selections;
  const dest = locOf(defById(spec, to), playerId);
  if (dest.def.role === "penalty") return 0;
  const count = tileIdsIn(state, zoneOf(state, { def: defById(spec, from), owner: "shared" })).filter(
    (id) => typeOf(state, id) === tileType,
  ).length;
  const free = freeSlots(dest.def, zoneOf(state, dest));
  if (count === free) return 3;
  return count < free ? 2 : 1;
}

export function chooseBotAction(
  spec: GameSpec,
  state: GameState,
  playerId: PlayerId,
  rngState: number,
): { action: LegalAction | null; rngState: number } {
  const legal = getLegalActions(spec, state, playerId);
  if (legal.length === 0) return { action: null, rngState };
  const scored = legal.map((action) => ({ action, pref: botPreference(spec, state, playerId, action) }));
  const best = Math.max(...scored.map((s) => s.pref));
  const candidates = scored.filter((s) => s.pref === best);
  const r = nextRandom(rngState);
  return { action: candidates[Math.floor(r.value * candidates.length)].action, rngState: r.state };
}
