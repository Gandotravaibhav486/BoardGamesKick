import type {
  EntityTypeDef,
  GameSpec,
  TileDraftingParams,
  ZoneDef,
} from "@/lib/game-spec/types";
import type { EntityStyle, IconName, PresentationSpec } from "@/lib/presentation/types";

/**
 * Compact, LLM-facing description of a tile-drafting game. The compiler fills
 * this in; `buildTileDraftingGame` deterministically expands it into a full,
 * valid Game Spec + Presentation Spec. The LLM never writes zones, actions or
 * effects directly.
 */
export interface TileDraftingDesign {
  id: string;
  name: string;
  summary: string;
  players: { min: number; max: number };
  estimatedMinutes: number;
  /** 3–6 tile types. Colors are CSS hex; icons come from the fixed registry. */
  tileTypes: { id: string; name: string; color: string; icon: IconName }[];
  tilesPerType: number;
  poolCount: number;
  poolCapacity: number;
  rowCapacities: number[];
  /** Explicit mosaic pattern of tile type ids, or "latin-shift" for a rotated Latin square */
  mosaicPattern: "latin-shift" | string[][];
  spillPenalties: number[];
  scoring: TileDraftingParams["scoring"];
  endCondition: TileDraftingParams["endCondition"];
  startingMarker: boolean;
  /** Thematic names for the zones */
  names: {
    supply: string;
    pool: string;
    overflow: string;
    discard: string;
    collectionRow: string;
    mosaic: string;
    penalty: string;
    startingMarker: string;
  };
  tableStyle: PresentationSpec["tableStyle"];
}

export const ZONE_IDS = {
  supply: "supply",
  pool: (i: number) => `pool-${i + 1}`,
  overflow: "overflow",
  discard: "discard",
  row: (i: number) => `row-${i + 1}`,
  mosaic: "mosaic",
  penalty: "penalty",
} as const;

export const STARTING_MARKER_TYPE = "starting-marker";

export function latinShiftPattern(typeIds: string[]): string[][] {
  const n = typeIds.length;
  return Array.from({ length: n }, (_, r) =>
    Array.from({ length: n }, (_, c) => typeIds[(c - r + n) % n]),
  );
}

