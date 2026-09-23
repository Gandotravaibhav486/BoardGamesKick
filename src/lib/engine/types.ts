import type {
  ActionIntent,
  GameEvent,
  GameSpec,
  GameState,
  PlayerId,
} from "@/lib/game-spec/types";

export interface LegalAction {
  actionId: string;
  name: string;
  /** Selections the client must provide, with the candidate values for each */
  parameters: Record<string, string[]>;
}

export interface GameResult {
  finished: boolean;
  winnerIds: PlayerId[];
  finalScores: Record<PlayerId, number>;
}

export interface ApplyResult {
  state: GameState;
  events: GameEvent[];
}

/**
 * Deterministic, framework-independent engine boundary.
 * Phase 0: interface only. Phase 1: real implementation.
 */
export interface GameEngine {
  initialize(spec: GameSpec, players: { id: PlayerId; name: string }[], seed: number): ApplyResult;
  getLegalActions(spec: GameSpec, state: GameState, playerId: PlayerId): LegalAction[];
  applyAction(spec: GameSpec, state: GameState, intent: ActionIntent): ApplyResult;
  getResult(spec: GameSpec, state: GameState): GameResult;
  /** Redact hidden information for a given viewer. Server-side only. */
  viewFor(spec: GameSpec, state: GameState, viewer: PlayerId): GameState;
}
