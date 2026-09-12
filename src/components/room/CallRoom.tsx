import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Check,
  Copy,
  Heart,
  MessageCircleHeart,
  Mic,
  MicOff,
  Moon,
  MonitorUp,
  MonitorX,
  NotebookPen,
  PhoneOff,
  Sunset,
  Flame,
  Video,
  VideoOff,
  Maximize2,
  Minimize2,
  CloudRain,
  Music,
  PictureInPicture2,
  Wifi,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useCoupleCall } from "@/hooks/useCoupleCall";
import { prettyRoomCode } from "@/lib/room-codes";
import { setAmbientSound, stopAmbientSound, type SoundMode } from "@/lib/ambient-sound";
import { cn } from "@/lib/utils";
import { VideoTile, type VideoFilter, type VideoSticker } from "./VideoTile";
import { HeartsOverlay } from "./HeartsOverlay";
import { SidePanel, type PanelTab } from "./SidePanel";

type Mood = "candle" | "moon" | "dusk";
const MOODS: { id: Mood; label: string; Icon: typeof Flame }[] = [
  { id: "candle", label: "Candlelight", Icon: Flame },
  { id: "moon", label: "Moonlight", Icon: Moon },
  { id: "dusk", label: "Sunset", Icon: Sunset },
];

const SOUNDS: { id: SoundMode; label: string; Icon: typeof CloudRain }[] = [
  { id: "off", label: "Mute sound", Icon: MicOff },
  { id: "rain", label: "Rain", Icon: CloudRain },
  { id: "fire", label: "Fireplace", Icon: Flame },
  { id: "lofi", label: "Lofi Chords", Icon: Music },
];

const EMOJIS = ["❤️", "💖", "💋", "🔥", "🥺", "🥂", "🎵", "🌙", "🌹"];

const FILTERS: { id: VideoFilter; label: string }[] = [
  { id: "none", label: "Normal 📹" },
  { id: "warm-glow", label: "Warm Glow 🔥" },
  { id: "vintage", label: "Vintage 🎞️" },
  { id: "noir", label: "Noir 🎬" },
  { id: "cyberpunk", label: "Cyberpunk 🏙️" },
  { id: "soft-romance", label: "Romance 💖" },
];

const STICKERS: { id: VideoSticker; label: string }[] = [
  { id: "none", label: "Off 🚫" },
  { id: "heart-glasses", label: "Glasses 🕶️" },
  { id: "sparkles", label: "Sparkles ✨" },
  { id: "flower-crown", label: "Crown 👑" },
  { id: "cat-ears", label: "Cat Ears 🐱" },
];

type Props = {
  code: string;
  name: string;
  stream: MediaStream | null;
  micOn: boolean;
  camOn: boolean;
};