export function buildTileDraftingGame(design: TileDraftingDesign): {
  spec: GameSpec;
  presentation: PresentationSpec;
} {
  const typeIds = design.tileTypes.map((t) => t.id);
  const n = design.rowCapacities.length;
  const pattern =
    design.mosaicPattern === "latin-shift" ? latinShiftPattern(typeIds) : design.mosaicPattern;

  const entityTypes: EntityTypeDef[] = [
    ...design.tileTypes.map((t) => ({
      id: t.id,
      name: t.name,
      kind: "tile" as const,
      count: design.tilesPerType,
    })),
    ...(design.startingMarker
      ? [{ id: STARTING_MARKER_TYPE, name: design.names.startingMarker, kind: "token" as const, count: 1 }]
      : []),
  ];

  const pools: ZoneDef[] = Array.from({ length: design.poolCount }, (_, i) => ({
    id: ZONE_IDS.pool(i),
    name: `${design.names.pool} ${i + 1}`,
    owner: "shared",
    visibility: "public",
    geometry: { kind: "row", capacity: design.poolCapacity },
    role: "pool",
  }));

  const rows: ZoneDef[] = design.rowCapacities.map((cap, i) => ({
    id: ZONE_IDS.row(i),
    name: `${design.names.collectionRow} ${i + 1}`,
    owner: "player",
    visibility: "public",
    geometry: { kind: "row", capacity: cap },
    role: "collection-row",
  }));

  const zones: ZoneDef[] = [
    { id: ZONE_IDS.supply, name: design.names.supply, owner: "shared", visibility: "private", geometry: { kind: "stack" }, role: "supply" },
    ...pools,
    { id: ZONE_IDS.overflow, name: design.names.overflow, owner: "shared", visibility: "public", geometry: { kind: "row" }, role: "overflow" },
    { id: ZONE_IDS.discard, name: design.names.discard, owner: "shared", visibility: "public", geometry: { kind: "stack" }, role: "discard" },
    ...rows,
    { id: ZONE_IDS.mosaic, name: design.names.mosaic, owner: "player", visibility: "public", geometry: { kind: "grid", rows: n, cols: n }, cellPattern: pattern, role: "mosaic" },
    { id: ZONE_IDS.penalty, name: design.names.penalty, owner: "player", visibility: "public", geometry: { kind: "row", capacity: design.spillPenalties.length }, role: "penalty" },
  ];

  const poolIds = pools.map((p) => p.id);
  const rowIds = rows.map((r) => r.id);

  const spec: GameSpec = {
    specVersion: "0.1",
    id: design.id,
    name: design.name,
    summary: design.summary,
    players: design.players,
    estimatedMinutes: design.estimatedMinutes,
    mechanics: {
      archetype: "tile-drafting",
      params: {
        poolCount: design.poolCount,
        poolCapacity: design.poolCapacity,
        tilesPerType: design.tilesPerType,
        rowCapacities: design.rowCapacities,
        spillPenalties: design.spillPenalties,
        scoring: design.scoring,
        endCondition: design.endCondition,
        startingMarker: design.startingMarker,
      },
    },
    entityTypes,
    resources: [],
    zones,
    setup: [
      ...typeIds.map((t) => ({ type: "fill" as const, zone: { zone: ZONE_IDS.supply }, entityType: t, count: design.tilesPerType })),
      { type: "shuffle", zone: { zone: ZONE_IDS.supply } },
      ...poolIds.map((id) => ({ type: "deal" as const, zone: { zone: id }, count: design.poolCapacity })),
      ...(design.startingMarker
        ? [{ type: "fill" as const, zone: { zone: ZONE_IDS.overflow }, entityType: STARTING_MARKER_TYPE, count: 1 }]
        : []),
    ],
    turnStructure: {
      order: design.startingMarker ? "starting-player-token" : "fixed",
      phases: [
        {
          id: "draft",
          name: "Draft",
          actions: ["take-from-pool", "take-from-overflow"],
          endsWhen: {
            op: "and",
            conditions: [
              { op: "zoneEmpty", zone: { zone: ZONE_IDS.overflow } },
              ...poolIds.map((id) => ({ op: "zoneEmpty" as const, zone: { zone: id } })),
            ],
          },
        },
        { id: "build", name: "Build", actions: ["place-rows"], endsWhen: { op: "always" } },
      ],
    },
    actions: [
      {
        id: "take-from-pool",
        name: `Take all tiles of one type from a ${design.names.pool.toLowerCase()}`,
        kind: "move",
        from: { anyOf: poolIds },
        to: { anyOf: [...rowIds, ZONE_IDS.penalty], owner: "active" },
        preconditions: [{ op: "isActivePlayer", player: "active" }],
        effects: [
          { type: "moveEntity", from: { anyOf: poolIds }, to: { anyOf: rowIds, owner: "active" }, count: "all" },
          { type: "moveEntity", from: { anyOf: poolIds }, to: { zone: ZONE_IDS.overflow }, count: "all" },
          { type: "advanceTurn" },
        ],
      },
      {
        id: "take-from-overflow",
        name: `Take all tiles of one type from the ${design.names.overflow.toLowerCase()}`,
        kind: "move",
        from: { zone: ZONE_IDS.overflow },
        to: { anyOf: [...rowIds, ZONE_IDS.penalty], owner: "active" },
        preconditions: [{ op: "not", condition: { op: "zoneEmpty", zone: { zone: ZONE_IDS.overflow } } }],
        effects: [
          { type: "moveEntity", from: { zone: ZONE_IDS.overflow }, to: { anyOf: rowIds, owner: "active" }, count: "all" },
          { type: "advanceTurn" },
        ],
      },
      {
        id: "place-rows",
        name: `Move completed ${design.names.collectionRow.toLowerCase()}s into the ${design.names.mosaic.toLowerCase()}`,
        kind: "place",
        from: { anyOf: rowIds, owner: "active" },
        to: { zone: ZONE_IDS.mosaic, owner: "active" },
        preconditions: [{ op: "always" }],
        effects: [
          { type: "moveEntity", from: { anyOf: rowIds, owner: "active" }, to: { zone: ZONE_IDS.mosaic, owner: "active" }, count: 1 },
          { type: "recordScore", player: "active", amount: { const: 1 } },
          { type: "advancePhase" },
        ],
      },
    ],
    scoring: [
      {
        id: "placement",
        description:
          design.scoring.placement === "adjacency"
            ? "Each tile placed scores 1 plus 1 per orthogonally connected tile in its row and column."
            : "Each tile placed scores 1.",
        when: "immediate",
        player: "active",
        amount: { const: 1 },
      },
      {
        id: "penalty",
        description: `Tiles in your ${design.names.penalty.toLowerCase()} cost ${design.spillPenalties.join(", ")} points.`,
        when: "end-of-round",
        player: "all",
        amount: { const: -1 },
      },
      {
        id: "end-bonuses",
        description: `At game end: ${design.scoring.completedRowBonus} per completed row, ${design.scoring.completedColumnBonus} per completed column, ${design.scoring.completedSetBonus} per completed tile set.`,
        when: "end-of-game",
        player: "all",
        amount: { const: design.scoring.completedRowBonus },
      },
    ],
    endConditions: [
      design.endCondition.type === "completed-row"
        ? { type: "zone-filled", zone: ZONE_IDS.mosaic, owner: "player" }
        : { type: "round-count", rounds: design.endCondition.rounds },
    ],
  };

  const entityStyles: EntityStyle[] = [
    ...design.tileTypes.map((t) => ({ entityTypeId: t.id, color: t.color, icon: t.icon, label: t.name })),
    ...(design.startingMarker
      ? [{ entityTypeId: STARTING_MARKER_TYPE, color: "#f8fafc", icon: "flag" as const, label: design.names.startingMarker }]
      : []),
  ];

  const presentation: PresentationSpec = {
    specVersion: "0.1",
    gameSpecId: design.id,
    themeMode: "dark",
    colors: {},
    entityStyles,
    zonePlacements: [
      ...poolIds.map((id) => ({ zoneId: id, region: "table" as const })),
      { zoneId: ZONE_IDS.overflow, region: "table" },
      { zoneId: ZONE_IDS.discard, region: "table" },
      ...rowIds.map((id) => ({ zoneId: id, region: "my-area" as const })),
      { zoneId: ZONE_IDS.mosaic, region: "my-area" },
      { zoneId: ZONE_IDS.penalty, region: "my-area" },
    ],
    tableStyle: design.tableStyle,
    animation: { enabled: true, speed: "normal" },
  };

  return { spec, presentation };
}
