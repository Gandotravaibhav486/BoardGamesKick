import type {
  CompileInput,
  CompileResult,
  RulesCompiler,
} from "@/lib/compiler/types";
import { anthropicCompiler } from "@/lib/compiler/anthropic-compiler";
import { buildTileDraftingGame } from "@/lib/game-spec/tile-drafting";
import { tidepoolDesign } from "@/lib/showcase/tidepool";
import { slugify } from "@/lib/store";

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Phase 0 mock compiler. It does not read `rulesText` to produce rules — it
 * always returns the Tidepool showcase ruleset reshaped with the designer's
 * title/pitch/players/time. This is intentionally obvious in the UI: the
 * `issues` array always contains a warning explaining the limitation, and
 * `coverage.covered` is always empty because none of the designer's own
 * sentences were actually compiled. Kept as a fallback for local dev / tests
 * via `COMPILER=mock`.
 */
export const mockCompiler: RulesCompiler = {
  async compile(input: CompileInput): Promise<CompileResult> {
    await delay(600);

    const { spec, presentation } = buildTileDraftingGame({
      ...tidepoolDesign,
      id: slugify(input.title || tidepoolDesign.name),
      name: input.title || tidepoolDesign.name,
      summary: input.pitch || tidepoolDesign.summary,
      players: { ...input.players },
      estimatedMinutes: input.estimatedMinutes,
    });

    return {
      status: "ok",
      spec,
      presentation,
      unsupportedRules: [],
      issues: [
        {
          severity: "warning",
          message:
            "Prototype compiler: this build uses the Tidepool showcase ruleset. Set COMPILER to anything other than \"mock\" to use the real AI compiler.",
        },
      ],
      coverage: {
        covered: [],
        uncovered: splitSentences(input.rulesText),
      },
    };
  },
};

export function getCompiler(): RulesCompiler {
  if (process.env.COMPILER === "mock") return mockCompiler;
  return anthropicCompiler;
}
