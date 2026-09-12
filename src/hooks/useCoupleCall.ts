import { useCallback, useEffect, useRef, useState } from "react";
import Peer, { type DataConnection, type MediaConnection } from "peerjs";
import { playHeartChime } from "@/lib/ambient-sound";

export type CallStatus = "connecting" | "waiting" | "connected" | "ended" | "error";

export type ChatMessage = {
  id: string;
  from: "me" | "partner";
  name: string;
  text: string;
  at: number;
};

export type PartnerState = {
  name: string;
  micOn: boolean;
  camOn: boolean;
  sharing: boolean;
};

export type Heart = { id: string; x: number; mine: boolean; emoji?: string | undefined };

type Wire =
  | { t: "hello"; name: string; micOn: boolean; camOn: boolean; hasMedia: boolean }
  | { t: "chat"; id: string; text: string; at: number }
  | { t: "notes"; text: string }
  | { t: "heart"; emoji?: string | undefined }
  | { t: "ping"; ts: number }
  | { t: "pong"; ts: number }
  | { t: "state"; micOn: boolean; camOn: boolean; sharing: boolean }
  | { t: "bye" };

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
  { urls: "stun:stun3.l.google.com:19302" },
  { urls: "stun:stun4.l.google.com:19302" },
  { urls: "stun:stun.cloudflare.com:3478" },
  { urls: "stun:global.stun.twilio.com:3478" },
  {
    urls: "turn:openrelay.metered.ca:80",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
  {
    urls: "turn:openrelay.metered.ca:443",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
];

/**
 * Optimize WebRTC Peer Connection Senders to prevent video lag, stuttering, and buffer bloat
 */
function optimizePeerConnection(pc: RTCPeerConnection | undefined, isSharing = false) {
  if (!pc) return;
  try {
    const senders = pc.getSenders();
    senders.forEach((sender) => {
      if (!sender.track) return;
      const params = sender.getParameters();
      if (!params.encodings || params.encodings.length === 0) {
        params.encodings = [{}];
      }
      const enc = params.encodings[0];
      if (!enc) return;

      if (sender.track.kind === "video") {
        // Cap video bitrate to prevent congestion: 2.5 Mbps for screen share, 1.5 Mbps for camera
        enc.maxBitrate = isSharing ? 2500000 : 1500000;
        enc.maxFramerate = 30;
        // Maintain framerate over resolution to ensure 0 lag / stuttering
        params.degradationPreference = "maintain-framerate";
        sender.setParameters(params).catch(() => {});
      } else if (sender.track.kind === "audio") {
        // High quality clear audio (96 kbps)
        enc.maxBitrate = 96000;
        sender.setParameters(params).catch(() => {});
      }
    });
  } catch {
    /* ignore unsupported browser params */
  }
}

const uid = () => Math.random().toString(36).slice(2, 10);

type Options = {
  code: string;
  name: string;
  stream: MediaStream | null;
  initialMicOn: boolean;
  initialCamOn: boolean;
};

export function useCoupleCall({ code, name, stream, initialMicOn, initialCamOn }: Options) {
  const [status, setStatus] = useState<CallStatus>("connecting");
  const [error, setError] = useState<string | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [partner, setPartner] = useState<PartnerState | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [notes, setNotesState] = useState("");
  const [micOn, setMicOn] = useState(initialMicOn);
  const [camOn, setCamOn] = useState(initialCamOn);
  const [sharing, setSharing] = useState(false);
  const [hearts, setHearts] = useState<Heart[]>([]);
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(stream);
  const [connectedAt, setConnectedAt] = useState<number | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);

  const peerRef = useRef<Peer | null>(null);
  const connRef = useRef<DataConnection | null>(null);
  const callRef = useRef<MediaConnection | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const stateRef = useRef({ micOn: initialMicOn, camOn: initialCamOn, sharing: false, name });
  const notesTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const endedRef = useRef(false);

  stateRef.current.name = name;

  const send = useCallback((msg: Wire) => {
    const c = connRef.current;
    if (c && c.open) {
      try {
        c.send(msg);
      } catch {
        /* ignore */
      }
    }
  }, []);

  const pushHeart = useCallback((mine: boolean, emoji?: string) => {
    playHeartChime();
    const h: Heart = { id: uid(), x: 8 + Math.random() * 84, mine, ...(emoji ? { emoji } : {}) };
    setHearts((prev) => [...prev.slice(-30), h]);
    setTimeout(() => setHearts((prev) => prev.filter((x) => x.id !== h.id)), 3300);
  }, []);

  useEffect(() => {
    if (!code) return;
    let cancelled = false;
    let currentPeer: Peer | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let pingInterval: ReturnType<typeof setInterval> | null = null;
    let retryAttempts = 0;
    const MAX_RETRIES = 5;
    const hostId = `lovenest-${code}-host`;

    const setPeerStatus = (s: CallStatus) => {
      if (!cancelled && !endedRef.current) setStatus(s);
    };

    const partnerLeft = (role: "host" | "guest") => {
      setRemoteStream(null);
      setPartner(null);
      setConnectedAt(null);
      setLatencyMs(null);
      connRef.current = null;
      callRef.current = null;
      if (pingInterval) clearInterval(pingInterval);
      if (role === "guest" && !cancelled && !endedRef.current) {
        currentPeer?.destroy();
        retryTimer = setTimeout(becomeHost, 1500);
      } else {
        setPeerStatus("waiting");
      }
    };

    const attachCall = (call: MediaConnection) => {
      callRef.current = call;
      call.on("stream", (rs) => {
        setRemoteStream(rs);
      });
      // Optimize peer connection encoding parameters to eliminate lag
      setTimeout(() => {
        optimizePeerConnection(call.peerConnection, false);
      }, 500);
      call.on("error", () => {
        /* handled by data close */
      });
    };

    const attachData = (conn: DataConnection, role: "host" | "guest", p: Peer) => {
      connRef.current = conn;
      conn.on("open", () => {
        retryAttempts = 0;
        const s = stateRef.current;
        const msg: Wire = {
          t: "hello",
          name: s.name,
          micOn: s.micOn,
          camOn: s.camOn,
          hasMedia: !!stream,
        };
        conn.send(msg);
        setPeerStatus("connected");
        setConnectedAt(Date.now());

        if (pingInterval) clearInterval(pingInterval);
        pingInterval = setInterval(() => {
          if (connRef.current?.open) {
            connRef.current.send({ t: "ping", ts: Date.now() });
          }
        }, 4000);
      });

      conn.on("data", (raw) => {
        const msg = raw as Wire;
        switch (msg.t) {
          case "hello":
            setPartner({
              name: msg.name || "Your love",
              micOn: msg.micOn,
              camOn: msg.camOn,
              sharing: false,
            });
            setPeerStatus("connected");
            if (role === "host" && !msg.hasMedia && stream && !callRef.current) {
              attachCall(p.call(conn.peer, stream, { metadata: { name: stateRef.current.name } }));
            }
            break;
          case "chat":
            setMessages((prev) => [
              ...prev,
              { id: msg.id, from: "partner", name: "", text: msg.text, at: msg.at },
            ]);
            break;
          case "notes":
            setNotesState(msg.text);
            break;
          case "heart":
            pushHeart(false, msg.emoji);
            break;
          case "ping":
            send({ t: "pong", ts: msg.ts });
            break;
          case "pong":
            setLatencyMs(Math.max(1, Date.now() - msg.ts));
            break;
          case "state":
            setPartner((prev) => ({
              name: prev?.name ?? "Your love",
              micOn: msg.micOn,
              camOn: msg.camOn,
              sharing: msg.sharing,
            }));
            break;
          case "bye":
            partnerLeft(role);
            break;
        }
      });
      conn.on("close", () => partnerLeft(role));
      conn.on("error", () => partnerLeft(role));
    };

    const bind = (p: Peer, role: "host" | "guest") => {
      currentPeer = p;
      peerRef.current = p;
      let connectTimeout: ReturnType<typeof setTimeout> | null = setTimeout(() => {
        if (!cancelled && !endedRef.current && !connRef.current && role === "host") {
          setPeerStatus("waiting");
        }
      }, 6000);

      p.on("open", () => {
        if (connectTimeout) clearTimeout(connectTimeout);
        retryAttempts = 0;
        if (role === "host") {
          setPeerStatus("waiting");
        } else {
          const conn = p.connect(hostId, {
            reliable: true,
            metadata: { name: stateRef.current.name },
          });
          attachData(conn, role, p);
          if (stream) {
            attachCall(p.call(hostId, stream, { metadata: { name: stateRef.current.name } }));
          }
        }
      });
      p.on("connection", (conn) => attachData(conn, role, p));
      p.on("call", (call) => {
        call.answer(stream ?? undefined);
        attachCall(call);
      });
      p.on("error", (err) => {
        const type = (err as { type?: string }).type;

        if (cancelled || endedRef.current) return;

        if (type === "unavailable-id" && role === "host") {
          p.destroy();
          becomeGuest();
          return;
        }

        if (type === "peer-unavailable" && role === "guest") {
          p.destroy();
          if (retryAttempts < MAX_RETRIES) {
            retryAttempts++;
            const backoff = Math.min(800 * retryAttempts, 3000);
            retryTimer = setTimeout(becomeHost, backoff);
          } else {
            setError("Partner is not online yet. Share the invite link with her.");
            setPeerStatus("waiting");
          }
          return;
        }

        if (
          type === "network" ||
          type === "server-error" ||
          type === "socket-error" ||
          type === "socket-closed"
        ) {
          if (retryAttempts < MAX_RETRIES) {
            retryAttempts++;
            retryTimer = setTimeout(role === "host" ? becomeHost : becomeGuest, 3000);
          } else {
            setError("Couldn't reach connection service. Check internet and refresh.");
            setPeerStatus("error");
          }
        }
      });
      p.on("disconnected", () => {
        if (!p.destroyed && !cancelled && !endedRef.current) {
          try {
            p.reconnect();
          } catch {
            /* ignore */
          }
        }
      });
    };

    function becomeHost() {
      if (cancelled || endedRef.current) return;
      setPeerStatus("connecting");
      bind(new Peer(hostId, { config: { iceServers: ICE_SERVERS } }), "host");
    }

    function becomeGuest() {
      if (cancelled || endedRef.current) return;
      setPeerStatus("connecting");
      bind(new Peer({ config: { iceServers: ICE_SERVERS } }), "guest");
    }

    becomeHost();

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      if (pingInterval) clearInterval(pingInterval);
      try {
        connRef.current?.send({ t: "bye" } satisfies Wire);
      } catch {
        /* ignore */
      }
      currentPeer?.destroy();
      peerRef.current = null;
      connRef.current = null;
      callRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const broadcastState = useCallback(() => {
    const s = stateRef.current;
    send({ t: "state", micOn: s.micOn, camOn: s.camOn, sharing: s.sharing });
  }, [send]);

  const toggleMic = useCallback(() => {
    const next = !stateRef.current.micOn;
    stream?.getAudioTracks().forEach((t) => (t.enabled = next));
    stateRef.current.micOn = next;
    setMicOn(next);
    broadcastState();
  }, [stream, broadcastState]);

  const toggleCam = useCallback(() => {
    const next = !stateRef.current.camOn;
    stream?.getVideoTracks().forEach((t) => (t.enabled = next));
    stateRef.current.camOn = next;
    setCamOn(next);
    broadcastState();
  }, [stream, broadcastState]);

  const stopShare = useCallback(() => {
    const screen = screenStreamRef.current;
    if (!screen) return;
    screen.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;
    const camTrack = stream?.getVideoTracks()[0] ?? null;
    const pc = callRef.current?.peerConnection;
    const senders = pc?.getSenders() ?? [];
    const sender = senders.find((s) => s.track?.kind === "video" || (!s.track && camTrack));
    if (sender && camTrack) sender.replaceTrack(camTrack).catch(() => {});
    optimizePeerConnection(pc, false);
    setPreviewStream(stream);
    stateRef.current.sharing = false;
    setSharing(false);
    broadcastState();
  }, [stream, broadcastState]);

  const startShare = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getDisplayMedia) {
      throw new Error("Screen sharing isn't supported on this device or browser.");
    }
    const screen = await navigator.mediaDevices.getDisplayMedia({
      video: {
        width: { max: 1920, ideal: 1280 },
        height: { max: 1080, ideal: 720 },
        frameRate: { max: 30, ideal: 30 },
      },
      audio: false,
    });
    const track = screen.getVideoTracks()[0];
    if (!track) return;
    screenStreamRef.current = screen;
    const pc = callRef.current?.peerConnection;
    const senders = pc?.getSenders() ?? [];
    const sender = senders.find((s) => s.track?.kind === "video");
    if (sender) {
      await sender.replaceTrack(track);
    } else if (pc) {
      pc.addTrack(track, screen);
    }
    optimizePeerConnection(pc, true);
    track.onended = () => stopShare();
    setPreviewStream(screen);
    stateRef.current.sharing = true;
    setSharing(true);
    broadcastState();
  }, [stopShare, broadcastState]);

  const sendChat = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      const msg = { id: uid(), text: trimmed, at: Date.now() };
      setMessages((prev) => [...prev, { ...msg, from: "me", name: stateRef.current.name }]);
      send({ t: "chat", ...msg });
    },
    [send],
  );

  const setNotes = useCallback(
    (text: string) => {
      setNotesState(text);
      if (notesTimer.current) clearTimeout(notesTimer.current);
      notesTimer.current = setTimeout(() => send({ t: "notes", text }), 120);
    },
    [send],
  );

  const sendHeart = useCallback(
    (emoji?: string) => {
      pushHeart(true, emoji);
      if (emoji) {
        send({ t: "heart", emoji });
      } else {
        send({ t: "heart" });
      }
    },
    [pushHeart, send],
  );

  const leave = useCallback(() => {
    endedRef.current = true;
    send({ t: "bye" });
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    stream?.getTracks().forEach((t) => t.stop());
    setTimeout(() => peerRef.current?.destroy(), 150);
    setStatus("ended");
  }, [send, stream]);

  return {
    status,
    error,
    remoteStream,
    previewStream,
    partner,
    messages,
    notes,
    micOn,
    camOn,
    sharing,
    hearts,
    connectedAt,
    latencyMs,
    toggleMic,
    toggleCam,
    startShare,
    stopShare,
    sendChat,
    setNotes,
    sendHeart,
    leave,
  };
}