export function CallRoom({ code, name, stream, micOn: initialMicOn, camOn: initialCamOn }: Props) {
  const navigate = useNavigate();
  const call = useCoupleCall({ code, name, stream, initialMicOn, initialCamOn });
  const [panelOpen, setPanelOpen] = useState(false);
  const [tab, setTab] = useState<PanelTab>("chat");
  const [unread, setUnread] = useState(0);
  const [mood, setMood] = useState<Mood>("candle");
  const [sound, setSoundState] = useState<SoundMode>("off");
  const [copied, setCopied] = useState(false);
  const [elapsed, setElapsed] = useState("00:00");
  const [fullscreen, setFullscreen] = useState(false);
  const [swap, setSwap] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filter, setFilter] = useState<VideoFilter>("none");
  const [sticker, setSticker] = useState<VideoSticker>("none");
  const videoTileRef = useRef<HTMLDivElement>(null);

  // Unread badge
  useEffect(() => {
    const last = call.messages[call.messages.length - 1];
    if (!last) return;
    if (last.from === "partner" && !(panelOpen && tab === "chat")) setUnread((u) => u + 1);
  }, [call.messages, panelOpen, tab]);
  useEffect(() => {
    if (panelOpen && tab === "chat") setUnread(0);
  }, [panelOpen, tab]);

  // Timer
  useEffect(() => {
    if (!call.connectedAt) {
      setElapsed("00:00");
      return;
    }
    const tick = () => {
      const s = Math.floor((Date.now() - call.connectedAt!) / 1000);
      const h = Math.floor(s / 3600);
      const m = Math.floor((s % 3600) / 60);
      const sec = s % 60;
      setElapsed(
        (h ? `${h}:` : "") + `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`,
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [call.connectedAt]);

  // Cleanup ambient sound on unmount
  useEffect(() => {
    return () => stopAmbientSound();
  }, []);

  const handleSoundChange = (m: SoundMode) => {
    setSoundState(m);
    setAmbientSound(m);
    toast(`Ambient sound set to ${m === "off" ? "Off" : m}`);
  };

  // Partner joined toast
  const partnerName = call.partner?.name ?? null;
  useEffect(() => {
    if (partnerName) toast(`${partnerName} is here 💗`);
  }, [partnerName]);

  useEffect(() => {
    const onFs = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const inviteLink = typeof window !== "undefined" ? `${window.location.origin}/room/${code}` : "";
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      toast.success("Invite link copied 💌");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy the link.");
    }
  };

  const toggleShare = async () => {
    try {
      if (call.sharing) call.stopShare();
      else await call.startShare();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Screen share was cancelled.";
      if (!/permission|abort|NotAllowed/i.test(msg)) toast.error(msg);
    }
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen?.().catch(() => {});
  };

  const togglePiP = async () => {
    try {
      const videoEl = videoTileRef.current?.querySelector("video");
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (videoEl && document.pictureInPictureEnabled) {
        await videoEl.requestPictureInPicture();
      }
    } catch {
      toast.error("Picture-in-Picture is not supported or active.");
    }
  };

  const openPanel = (t: PanelTab) => {
    if (panelOpen && tab === t) setPanelOpen(false);
    else {
      setTab(t);
      setPanelOpen(true);
    }
  };

  if (call.status === "ended") {
    return (
      <main className="ambient mood-candle flex h-dvh flex-col items-center justify-center p-6 text-center">
        <div className="glass-strong flex max-w-md flex-col items-center gap-6 rounded-3xl p-8 shadow-soft">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-warm-gradient text-3xl shadow-glow">
            💖
          </div>
          <div>
            <h1 className="font-display text-3xl">Call Ended</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              You spent <span className="font-bold text-foreground">{elapsed}</span> together.
            </p>
          </div>
          <div className="flex w-full flex-col gap-3">
            <Button variant="hero" onClick={() => window.location.reload()}>
              Rejoin call
            </Button>
            <Button variant="glass" onClick={() => navigate({ to: "/" })}>
              Back to home
            </Button>
          </div>
        </div>
      </main>
    );
  }

  const connected = call.status === "connected";
  const statusLabel =
    call.status === "connected"
      ? "Connected"
      : call.status === "waiting"
        ? "Waiting for her…"
        : call.status === "error"
          ? "Connection issue"
          : "Connecting…";

  const bigStream = swap ? call.previewStream : call.remoteStream;
  const smallStream = swap ? call.remoteStream : call.previewStream;

  return (
    <div className={cn("ambient flex h-dvh flex-col overflow-hidden", `mood-${mood}`)}>
      <HeartsOverlay hearts={call.hearts} />

      {/* Top bar */}
      <header className="relative z-20 flex items-center justify-between gap-2 px-3 pt-3 sm:px-5">
        <Link to="/" className="flex items-center gap-2 font-display text-lg">
          <Heart className="size-4 fill-primary text-primary" />
          <span className="hidden sm:inline">LoveNest</span>
        </Link>
        <div className="glass flex items-center gap-2 rounded-full px-3 py-1.5 text-xs sm:text-sm">
          <span
            className={cn(
              "size-2 rounded-full",
              connected
                ? "bg-success"
                : call.status === "error"
                  ? "bg-destructive"
                  : "bg-candle animate-pulse",
            )}
          />
          <span className="font-medium">{statusLabel}</span>
          {connected && <span className="tabular-nums text-muted-foreground">· {elapsed}</span>}
          {connected && call.latencyMs !== null && (
            <span className="hidden text-xs text-muted-foreground sm:inline-flex items-center gap-1">
              · <Wifi className="size-3" /> {call.latencyMs}ms
            </span>
          )}
          <span className="hidden text-muted-foreground md:inline">· {prettyRoomCode(code)}</span>
        </div>
        <div className="flex items-center gap-1">
          {/* Mood themes */}
          <div className="glass hidden items-center gap-0.5 rounded-full p-1 sm:flex">
            {MOODS.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setMood(id)}
                title={label}
                aria-label={label}
                className={cn(
                  "rounded-full p-1.5 transition [&_svg]:size-4",
                  mood === id
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon />
              </button>
            ))}
          </div>

          {/* Ambient Sound selector */}
          <div className="glass hidden items-center gap-0.5 rounded-full p-1 md:flex">
            {SOUNDS.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => handleSoundChange(id)}
                title={`Ambient: ${label}`}
                aria-label={`Ambient: ${label}`}
                className={cn(
                  "rounded-full p-1.5 transition [&_svg]:size-4",
                  sound === id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon />
              </button>
            ))}
          </div>

          <Button variant="glass" size="sm" onClick={copy}>
            {copied ? <Check /> : <Copy />} <span className="hidden sm:inline">Invite</span>
          </Button>
          <Button
            variant="glass"
            size="icon"
            onClick={togglePiP}
            title="Picture-in-Picture"
            aria-label="Picture-in-Picture"
            className="hidden sm:inline-flex"
          >
            <PictureInPicture2 />
          </Button>
          <Button
            variant="glass"
            size="icon"
            onClick={toggleFullscreen}
            aria-label="Fullscreen"
            className="hidden sm:inline-flex"
          >
            {fullscreen ? <Minimize2 /> : <Maximize2 />}
          </Button>
        </div>
      </header>

      {/* Stage */}
      <div className="relative z-10 flex min-h-0 flex-1 gap-3 p-3 sm:p-4">
        <div ref={videoTileRef} className="relative min-h-0 flex-1">
          {call.remoteStream || call.partner ? (
            <VideoTile
              stream={bigStream}
              name={swap ? name : (call.partner?.name ?? "Your love")}
              muted={swap}
              mirrored={swap}
              camOn={swap ? call.camOn : (call.partner?.camOn ?? true)}
              micOn={swap ? call.micOn : (call.partner?.micOn ?? true)}
              sharing={swap ? call.sharing : (call.partner?.sharing ?? false)}
              filter={swap ? filter : "none"}
              sticker={swap ? sticker : "none"}
              className="h-full w-full"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-5 rounded-3xl bg-stage/60 p-6 text-center ring-1 ring-border">
              <div className="relative">
                <span className="absolute inset-0 rounded-full bg-primary/40 animate-pulse-ring" />
                <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-warm-gradient shadow-glow">
                  <Heart className="size-10 fill-rose-foreground text-rose-foreground" />
                </div>
              </div>
              <div>
                <h2 className="font-display text-2xl sm:text-3xl">
                  {call.status === "error" ? "Hmm, connection trouble" : "Waiting for her to join…"}
                </h2>
                <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
                  {call.error ??
                    "Send her the invite link. The moment she opens it, you'll both be connected — no sign-up needed."}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button variant="hero" onClick={copy}>
                  {copied ? <Check /> : <Copy />} Copy invite link
                </Button>
                {call.status === "error" && (
                  <Button variant="glass" onClick={() => window.location.reload()}>
                    Try again
                  </Button>
                )}
              </div>
              <p className="max-w-xs break-all text-xs text-muted-foreground">{inviteLink}</p>
            </div>
          )}

          {/* Local PiP */}
          {(call.remoteStream || call.partner) && (
            <button
              onClick={() => setSwap((v) => !v)}
              className="absolute bottom-3 right-3 w-[30vw] max-w-[220px] min-w-[110px] cursor-pointer transition hover:scale-[1.03] sm:bottom-4 sm:right-4 z-20"
              title="Swap views"
            >
              <VideoTile
                stream={smallStream}
                name={swap ? (call.partner?.name ?? "Your love") : "You"}
                muted={!swap}
                mirrored={!swap}
                camOn={swap ? (call.partner?.camOn ?? true) : call.camOn}
                micOn={swap ? (call.partner?.micOn ?? true) : call.micOn}
                sharing={swap ? (call.partner?.sharing ?? false) : call.sharing}
                filter={!swap ? filter : "none"}
                sticker={!swap ? sticker : "none"}
                size="pip"
                className="aspect-[4/3] w-full"
              />
            </button>
          )}
          {!(call.remoteStream || call.partner) && call.previewStream && (
            <div className="absolute bottom-3 right-3 w-[30vw] max-w-[220px] min-w-[110px] sm:bottom-4 sm:right-4 z-20">
              <VideoTile
                stream={call.previewStream}
                name="You"
                muted
                mirrored
                camOn={call.camOn}
                micOn={call.micOn}
                sharing={call.sharing}
                filter={filter}
                sticker={sticker}
                size="pip"
                className="aspect-[4/3] w-full"
              />
            </div>
          )}
        </div>

        <SidePanel
          open={panelOpen}
          tab={tab}
          onTabChange={setTab}
          onClose={() => setPanelOpen(false)}
          messages={call.messages}
          onSend={call.sendChat}
          notes={call.notes}
          onNotesChange={call.setNotes}
          partnerName={call.partner?.name ?? null}
          myName={name}
        />
      </div>

      {/* Controls */}
      <footer className="relative z-20 flex items-center justify-center gap-2 px-3 pb-4 sm:gap-3 sm:pb-5">
        <Button
          variant={call.micOn ? "control" : "controlOff"}
          size="control"
          onClick={call.toggleMic}
          disabled={!stream}
          aria-label={call.micOn ? "Mute" : "Unmute"}
        >
          {call.micOn ? <Mic /> : <MicOff />}
        </Button>
        <Button
          variant={call.camOn ? "control" : "controlOff"}
          size="control"
          onClick={call.toggleCam}
          disabled={!stream?.getVideoTracks().length}
          aria-label={call.camOn ? "Camera off" : "Camera on"}
        >
          {call.camOn ? <Video /> : <VideoOff />}
        </Button>
        <Button
          variant={call.sharing ? "controlActive" : "control"}
          size="control"
          onClick={toggleShare}
          aria-label={call.sharing ? "Stop sharing" : "Share screen"}
          className="hidden sm:inline-flex"
        >
          {call.sharing ? <MonitorX /> : <MonitorUp />}
        </Button>

        {/* Video Filters & AR Stickers popover */}
        <div className="relative">
          {showFilters && (
            <div className="glass-strong absolute bottom-16 left-1/2 -translate-x-1/2 flex flex-col gap-3 rounded-2xl p-3 shadow-soft min-w-[280px] z-50 animate-in fade-in zoom-in-90 duration-200">
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  🎨 Video Filters
                </p>
                <div className="grid grid-cols-3 gap-1">
                  {FILTERS.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setFilter(f.id)}
                      className={cn(
                        "rounded-xl px-2 py-1.5 text-xs text-center font-medium transition",
                        filter === f.id
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary/60 hover:bg-accent text-secondary-foreground",
                      )}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  ✨ Fun AR Stickers
                </p>
                <div className="grid grid-cols-3 gap-1">
                  {STICKERS.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setSticker(s.id)}
                      className={cn(
                        "rounded-xl px-2 py-1.5 text-xs text-center font-medium transition",
                        sticker === s.id
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary/60 hover:bg-accent text-secondary-foreground",
                      )}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          <Button
            variant={filter !== "none" || sticker !== "none" ? "controlActive" : "control"}
            size="control"
            onClick={() => {
              setShowFilters((v) => !v);
              setShowReactions(false);
            }}
            aria-label="Video filters and AR stickers"
            title="Video filters & AR stickers"
          >
            <Wand2 />
          </Button>
        </div>

        {/* Heart / Emoji reaction button & popover */}
        <div className="relative">
          {showReactions && (
            <div className="glass-strong absolute bottom-16 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-full p-2 shadow-soft animate-in fade-in zoom-in-90 duration-200">
              {EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => {
                    call.sendHeart(emoji);
                    setShowReactions(false);
                  }}
                  className="flex h-10 w-10 items-center justify-center rounded-full text-xl transition hover:scale-125 hover:bg-accent"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
          <Button
            variant="controlLove"
            size="control"
            onClick={() => {
              call.sendHeart();
              setShowReactions((v) => !v);
              setShowFilters(false);
            }}
            aria-label="Send reaction"
          >
            <Heart className="fill-current" />
          </Button>
        </div>

        <div className="relative">
          <Button
            variant={panelOpen && tab === "chat" ? "controlActive" : "control"}
            size="control"
            onClick={() => openPanel("chat")}
            aria-label="Chat"
          >
            <MessageCircleHeart />
          </Button>
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-bold text-primary-foreground">
              {unread}
            </span>
          )}
        </div>
        <Button
          variant={panelOpen && tab === "notes" ? "controlActive" : "control"}
          size="control"
          onClick={() => openPanel("notes")}
          aria-label="Shared notes"
        >
          <NotebookPen />
        </Button>
        <Button
          variant="controlOff"
          size="control"
          onClick={call.leave}
          aria-label="Leave"
          className="ml-2 sm:ml-4 sm:w-16"
        >
          <PhoneOff />
        </Button>
      </footer>
    </div>
  );
}
