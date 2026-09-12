import { useEffect, useState } from "react";
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
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useCoupleCall } from "@/hooks/useCoupleCall";
import { prettyRoomCode } from "@/lib/room-codes";
import { cn } from "@/lib/utils";
import { VideoTile } from "./VideoTile";
import { HeartsOverlay } from "./HeartsOverlay";
import { SidePanel, type PanelTab } from "./SidePanel";

type Mood = "candle" | "moon" | "dusk";
const MOODS: { id: Mood; label: string; Icon: typeof Flame }[] = [
  { id: "candle", label: "Candlelight", Icon: Flame },
  { id: "moon", label: "Moonlight", Icon: Moon },
  { id: "dusk", label: "Sunset", Icon: Sunset },
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
  const [copied, setCopied] = useState(false);
  const [elapsed, setElapsed] = useState("00:00");
  const [fullscreen, setFullscreen] = useState(false);
  const [swap, setSwap] = useState(false);

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

  // Partner joined/left toasts
  const partnerName = call.partner?.name ?? null;
  useEffect(() => {
    if (partnerName) toast(`${partnerName} is here 💗`);
  }, [partnerName]);

  useEffect(() => {
    if (call.status === "ended") navigate({ to: "/", search: { left: "1" } as never });
  }, [call.status, navigate]);

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

  const openPanel = (t: PanelTab) => {
    if (panelOpen && tab === t) setPanelOpen(false);
    else {
      setTab(t);
      setPanelOpen(true);
    }
  };

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
              connected ? "bg-success" : call.status === "error" ? "bg-destructive" : "bg-candle animate-pulse",
            )}
          />
          <span className="font-medium">{statusLabel}</span>
          {connected && <span className="tabular-nums text-muted-foreground">· {elapsed}</span>}
          <span className="hidden text-muted-foreground md:inline">· {prettyRoomCode(code)}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="glass hidden items-center gap-0.5 rounded-full p-1 sm:flex">
            {MOODS.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setMood(id)}
                title={label}
                aria-label={label}
                className={cn(
                  "rounded-full p-1.5 transition [&_svg]:size-4",
                  mood === id ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon />
              </button>
            ))}
          </div>
          <Button variant="glass" size="sm" onClick={copy}>
            {copied ? <Check /> : <Copy />} <span className="hidden sm:inline">Invite</span>
          </Button>
          <Button variant="glass" size="icon" onClick={toggleFullscreen} aria-label="Fullscreen" className="hidden sm:inline-flex">
            {fullscreen ? <Minimize2 /> : <Maximize2 />}
          </Button>
        </div>
      </header>

      {/* Stage */}
      <div className="relative z-10 flex min-h-0 flex-1 gap-3 p-3 sm:p-4">
        <div className="relative min-h-0 flex-1">
          {call.remoteStream || call.partner ? (
            <VideoTile
              stream={bigStream}
              name={swap ? name : (call.partner?.name ?? "Your love")}
              muted={swap}
              mirrored={swap}
              camOn={swap ? call.camOn : (call.partner?.camOn ?? true)}
              micOn={swap ? call.micOn : (call.partner?.micOn ?? true)}
              sharing={swap ? call.sharing : call.partner?.sharing}
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
              className="absolute bottom-3 right-3 w-[30vw] max-w-[220px] min-w-[110px] cursor-pointer transition hover:scale-[1.03] sm:bottom-4 sm:right-4"
              title="Swap views"
            >
              <VideoTile
                stream={smallStream}
                name={swap ? (call.partner?.name ?? "Your love") : "You"}
                muted={!swap}
                mirrored={!swap}
                camOn={swap ? (call.partner?.camOn ?? true) : call.camOn}
                micOn={swap ? (call.partner?.micOn ?? true) : call.micOn}
                sharing={swap ? call.partner?.sharing : call.sharing}
                size="pip"
                className="aspect-[4/3] w-full"
              />
            </button>
          )}
          {!(call.remoteStream || call.partner) && call.previewStream && (
            <div className="absolute bottom-3 right-3 w-[30vw] max-w-[220px] min-w-[110px] sm:bottom-4 sm:right-4">
              <VideoTile
                stream={call.previewStream}
                name="You"
                muted
                mirrored
                camOn={call.camOn}
                micOn={call.micOn}
                sharing={call.sharing}
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
        <Button variant="controlLove" size="control" onClick={call.sendHeart} aria-label="Send a heart">
          <Heart className="fill-current" />
        </Button>
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
        <Button variant="controlOff" size="control" onClick={call.leave} aria-label="Leave" className="ml-2 sm:ml-4 sm:w-16">
          <PhoneOff />
        </Button>
      </footer>
    </div>
  );
}
