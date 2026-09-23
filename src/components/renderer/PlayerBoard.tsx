"use client";

import type { EntityId, EntityInstance, GameSpec, PlayerId, ZoneState } from "@/lib/game-spec/types";
import type { PresentationSpec } from "@/lib/presentation/types";
import { ZoneView } from "@/components/renderer/ZoneView";
import { ScoreChip } from "@/components/renderer/ScoreChip";
import { cn } from "@/lib/cn";
import type { StyleMap } from "@/components/renderer/types";

export interface DestinationInfo {
  zoneId: string;
  legal: boolean;
  reason?: string;
}

export interface PlayerBoardProps {
  spec: GameSpec;
  presentation: PresentationSpec;
  playerId: PlayerId;
  playerName: string;
  score: number;
  zones: ZoneState[];
  entities: Record<EntityId, EntityInstance>;
  styles: StyleMap;
  isActive: boolean;
  isYou: boolean;
  compact?: boolean;
  selectedType?: string;
  selectedFromZoneId?: string;
  destinations?: DestinationInfo[];
  onSelectDestination?: (zoneId: string) => void;
}

export function PlayerBoard({
  spec,
  presentation,
  playerName,
  score,
  zones,
  entities,
  styles,
  isActive,
  isYou,
  compact,
  selectedType,
  selectedFromZoneId,
  destinations,
  onSelectDestination,
}: PlayerBoardProps) {
  const myAreaZoneIds = new Set(
    presentation.zonePlacements.filter((zp) => zp.region === "my-area").map((zp) => zp.zoneId),
  );
  const orderedZoneDefs = spec.zones.filter((z) => z.owner === "player" && myAreaZoneIds.has(z.id));

  return (
    <div
      className={cn(
        "rounded-lg border bg-board text-board-ink shadow-sm",
        isActive ? "border-highlight ring-2 ring-highlight/70" : "border-board-line",
        compact ? "p-2" : "p-3",
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className={cn("truncate font-semibold", compact ? "text-sm" : "text-base")}>
            {playerName}
            {isYou ? " (You)" : ""}
          </span>
          {isActive && (
            <span className="rounded-full bg-highlight px-2 py-0.5 text-[10px] font-semibold text-board-ink">
              Active
            </span>
          )}
        </div>
        <ScoreChip score={score} />
      </div>
      <div className={cn("flex flex-wrap gap-2", compact && "gap-1")}>
        {orderedZoneDefs.map((zoneDef) => {
          const zoneState = zones.find((z) => z.zoneId === zoneDef.id);
          if (!zoneState) return null;
          const placement = presentation.zonePlacements.find((zp) => zp.zoneId === zoneDef.id);
          const dest = destinations?.find((d) => d.zoneId === zoneDef.id);
          return (
            <ZoneView
              key={zoneDef.id}
              zoneDef={zoneDef}
              zoneState={zoneState}
              entities={entities}
              styles={styles}
              label={placement?.label ?? zoneDef.name}
              size={compact ? "sm" : "md"}
              selectedType={selectedType}
              selectedFromZoneId={selectedFromZoneId}
              destination={dest ? (dest.legal ? "legal" : "illegal") : "none"}
              disabledReason={dest?.reason}
              onSelectDestination={dest ? () => onSelectDestination?.(zoneDef.id) : undefined}
            />
          );
        })}
      </div>
    </div>
  );
}
