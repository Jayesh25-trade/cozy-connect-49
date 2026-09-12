import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Lobby } from "@/components/room/Lobby";
import { CallRoom } from "@/components/room/CallRoom";
import { normalizeRoomCode, prettyRoomCode } from "@/lib/room-codes";

export const Route = createFileRoute("/room/$code")({
  head: ({ params }) => {
    const title = `${prettyRoomCode(params.code)} · LoveNest private room`;
    const description =
      "You've been invited to a private video room. Free, no sign-up, no time limit — just the two of you.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "robots", content: "noindex" },
      ],
    };
  },
  component: RoomPage,
});

type JoinState = { name: string; stream: MediaStream | null; micOn: boolean; camOn: boolean };

function RoomPage() {
  const { code: raw } = Route.useParams();
  const code = normalizeRoomCode(raw);
  const [joined, setJoined] = useState<JoinState | null>(null);

  if (!joined) return <Lobby code={code} onJoin={setJoined} />;

  return (
    <CallRoom
      code={code}
      name={joined.name}
      stream={joined.stream}
      micOn={joined.micOn}
      camOn={joined.camOn}
    />
  );
}
