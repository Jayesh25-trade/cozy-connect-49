import { Heart } from "lucide-react";
import type { Heart as HeartT } from "@/hooks/useCoupleCall";
import { cn } from "@/lib/utils";

export function HeartsOverlay({ hearts }: { hearts: HeartT[] }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden" aria-hidden>
      {hearts.map((h) => (
        <div
          key={h.id}
          className={cn(
            "absolute bottom-24 flex items-center justify-center animate-float-up drop-shadow-[0_0_16px_var(--rose)]",
            h.mine ? "text-primary" : "text-candle",
          )}
          style={{ left: `${h.x}%` }}
        >
          {h.emoji ? (
            <span className="select-none" style={{ fontSize: `${30 + (h.x % 16)}px` }}>
              {h.emoji}
            </span>
          ) : (
            <Heart
              className="fill-current"
              style={{ width: 28 + (h.x % 18), height: 28 + (h.x % 18) }}
            />
          )}
        </div>
      ))}
    </div>
  );
}
