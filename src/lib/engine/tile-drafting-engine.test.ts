import { describe, expect, it } from "vitest";
import { STARTING_MARKER_TYPE } from "@/lib/game-spec/tile-drafting";
import type { GameEvent, GameSpec, GameState, ZoneState } from "@/lib/game-spec/types";
import { tidepoolSpec } from "@/lib/showcase/tidepool";
import {
  chooseBotAction,
  getEngine,
  IllegalActionError,
  mulberry32,
  nextRandom,
  tileDraftingEngine as engine,
  type LegalAction,
} from "./index";

const PLAYERS_3 = [
  { id: "p1", name: "Ada" },
  { id: "p2", name: "Bo" },
  { id: "p3", name: "Cy" },
];
const PLAYERS_2 = PLAYERS_3.slice(0, 2);
const POOLS = ["pool-1", "pool-2", "pool-3", "pool-4", "pool-5"];

function init(players = PLAYERS_3, seed = 42, spec: GameSpec = tidepoolSpec) {
  return engine.initialize(spec, players, seed);
}

function zone(state: GameState, zoneId: string, owner = "shared"): ZoneState {
  const z = state.zones.find((s) => s.zoneId === zoneId && s.owner === owner);
  if (!z) throw new Error(`missing zone ${zoneId}/${owner}`);
  return z;
}

function ids(z: ZoneState): string[] {
  return z.slots.filter((s): s is string => s !== null);
}

function typesIn(state: GameState, z: ZoneState): string[] {
  return ids(z).map((id) => state.entities[id].type);
}

function withSpec(patch: (p: GameSpec["mechanics"]["params"]) => void): GameSpec {
  const spec = structuredClone(tidepoolSpec);
  patch(spec.mechanics.params);
  return spec;
}

/**
 * Crafted-state helper: moves every tile on the table (pools, overflow) back to
 * the supply, leaving the marker in the overflow. Returns a mutable clone.
 */
function clearTable(state: GameState): GameState {
  const s = structuredClone(state);
  const supply = zone(s, "supply");
  for (const zid of [...POOLS, "overflow"]) {
    const z = zone(s, zid);
    for (const id of ids(z)) {
      if (s.entities[id].type === STARTING_MARKER_TYPE) continue;
      supply.slots.push(id);
      if (zid === "overflow") z.slots.splice(z.slots.indexOf(id), 1);
      else z.slots[z.slots.indexOf(id)] = null;
    }
  }
  return s;
}

function takeFromSupply(s: GameState, type: string): string {
  const supply = zone(s, "supply");
  const idx = supply.slots.findIndex((id) => id !== null && s.entities[id].type === type);
  if (idx < 0) throw new Error(`no ${type} in supply`);
  const [id] = supply.slots.splice(idx, 1);
  return id as string;
}

function fillPool(s: GameState, poolId: string, types: string[]): void {
  const z = zone(s, poolId);
  types.forEach((t, i) => (z.slots[i] = takeFromSupply(s, t)));
}

function addToOverflow(s: GameState, types: string[]): void {
  for (const t of types) zone(s, "overflow").slots.push(takeFromSupply(s, t));
}

function setMosaic(s: GameState, owner: string, cells: [number, number, string][]): void {
  for (const [r, c, t] of cells) zone(s, "mosaic", owner).slots[r * 5 + c] = takeFromSupply(s, t);
}

function take(from: string, tileType: string, to: string, playerId = "p1", actionId = "take-from-pool") {
  return { actionId, playerId, selections: { from, tileType, to } };
}

function scoreEvents(events: GameEvent[]) {
  return events.filter((e): e is Extract<GameEvent, { type: "SCORE_CHANGED" }> => e.type === "SCORE_CHANGED");
}

function playBots(spec: GameSpec, start: GameState, maxActions: number, botSeed = 7) {
  let state = start;
  let rng = botSeed;
  const events: GameEvent[] = [];
  let actions = 0;
  while (state.status !== "finished" && actions < maxActions) {
    const pick = chooseBotAction(spec, state, state.turn.activePlayer, rng);
    rng = pick.rngState;
    if (!pick.action) throw new Error("bot found no action while in progress");
    const res = engine.applyAction(spec, state, {
      actionId: pick.action.actionId,
      playerId: state.turn.activePlayer,
      selections: pick.action.selections,
    });
    state = res.state;
    events.push(...res.events);
    actions++;
  }
  return { state, events, actions };
}

