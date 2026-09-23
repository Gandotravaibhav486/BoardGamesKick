import { describe, expect, it, vi } from "vitest";
import { createAnthropicCompiler } from "./anthropic-compiler";
import type { CompilerOutput } from "./schema";
import type { CompileInput } from "./types";

function baseInput(overrides?: Partial<CompileInput>): CompileInput {
  return {
    title: "Reef Runners",
    pitch: "Draft shells into rows, then build a reef mosaic.",
    players: { min: 2, max: 4 },
    estimatedMinutes: 30,
    rulesText:
      "Each round, fill five tidepools with four shells each. Take all shells of one type from a pool, or from the shore. Overflow goes to the shore.",
    ...overrides,
  };
}

function validDesign(): NonNullable<CompilerOutput["design"]> {
  return {
    id: "reef-runners",
    name: "Reef Runners",
    summary: "Draft shells into rows, then build a reef mosaic.",
    players: { min: 2, max: 4 },
    estimatedMinutes: 30,
    tileTypes: [
      { id: "ember", name: "Ember shell", color: "#d9532b", icon: "flame" },
      { id: "tide", name: "Tide shell", color: "#2a7fb8", icon: "wave" },
      { id: "moss", name: "Moss shell", color: "#4f8a3a", icon: "leaf" },
      { id: "dusk", name: "Dusk shell", color: "#6d4bb5", icon: "moon" },
      { id: "sand", name: "Sand shell", color: "#e0b64a", icon: "sun" },
    ],
    tilesPerType: 20,
    poolCount: 5,
    poolCapacity: 4,
    rowCapacities: [1, 2, 3, 4, 5],
    mosaicPattern: "latin-shift",
    spillPenalties: [-1, -1, -2, -2, -2, -3, -3],
    scoring: { placement: "adjacency", completedRowBonus: 2, completedColumnBonus: 7, completedSetBonus: 10 },
    endCondition: { type: "completed-row" },
    startingMarker: true,
    names: {
      supply: "Shell bag",
      pool: "Tidepool",
      overflow: "Shore",
      discard: "Tide-out pile",
      collectionRow: "Collection row",
      mosaic: "Reef mosaic",
      penalty: "Spill",
      startingMarker: "Starting marker",
    },
    tableStyle: "felt",
  };
}

function validOutput(): CompilerOutput {
  return {
    fit: "tile-drafting",
    fitExplanation: "Matches the drafting-into-rows-then-mosaic loop.",
    design: validDesign(),
    unsupportedRules: [],
    ambiguities: [],
    coverage: { covered: ["Each round, fill five tidepools with four shells each."], uncovered: [] },
  };
}

describe("createAnthropicCompiler", () => {
  it("compiles a valid design into an ok result", async () => {
    const generate = vi.fn().mockResolvedValue(validOutput());
    const compiler = createAnthropicCompiler({ generate });

    const result = await compiler.compile(baseInput());

    expect(result.status).toBe("ok");
    expect(result.spec).toBeDefined();
    expect(result.presentation).toBeDefined();
    expect(result.presentation!.entityStyles).toHaveLength(6); // 5 tile types + starting marker
    expect(generate).toHaveBeenCalledTimes(1);
  });

  it("returns failed with unsupportedRules when fit is unsupported", async () => {
    const output: CompilerOutput = {
      fit: "unsupported",
      fitExplanation: "This is a card-trading game, not tile-drafting.",
      design: null,
      unsupportedRules: [
        {
          rule: "Players trade cards from hidden hands",
          reason: "The tile-drafting archetype has no hidden information or trading.",
          suggestedClarification: "Describe drafting from a shared public pool instead of trading.",
        },
      ],
      ambiguities: [],
      coverage: { covered: [], uncovered: ["Players trade cards from hidden hands."] },
    };
    const generate = vi.fn().mockResolvedValue(output);
    const compiler = createAnthropicCompiler({ generate });

    const result = await compiler.compile(baseInput());

    expect(result.status).toBe("failed");
    expect(result.spec).toBeUndefined();
    expect(result.unsupportedRules).toHaveLength(1);
    expect(result.unsupportedRules[0].rule).toContain("trade cards");
  });

  it("retries once when the first design fails validation, then succeeds", async () => {
    const invalidDesign = validDesign();
    invalidDesign.rowCapacities = [1, 2];
    invalidDesign.tileTypes = [
      ...invalidDesign.tileTypes.slice(0, 4),
      { ...invalidDesign.tileTypes[0] },
    ];

    const firstOutput: CompilerOutput = {
      fit: "tile-drafting",
      fitExplanation: "ok",
      design: invalidDesign,
      unsupportedRules: [],
      ambiguities: [],
      coverage: { covered: [], uncovered: ["some sentence"] },
    };

    const generate = vi.fn().mockResolvedValueOnce(firstOutput).mockResolvedValueOnce(validOutput());
    const compiler = createAnthropicCompiler({ generate });

    const result = await compiler.compile(baseInput());

    expect(generate).toHaveBeenCalledTimes(2);
    expect(result.status).toBe("ok");
    expect(result.spec).toBeDefined();
  });

  it("returns failed with an issue when generate throws, without throwing", async () => {
    const generate = vi.fn().mockRejectedValue(new Error("network down"));
    const compiler = createAnthropicCompiler({ generate });

    const result = await compiler.compile(baseInput());

    expect(result.status).toBe("failed");
    expect(result.issues.length).toBeGreaterThan(0);
    expect(result.spec).toBeUndefined();
  });
});
