import { describe, expect, it } from "vitest";
import { anthropicCompiler } from "./anthropic-compiler";
import { getGame } from "@/lib/store";

const runLive = process.env.LIVE_LLM === "1";

describe.skipIf(!runLive)("anthropicCompiler (live)", () => {
  it(
    "compiles the Tidepool rules text into a tile-drafting design",
    async () => {
      const tidepool = getGame("tidepool");
      if (!tidepool) throw new Error("Tidepool showcase game not found");

      const result = await anthropicCompiler.compile({
        title: tidepool.title,
        pitch: tidepool.pitch,
        players: tidepool.players,
        estimatedMinutes: tidepool.estimatedMinutes,
        rulesText: tidepool.rulesText,
      });

       
      console.log(JSON.stringify({ status: result.status, designSummary: result.designSummary, unsupportedRules: result.unsupportedRules, coverage: result.coverage, durationMs: result.durationMs }, null, 2));

      expect(result.status).toBe("ok");
      expect(result.spec).toBeDefined();
      expect(result.spec!.entityTypes.filter((e) => e.kind === "tile")).toHaveLength(5);
    },
    120_000,
  );
});