describe("PRNG", () => {
  it("nextRandom matches mulberry32 and is pure", () => {
    const gen = mulberry32(123);
    let s = 123;
    for (let i = 0; i < 5; i++) {
      const r = nextRandom(s);
      expect(r.value).toBe(gen());
      expect(r.value).toBeGreaterThanOrEqual(0);
      expect(r.value).toBeLessThan(1);
      s = r.state;
    }
    expect(nextRandom(99)).toEqual(nextRandom(99));
  });
});

describe("initialize", () => {
  it("creates entities, deals pools and places the marker", () => {
    const { state, events } = init();
    expect(Object.keys(state.entities)).toHaveLength(101);
    for (const pool of POOLS) expect(ids(zone(state, pool))).toHaveLength(4);
    expect(ids(zone(state, "supply"))).toHaveLength(80);
    expect(typesIn(state, zone(state, "overflow"))).toEqual([STARTING_MARKER_TYPE]);
    expect(state.status).toBe("in-progress");
    expect(state.turn).toMatchObject({ round: 1, activePlayer: "p1", phaseId: "draft", turnNumber: 1 });
    expect(zone(state, "mosaic", "p2").slots).toHaveLength(25);
    expect(zone(state, "row-3", "p3").slots).toEqual([null, null, null]);
    expect(events.map((e) => e.type)).toEqual(["GAME_STARTED", "ROUND_STARTED", "PHASE_STARTED", "TURN_STARTED"]);
  });

  it("rejects invalid player counts", () => {
    expect(() => init([PLAYERS_3[0]])).toThrow();
    expect(() => init([...PLAYERS_3, { id: "p4", name: "D" }, { id: "p5", name: "E" }])).toThrow();
  });

  it("getEngine selects the archetype and rejects unknown ones", () => {
    expect(getEngine(tidepoolSpec)).toBe(engine);
    const bad = { ...tidepoolSpec, mechanics: { archetype: "worker-placement" } } as unknown as GameSpec;
    expect(() => getEngine(bad)).toThrow(/Unsupported/);
  });
});

describe("determinism", () => {
  it("same seed → identical state; different seeds differ", () => {
    expect(init(PLAYERS_3, 5)).toEqual(init(PLAYERS_3, 5));
    expect(init(PLAYERS_3, 5).state.zones).not.toEqual(init(PLAYERS_3, 6).state.zones);
  });

  it("same action sequence → identical states", () => {
    const a = playBots(tidepoolSpec, init(PLAYERS_3, 9).state, 40, 3);
    const b = playBots(tidepoolSpec, init(PLAYERS_3, 9).state, 40, 3);
    expect(a.state).toEqual(b.state);
    expect(a.events).toEqual(b.events);
  });
});

describe("legal actions", () => {
  it("returns nothing for non-active players", () => {
    const { state } = init();
    expect(engine.getLegalActions(tidepoolSpec, state, "p2")).toEqual([]);
    expect(engine.getLegalActions(tidepoolSpec, state, "p1").length).toBeGreaterThan(0);
  });

  it("every destination obeys the row rules and penalty is always offered", () => {
    const mid = playBots(tidepoolSpec, init().state, 12).state;
    const player = mid.turn.activePlayer;
    const legal = engine.getLegalActions(tidepoolSpec, mid, player);
    expect(legal.length).toBeGreaterThan(0);
    const rowIds = ["row-1", "row-2", "row-3", "row-4", "row-5"];
    const pattern = tidepoolSpec.zones.find((z) => z.id === "mosaic")!.cellPattern!;
    const byTile = new Map<string, LegalAction[]>();
    for (const a of legal) {
      expect(a.selections.tileType).not.toBe(STARTING_MARKER_TYPE);
      const key = `${a.selections.from}:${a.selections.tileType}`;
      byTile.set(key, [...(byTile.get(key) ?? []), a]);
      if (a.selections.to === "penalty") continue;
      const r = rowIds.indexOf(a.selections.to);
      const row = zone(mid, a.selections.to, player);
      expect(row.slots).toContain(null);
      expect(typesIn(mid, row).every((t) => t === a.selections.tileType)).toBe(true);
      const col = pattern[r].indexOf(a.selections.tileType);
      expect(zone(mid, "mosaic", player).slots[r * 5 + col]).toBeNull();
    }
    for (const actions of byTile.values()) expect(actions.some((a) => a.selections.to === "penalty")).toBe(true);
  });

  it("excludes rows holding another type and rows whose mosaic cell is taken", () => {
    const s = clearTable(init().state);
    fillPool(s, "pool-1", ["ember", "ember", "tide", "moss"]);
    zone(s, "row-2", "p1").slots[1] = takeFromSupply(s, "tide");
    setMosaic(s, "p1", [[0, 0, "ember"]]);
    const dests = engine
      .getLegalActions(tidepoolSpec, s, "p1")
      .filter((a) => a.selections.tileType === "ember")
      .map((a) => a.selections.to);
    expect(dests).toEqual(["row-3", "row-4", "row-5", "penalty"]);
  });

  it("describes moves with spec names", () => {
    const s = clearTable(init().state);
    fillPool(s, "pool-3", ["ember", "ember", "tide", "moss"]);
    const a = engine
      .getLegalActions(tidepoolSpec, s, "p1")
      .find((x) => x.selections.tileType === "ember" && x.selections.to === "row-2");
    expect(a?.description).toBe("Take 2 Ember shells from Tidepool 3 → Collection row 2");
  });

  it("throws IllegalActionError for fabricated or out-of-turn intents without mutating state", () => {
    const { state } = init();
    const snapshot = structuredClone(state);
    const legal = engine.getLegalActions(tidepoolSpec, state, "p1")[0];
    expect(() =>
      engine.applyAction(tidepoolSpec, state, { ...legal, playerId: "p2" }),
    ).toThrow(IllegalActionError);
    expect(() =>
      engine.applyAction(tidepoolSpec, state, take("supply", "ember", "row-1")),
    ).toThrow(IllegalActionError);
    expect(() =>
      engine.applyAction(tidepoolSpec, state, { actionId: "cheat", playerId: "p1", selections: legal.selections }),
    ).toThrow(IllegalActionError);
    expect(state).toEqual(snapshot);
  });
});

