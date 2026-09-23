import type {
  CompileInput,
  CompileResult,
  RulesCompiler,
} from "@/lib/compiler/types";
import { tidepoolPresentation, tidepoolSpec } from "@/lib/showcase/tidepool";

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
 * sentences were actually compiled.
 */
export const mockCompiler: RulesCompiler = {
  async compile(input: CompileInput): Promise<CompileResult> {
    await delay(600);

    const spec = {
      ...tidepoolSpec,
      name: input.title || tidepoolSpec.name,
      summary: input.pitch || tidepoolSpec.summary,
      players: { ...input.players },
      estimatedMinutes: input.estimatedMinutes,
    };

    const presentation = {
      ...tidepoolPresentation,
      gameSpecId: spec.id,
    };

    return {
      status: "ok",
      spec,
      presentation,
      unsupportedRules: [],
      issues: [
        {
          severity: "warning",
          message:
            "Prototype compiler: this build uses the Tidepool showcase ruleset. Real AI compilation arrives in Phase 1.",
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
  return mockCompiler;
}
