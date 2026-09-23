import type { PresentationSpec } from "@/lib/presentation/types";
import { cn } from "@/lib/cn";

const TABLE_TONES: Record<PresentationSpec["tableStyle"], { background: string; line: string }> = {
  felt: { background: "linear-gradient(135deg, var(--felt) 0%, var(--felt-2) 100%)", line: "var(--felt-line)" },
  wood: { background: "linear-gradient(135deg, #5b3a22 0%, #7a5133 100%)", line: "#4a2e19" },
  linen: { background: "linear-gradient(135deg, var(--board) 0%, #e8dcc2 100%)", line: "var(--board-line)" },
};

/**
 * Abstract, data-driven preview of a game built only from its own
 * PresentationSpec — a tinted surface (from tableStyle) with a mosaic of
 * swatches drawn from the game's entity colors, plus a subtle initial
 * watermark. No external images or fabricated artwork.
 */
export function GamePreview({
  presentation,
  title,
  className,
  size = "md",
}: {
  presentation: PresentationSpec;
  title: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const tone = TABLE_TONES[presentation.tableStyle] ?? TABLE_TONES.felt;
  const colors = presentation.entityStyles.length > 0
    ? presentation.entityStyles.map((s) => s.color)
    : ["var(--tile-sand)"];

  const cells = size === "lg" ? 30 : size === "sm" ? 12 : 20;
  const cols = size === "lg" ? 10 : size === "sm" ? 6 : 5;
  const isLight = presentation.tableStyle === "linen";

  return (
    <div
      className={cn("relative overflow-hidden", className)}
      style={{ background: tone.background }}
      aria-hidden
    >
      <span
        className={cn(
          "pointer-events-none absolute -bottom-3 -right-1 select-none font-semibold leading-none",
          size === "lg" ? "text-[7rem]" : size === "sm" ? "text-[3.5rem]" : "text-[4.5rem]",
        )}
        style={{ color: isLight ? "rgba(43,36,32,0.10)" : "rgba(255,255,255,0.08)" }}
      >
        {title.trim().charAt(0).toUpperCase() || "?"}
      </span>
      <div
        className="grid h-full w-full gap-1 p-3"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: cells }).map((_, i) => {
          const color = colors[i % colors.length];
          const scale = 0.55 + ((i * 37) % 45) / 100;
          return (
            <div
              key={i}
              className="aspect-square rounded-[3px]"
              style={{
                background: color,
                opacity: scale,
                boxShadow: `inset 0 0 0 1px ${tone.line}`,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
