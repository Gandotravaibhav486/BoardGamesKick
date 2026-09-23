/**
 * Zod schema for the LLM's structured output. This is pure data describing a
 * `TileDraftingDesign` (see ./tile-drafting.ts) plus honesty metadata — the
 * LLM never emits zones, actions or effects directly.
 */
import { z } from "zod";

const iconNameSchema = z.enum([
  "tile",
  "token",
  "card",
  "coin",
  "star",
  "trophy",
  "dice",
  "hourglass",
  "flag",
  "shield",
  "leaf",
  "flame",
  "wave",
  "moon",
  "sun",
]);

const tileTypeSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string(),
  icon: iconNameSchema,
});

const scoringSchema = z.object({
  placement: z.enum(["adjacency", "flat"]),
  completedRowBonus: z.number(),
  completedColumnBonus: z.number(),
  completedSetBonus: z.number(),
});

const endConditionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("completed-row") }),
  z.object({ type: z.literal("rounds"), rounds: z.number().int().min(1) }),
]);

const namesSchema = z.object({
  supply: z.string(),
  pool: z.string(),
  overflow: z.string(),
  discard: z.string(),
  collectionRow: z.string(),
  mosaic: z.string(),
  penalty: z.string(),
  startingMarker: z.string(),
});

const tileDraftingDesignSchema = z.object({
  id: z.string(),
  name: z.string(),
  summary: z.string(),
  players: z.object({ min: z.number().int().min(1), max: z.number().int().min(1) }),
  estimatedMinutes: z.number().int().min(5),
  tileTypes: z.array(tileTypeSchema).min(3).max(6),
  tilesPerType: z.number().int().min(1),
  poolCount: z.number().int().min(1),
  poolCapacity: z.number().int().min(1),
  rowCapacities: z.array(z.number().int().min(1)).min(1),
  mosaicPattern: z.literal("latin-shift"),
  spillPenalties: z.array(z.number()).min(1),
  scoring: scoringSchema,
  endCondition: endConditionSchema,
  startingMarker: z.boolean(),
  names: namesSchema,
  tableStyle: z.enum(["felt", "wood", "linen"]),
});

const unsupportedRuleSchema = z.object({
  rule: z.string(),
  reason: z.string(),
  suggestedClarification: z.string(),
});

const ambiguitySchema = z.object({
  message: z.string(),
  question: z.string(),
});

const coverageSchema = z.object({
  covered: z.array(z.string()),
  uncovered: z.array(z.string()),
});

export const compilerOutputSchema = z.object({
  fit: z.enum(["tile-drafting", "unsupported"]),
  fitExplanation: z.string(),
  design: tileDraftingDesignSchema.nullable(),
  unsupportedRules: z.array(unsupportedRuleSchema),
  ambiguities: z.array(ambiguitySchema),
  coverage: coverageSchema,
});

export type CompilerOutput = z.infer<typeof compilerOutputSchema>;
export type CompilerOutputDesign = z.infer<typeof tileDraftingDesignSchema>;
