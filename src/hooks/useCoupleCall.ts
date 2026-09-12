import { useCallback, useEffect, useRef, useState } from "react";
import type Peer from "peerjs";
import type { DataConnection, MediaConnection } from "peerjs";

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

export type Heart = { id: string; x: number; mine: boolean };

type Wire =
  | { t: "hello"; name: string; micOn: boolean; camOn: boolean; hasMedia: boolean }
  | { t: "chat"; id: string; text: string; at: number }
  | { t: "notes"; text: string }
  | { t: "heart" }
  | { t: "state"; micOn: boolean; camOn: boolean; sharing: boolean }
  | { t: "bye" };

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
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
  {
    urls: "turn:openrelay.metered.ca:443?transport=tcp",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
];

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

  const pushHeart = useCallback((mine: boolean) => {
    const h: Heart = { id: uid(), x: 8 + Math.random() * 84, mine };
    setHearts((prev) => [...prev.slice(-30), h]);
    setTimeout(() => setHearts((prev) => prev.filter((x) => x.id !== h.id)), 3300);
  }, []);

  useEffect(() => {
    if (!code) return;
    let cancelled = false;
    let currentPeer: Peer | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    const hostId = `lovenest-${code}-host`;

    const setPeerStatus = (s: CallStatus) => {
      if (!cancelled && !endedRef.current) setStatus(s);
    };

    const partnerLeft = (role: "host" | "guest") => {
      setRemoteStream(null);
      setPartner(null);
      setConnectedAt(null);
      connRef.current = null;
      callRef.current = null;
      if (role === "guest") {
        // Host left — take over the room so the link keeps working.
        currentPeer?.destroy();
        retryTimer = setTimeout(becomeHost, 1200);
      } else {
        setPeerStatus("waiting");
      }
    };

    const attachCall = (call: MediaConnection) => {
      callRef.current = call;
      call.on("stream", (rs) => {
        setRemoteStream(rs);
      });
      call.on("error", () => {
        /* handled by data close */
      });
    };

    const attachData = (conn: DataConnection, role: "host" | "guest", p: Peer) => {
      connRef.current = conn;
      conn.on("open", () => {
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
      });
      conn.on("data", (raw) => {
        const msg = raw as Wire;
        switch (msg.t) {
          case "hello":
            setPartner({ name: msg.name || "Your love", micOn: msg.micOn, camOn: msg.camOn, sharing: false });
            setPeerStatus("connected");
            // If the guest has no camera/mic, the host initiates media so the guest can still see us.
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
            pushHeart(false);
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
      p.on("open", () => {
        if (role === "host") {
          setPeerStatus("waiting");
        } else {
          const conn = p.connect(hostId, { reliable: true, metadata: { name: stateRef.current.name } });
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
        if (type === "unavailable-id" && role === "host") {
          p.destroy();
          becomeGuest();
          return;
        }
        if (type === "peer-unavailable" && role === "guest") {
          p.destroy();
          retryTimer = setTimeout(becomeHost, 800);
          return;
        }
        if (type === "network" || type === "server-error" || type === "socket-error" || type === "socket-closed") {
          setError("Couldn't reach the connection service. Check your internet and try again.");
          setPeerStatus("error");
        }
      });
      p.on("disconnected", () => {
        if (!p.destroyed && !cancelled) {
          try {
            p.reconnect();
          } catch {
            /* ignore */
          }
        }
      });
    };

    async function becomeHost() {
      if (cancelled) return;
      const { default: PeerCtor } = await import("peerjs");
      if (cancelled) return;
      setPeerStatus("connecting");
      bind(new PeerCtor(hostId, { config: { iceServers: ICE_SERVERS } }), "host");
    }

    async function becomeGuest() {
      if (cancelled) return;
      const { default: PeerCtor } = await import("peerjs");
      if (cancelled) return;
      setPeerStatus("connecting");
      bind(new PeerCtor({ config: { iceServers: ICE_SERVERS } }), "guest");
    }

    becomeHost();

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
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
    const sender = callRef.current?.peerConnection
      ?.getSenders()
      .find((s) => s.track?.kind === "video" || (!s.track && camTrack));
    if (sender && camTrack) sender.replaceTrack(camTrack).catch(() => {});
    setPreviewStream(stream);
    stateRef.current.sharing = false;
    setSharing(false);
    broadcastState();
  }, [stream, broadcastState]);

  const startShare = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getDisplayMedia) {
      throw new Error("Screen sharing isn't supported on this device or browser.");
    }
    const screen = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
    const track = screen.getVideoTracks()[0];
    screenStreamRef.current = screen;
    const pc = callRef.current?.peerConnection;
    const sender = pc?.getSenders().find((s) => s.track?.kind === "video");
    if (sender) {
      await sender.replaceTrack(track);
    } else if (pc) {
      pc.addTrack(track, screen);
    }
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

  const sendHeart = useCallback(() => {
    pushHeart(true);
    send({ t: "heart" });
  }, [pushHeart, send]);

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
