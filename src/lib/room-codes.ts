const WORDS = [
  "moon",
  "lantern",
  "velvet",
  "honey",
  "ember",
  "petal",
  "cocoa",
  "starlit",
  "cinnamon",
  "blossom",
  "amber",
  "dusk",
  "whisper",
  "willow",
  "cloud",
  "maple",
  "rose",
  "candle",
  "snug",
  "meadow",
  "peach",
  "linen",
  "firefly",
  "harbor",
];

export function generateRoomCode(): string {
  const pick = () => WORDS[Math.floor(Math.random() * WORDS.length)];
  const a = pick();
  let b = pick();
  while (b === a) b = pick();
  const n = Math.floor(10 + Math.random() * 90);
  return `${a}-${b}-${n}`;
}

/** Accepts a raw code or a full invite link and returns the clean code. */
export function normalizeRoomCode(input: string): string {
  if (!input) return "";
  let s = input.trim();
  try {
    if (/^https?:\/\//i.test(s)) {
      const u = new URL(s);
      const queryCode = u.searchParams.get("room") || u.searchParams.get("code");
      if (queryCode) {
        s = queryCode;
      } else {
        s = u.pathname.split("/").filter(Boolean).pop() ?? "";
      }
    }
  } catch {
    /* not a URL */
  }
  if (s.includes("room=")) {
    const m = s.match(/room=([a-zA-Z0-9_-]+)/);
    if (m && m[1]) s = m[1];
  }
  return s
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function prettyRoomCode(code: string): string {
  return code
    .split("-")
    .map((p) => (p ? p.charAt(0).toUpperCase() + p.slice(1) : p))
    .join(" · ");
}
