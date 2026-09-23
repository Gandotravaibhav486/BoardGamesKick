"use client";

import { Tile } from "@/components/renderer/Tile";
import type { ZoneViewProps } from "@/components/renderer/types";
import { cn } from "@/lib/cn";
import { Layers } from "lucide-react";

function typeCounts(slots: (string | null)[], entities: ZoneViewProps["entities"]) {
  const counts = new Map<string, number>();
  for (const id of slots) {
    if (!id) continue;
    const type = entities[id]?.type;
    if (!type) continue;
    counts.set(type, (counts.get(type) ?? 0) + 1);
  }
  return counts;
}

export function ZoneView({
  zoneDef,
  zoneState,
  entities,
  styles,
  label,
  size = "md",
  selectedType,
  selectedFromZoneId,
  onSelectTile,
  destination = "none",
  onSelectDestination,
  disabledReason,
  tone = "board",
}: ZoneViewProps) {
  const isSourceSelectable = typeof onSelectTile === "function";
  const isDestination = destination !== "none";
  const labelClass = tone === "felt" ? "text-board/80" : "text-ink-muted";
  const emptyBorderClass = tone === "felt" ? "border-board/30 text-board/60" : "border-board-line/60 text-ink-muted/70";

  const wrapperClasses = cn(
    "rounded-lg border p-2 transition-colors",
    isDestination && destination === "legal" && "border-highlight ring-2 ring-highlight/70 animate-pulse cursor-pointer",
    isDestination && destination === "illegal" && "border-border/60 opacity-50",
    !isDestination && "border-transparent",
  );

  if (zoneDef.visibility === "private" && zoneDef.geometry.kind === "stack") {
    const count = zoneState.slots.length;
    return (
      <div className="flex flex-col items-center gap-1">
        <div className="flex h-14 w-11 items-center justify-center rounded-md border border-black/20 bg-board-ink/80 text-board shadow-md">
          <Layers className="h-5 w-5" />
        </div>
        <span className={cn("text-xs", labelClass)}>
          {label} &middot; {count}
        </span>
      </div>
    );
  }

  if (zoneDef.geometry.kind === "stack") {
    const count = zoneState.slots.length;
    const topId = zoneState.slots[zoneState.slots.length - 1];
    const topType = topId ? entities[topId]?.type : undefined;
    return (
      <div className="flex flex-col items-center gap-1">
        <div className="relative">
          <Tile typeId={topType ?? "empty"} style={topType ? styles[topType] : undefined} size={size} ghost={!topType} />
          {count > 0 && (
            <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-ink px-1 text-[10px] font-semibold text-white">
              {count}
            </span>
          )}
        </div>
        <span className={cn("text-xs", labelClass)}>{label}</span>
      </div>
    );
  }

  if (zoneDef.geometry.kind === "grid") {
    const { rows, cols } = zoneDef.geometry;
    return (
      <div className="flex flex-col gap-1">
        <span className={cn("text-xs font-medium", labelClass)}>{label}</span>
        <div
          className="grid gap-1 rounded-md bg-board-line/20 p-1"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: rows * cols }, (_, idx) => {
            const id = zoneState.slots[idx];
            const type = id ? entities[id]?.type : undefined;
            const patternType = zoneDef.cellPattern?.[Math.floor(idx / cols)]?.[idx % cols];
            const hintStyle = patternType ? styles[patternType] : undefined;
            if (type) {
              return (
                <Tile key={idx} typeId={type} style={styles[type]} size="sm" />
              );
            }
            return (
              <span
                key={idx}
                className="flex h-8 w-8 items-center justify-center rounded-md border border-dashed border-board-line/70"
                style={hintStyle ? { backgroundColor: hintStyle.color, opacity: 0.14 } : undefined}
              />
            );
          })}
        </div>
      </div>
    );
  }

  // row
  const capacity = zoneDef.geometry.capacity;
  const isEmpty = zoneState.slots.every((s) => s === null);
  const counts = capacity ? null : typeCounts(zoneState.slots, entities);
  const groupedEntries = counts ? [...counts.entries()] : null;

  return (
    <div
      className={wrapperClasses}
      role={isDestination ? "button" : undefined}
      tabIndex={isDestination && destination === "legal" ? 0 : undefined}
      aria-disabled={isDestination && destination === "illegal"}
      title={isDestination && destination === "illegal" ? disabledReason : undefined}
      onClick={() => {
        if (isDestination) {
          if (destination === "legal") onSelectDestination?.();
        }
      }}
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className={cn("truncate text-xs font-medium", labelClass)}>{label}</span>
        {capacity ? <span className={cn("text-[10px]", labelClass)}>{zoneState.slots.filter(Boolean).length}/{capacity}</span> : null}
      </div>
      {isEmpty ? (
        <div className={cn("flex h-11 min-w-24 items-center justify-center rounded-md border border-dashed text-[11px]", emptyBorderClass)}>
          Empty
        </div>
      ) : capacity ? (
        <div className="flex justify-end gap-1">
          {zoneState.slots.map((id, idx) => {
            const type = id ? entities[id]?.type : undefined;
            if (!type) {
              return <Tile key={idx} typeId="empty" size={size} ghost />;
            }
            const selected = isSourceSelectable && selectedType === type && selectedFromZoneId === zoneState.zoneId;
            const dimmed = Boolean(selectedType) && selectedFromZoneId === zoneState.zoneId && selectedType !== type;
            return (
              <Tile
                key={idx}
                typeId={type}
                style={styles[type]}
                size={size}
                selected={selected}
                dimmed={dimmed}
                onClick={isSourceSelectable ? () => onSelectTile?.(type) : undefined}
              />
            );
          })}
        </div>
      ) : (
        <div className="flex flex-wrap gap-1">
          {groupedEntries?.map(([type, count]) => {
            const selected = isSourceSelectable && selectedType === type && selectedFromZoneId === zoneState.zoneId;
            const dimmed = Boolean(selectedType) && selectedFromZoneId === zoneState.zoneId && selectedType !== type;
            return (
              <div key={type} className="relative">
                <Tile
                  typeId={type}
                  style={styles[type]}
                  size={size}
                  selected={selected}
                  dimmed={dimmed}
                  onClick={isSourceSelectable ? () => onSelectTile?.(type) : undefined}
                />
                {count > 1 && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-ink px-1 text-[9px] font-semibold text-white">
                    {count}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
