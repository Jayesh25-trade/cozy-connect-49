import { useEffect, useRef } from "react";
import { MicOff, VideoOff } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  stream: MediaStream | null;
  name: string;
  muted?: boolean | undefined;
  mirrored?: boolean | undefined;
  camOn?: boolean | undefined;
  micOn?: boolean | undefined;
  sharing?: boolean | undefined;
  className?: string | undefined;
  size?: "stage" | "pip" | undefined;
};

export function VideoTile({
  stream,
  name,
  muted,
  mirrored,
  camOn = true,
  micOn = true,
  sharing,
  className,
  size = "stage",
}: Props) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.srcObject = stream;
    if (stream) el.play().catch(() => {});
  }, [stream]);

  const hasVideo = !!stream && stream.getVideoTracks().length > 0 && camOn;
  const initial = (name || "?").trim().charAt(0).toUpperCase();

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-3xl bg-stage shadow-soft ring-1 ring-border",
        className,
      )}
    >
      <video
        ref={ref}
        autoPlay
        playsInline
        muted={muted}
        className={cn(
          "h-full w-full object-cover transition-opacity duration-500",
          mirrored && !sharing && "mirror",
          sharing && "object-contain",
          !hasVideo && "opacity-0",
        )}
      />

      {!hasVideo && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <div className="relative">
            <span className="absolute inset-0 rounded-full bg-primary/40 animate-pulse-ring" />
            <div
              className={cn(
                "relative flex items-center justify-center rounded-full bg-warm-gradient font-display text-rose-foreground shadow-glow",
                size === "stage"
                  ? "h-24 w-24 text-4xl sm:h-32 sm:w-32 sm:text-5xl"
                  : "h-12 w-12 text-xl",
              )}
            >
              {initial}
            </div>
          </div>
          {size === "stage" && (
            <p className="text-sm text-muted-foreground">
              {stream ? "Camera is off" : "Connecting camera…"}
            </p>
          )}
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-gradient-to-t from-stage/80 to-transparent p-3">
        <span
          className={cn(
            "glass rounded-full px-3 py-1 font-medium",
            size === "stage" ? "text-sm" : "text-xs",
          )}
        >
          {name}
          {sharing ? " · sharing screen" : ""}
        </span>
        <span className="flex gap-1.5">
          {!micOn && (
            <span className="rounded-full bg-destructive/90 p-1.5 text-destructive-foreground">
              <MicOff className="size-3.5" />
            </span>
          )}
          {!camOn && size === "pip" && (
            <span className="rounded-full bg-destructive/90 p-1.5 text-destructive-foreground">
              <VideoOff className="size-3.5" />
            </span>
          )}
        </span>
      </div>
    </div>
  );
}
