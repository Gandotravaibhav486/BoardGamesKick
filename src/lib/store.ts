import type { GameSpec } from "@/lib/game-spec/types";
import type { PresentationSpec } from "@/lib/presentation/types";
import { tidepoolPresentation, tidepoolSpec } from "@/lib/showcase/tidepool";

/**
 * Phase 0 persistence: in-memory, process-local. Resets on server restart.
 * Replace with a database in a later phase. Clearly MOCKED.
 */

export type GameStatus = "draft" | "published";

export interface GameVersion {
  version: number;
  createdAt: string;
  notes: string;
  spec: GameSpec;
  presentation: PresentationSpec;
}

export interface GameRecord {
  id: string;
  title: string;
  pitch: string;
  designer: string;
  players: { min: number; max: number };
  estimatedMinutes: number;
  status: GameStatus;
  createdAt: string;
  rulesText: string;
  versions: GameVersion[];
  /** Original showcase ruleset shipped with the app, vs. user-created */
  isShowcase: boolean;
}

const games = new Map<string, GameRecord>();

const now = () => new Date().toISOString();

function seedShowcase() {
  if (games.has("tidepool")) return;
  games.set("tidepool", {
    id: "tidepool",
    title: tidepoolSpec.name,
    pitch: tidepoolSpec.summary,
    designer: "BoardGamesKick team",
    players: tidepoolSpec.players,
    estimatedMinutes: tidepoolSpec.estimatedMinutes,
    status: "published",
    createdAt: now(),
    rulesText:
      "Each round, fill five tidepools with four shells each from the bag. On your turn, take all shells of one type from a tidepool (the rest slide to the shore) or from the shore, and put them into one collection row of matching type. Overflow goes to your spill row and costs points. When every pool and the shore are empty, move each completed row's rightmost shell into your reef mosaic and score it for adjacency. The game ends when someone completes a reef row.",
    versions: [
      { version: 1, createdAt: now(), notes: "Initial showcase ruleset", spec: tidepoolSpec, presentation: tidepoolPresentation },
    ],
    isShowcase: true,
  });
}

seedShowcase();

export function listGames(): GameRecord[] {
  seedShowcase();
  return [...games.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getGame(id: string): GameRecord | undefined {
  seedShowcase();
  return games.get(id);
}

export function saveGame(game: GameRecord): GameRecord {
  games.set(game.id, game);
  return game;
}

export function latestVersion(game: GameRecord): GameVersion {
  return game.versions[game.versions.length - 1];
}

export function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "game";
  let slug = base;
  let n = 2;
  while (games.has(slug)) slug = `${base}-${n++}`;
  return slug;
}
