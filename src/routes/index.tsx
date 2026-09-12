import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  Heart,
  Infinity as InfinityIcon,
  LockKeyhole,
  MessageCircleHeart,
  MonitorUp,
  NotebookPen,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateRoomCode, normalizeRoomCode } from "@/lib/room-codes";
import heroImg from "@/assets/hero-lanterns.jpg";

const TITLE = "LoveNest · Free private video calls for couples";
const DESC =
  "A cozy, private video room for two. Free forever, no time limit, no sign-up — video, voice, chat, screen share and a shared notepad, connected directly between your devices.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const FEATURES = [
  {
    Icon: LockKeyhole,
    title: "Truly private",
    text: "Direct device-to-device connection. No servers keep your video, chat or notes.",
  },
  {
    Icon: InfinityIcon,
    title: "No time limit",
    text: "Talk for 5 minutes or 5 hours. Nothing cuts you off. Free forever.",
  },
  {
    Icon: Video,
    title: "HD video & voice",
    text: "Crisp video, clear audio with echo and noise cleanup built in.",
  },
  {
    Icon: MessageCircleHeart,
    title: "Sweet little chat",
    text: "Text while you talk, send floating hearts, quick love notes.",
  },
  {
    Icon: MonitorUp,
    title: "Screen share",
    text: "Watch things together, show her that photo, plan a trip side by side.",
  },
  {
    Icon: NotebookPen,
    title: "Shared notepad",
    text: "A live notepad you both type in — movie lists, dreams, inside jokes.",
  },
];

function Index() {
  const navigate = useNavigate();
  const [joinCode, setJoinCode] = useState("");

  const createRoom = () => {
    const code = generateRoomCode();
    navigate({ to: "/room/$code", params: { code } });
  };

  const joinRoom = () => {
    const code = normalizeRoomCode(joinCode);
    if (!code) return;
    navigate({ to: "/room/$code", params: { code } });
  };

  return (
    <main className="ambient mood-candle min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6">
        <div className="flex items-center gap-2 font-display text-xl">
          <Heart className="size-5 fill-primary text-primary" /> LoveNest
        </div>
        <span className="glass rounded-full px-3 py-1 text-xs text-muted-foreground">
          free · private · unlimited
        </span>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 pb-16 pt-6 lg:grid-cols-[1.1fr_0.9fr] lg:pt-12">
        <div>
          <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
            <span className="size-1.5 rounded-full bg-success" /> Your own little corner of the
            internet
          </p>
          <h1 className="font-display text-5xl leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
            Video calls that feel like{" "}
            <span className="text-gradient-warm italic">being together.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            A cozy private room built for two. No accounts, no 40-minute cutoffs, no one in between.
            Create a room, send her the link, and you're face to face.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button variant="hero" size="xl" onClick={createRoom}>
              <Heart className="fill-current" /> Create our room
            </Button>
            <form
              className="glass flex h-14 items-center rounded-full pl-5 pr-1.5"
              onSubmit={(e) => {
                e.preventDefault();
                joinRoom();
              }}
            >
              <input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder="Paste a room link or code"
                className="w-44 bg-transparent text-sm outline-none placeholder:text-muted-foreground sm:w-52"
              />
              <Button
                type="submit"
                size="icon"
                variant="secondary"
                aria-label="Join room"
                className="h-11 w-11"
              >
                <ArrowRight />
              </Button>
            </form>
          </div>

          <p className="mt-4 text-xs text-muted-foreground">
            Works in any modern browser on phone or laptop. She just taps the link — no app to
            install.
          </p>
        </div>

        <div className="relative mx-auto w-full max-w-md">
          <div className="absolute -inset-6 rounded-[2.5rem] bg-warm-gradient opacity-25 blur-3xl animate-breathe" />
          <img
            src={heroImg}
            alt="Two glowing lanterns floating together under a crescent moon"
            width={1024}
            height={1024}
            className="relative aspect-square w-full rounded-[2rem] object-cover shadow-soft ring-1 ring-border"
          />
          <div className="glass-strong absolute -bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-2xl px-4 py-3 text-sm whitespace-nowrap">
            <span className="flex -space-x-2">
              <span className="flex size-8 items-center justify-center rounded-full bg-primary font-display text-primary-foreground ring-2 ring-background">
                U
              </span>
              <span className="flex size-8 items-center justify-center rounded-full bg-candle font-display text-candle-foreground ring-2 ring-background">
                H
              </span>
            </span>
            <span>
              <span className="font-semibold">Just you two</span>
              <span className="text-muted-foreground"> · end-to-end encrypted</span>
            </span>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-20">
        <h2 className="font-display text-3xl sm:text-4xl">
          Everything you need, nothing you don't.
        </h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ Icon, title, text }) => (
            <article key={title} className="glass rounded-3xl p-6 transition hover:bg-accent/60">
              <div className="mb-4 inline-flex rounded-2xl bg-warm-gradient p-2.5 text-rose-foreground">
                <Icon className="size-5" />
              </div>
              <h3 className="font-display text-xl">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-20">
        <div className="glass-strong grid gap-6 rounded-[2rem] p-8 sm:grid-cols-3 sm:p-10">
          {[
            [
              "1",
              "Create a room",
              "One tap. You get a sweet little room name like Moon · Lantern · 42.",
            ],
            [
              "2",
              "Send her the link",
              "Copy it into WhatsApp, iMessage, anywhere. No sign-up on her side.",
            ],
            ["3", "Be together", "Video, voice, chat, hearts, notes. Stay as long as you like."],
          ].map(([n, t, d]) => (
            <div key={n}>
              <span className="font-display text-4xl text-gradient-warm">{n}</span>
              <h3 className="mt-2 font-display text-xl">{t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-5 pb-10 text-center text-xs text-muted-foreground">
        <p>
          Made with love, for love. Video and messages travel directly between your two devices.
        </p>
      </footer>
    </main>
  );
}
