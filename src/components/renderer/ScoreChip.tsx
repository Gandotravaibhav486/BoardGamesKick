import { Star } from "lucide-react";
import { cn } from "@/lib/cn";

export function ScoreChip({ score, className }: { score: number; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-ink/10 px-2 py-0.5 text-xs font-semibold text-ink",
        className,
      )}
    >
      <Star className="h-3 w-3" strokeWidth={2.5} />
      {score}
    </span>
  );
}
