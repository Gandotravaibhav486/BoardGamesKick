/**
 * Zod schemas mirroring every type in ./types.ts. These are the schema-level
 * (structural) validation layer; semantic validation lives in ./validate.ts.
 */
import { z } from "zod";
import { GAME_SPEC_VERSION, type Condition, type Effect, type GameSpec, type Value } from "./types";

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

const playerIdSchema = z.string();
const zoneIdSchema = z.string();

const visibilitySchema = z.enum(["public", "owner", "private"]);
const zoneOwnerSchema = z.enum(["shared", "player"]);

// ---------------------------------------------------------------------------
// ZoneGeometry
// ---------------------------------------------------------------------------

export const zoneGeometrySchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("stack") }),
  z.object({
    kind: z.literal("row"),
    capacity: z.number().int().optional(),
  }),
  z.object({
    kind: z.literal("grid"),
    rows: z.number().int(),
    cols: z.number().int(),
  }),
]);

// ---------------------------------------------------------------------------
// ZoneDef
// ---------------------------------------------------------------------------

export const zoneDefSchema = z.object({
  id: zoneIdSchema,
  name: z.string(),
  owner: zoneOwnerSchema,
  visibility: visibilitySchema,
  geometry: zoneGeometrySchema,
  cellPattern: z.array(z.array(z.string())).optional(),
});

// ---------------------------------------------------------------------------
// EntityTypeDef
// ---------------------------------------------------------------------------

const entityKindSchema = z.enum(["tile", "token", "card", "piece"]);

export const entityTypeDefSchema = z.object({
  id: z.string(),
  name: z.string(),
  kind: entityKindSchema,
  count: z.number().int(),
  properties: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
});

// ---------------------------------------------------------------------------
// ResourceDef
// ---------------------------------------------------------------------------

export const resourceDefSchema = z.object({
  id: z.string(),
  name: z.string(),
  min: z.number().optional(),
  max: z.number().optional(),
  initial: z.number(),
});

// ---------------------------------------------------------------------------
// ZoneRef
// ---------------------------------------------------------------------------

const zoneOwnerRefSchema = z.union([z.literal("active"), z.literal("any"), playerIdSchema]);

export const zoneRefSchema = z.union([
  z.object({ zone: zoneIdSchema, owner: zoneOwnerRefSchema.optional() }),
  z.object({ anyOf: z.array(zoneIdSchema) }),
]);

// ---------------------------------------------------------------------------
// Value
// ---------------------------------------------------------------------------

export const valueSchema: z.ZodType<Value> = z.lazy(() =>
  z.union([
    z.object({ const: z.number() }),
    z.object({ resource: z.string(), of: z.union([z.literal("active"), playerIdSchema]) }),
    z.object({ countIn: zoneRefSchema, entityType: z.string().optional() }),
    z.object({ property: z.string(), ofEntity: z.literal("selected") }),
  ]),
);

// ---------------------------------------------------------------------------
// Condition (recursive)
// ---------------------------------------------------------------------------

export const conditionSchema: z.ZodType<Condition> = z.lazy(() =>
  z.discriminatedUnion("op", [
    z.object({
      op: z.enum(["eq", "neq", "gt", "lt", "gte", "lte"]),
      left: valueSchema,
      right: valueSchema,
    }),
    z.object({
      op: z.enum(["and", "or"]),
      conditions: z.array(conditionSchema),
    }),
    z.object({
      op: z.literal("not"),
      condition: conditionSchema,
    }),
    z.object({
      op: z.literal("zoneEmpty"),
      zone: zoneRefSchema,
    }),
    z.object({
      op: z.literal("isActivePlayer"),
      player: playerIdSchema,
    }),
    z.object({
      op: z.literal("always"),
    }),
  ]),
);

// ---------------------------------------------------------------------------
// Effect
// ---------------------------------------------------------------------------

const countOrAllSchema = z.union([z.number(), z.literal("all")]);

