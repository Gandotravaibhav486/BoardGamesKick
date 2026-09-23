/**
 * Game Spec — machine-readable rules. Produced by the AI compiler, validated,
 * then interpreted by the deterministic engine. Contains NO presentation data
 * and NO executable code. See docs/GAME_SPEC.md.
 */

export const GAME_SPEC_VERSION = "0.1" as const;

export type PlayerId = string;
export type EntityId = string;
export type ZoneId = string;

export type Visibility = "public" | "owner" | "private";

export type ZoneOwner = "shared" | "player";

export type ZoneGeometry =
  | { kind: "stack" }
  | { kind: "row"; capacity?: number }
  | { kind: "grid"; rows: number; cols: number };

export interface ZoneDef {
  id: ZoneId;
  name: string;
  owner: ZoneOwner;
  visibility: Visibility;
  geometry: ZoneGeometry;
  /** Optional pattern of allowed entity types per cell, e.g. for wall placement rules */
  cellPattern?: string[][];
}

export type EntityKind = "tile" | "token" | "card" | "piece";

export interface EntityTypeDef {
  id: string;
  name: string;
  kind: EntityKind;
  /** Total copies in the game's supply */
  count: number;
  properties?: Record<string, string | number | boolean>;
}

export interface ResourceDef {
  id: string;
  name: string;
  min?: number;
  max?: number;
  initial: number;
}

export type TurnOrder = "fixed" | "starting-player-token";

export interface TurnStructure {
  order: TurnOrder;
  phases: PhaseDef[];
}

export interface PhaseDef {
  id: string;
  name: string;
  /** Actions legal during this phase */
  actions: string[];
  /** Phase ends when this condition holds */
  endsWhen: Condition;
}

export type ActionKind =
  | "move"
  | "place"
  | "remove"
  | "flip"
  | "draw"
  | "discard"
  | "play"
  | "trade"
  | "roll"
  | "gain-resource"
  | "spend-resource"
  | "pass";

export interface ActionDef {
  id: string;
  name: string;
  kind: ActionKind;
  /** Where the action draws from / acts upon */
  from?: ZoneRef;
  to?: ZoneRef;
  preconditions: Condition[];
  effects: Effect[];
}

export type ZoneRef =
  | { zone: ZoneId; owner?: "active" | "any" | PlayerId }
  | { anyOf: ZoneId[] };

export type Value =
  | { const: number }
  | { resource: string; of: "active" | PlayerId }
  | { countIn: ZoneRef; entityType?: string }
  | { property: string; ofEntity: "selected" };

export type Condition =
  | { op: "eq" | "neq" | "gt" | "lt" | "gte" | "lte"; left: Value; right: Value }
  | { op: "and" | "or"; conditions: Condition[] }
  | { op: "not"; condition: Condition }
  | { op: "zoneEmpty"; zone: ZoneRef }
  | { op: "isActivePlayer"; player: PlayerId }
  | { op: "always" };

export type Effect =
  | { type: "moveEntity"; from: ZoneRef; to: ZoneRef; entityType?: string; count?: number | "all" }
  | { type: "changeResource"; resource: string; player: "active" | "all"; delta: Value }
  | { type: "createEntity"; entityType: string; in: ZoneRef; count: number }
  | { type: "removeEntity"; from: ZoneRef; entityType?: string; count?: number | "all" }
  | { type: "reveal" | "hide"; zone: ZoneRef }
  | { type: "advancePhase" }
  | { type: "advanceTurn" }
  | { type: "recordScore"; player: "active" | "all"; amount: Value };

export interface ScoringRule {
  id: string;
  description: string;
  when: "immediate" | "end-of-round" | "end-of-game";
  player: "active" | "all";
  amount: Value;
}

export type EndCondition =
  | { type: "score-threshold"; score: number }
  | { type: "round-count"; rounds: number }
  | { type: "supply-exhausted"; zone: ZoneId }
  | { type: "zone-filled"; zone: ZoneId; owner: ZoneOwner }
  | { type: "condition"; condition: Condition };

export interface SetupStep {
  type: "fill" | "shuffle" | "deal";
  zone: ZoneRef;
  entityType?: string;
  count?: number | "all";
}

export interface GameSpec {
  specVersion: typeof GAME_SPEC_VERSION;
  id: string;
  name: string;
  summary: string;
  players: { min: number; max: number };
  estimatedMinutes: number;
  entityTypes: EntityTypeDef[];
  resources: ResourceDef[];
  zones: ZoneDef[];
  setup: SetupStep[];
  turnStructure: TurnStructure;
  actions: ActionDef[];
  scoring: ScoringRule[];
  endConditions: EndCondition[];
}

// ---------------------------------------------------------------------------
// Game State — runtime state produced by the engine. Serializable.
// ---------------------------------------------------------------------------

export interface EntityInstance {
  id: EntityId;
  type: string;
  faceUp: boolean;
}

export interface ZoneState {
  zoneId: ZoneId;
  owner: PlayerId | "shared";
  /** For grid zones, index = row * cols + col; null = empty cell */
  slots: (EntityId | null)[];
}

export interface PlayerState {
  id: PlayerId;
  name: string;
  resources: Record<string, number>;
  score: number;
}

export interface TurnState {
  round: number;
  activePlayer: PlayerId;
  phaseId: string;
  turnNumber: number;
}

export interface GameState {
  specId: string;
  seed: number;
  players: PlayerState[];
  entities: Record<EntityId, EntityInstance>;
  zones: ZoneState[];
  turn: TurnState;
  status: "setup" | "in-progress" | "finished";
  winnerIds?: PlayerId[];
}

// ---------------------------------------------------------------------------
// Actions & Events
// ---------------------------------------------------------------------------

/** What a client sends. The server validates and applies it. */
export interface ActionIntent {
  actionId: string;
  playerId: PlayerId;
  /** Entity/zone selections made by the player, keyed by parameter name */
  selections: Record<string, EntityId | ZoneId | string>;
}

export type GameEvent =
  | { type: "GAME_STARTED"; specId: string; seed: number }
  | { type: "ROUND_STARTED"; round: number }
  | { type: "TURN_STARTED"; playerId: PlayerId; turnNumber: number }
  | { type: "ACTION_CONFIRMED"; actionId: string; playerId: PlayerId }
  | { type: "ENTITY_MOVED"; entityId: EntityId; from: ZoneId; to: ZoneId; toSlot?: number }
  | { type: "RESOURCE_CHANGED"; playerId: PlayerId; resource: string; delta: number; total: number }
  | { type: "SCORE_CHANGED"; playerId: PlayerId; delta: number; total: number }
  | { type: "DICE_ROLLED"; playerId: PlayerId; values: number[] }
  | { type: "CARD_DRAWN"; playerId: PlayerId; entityId: EntityId }
  | { type: "GAME_ENDED"; winnerIds: PlayerId[] };
