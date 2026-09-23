import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { buildTileDraftingGame, type TileDraftingDesign } from "@/lib/game-spec/tile-drafting";
import { validateGameSpec } from "@/lib/game-spec/validate";
import { slugify } from "@/lib/store";
import { compilerOutputSchema, type CompilerOutput } from "./schema";
import type { CompileInput, CompileResult, CompilerIssue, RulesCompiler, UnsupportedRule } from "./types";

const MODEL = "claude-opus-5";

const SYSTEM_PROMPT = `You are the rules compiler for BoardGamesKick. Your only job is to map a
designer's natural-language game description onto the parameters of exactly
one supported archetype: "tile-drafting". You never write code, zones,
actions or effects — only the design parameters below. A deterministic
builder turns your output into the real game.

THE TILE-DRAFTING ARCHETYPE, IN PLAIN TERMS:
- There is a shared supply of tiles, 3-6 types, refilled each round into
  several shared pools.
- On your turn you take ALL tiles of one type from one pool (the rest of
  that pool slides into a shared overflow area) or you take all tiles of one
  type from the overflow area instead.
- Tiles you take go into one of your collection rows. Each row only accepts
  one tile type and has a fixed capacity. Overflow tiles that don't fit go
  into your penalty row instead.
- When every pool and the overflow are empty, each of your full collection
  rows places one tile into your mosaic grid, in the cell matching that
  type's fixed pattern, and scores (either flat, or by counting adjacent
  matching-pattern neighbours). Rows that are not full do not place.
- Tiles sitting in your penalty row cost you points.
- The game ends when a mosaic row is completed by any player, or after a
  fixed number of rounds. There can be end-of-game bonuses per completed
  mosaic row, column, or fully-placed tile set.
- Optionally, taking from the overflow first also grants a starting-player
  marker for next round (and usually costs one penalty tile).

KNOBS YOU CONTROL (and nothing else):
name, summary, players (min/max), estimatedMinutes, tileTypes (3-6, each
with id, display name, hex color, one icon from the fixed icon set), tiles
per type, number of pools, pool capacity, one row capacity per collection
row, spill penalties (points lost per penalty slot), scoring.placement
("adjacency" or "flat"), completedRowBonus, completedColumnBonus,
completedSetBonus, endCondition (completed-row, or a fixed number of
rounds), whether there is a starting-player marker, thematic names for every
zone (supply/pool/overflow/discard/collectionRow/mosaic/penalty/
startingMarker), and a table style (felt, wood, or linen). The mosaic
pattern is always a rotated Latin square; you cannot choose a custom layout.

YOUR JOB:
1. Use the designer's own theme, vocabulary and names wherever the rules
   text supplies them; invent thematically consistent names for anything
   left unnamed. Pick 3-6 tile types with distinct, readable colors on a
   dark felt-like table and icons chosen only from the allowed icon list.
2. Classify every sentence of the rules text as "covered" (represented,
   verbatim or lightly trimmed) or "uncovered" — cover every sentence, do
   not skip any.
3. For any rule the archetype genuinely cannot express — cards, dice,
   hidden hands, trading, worker placement, variable player powers, combat,
   or any other mechanic outside the loop above — add an entry to
   unsupportedRules with a concrete, specific suggestedClarification (e.g.
   "Remove the trading phase, or describe it as taking tiles from a shared
   pool instead"). Never invent a workaround or silently drop the rule.
4. If the description is ambiguous but still expressible (e.g. it doesn't
   say how many pools), record an ambiguity with a clarifying question, and
   make a reasonable default choice in the design anyway.
5. If the core loop of the description is NOT "draft tiles from shared
   pools into rows, then build a mosaic", set fit to "unsupported", explain
   why in fitExplanation, leave design null, and list the unsupported rules.
   Otherwise set fit to "tile-drafting" and fill in design completely.

Be factual and concrete. No marketing language, no filler, no code.`;

