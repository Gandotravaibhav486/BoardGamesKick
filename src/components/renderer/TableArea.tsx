"use client";

import type { EntityId, EntityInstance, GameSpec, ZoneState } from "@/lib/game-spec/types";
import type { PresentationSpec } from "@/lib/presentation/types";
import { ZoneView } from "@/components/renderer/ZoneView";
import type { StyleMap } from "@/components/renderer/types";

export interface TableAreaProps {
  spec: GameSpec;
  presentation: PresentationSpec;
  zones: ZoneState[];
  entities: Record<EntityId, EntityInstance>;
  styles: StyleMap;
  selectedType?: string;
  selectedFromZoneId?: string;
  onSelectTile: (zoneId: string, entityType: string) => void;
  canSelect: boolean;
}

export function TableArea({
  spec,
  presentation,
  zones,
  entities,
  styles,
  selectedType,
  selectedFromZoneId,
  onSelectTile,
  canSelect,
}: TableAreaProps) {
  const tableZoneIds = new Set(
    presentation.zonePlacements.filter((zp) => zp.region === "table").map((zp) => zp.zoneId),
  );
  const tableZoneDefs = spec.zones.filter((z) => tableZoneIds.has(z.id));
  const bounded = tableZoneDefs.filter((z) => z.geometry.kind !== "row" || z.geometry.capacity);
  const unbounded = tableZoneDefs.filter((z) => z.geometry.kind === "row" && !z.geometry.capacity);

  const renderZone = (zoneDef: (typeof tableZoneDefs)[number]) => {
    const zoneState = zones.find((z) => z.zoneId === zoneDef.id && z.owner === "shared");
    if (!zoneState) return null;
    const placement = presentation.zonePlacements.find((zp) => zp.zoneId === zoneDef.id);
    return (
      <ZoneView
        key={zoneDef.id}
        zoneDef={zoneDef}
        zoneState={zoneState}
        entities={entities}
        styles={styles}
        label={placement?.label ?? zoneDef.name}
        size="lg"
        tone="felt"
        selectedType={selectedType}
        selectedFromZoneId={selectedFromZoneId}
        onSelectTile={canSelect ? (type) => onSelectTile(zoneDef.id, type) : undefined}
      />
    );
  };

  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-4 rounded-xl border border-felt-line bg-felt p-4 text-board shadow-inner">
      <div className="flex flex-wrap items-center justify-center gap-3">
        {bounded.map(renderZone)}
      </div>
      {unbounded.length > 0 && (
        <div className="flex w-full flex-wrap items-center justify-center gap-3 border-t border-felt-line/60 pt-3">
          {unbounded.map(renderZone)}
        </div>
      )}
    </div>
  );
}