describe("moves", () => {
  it("moves matching tiles right-aligned and the rest to the overflow", () => {
    const s = clearTable(init().state);
    fillPool(s, "pool-1", ["ember", "ember", "tide", "moss"]);
    fillPool(s, "pool-2", ["sand", "sand", "sand", "sand"]);
    const snapshot = structuredClone(s);
    const { state, events } = engine.applyAction(tidepoolSpec, s, take("pool-1", "ember", "row-3"));
    expect(s).toEqual(snapshot);
    const row = zone(state, "row-3", "p1");
    expect(row.slots[0]).toBeNull();
    expect(typesIn(state, row)).toEqual(["ember", "ember"]);
    expect(zone(state, "pool-1").slots).toEqual([null, null, null, null]);
    expect(typesIn(state, zone(state, "overflow")).sort()).toEqual(["moss", STARTING_MARKER_TYPE, "tide"].sort());
    expect(state.turn).toMatchObject({ activePlayer: "p2", turnNumber: 2 });
    const moved = events.filter((e) => e.type === "ENTITY_MOVED");
    expect(moved).toHaveLength(4);
    expect(events.map((e) => e.type)).toContain("ACTION_CONFIRMED");
    expect(events.at(-1)).toEqual({ type: "TURN_STARTED", playerId: "p2", turnNumber: 2 });
  });

  it("spills excess tiles into the penalty zone", () => {
    const s = clearTable(init().state);
    fillPool(s, "pool-1", ["ember", "ember", "ember", "tide"]);
    fillPool(s, "pool-2", ["sand", "sand", "sand", "sand"]);
    const { state } = engine.applyAction(tidepoolSpec, s, take("pool-1", "ember", "row-2"));
    expect(typesIn(state, zone(state, "row-2", "p1"))).toEqual(["ember", "ember"]);
    const penalty = zone(state, "penalty", "p1");
    expect(state.entities[penalty.slots[0] as string].type).toBe("ember");
    expect(penalty.slots.slice(1).every((x) => x === null)).toBe(true);
  });

  it("taking to the penalty zone sends everything there, overflowing to discard", () => {
    const s = clearTable(init().state);
    fillPool(s, "pool-1", ["ember", "ember", "ember", "tide"]);
    fillPool(s, "pool-2", ["sand", "sand", "sand", "sand"]);
    const pen = zone(s, "penalty", "p1");
    for (let i = 0; i < 5; i++) pen.slots[i] = takeFromSupply(s, "dusk");
    const { state } = engine.applyAction(tidepoolSpec, s, take("pool-1", "ember", "penalty"));
    expect(ids(zone(state, "penalty", "p1"))).toHaveLength(7);
    expect(typesIn(state, zone(state, "discard"))).toEqual(["ember"]);
  });

  it("first take from the overflow grants the marker and next starting player", () => {
    const s = clearTable(init().state);
    addToOverflow(s, ["ember", "ember"]);
    fillPool(s, "pool-1", ["tide", "tide", "tide", "tide"]);
    const { state } = engine.applyAction(
      tidepoolSpec,
      s,
      take("overflow", "ember", "row-2", "p1", "take-from-overflow"),
    );
    const penalty = zone(state, "penalty", "p1");
    expect(state.entities[penalty.slots[0] as string].type).toBe(STARTING_MARKER_TYPE);
    expect(ids(penalty)).toHaveLength(1);
    expect(state.turn.nextStartingPlayer).toBe("p1");
    expect(ids(zone(state, "overflow"))).toHaveLength(0);
  });
});

