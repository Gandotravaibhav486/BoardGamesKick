import { describe, expect, it } from "vitest";
import { TILE_TYPES, tidepoolSpec } from "./tidepool";

describe("tidepoolSpec", () => {
  it("has a total entity count of 5*20 + 1", () => {
    const total = tidepoolSpec.entityTypes.reduce((sum, e) => sum + e.count, 0);
    expect(total).toBe(5 * 20 + 1);
  });

  it("uses only known tile types in every cellPattern cell", () => {
    const reef = tidepoolSpec.zones.find((z) => z.role === "mosaic");
    expect(reef?.cellPattern).toBeDefined();
    const knownTypes = new Set<string>(TILE_TYPES);
    for (const row of reef!.cellPattern!) {
      for (const cell of row) {
        expect(knownTypes.has(cell)).toBe(true);
      }
    }
  });

  it("has each cellPattern row be a permutation of TILE_TYPES", () => {
    const reef = tidepoolSpec.zones.find((z) => z.role === "mosaic");
    const sortedTileTypes = [...TILE_TYPES].sort();
    for (const row of reef!.cellPattern!) {
      expect([...row].sort()).toEqual(sortedTileTypes);
    }
  });
});
