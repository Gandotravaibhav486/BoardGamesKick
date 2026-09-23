import type { GameSpec } from "@/lib/game-spec/types";
import type { PresentationSpec } from "@/lib/presentation/types";

/**
 * Tidepool — an original tile-drafting showcase game.
 * Players draft shells from shared tidepools into their collection rows, then
 * place completed rows into their reef mosaic to score. Not Azul; used only to
 * exercise the same class of tabletop UI (shared draft area + player boards).
 */

export const TILE_TYPES = ["ember", "tide", "moss", "dusk", "sand"] as const;
export type TileType = (typeof TILE_TYPES)[number];

const TILES_PER_TYPE = 20;
const POOL_COUNT = 5;
const POOL_CAPACITY = 4;

export const tidepoolSpec: GameSpec = {
  specVersion: "0.1",
  id: "tidepool",
  name: "Tidepool",
  summary:
    "Draft shells from shared tidepools into your collection rows, then build the most valuable reef mosaic. Drafting is public; scoring is about timing and denial.",
  players: { min: 2, max: 4 },
  estimatedMinutes: 30,
  entityTypes: [
    ...TILE_TYPES.map((t) => ({
      id: t,
      name: `${t[0].toUpperCase()}${t.slice(1)} shell`,
      kind: "tile" as const,
      count: TILES_PER_TYPE,
    })),
    { id: "starting-marker", name: "Starting marker", kind: "token", count: 1 },
  ],
  resources: [],
  zones: [
    { id: "bag", name: "Shell bag", owner: "shared", visibility: "private", geometry: { kind: "stack" } },
    ...Array.from({ length: POOL_COUNT }, (_, i) => ({
      id: `pool-${i + 1}`,
      name: `Tidepool ${i + 1}`,
      owner: "shared" as const,
      visibility: "public" as const,
      geometry: { kind: "row" as const, capacity: POOL_CAPACITY },
    })),
    { id: "shore", name: "Shore", owner: "shared", visibility: "public", geometry: { kind: "row" } },
    { id: "discard", name: "Tide-out pile", owner: "shared", visibility: "public", geometry: { kind: "stack" } },
    ...[1, 2, 3, 4, 5].map((cap) => ({
      id: `row-${cap}`,
      name: `Collection row ${cap}`,
      owner: "player" as const,
      visibility: "public" as const,
      geometry: { kind: "row" as const, capacity: cap },
    })),
    {
      id: "reef",
      name: "Reef mosaic",
      owner: "player",
      visibility: "public",
      geometry: { kind: "grid", rows: 5, cols: 5 },
      cellPattern: [
        ["tide", "sand", "ember", "dusk", "moss"],
        ["moss", "tide", "sand", "ember", "dusk"],
        ["dusk", "moss", "tide", "sand", "ember"],
        ["ember", "dusk", "moss", "tide", "sand"],
        ["sand", "ember", "dusk", "moss", "tide"],
      ],
    },
    { id: "spill", name: "Spill", owner: "player", visibility: "public", geometry: { kind: "row", capacity: 7 } },
  ],
  setup: [
    ...TILE_TYPES.map((t) => ({ type: "fill" as const, zone: { zone: "bag" }, entityType: t, count: TILES_PER_TYPE })),
    { type: "shuffle", zone: { zone: "bag" } },
    ...Array.from({ length: POOL_COUNT }, (_, i) => ({
      type: "deal" as const,
      zone: { zone: `pool-${i + 1}` },
      count: POOL_CAPACITY,
    })),
    { type: "fill", zone: { zone: "shore" }, entityType: "starting-marker", count: 1 },
  ],
  turnStructure: {
    order: "starting-player-token",
    phases: [
      {
        id: "draft",
        name: "Draft shells",
        actions: ["take-from-pool", "take-from-shore"],
        endsWhen: {
          op: "and",
          conditions: [
            { op: "zoneEmpty", zone: { zone: "shore" } },
            ...Array.from({ length: POOL_COUNT }, (_, i) => ({
              op: "zoneEmpty" as const,
              zone: { zone: `pool-${i + 1}` },
            })),
          ],
        },
      },
      {
        id: "build",
        name: "Build reef",
        actions: ["place-row"],
        endsWhen: { op: "always" },
      },
    ],
  },
  actions: [
    {
      id: "take-from-pool",
      name: "Take all shells of one type from a tidepool",
      kind: "move",
      from: { anyOf: Array.from({ length: POOL_COUNT }, (_, i) => `pool-${i + 1}`) },
      to: { anyOf: ["row-1", "row-2", "row-3", "row-4", "row-5"], owner: "active" },
      preconditions: [{ op: "not", condition: { op: "zoneEmpty", zone: { zone: "pool-1" } } }],
      effects: [
        { type: "moveEntity", from: { zone: "pool-1" }, to: { zone: "row-1", owner: "active" }, count: "all" },
        { type: "moveEntity", from: { zone: "pool-1" }, to: { zone: "shore" }, count: "all" },
        { type: "advanceTurn" },
      ],
    },
    {
      id: "take-from-shore",
      name: "Take all shells of one type from the shore",
      kind: "move",
      from: { zone: "shore" },
      to: { anyOf: ["row-1", "row-2", "row-3", "row-4", "row-5"], owner: "active" },
      preconditions: [{ op: "not", condition: { op: "zoneEmpty", zone: { zone: "shore" } } }],
      effects: [
        { type: "moveEntity", from: { zone: "shore" }, to: { zone: "row-1", owner: "active" }, count: "all" },
        { type: "advanceTurn" },
      ],
    },
    {
      id: "place-row",
      name: "Place a completed row into the reef",
      kind: "place",
      from: { anyOf: ["row-1", "row-2", "row-3", "row-4", "row-5"], owner: "active" },
      to: { zone: "reef", owner: "active" },
      preconditions: [{ op: "always" }],
      effects: [
        { type: "moveEntity", from: { zone: "row-1", owner: "active" }, to: { zone: "reef", owner: "active" }, count: 1 },
        { type: "recordScore", player: "active", amount: { const: 1 } },
        { type: "advancePhase" },
      ],
    },
  ],
  scoring: [
    {
      id: "adjacency",
      description: "Each shell placed scores 1 plus 1 per orthogonally connected shell in its row and column.",
      when: "immediate",
      player: "active",
      amount: { const: 1 },
    },
    {
      id: "spill-penalty",
      description: "Each shell in your spill row costs points: -1, -1, -2, -2, -2, -3, -3.",
      when: "end-of-round",
      player: "all",
      amount: { const: -1 },
    },
    {
      id: "complete-row",
      description: "Each completed reef row scores 2 at game end.",
      when: "end-of-game",
      player: "all",
      amount: { const: 2 },
    },
  ],
  endConditions: [{ type: "zone-filled", zone: "reef", owner: "player" }],
};

