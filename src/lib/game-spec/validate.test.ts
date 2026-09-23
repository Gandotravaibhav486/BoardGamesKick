import { describe, expect, it } from "vitest";
import { tidepoolSpec } from "@/lib/showcase/tidepool";
import { validateGameSpec } from "./validate";
import type { GameSpecInput } from "./schema";

function baseSpec(): GameSpecInput {
  return {
    specVersion: "0.1",
    id: "mini",
    name: "Mini Game",
    summary: "A minimal valid spec used as a base for tests.",
    players: { min: 2, max: 4 },
    estimatedMinutes: 10,
    entityTypes: [{ id: "token", name: "Token", kind: "token", count: 10 }],
    resources: [],
    zones: [
      {
        id: "pool",
        name: "Pool",
        owner: "shared",
        visibility: "public",
        geometry: { kind: "stack" },
      },
      {
        id: "hand",
        name: "Hand",
        owner: "player",
        visibility: "owner",
        geometry: { kind: "row", capacity: 5 },
      },
    ],
    setup: [{ type: "fill", zone: { zone: "pool" }, entityType: "token", count: "all" }],
    turnStructure: {
      order: "fixed",
      phases: [
        {
          id: "main",
          name: "Main",
          actions: ["take"],
          endsWhen: { op: "always" },
        },
      ],
    },
    actions: [
      {
        id: "take",
        name: "Take a token",
        kind: "move",
        from: { zone: "pool" },
        to: { zone: "hand", owner: "active" },
        preconditions: [{ op: "always" }],
        effects: [
          { type: "moveEntity", from: { zone: "pool" }, to: { zone: "hand", owner: "active" }, count: 1 },
        ],
      },
    ],
    scoring: [],
    endConditions: [{ type: "round-count", rounds: 5 }],
  };
}

describe("validateGameSpec", () => {
  it("accepts the tidepool showcase spec", () => {
    const result = validateGameSpec(tidepoolSpec);
    if (result.issues.length > 0) {
       
      console.log("tidepool validation issues:", JSON.stringify(result.issues, null, 2));
    }
    expect(result.ok).toBe(true);
  });

  it("rejects garbage input without throwing", () => {
    expect(() => validateGameSpec("garbage")).not.toThrow();
    expect(() => validateGameSpec(null)).not.toThrow();
    expect(() => validateGameSpec({})).not.toThrow();
    expect(validateGameSpec("garbage").ok).toBe(false);
    expect(validateGameSpec(null).ok).toBe(false);
    expect(validateGameSpec({}).ok).toBe(false);
  });

  it("rejects a spec with a duplicate zone id", () => {
    const spec = baseSpec();
    spec.zones = [...spec.zones, { ...spec.zones[0] }];
    const result = validateGameSpec(spec);
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.level === "error" && i.message.includes("Duplicate zones id"))).toBe(true);
  });

  it("rejects a spec referencing an unknown zone in an action", () => {
    const spec = baseSpec();
    spec.actions[0].from = { zone: "does-not-exist" };
    const result = validateGameSpec(spec);
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.level === "error" && i.message.includes("does-not-exist"))).toBe(true);
  });

  it("rejects a spec with players.min > players.max", () => {
    const spec = baseSpec();
    spec.players = { min: 5, max: 2 };
    const result = validateGameSpec(spec);
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.level === "error" && i.path === "players")).toBe(true);
  });

  it("rejects a spec with cellPattern mismatched to grid size", () => {
    const spec = baseSpec();
    spec.zones.push({
      id: "board",
      name: "Board",
      owner: "shared",
      visibility: "public",
      geometry: { kind: "grid", rows: 2, cols: 2 },
      cellPattern: [["token", "token", "token"]],
    });
    const result = validateGameSpec(spec);
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.level === "error" && i.path.startsWith("zones[2].cellPattern"))).toBe(true);
  });

  it("warns but does not fail on an unreachable action", () => {
    const spec = baseSpec();
    spec.actions.push({
      id: "unused",
      name: "Unused action",
      kind: "pass",
      preconditions: [{ op: "always" }],
      effects: [],
    });
    const result = validateGameSpec(spec);
    expect(result.ok).toBe(true);
    expect(
      result.issues.some((i) => i.level === "warning" && i.message.includes('"unused"')),
    ).toBe(true);
  });
});