function buildUserPrompt(input: CompileInput, priorErrors?: string[]): string {
  const base = `Design a tile-drafting game from this designer's submission.

Title: ${input.title}
Pitch: ${input.pitch}
Players: ${input.players.min}-${input.players.max}
Estimated minutes: ${input.estimatedMinutes}

Rules text:
"""
${input.rulesText}
"""`;

  if (!priorErrors || priorErrors.length === 0) return base;

  return `${base}

Your previous design failed validation with these errors. Fix them and
produce a corrected design that still honestly reflects the rules text:
${priorErrors.map((e) => `- ${e}`).join("\n")}`;
}

async function defaultGenerate(system: string, user: string): Promise<CompilerOutput> {
  const client = new Anthropic({ timeout: 120_000 });
  const response = await client.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    system,
    messages: [{ role: "user", content: user }],
    output_config: { format: zodOutputFormat(compilerOutputSchema), effort: "medium" },
  });
  const parsed = response.parsed_output;
  if (!parsed) {
    throw new Error("The AI service returned a response that could not be parsed into a design.");
  }
  return parsed;
}

function clampTileTypes(tileTypes: TileDraftingDesign["tileTypes"]): TileDraftingDesign["tileTypes"] {
  if (tileTypes.length >= 3 && tileTypes.length <= 6) return tileTypes;
  if (tileTypes.length < 3) return tileTypes;
  return tileTypes.slice(0, 6);
}

function normalizeDesign(
  design: NonNullable<CompilerOutput["design"]>,
): { design: TileDraftingDesign; ambiguities: { message: string; question: string }[] } {
  const ambiguities: { message: string; question: string }[] = [];

  const tileTypes = clampTileTypes(design.tileTypes);
  const n = tileTypes.length;

  let rowCapacities = design.rowCapacities;
  if (rowCapacities.length !== n) {
    ambiguities.push({
      message: `The design specified ${rowCapacities.length} collection row(s) but ${n} tile types; defaulted to one row per type.`,
      question: "How many tiles should each collection row hold?",
    });
    rowCapacities = Array.from({ length: n }, (_, i) => i + 1);
  }

  const playersMax = design.players.max || 4;
  let poolCount = design.poolCount;
  if (!poolCount || poolCount < 1) {
    poolCount = 2 * playersMax + 1;
  }

  const id = slugify(design.name);

  const normalized: TileDraftingDesign = {
    id,
    name: design.name,
    summary: design.summary,
    players: design.players,
    estimatedMinutes: design.estimatedMinutes,
    tileTypes,
    tilesPerType: design.tilesPerType,
    poolCount,
    poolCapacity: design.poolCapacity,
    rowCapacities,
    mosaicPattern: "latin-shift",
    spillPenalties: design.spillPenalties,
    scoring: design.scoring,
    endCondition: design.endCondition,
    startingMarker: design.startingMarker,
    names: design.names,
    tableStyle: design.tableStyle,
  };

  return { design: normalized, ambiguities };
}

function toIssues(ambiguities: { message: string; question: string }[]): CompilerIssue[] {
  return ambiguities.map((a) => ({ severity: "ambiguity" as const, message: a.message, question: a.question }));
}

function failed(
  unsupportedRules: UnsupportedRule[],
  issues: CompilerIssue[],
  coverage: { covered: string[]; uncovered: string[] },
  model: string,
  durationMs: number,
): CompileResult {
  return {
    status: "failed",
    unsupportedRules,
    issues,
    coverage,
    model,
    durationMs,
  };
}