export const tidepoolPresentation: PresentationSpec = {
  specVersion: "0.1",
  gameSpecId: "tidepool",
  themeMode: "dark",
  colors: {},
  entityStyles: [
    { entityTypeId: "ember", color: "var(--tile-ember)", icon: "flame", label: "Ember" },
    { entityTypeId: "tide", color: "var(--tile-tide)", icon: "wave", label: "Tide" },
    { entityTypeId: "moss", color: "var(--tile-moss)", icon: "leaf", label: "Moss" },
    { entityTypeId: "dusk", color: "var(--tile-dusk)", icon: "moon", label: "Dusk" },
    { entityTypeId: "sand", color: "var(--tile-sand)", icon: "sun", label: "Sand" },
    { entityTypeId: "starting-marker", color: "#f8fafc", icon: "flag", label: "Starting marker" },
  ],
  zonePlacements: [
    ...Array.from({ length: POOL_COUNT }, (_, i) => ({ zoneId: `pool-${i + 1}`, region: "table" as const })),
    { zoneId: "shore", region: "table" },
    { zoneId: "discard", region: "table", label: "Tide-out" },
    ...[1, 2, 3, 4, 5].map((n) => ({ zoneId: `row-${n}`, region: "my-area" as const })),
    { zoneId: "reef", region: "my-area" },
    { zoneId: "spill", region: "my-area" },
  ],
  tableStyle: "felt",
  animation: { enabled: true, speed: "normal" },
};
