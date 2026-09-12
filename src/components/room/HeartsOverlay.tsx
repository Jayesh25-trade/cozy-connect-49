import { Heart } from "lucide-react";
import type { Heart as HeartT } from "@/hooks/useCoupleCall";
import { cn } from "@/lib/utils";

export function HeartsOverlay({ hearts }: { hearts: HeartT[] }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden" aria-hidden>
      {hearts.map((h) => (
        <Heart
          key={h.id}
          className={cn(
            "absolute bottom-24 animate-float-up drop-shadow-[0_0_12px_var(--rose)]",
            h.mine ? "fill-primary text-primary" : "fill-candle text-candle",
          )}
          style={{ left: `${h.x}%`, width: 28 + (h.x % 18), height: 28 + (h.x % 18) }}
        />
      ))}
    </div>
  );
}