describe("build phase", () => {
  /** p1 completes row-1 with an ember (mosaic cell 0,0), ending the draft. */
  function buildWith(spec: GameSpec, cells: [number, number, string][], prep?: (s: GameState) => void) {
    const s = clearTable(init(PLAYERS_2, 1, spec).state);
    fillPool(s, "pool-1", ["ember"]);
    setMosaic(s, "p1", cells);
    prep?.(s);
    return engine.applyAction(spec, s, take("pool-1", "ember", "row-1"));
  }

  it.each([
    ["isolated tile", [] as [number, number, string][], 1],
    ["horizontal neighbour", [[0, 1, "tide"]] as [number, number, string][], 2],
    ["L-shape", [[0, 1, "tide"], [1, 0, "sand"]] as [number, number, string][], 4],
    ["long runs", [[0, 1, "tide"], [0, 2, "moss"], [1, 0, "sand"]] as [number, number, string][], 5],
  ])("adjacency scoring: %s", (_label, cells, expected) => {
    const { state, events } = buildWith(tidepoolSpec, cells);
    expect(state.players[0].score).toBe(expected);
    expect(state.entities[zone(state, "mosaic", "p1").slots[0] as string].type).toBe("ember");
    expect(ids(zone(state, "row-1", "p1"))).toHaveLength(0);
    const scored = scoreEvents(events);
    expect(scored[0]).toMatchObject({ playerId: "p1", delta: expected, reason: "Placed Ember shell in Reef mosaic" });
    expect(events.map((e) => e.type)).toContain("ROUND_ENDED");
  });

  it("flat scoring gives 1 point", () => {
    const flat = withSpec((p) => (p.scoring = { ...p.scoring, placement: "flat" }));
    const { state } = buildWith(flat, [[0, 1, "tide"], [1, 0, "sand"]]);
    expect(state.players[0].score).toBe(1);
  });

  it("discards extra tiles from full rows and leaves partial rows", () => {
    const { state } = buildWith(tidepoolSpec, [], (s) => {
      const r2 = zone(s, "row-2", "p1");
      r2.slots[0] = takeFromSupply(s, "tide");
      r2.slots[1] = takeFromSupply(s, "tide");
      zone(s, "row-3", "p1").slots[2] = takeFromSupply(s, "moss");
    });
    // ember → (0,0) = 1; tide → (1,2), not adjacent to anything = 1.
    expect(state.players[0].score).toBe(2);
    expect(ids(zone(state, "row-2", "p1"))).toHaveLength(0);
    expect(typesIn(state, zone(state, "row-3", "p1"))).toEqual(["moss"]);
    expect(typesIn(state, zone(state, "discard"))).toContain("tide");
  });

  it("applies spill penalties from the schedule", () => {
    const { state, events } = buildWith(tidepoolSpec, [], (s) => {
      s.players[0].score = 10;
      const pen = zone(s, "penalty", "p1");
      for (let i = 0; i < 3; i++) pen.slots[i] = takeFromSupply(s, "dusk");
    });
    expect(state.players[0].score).toBe(10 + 1 - 4);
    expect(scoreEvents(events).find((e) => e.reason === "Spill penalty")?.delta).toBe(-4);
    expect(ids(zone(state, "penalty", "p1"))).toHaveLength(0);
  });

  it("floors the score at zero", () => {
    const { state, events } = buildWith(tidepoolSpec, [], (s) => {
      const pen = zone(s, "penalty", "p1");
      for (let i = 0; i < 7; i++) pen.slots[i] = takeFromSupply(s, "dusk");
    });
    expect(state.players[0].score).toBe(0);
    expect(scoreEvents(events).find((e) => e.reason === "Spill penalty")?.delta).toBe(-1);
  });
});

