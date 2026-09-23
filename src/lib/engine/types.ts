import type {
  ActionIntent,
  GameEvent,
  GameSpec,
  GameState,
  PlayerId,
} from "@/lib/game-spec/types";

/**
 * One concrete, fully-specified legal move. The client picks one and sends it
 * back verbatim as an ActionIntent; the engine re-validates before applying.
 */
export interface LegalAction {
  actionId: string;
  name: string;
  /** Human-readable, e.g. "Take 2 Ember shells from Tidepool 3 to Collection row 2" */
  description: string;
  selections: Record<string, string>;
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

export class IllegalActionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IllegalActionError";
  }
}

/**
 * Deterministic, framework-independent engine boundary. Pure functions: every
 * method returns new state and never mutates its inputs. Given the same spec,
 * players, seed and action sequence, the resulting state is identical.
 */
export interface GameEngine {
  initialize(spec: GameSpec, players: { id: PlayerId; name: string }[], seed: number): ApplyResult;
  getLegalActions(spec: GameSpec, state: GameState, playerId: PlayerId): LegalAction[];
  /** Throws IllegalActionError if the intent is not currently legal for that player */
  applyAction(spec: GameSpec, state: GameState, intent: ActionIntent): ApplyResult;
  getResult(spec: GameSpec, state: GameState): GameResult;
  /** Redact hidden information for a given viewer. Server-side only. */
  viewFor(spec: GameSpec, state: GameState, viewer: PlayerId): GameState;
}
