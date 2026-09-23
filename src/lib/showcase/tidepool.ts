import { buildTileDraftingGame, type TileDraftingDesign } from "@/lib/game-spec/tile-drafting";

/**
 * Tidepool — an original tile-drafting showcase game.
 * Players draft shells from shared tidepools into their collection rows, then
 * place completed rows into their reef mosaic to score. Same UI class as other
 * drafting games; original theme, names and scoring.
 */

export const TILE_TYPES = ["ember", "tide", "moss", "dusk", "sand"] as const;
export type TileType = (typeof TILE_TYPES)[number];

export const tidepoolDesign: TileDraftingDesign = {
  id: "tidepool",
  name: "Tidepool",
  summary:
    "Draft shells from shared tidepools into your collection rows, then build the most valuable reef mosaic. Drafting is public; scoring is about timing and denial.",
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

const built = buildTileDraftingGame(tidepoolDesign);
export const tidepoolSpec = built.spec;
export const tidepoolPresentation = built.presentation;
