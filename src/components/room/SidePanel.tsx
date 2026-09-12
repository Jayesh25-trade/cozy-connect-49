import { useEffect, useRef, useState } from "react";
import { MessageCircleHeart, NotebookPen, SendHorizonal, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ChatMessage } from "@/hooks/useCoupleCall";
import { cn } from "@/lib/utils";

export type PanelTab = "chat" | "notes";

type Props = {
  open: boolean;
  tab: PanelTab;
  onTabChange: (t: PanelTab) => void;
  onClose: () => void;
  messages: ChatMessage[];
  onSend: (text: string) => void;
  notes: string;
  onNotesChange: (text: string) => void;
  partnerName: string | null;
  myName: string;
};

const QUICK = ["miss you 💗", "you look cute", "hehe", "brb 2 min", "love you ✨", "kiss 💋"];

const NOTE_TEMPLATES = [
  { label: "🎬 Movies", text: "🎬 Movies to Watch Together:\n• \n• \n" },
  { label: "🍝 Date Ideas", text: "🍝 Romantic Date Ideas:\n• Candlelight dinner\n• Stargazing\n" },
  { label: "💌 Dreams", text: "💌 Dreams & Goals:\n• \n" },
];

export function SidePanel({
  open,
  tab,
  onTabChange,
  onClose,
  messages,
  onSend,
  notes,
  onNotesChange,
  partnerName,
  myName,
}: Props) {
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, open, tab]);

  const submit = () => {
    if (!draft.trim()) return;
    onSend(draft);
    setDraft("");
  };

  const words = notes.trim() ? notes.trim().split(/\s+/).length : 0;
  const chars = notes.length;

  return (
    <aside
      className={cn(
        "glass-strong absolute inset-y-3 right-3 z-40 flex w-[min(92vw,380px)] flex-col overflow-hidden rounded-3xl transition-all duration-300 lg:relative lg:inset-auto lg:h-full lg:w-[380px] lg:shrink-0",
        open
          ? "translate-x-0 opacity-100"
          : "pointer-events-none translate-x-6 opacity-0 lg:hidden",
      )}
    >
      <header className="flex items-center gap-1 border-b border-border p-2">
        <TabButton active={tab === "chat"} onClick={() => onTabChange("chat")}>
          <MessageCircleHeart /> Chat
        </TabButton>
        <TabButton active={tab === "notes"} onClick={() => onTabChange("notes")}>
          <NotebookPen /> Our notes
        </TabButton>
        <Button
          variant="ghost"
          size="icon"
          className="ml-auto"
          onClick={onClose}
          aria-label="Close panel"
        >
          <X />
        </Button>
      </header>

      {tab === "chat" ? (
        <>
          <div ref={listRef} className="scrollbar-thin flex-1 space-y-2 overflow-y-auto p-3">
            {messages.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
                <MessageCircleHeart className="size-8 text-primary/70" />
                <p>
                  Messages stay just between you two.
                  <br />
                  Nothing is saved anywhere.
                </p>
              </div>
            )}
            {messages.map((m) => (
              <div
                key={m.id}
                className={cn("flex flex-col", m.from === "me" ? "items-end" : "items-start")}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed",
                    m.from === "me"
                      ? "rounded-br-md bg-primary text-primary-foreground"
                      : "rounded-bl-md bg-secondary text-secondary-foreground",
                  )}
                >
                  {m.text}
                </div>
                <span className="mt-0.5 px-1 text-[10px] text-muted-foreground">
                  {m.from === "me" ? myName || "You" : partnerName || "Them"} ·{" "}
                  {new Date(m.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            ))}
          </div>
          <div className="scrollbar-thin flex gap-1.5 overflow-x-auto px-3 pb-2">
            {QUICK.map((q) => (
              <button
                key={q}
                onClick={() => onSend(q)}
                className="shrink-0 rounded-full bg-secondary px-3 py-1 text-xs text-secondary-foreground transition hover:bg-accent"
              >
                {q}
              </button>
            ))}
          </div>
          <form
            className="flex items-center gap-2 border-t border-border p-2"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={`Message ${partnerName ?? "your love"}…`}
              className="h-10 flex-1 rounded-full bg-input/60 px-4 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
            />
            <Button type="submit" size="icon" variant="hero" aria-label="Send">
              <SendHorizonal />
            </Button>
          </form>
        </>
      ) : (
        <div className="flex flex-1 flex-col p-3 gap-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Shared notepad — syncs live between both of you.
            </p>
            {notes && (
              <button
                onClick={() => onNotesChange("")}
                className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1"
                title="Clear notes"
              >
                <Trash2 className="size-3" /> Clear
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {NOTE_TEMPLATES.map((t) => (
              <button
                key={t.label}
                onClick={() => onNotesChange(notes ? `${notes}\n\n${t.text}` : t.text)}
                className="shrink-0 rounded-full bg-secondary px-2.5 py-1 text-xs text-secondary-foreground hover:bg-accent transition"
              >
                + {t.label}
              </button>
            ))}
          </div>

          <textarea
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder={
              "🎬 Movies to watch together\n🍝 Date ideas\n💌 Things I want to tell you…"
            }
            className="scrollbar-thin flex-1 resize-none rounded-2xl bg-input/40 p-4 font-sans text-sm leading-relaxed outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
          />

          <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
            <span>Live Sync Active</span>
            <span>
              {words} words · {chars} chars
            </span>
          </div>
        </div>
      )}
    </aside>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition [&_svg]:size-4",
        active
          ? "bg-foreground text-background"
          : "text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