export function createAnthropicCompiler(deps?: {
  generate?: (system: string, user: string) => Promise<CompilerOutput>;
}): RulesCompiler {
  const generate = deps?.generate ?? defaultGenerate;

  return {
    async compile(input: CompileInput): Promise<CompileResult> {
      const start = Date.now();

      let output: CompilerOutput;
      try {
        output = await generate(SYSTEM_PROMPT, buildUserPrompt(input));
      } catch (err) {
        return failed(
          [],
          [{ severity: "warning", message: describeError(err) }],
          { covered: [], uncovered: [] },
          MODEL,
          Date.now() - start,
        );
      }

      if (output.fit === "unsupported" || !output.design) {
        return failed(
          output.unsupportedRules,
          [
            {
              severity: "warning",
              message:
                "This description doesn't map to a tile-drafting game yet; the MVP engine supports drafting tiles from shared pools into rows and building a mosaic.",
            },
            ...(output.fitExplanation
              ? [{ severity: "warning" as const, message: output.fitExplanation }]
              : []),
          ],
          output.coverage,
          MODEL,
          Date.now() - start,
        );
      }

      const attempt = async (
        design: NonNullable<CompilerOutput["design"]>,
        priorAmbiguities: { message: string; question: string }[],
      ) => {
        const { design: normalized, ambiguities } = normalizeDesign(design);
        const { spec, presentation } = buildTileDraftingGame(normalized);
        const validation = validateGameSpec(spec);
        return {
          normalized,
          spec,
          presentation,
          validation,
          ambiguities: [...priorAmbiguities, ...ambiguities],
        };
      };

      let result = await attempt(output.design, output.ambiguities);

      if (!result.validation.ok) {
        const priorErrors = result.validation.issues
          .filter((i) => i.level === "error")
          .map((i) => `${i.path}: ${i.message}`);

        let retryOutput: CompilerOutput;
        try {
          retryOutput = await generate(SYSTEM_PROMPT, buildUserPrompt(input, priorErrors));
        } catch (err) {
          return failed(
            output.unsupportedRules,
            [{ severity: "warning", message: describeError(err) }],
            output.coverage,
            MODEL,
            Date.now() - start,
          );
        }

        if (retryOutput.fit === "unsupported" || !retryOutput.design) {
          return failed(
            retryOutput.unsupportedRules,
            [
              {
                severity: "warning",
                message:
                  "This description doesn't map to a tile-drafting game yet; the MVP engine supports drafting tiles from shared pools into rows and building a mosaic.",
              },
            ],
            retryOutput.coverage,
            MODEL,
            Date.now() - start,
          );
        }

        result = await attempt(retryOutput.design, retryOutput.ambiguities);
        output.unsupportedRules.push(...retryOutput.unsupportedRules);
        output.coverage.covered.push(...retryOutput.coverage.covered);
        output.coverage.uncovered = retryOutput.coverage.uncovered;

        if (!result.validation.ok) {
          return failed(
            output.unsupportedRules,
            result.validation.issues
              .filter((i) => i.level === "error")
              .map((i) => ({ severity: "warning" as const, message: `${i.path}: ${i.message}` })),
            output.coverage,
            MODEL,
            Date.now() - start,
          );
        }
      }

      return {
        status: "ok",
        spec: result.spec,
        presentation: result.presentation,
        unsupportedRules: output.unsupportedRules,
        issues: toIssues(result.ambiguities),
        coverage: output.coverage,
        model: MODEL,
        durationMs: Date.now() - start,
        designSummary: `${result.normalized.name}: ${result.normalized.tileTypes.length} tile types, ${result.normalized.poolCount} pools, ${result.normalized.rowCapacities.length} collection rows.`,
      };
    },
  };
}

function describeError(err: unknown): string {
  if (err instanceof Anthropic.AuthenticationError) {
    return "The AI service could not be reached (authentication failed). Please check the Anthropic credentials and try again.";
  }
  if (err instanceof Anthropic.RateLimitError) {
    return "The AI service is rate-limited right now. Please wait a moment and try again.";
  }
  if (err instanceof Anthropic.APIConnectionError) {
    return "The AI service could not be reached (connection error). Please try again.";
  }
  if (err instanceof Anthropic.APIError) {
    return `The AI service returned an error: ${err.message}`;
  }
  if (err instanceof Error) {
    return err.message;
  }
  return "The AI service could not be reached.";
}

export const anthropicCompiler = createAnthropicCompiler();
