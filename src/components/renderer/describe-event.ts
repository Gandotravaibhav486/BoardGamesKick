import type { GameEvent, GameSpec, GameState } from "@/lib/game-spec/types";

export interface LogEntry {
  id: string;
  text: string;
  tone: "positive" | "negative" | "neutral";
}

let entryCounter = 0;
function makeEntry(text: string, tone: LogEntry["tone"] = "neutral"): LogEntry {
  entryCounter += 1;
  return { id: `log-${entryCounter}`, text, tone };
}

/** Converts one engine GameEvent into a human-readable log line, or null to skip it. */
export function describeEvent(event: GameEvent, state: GameState, spec: GameSpec): LogEntry | null {
  const playerName = (id: string) => state.players.find((p) => p.id === id)?.name ?? id;
  const zoneName = (id: string) => spec.zones.find((z) => z.id === id)?.name ?? id;
  const entityName = (type: string) => spec.entityTypes.find((e) => e.id === type)?.name ?? type;

  switch (event.type) {
    case "GAME_STARTED":
      return makeEntry("Game started.");
    case "ROUND_STARTED":
      return makeEntry(`Round ${event.round} begins.`);
    case "ROUND_ENDED":
      return makeEntry(`Round ${event.round} complete.`);
    case "PHASE_STARTED":
      return null;
    case "TURN_STARTED":
      return null;
    case "ACTION_CONFIRMED":
      return makeEntry(`${playerName(event.playerId)} — ${event.description}`);
    case "ENTITY_MOVED":
      return makeEntry(
        `${entityName(event.entityType)} moved from ${zoneName(event.from)} to ${zoneName(event.to)}.`,
      );
    case "RESOURCE_CHANGED":
      return makeEntry(
        `${playerName(event.playerId)} ${event.delta >= 0 ? "gained" : "lost"} ${Math.abs(event.delta)} ${event.resource}.`,
      );
    case "SCORE_CHANGED":
      return makeEntry(
        `${playerName(event.playerId)} ${event.delta >= 0 ? "+" : ""}${event.delta} — ${event.reason}`,
        event.delta > 0 ? "positive" : event.delta < 0 ? "negative" : "neutral",
      );
    case "DICE_ROLLED":
      return makeEntry(`${playerName(event.playerId)} rolled ${event.values.join(", ")}.`);
    case "CARD_DRAWN":
      return makeEntry(`${playerName(event.playerId)} drew a card.`);
    case "GAME_ENDED": {
      const names = event.winnerIds.map(playerName);
      const winnerText = names.length > 1 ? `${names.join(" and ")} tie` : `${names[0] ?? "Nobody"} wins`;
      return makeEntry(`Game over — ${winnerText}.`);
    }
    default:
      return null;
  }
}