describe("round progression", () => {
  it("starts a new round with refilled pools and the marker taker first", () => {
    const s = clearTable(init(PLAYERS_2).state);
    fillPool(s, "pool-1", ["ember"]);
    addToOverflow(s, ["tide"]);
    const r1 = engine.applyAction(tidepoolSpec, s, take("pool-1", "ember", "row-1"));
    expect(r1.state.turn.activePlayer).toBe("p2");
    const r2 = engine.applyAction(
      tidepoolSpec,
      r1.state,
      take("overflow", "tide", "row-2", "p2", "take-from-overflow"),
    );
    const st = r2.state;
    expect(st.turn).toMatchObject({ round: 2, activePlayer: "p2", phaseId: "draft" });
    expect(st.turn.nextStartingPlayer).toBeUndefined();
    for (const pool of POOLS) expect(ids(zone(st, pool))).toHaveLength(4);
    expect(typesIn(st, zone(st, "overflow"))).toEqual([STARTING_MARKER_TYPE]);
    expect(st.players.map((p) => p.score)).toEqual([1, 0]);
    const types = r2.events.map((e) => e.type);
    expect(types.indexOf("ROUND_ENDED")).toBeLessThan(types.indexOf("ROUND_STARTED"));
    expect(r2.events.at(-1)).toMatchObject({ type: "TURN_STARTED", playerId: "p2" });
  });

  it("refills from the discard when the supply runs out", () => {
    const s = clearTable(init(PLAYERS_2).state);
    fillPool(s, "pool-1", ["ember"]);
    const supply = zone(s, "supply");
    zone(s, "discard").slots.push(...ids(supply));
    supply.slots = [];
    const { state, events } = engine.applyAction(tidepoolSpec, s, take("pool-1", "ember", "row-1"));
    for (const pool of POOLS) expect(ids(zone(state, pool))).toHaveLength(4);
    expect(ids(zone(state, "discard"))).toHaveLength(0);
    expect(ids(zone(state, "supply"))).toHaveLength(100 - 1 - 20);
    expect(events.some((e) => e.type === "ENTITY_MOVED" && e.from === "discard" && e.to === "supply")).toBe(true);
  });
});

describe("game completion", () => {
  it("plays Tidepool to completion with bots", () => {
    const { state, events, actions } = playBots(tidepoolSpec, init(PLAYERS_3, 2024).state, 500);
    expect(actions).toBeLessThan(500);
    expect(state.status).toBe("finished");
    const result = engine.getResult(tidepoolSpec, state);
    expect(result.finished).toBe(true);
    expect(result.winnerIds.length).toBeGreaterThan(0);
    const max = Math.max(...Object.values(result.finalScores));
    for (const w of result.winnerIds) expect(result.finalScores[w]).toBe(max);
    for (const p of state.players) {
      expect(p.score).toBeGreaterThanOrEqual(0);
      const sum = scoreEvents(events).filter((e) => e.playerId === p.id).reduce((a, e) => a + e.delta, 0);
      expect(sum).toBe(p.score);
    }
    // completed-row end condition: someone has a full mosaic row
    const full = state.players.some((p) => {
      const slots = zone(state, "mosaic", p.id).slots;
      return [0, 1, 2, 3, 4].some((r) => slots.slice(r * 5, r * 5 + 5).every((x) => x !== null));
    });
    expect(full).toBe(true);
    expect(events.at(-1)).toEqual({ type: "GAME_ENDED", winnerIds: result.winnerIds });
    for (const p of state.players) expect(engine.getLegalActions(tidepoolSpec, state, p.id)).toEqual([]);
    expect(() =>
      engine.applyAction(tidepoolSpec, state, take("pool-1", "ember", "penalty", state.turn.activePlayer)),
    ).toThrow(IllegalActionError);
    // entity conservation: every entity sits in exactly one zone
    const placed = state.zones.flatMap(ids);
    expect(placed).toHaveLength(101);
    expect(new Set(placed).size).toBe(101);
  });

  it("ends after N rounds with the rounds end condition", () => {
    const spec = withSpec((p) => (p.endCondition = { type: "rounds", rounds: 2 }));
    const { state, events } = playBots(spec, init(PLAYERS_2, 11, spec).state, 500);
    expect(state.status).toBe("finished");
    expect(state.turn.round).toBe(2);
    expect(events.filter((e) => e.type === "ROUND_ENDED")).toHaveLength(2);
  });
});

describe("viewFor", () => {
  it("hides supply contents without changing counts or the input", () => {
    const { state } = init();
    const snapshot = structuredClone(state);
    const view = engine.viewFor(tidepoolSpec, state, "p1");
    const supplyIds = ids(zone(view, "supply"));
    expect(supplyIds).toHaveLength(80);
    for (const id of supplyIds) expect(view.entities[id]).toEqual({ id, type: "hidden", faceUp: false });
    const poolId = ids(zone(view, "pool-1"))[0];
    expect(view.entities[poolId].type).not.toBe("hidden");
    expect(state).toEqual(snapshot);
  });
});