export const effectSchema: z.ZodType<Effect> = z.lazy(() =>
  z.discriminatedUnion("type", [
    z.object({
      type: z.literal("moveEntity"),
      from: zoneRefSchema,
      to: zoneRefSchema,
      entityType: z.string().optional(),
      count: countOrAllSchema.optional(),
    }),
    z.object({
      type: z.literal("changeResource"),
      resource: z.string(),
      player: z.enum(["active", "all"]),
      delta: valueSchema,
    }),
    z.object({
      type: z.literal("createEntity"),
      entityType: z.string(),
      in: zoneRefSchema,
      count: z.number(),
    }),
    z.object({
      type: z.literal("removeEntity"),
      from: zoneRefSchema,
      entityType: z.string().optional(),
      count: countOrAllSchema.optional(),
    }),
    z.object({
      type: z.literal("reveal"),
      zone: zoneRefSchema,
    }),
    z.object({
      type: z.literal("hide"),
      zone: zoneRefSchema,
    }),
    z.object({
      type: z.literal("advancePhase"),
    }),
    z.object({
      type: z.literal("advanceTurn"),
    }),
    z.object({
      type: z.literal("recordScore"),
      player: z.enum(["active", "all"]),
      amount: valueSchema,
    }),
  ]),
);

// ---------------------------------------------------------------------------
// ActionDef
// ---------------------------------------------------------------------------

const actionKindSchema = z.enum([
  "move",
  "place",
  "remove",
  "flip",
  "draw",
  "discard",
  "play",
  "trade",
  "roll",
  "gain-resource",
  "spend-resource",
  "pass",
]);

export const actionDefSchema = z.object({
  id: z.string(),
  name: z.string(),
  kind: actionKindSchema,
  from: zoneRefSchema.optional(),
  to: zoneRefSchema.optional(),
  preconditions: z.array(conditionSchema),
  effects: z.array(effectSchema),
});

// ---------------------------------------------------------------------------
// PhaseDef / TurnStructure
// ---------------------------------------------------------------------------

export const phaseDefSchema = z.object({
  id: z.string(),
  name: z.string(),
  actions: z.array(z.string()),
  endsWhen: conditionSchema,
});

const turnOrderSchema = z.enum(["fixed", "starting-player-token"]);

export const turnStructureSchema = z.object({
  order: turnOrderSchema,
  phases: z.array(phaseDefSchema),
});

// ---------------------------------------------------------------------------
// ScoringRule
// ---------------------------------------------------------------------------

export const scoringRuleSchema = z.object({
  id: z.string(),
  description: z.string(),
  when: z.enum(["immediate", "end-of-round", "end-of-game"]),
  player: z.enum(["active", "all"]),
  amount: valueSchema,
});

// ---------------------------------------------------------------------------
// EndCondition
// ---------------------------------------------------------------------------

export const endConditionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("score-threshold"), score: z.number() }),
  z.object({ type: z.literal("round-count"), rounds: z.number() }),
  z.object({ type: z.literal("supply-exhausted"), zone: zoneIdSchema }),
  z.object({ type: z.literal("zone-filled"), zone: zoneIdSchema, owner: zoneOwnerSchema }),
  z.object({ type: z.literal("condition"), condition: conditionSchema }),
]);

// ---------------------------------------------------------------------------
// SetupStep
// ---------------------------------------------------------------------------

export const setupStepSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("fill"),
    zone: zoneRefSchema,
    entityType: z.string().optional(),
    count: countOrAllSchema.optional(),
  }),
  z.object({
    type: z.literal("shuffle"),
    zone: zoneRefSchema,
    entityType: z.string().optional(),
    count: countOrAllSchema.optional(),
  }),
  z.object({
    type: z.literal("deal"),
    zone: zoneRefSchema,
    entityType: z.string().optional(),
    count: countOrAllSchema.optional(),
  }),
]);

// ---------------------------------------------------------------------------
// GameSpec
// ---------------------------------------------------------------------------

export const gameSpecSchema = z.object({
  specVersion: z.literal(GAME_SPEC_VERSION),
  id: z.string(),
  name: z.string(),
  summary: z.string(),
  players: z.object({ min: z.number().int(), max: z.number().int() }),
  estimatedMinutes: z.number(),
  entityTypes: z.array(entityTypeDefSchema),
  resources: z.array(resourceDefSchema),
  zones: z.array(zoneDefSchema),
  setup: z.array(setupStepSchema),
  turnStructure: turnStructureSchema,
  actions: z.array(actionDefSchema),
  scoring: z.array(scoringRuleSchema),
  endConditions: z.array(endConditionSchema),
});

export type GameSpecInput = z.input<typeof gameSpecSchema>;

// ---------------------------------------------------------------------------
// Compile-time drift check: the schema's inferred output type must be
// assignable to GameSpec. If this line fails to typecheck, schema.ts has
// drifted from types.ts.
// ---------------------------------------------------------------------------

 
const _gameSpecDriftCheck: GameSpec = {} as z.infer<typeof gameSpecSchema>;
void _gameSpecDriftCheck;
