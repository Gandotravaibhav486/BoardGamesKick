"use client";

import type { EntityStyle } from "@/lib/presentation/types";
import { Icon } from "@/components/renderer/icons";
import { cn } from "@/lib/cn";

const sizeClasses = {
  sm: "h-8 w-8 text-[10px]",
  md: "h-11 w-11 text-xs",
  lg: "h-14 w-14 text-sm",
};

export interface TileProps {
  typeId: string;
  style?: EntityStyle;
  size?: "sm" | "md" | "lg";
  selected?: boolean;
  dimmed?: boolean;
  ghost?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

export function Tile({
  typeId,
  style,
  size = "md",
  selected,
  dimmed,
  ghost,
  disabled,
  onClick,
}: TileProps) {
  const label = style?.label ?? typeId;
  const color = style?.color ?? "var(--tile-ember)";
  const interactive = typeof onClick === "function";

  const content = (
    <span
      aria-label={label}
      title={label}
      className={cn(
        "relative inline-flex items-center justify-center rounded-md border transition-all duration-150 ease-out",
        sizeClasses[size],
        ghost ? "border-dashed border-board-line/60 bg-transparent" : "border-black/15 shadow-sm",
        selected && "ring-2 ring-highlight ring-offset-1 -translate-y-1 shadow-lg",
        dimmed && "opacity-35",
        interactive && !disabled && "cursor-pointer hover:-translate-y-0.5 hover:shadow-md",
        disabled && "cursor-not-allowed opacity-40",
      )}
      style={ghost ? undefined : { backgroundColor: color }}
    >
      {!ghost && (
        <Icon
          name={style?.icon}
          className="h-1/2 w-1/2 text-white/90 drop-shadow-sm"
          strokeWidth={2.25}
        />
      )}
    </span>
  );

  if (!interactive) return content;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      aria-disabled={disabled}
      aria-label={label}
      className="appearance-none bg-transparent p-0"
    >
      {content}
    </button>
  );
}
