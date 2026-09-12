import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Check, Copy, Heart, Mic, MicOff, Video, VideoOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { prettyRoomCode } from "@/lib/room-codes";
import { cn } from "@/lib/utils";

type Props = {
  code: string;
  onJoin: (opts: {
    name: string;
    stream: MediaStream | null;
    micOn: boolean;
    camOn: boolean;
  }) => void;
};

export function Lobby({ code, onJoin }: Props) {
  const [name, setName] = useState("");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [copied, setCopied] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem("lovenest-name");
    if (saved) setName(saved);
  }, []);

  useEffect(() => {
    let active = true;
    let s: MediaStream | null = null;
    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setMediaError("This browser can't access a camera. You can still join for chat.");
        return;
      }
      try {
        s = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
      } catch {
        try {
          s = await navigator.mediaDevices.getUserMedia({ audio: true });
          setCamOn(false);
          setMediaError("Camera not available — joining with voice only.");
        } catch {
          setMediaError("Couldn't access camera or mic. Allow permission, or join for chat only.");
        }
      }
      if (!active) {
        s?.getTracks().forEach((t) => t.stop());
        return;
      }
      setStream(s);
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }, [stream]);

  useEffect(() => {
    stream?.getAudioTracks().forEach((t) => (t.enabled = micOn));
  }, [stream, micOn]);
  useEffect(() => {
    stream?.getVideoTracks().forEach((t) => (t.enabled = camOn));
  }, [stream, camOn]);

  const inviteLink = typeof window !== "undefined" ? `${window.location.origin}/room/${code}` : "";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      toast.success("Invite link copied — send it to her 💌");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy. Long-press the link to copy it.");
    }
  };

  const join = () => {
    const n = name.trim() || "Me";
    window.localStorage.setItem("lovenest-name", n);
    onJoin({ name: n, stream, micOn, camOn: camOn && !!stream?.getVideoTracks().length });
  };

  const hasVideo = !!stream?.getVideoTracks().length;

  return (
    <main className="ambient mood-candle flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <Link to="/" className="mb-6 flex items-center gap-2 font-display text-xl">
        <Heart className="size-5 fill-primary text-primary" /> LoveNest
      </Link>

      <div className="grid w-full max-w-4xl gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="relative aspect-video overflow-hidden rounded-3xl bg-stage shadow-soft ring-1 ring-border">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={cn("mirror h-full w-full object-cover", (!hasVideo || !camOn) && "hidden")}
          />
          {(!hasVideo || !camOn) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-warm-gradient font-display text-4xl text-rose-foreground shadow-glow">
                {(name.trim() || "?").charAt(0).toUpperCase()}
              </div>
              <p className="px-6 text-sm text-muted-foreground">
                {mediaError ?? (hasVideo ? "Camera is off" : "Waiting for camera permission…")}
              </p>
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 flex justify-center gap-3 bg-gradient-to-t from-stage/80 to-transparent p-4">
            <Button
              variant={micOn ? "control" : "controlOff"}
              size="control"
              onClick={() => setMicOn((v) => !v)}
              aria-label={micOn ? "Mute mic" : "Unmute mic"}
              disabled={!stream}
            >
              {micOn ? <Mic /> : <MicOff />}
            </Button>
            <Button
              variant={camOn && hasVideo ? "control" : "controlOff"}
              size="control"
              onClick={() => setCamOn((v) => !v)}
              aria-label={camOn ? "Turn camera off" : "Turn camera on"}
              disabled={!hasVideo}
            >
              {camOn && hasVideo ? <Video /> : <VideoOff />}
            </Button>
          </div>
        </div>

        <div className="glass-strong flex flex-col justify-between gap-6 rounded-3xl p-6">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Your room</p>
            <h1 className="mt-1 font-display text-2xl leading-tight sm:text-3xl">
              {prettyRoomCode(code)}
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Private, direct connection between your two devices. No accounts, no time limit,
              nothing recorded.
            </p>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">What should she see you as?</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && join()}
              placeholder="Your name"
              maxLength={24}
              className="h-12 w-full rounded-2xl bg-input/60 px-4 text-base outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
            />
          </label>

          <div className="space-y-3">
            <Button variant="hero" size="xl" className="w-full" onClick={join}>
              <Heart className="fill-current" /> Join the room
            </Button>
            <Button variant="glass" size="lg" className="w-full" onClick={copy}>
              {copied ? <Check /> : <Copy />} {copied ? "Copied!" : "Copy invite link"}
            </Button>
            <p className="break-all text-center text-xs text-muted-foreground">{inviteLink}</p>
          </div>
        </div>
      </div>
    </main>
  );
}
