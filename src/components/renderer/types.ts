import type { EntityInstance, EntityId, ZoneDef, ZoneState } from "@/lib/game-spec/types";
import type { EntityStyle } from "@/lib/presentation/types";

export type StyleMap = Record<string, EntityStyle>;

export interface ZoneViewProps {
  zoneDef: ZoneDef;
  zoneState: ZoneState;
  entities: Record<EntityId, EntityInstance>;
  styles: StyleMap;
  label: string;
  size?: "sm" | "md" | "lg";
  /** Entity type currently selected elsewhere on the table, used to glow matching tiles here. */
  selectedType?: string;
  selectedFromZoneId?: string;
  /** Called when a tile of a given type is clicked in this zone (source selection). */
  onSelectTile?: (entityType: string) => void;
  /** Whether this whole zone is a valid drop target for the current selection. */
  destination?: "legal" | "illegal" | "none";
  onSelectDestination?: () => void;
  disabledReason?: string;
  /** Surface this zone sits on, for label/border contrast. */
  tone?: "felt" | "board";
}
