import { useEffect, useRef, useState } from "react";
import { MicOff, VideoOff, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export type VideoFilter = "none" | "warm-glow" | "vintage" | "noir" | "cyberpunk" | "soft-romance";
export type VideoSticker = "none" | "heart-glasses" | "sparkles" | "flower-crown" | "cat-ears";

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
  filter?: VideoFilter | undefined;
  sticker?: VideoSticker | undefined;
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
  filter = "none",
  sticker = "none",
}: Props) {
  const ref = useRef<HTMLVideoElement>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.srcObject = stream;
    if (stream) el.play().catch(() => {});
  }, [stream]);

  useEffect(() => {
    if (!stream || !micOn || muted || stream.getAudioTracks().length === 0) {
      setIsSpeaking(false);
      return;
    }
    let animId: number;
    let audioCtx: AudioContext | null = null;
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioCtx = new AudioContextClass();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);

      const check = () => {
        analyser.getByteFrequencyData(data);
        const sum = data.reduce((a, b) => a + b, 0);
        const avg = sum / data.length;
        setIsSpeaking(avg > 15);
        animId = requestAnimationFrame(check);
      };
      check();
    } catch {
      /* ignore audio context errors */
    }

    return () => {
      if (animId) cancelAnimationFrame(animId);
      if (audioCtx) audioCtx.close().catch(() => {});
    };
  }, [stream, micOn, muted]);

  const hasVideo = !!stream && stream.getVideoTracks().length > 0 && camOn;
  const initial = (name || "?").trim().charAt(0).toUpperCase();

  const filterClass = filter !== "none" ? `filter-${filter}` : "";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-3xl bg-stage shadow-soft ring-1 transition-all duration-300",
        isSpeaking ? "ring-2 ring-emerald-500 shadow-[0_0_25px_rgba(16,185,129,0.4)]" : "ring-border",
        className,
      )}
    >
      <video
        ref={ref}
        autoPlay
        playsInline
        muted={muted}
        className={cn(
          "h-full w-full object-contain transition-all duration-500",
          mirrored && !sharing && "mirror",
          !hasVideo && "opacity-0",
          filterClass,
        )}
      />

      {/* AR Sticker Overlays */}
      {hasVideo && sticker !== "none" && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center overflow-hidden">
          {sticker === "heart-glasses" && (
            <div className="absolute top-[28%] flex items-center justify-center gap-6 animate-pulse">
              <span className="text-5xl sm:text-6xl drop-shadow-[0_0_12px_rgba(244,63,94,0.8)]">
                🕶️❤️
              </span>
            </div>
          )}
          {sticker === "sparkles" && (
            <div className="absolute inset-0 p-4 flex flex-wrap items-center justify-between opacity-80">
              <Sparkles className="size-8 text-amber-300 animate-twinkle top-4 left-6 absolute" />
              <Sparkles className="size-10 text-rose-400 animate-twinkle bottom-12 left-10 absolute" />
              <Sparkles className="size-8 text-pink-300 animate-twinkle top-8 right-8 absolute" />
              <Sparkles className="size-9 text-yellow-200 animate-twinkle bottom-16 right-12 absolute" />
            </div>
          )}
          {sticker === "flower-crown" && (
            <div className="absolute top-3 text-3xl sm:text-4xl tracking-widest drop-shadow-md select-none">
              🌸 🌺 🌼 👑 🌼 🌺 🌸
            </div>
          )}
          {sticker === "cat-ears" && (
            <div className="absolute top-2 flex w-full justify-between px-8 text-4xl sm:text-5xl select-none">
              <span className="transform -rotate-12">🐱</span>
              <span className="transform rotate-12">🐱</span>
            </div>
          )}
        </div>
      )}

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
            "glass rounded-full px-3 py-1 font-medium flex items-center gap-2",
            size === "stage" ? "text-sm" : "text-xs",
          )}
        >
          {isSpeaking && micOn && (
            <span className="flex items-end gap-0.5 h-3">
              <span className="w-0.5 bg-emerald-400 animate-pulse h-full" />
              <span className="w-0.5 bg-emerald-400 animate-pulse h-2" />
              <span className="w-0.5 bg-emerald-400 animate-pulse h-3" />
            </span>
          )}
          <span>{name}</span>
          {sharing ? " · sharing screen" : ""}
          {filter !== "none" ? ` · ${filter}` : ""}
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
