"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChatMessage, RoomState, SOCKET_EVENTS, StrokePayload } from "@mangart/shared";
import { socket } from "../../../lib/socket";
import { CanvasBoard } from "../../../components/CanvasBoard";
import { ChatPanel } from "../../../components/ChatPanel";
import { PlayersPanel } from "../../../components/PlayersPanel";

const initialState: RoomState = {
  roomCode: "",
  players: [],
  hostId: "",
  phase: "lobby",
  settings: { rounds: 3, roundDurationSec: 80, maxPlayers: 8 },
  round: { roundNumber: 0, turnNumber: 0, drawerId: null, chosenWord: null, maskedWord: "", startedAt: null, endsAt: null, hintsRevealed: 0 },
  chat: [],
  leaderboard: []
};

export default function RoomPage() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const router = useRouter();
  const [state, setState] = useState<RoomState>(initialState);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [wordChoices, setWordChoices] = useState<string[]>([]);
  const [timer, setTimer] = useState(0);
  const [remoteStroke, setRemoteStroke] = useState<StrokePayload | null>(null);
  const [clearSignal, setClearSignal] = useState(0);
  const me = useMemo(() => state.players.find((p) => p.id === socket.id), [state.players]);

  useEffect(() => {
    const username = localStorage.getItem("mangart_username");
    if (!username) {
      router.push("/");
      return;
    }
    if (!socket.connected) socket.connect();

    socket.emit(SOCKET_EVENTS.ROOM_JOIN, { roomCode: roomCode.toUpperCase(), username });

    socket.on(SOCKET_EVENTS.ROOM_JOINED, ({ state: nextState }) => setState(nextState));
    socket.on(SOCKET_EVENTS.ROOM_STATE, (nextState) => setState(nextState));
    socket.on(SOCKET_EVENTS.WORD_CHOICES, ({ words }) => setWordChoices(words));
    socket.on(SOCKET_EVENTS.CHAT_MESSAGE, (msg) => setMessages((prev) => [...prev.slice(-99), msg]));
    socket.on(SOCKET_EVENTS.ROOM_ERROR, ({ message }) => alert(message));
    socket.on(SOCKET_EVENTS.DRAW_STROKE, (stroke) => setRemoteStroke(stroke));
    socket.on(SOCKET_EVENTS.DRAW_CLEAR, () => setClearSignal((v) => v + 1));
    socket.on(SOCKET_EVENTS.ROUND_ENDED, ({ answer }) => {
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), playerId: "system", username: "System", content: `Round ended. Answer: ${answer}`, isSystem: true, timestamp: Date.now() }]);
    });

    return () => {
      socket.off();
      socket.emit(SOCKET_EVENTS.ROOM_LEAVE);
    };
  }, [roomCode, router]);

  useEffect(() => {
    if (state.round.endsAt) {
      const id = setInterval(() => {
        setTimer(Math.max(0, Math.floor((state.round.endsAt! - Date.now()) / 1000)));
      }, 250);
      return () => clearInterval(id);
    }
    setTimer(0);
  }, [state.round.endsAt]);

  const canDraw = me?.id === state.round.drawerId && state.phase === "drawing";

  return (
    <main className="mx-auto grid min-h-screen max-w-7xl gap-3 p-3 lg:grid-cols-[1fr,320px]">
      <section className="space-y-3">
        <header className="rounded-xl bg-white/10 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p>Room: <strong>{state.roomCode || roomCode}</strong></p>
            <p>Round {state.round.roundNumber}/{state.settings.rounds} · Time: {timer}s</p>
            <p>Word: {canDraw ? state.round.chosenWord ?? "Choose a word" : state.round.maskedWord || "..."}</p>
          </div>
          {state.phase === "lobby" && (
            <div className="mt-2 flex gap-2">
              <button className="rounded bg-sakura px-3 py-1" onClick={() => socket.emit(SOCKET_EVENTS.GAME_START)}>Start game</button>
            </div>
          )}
          {wordChoices.length > 0 && canDraw && state.phase === "wordPicking" && (
            <div className="mt-2 flex gap-2">
              {wordChoices.map((word) => (
                <button key={word} className="rounded bg-neon px-3 py-1 text-ink" onClick={() => socket.emit(SOCKET_EVENTS.WORD_PICKED, { word })}>{word}</button>
              ))}
            </div>
          )}
        </header>

        <CanvasBoard
          canDraw={Boolean(canDraw)}
          onStroke={(stroke) => socket.emit(SOCKET_EVENTS.DRAW_STROKE, stroke)}
          remoteStroke={remoteStroke}
          onClear={() => {
            setClearSignal((v) => v + 1);
            socket.emit(SOCKET_EVENTS.DRAW_CLEAR);
          }}
          clearSignal={clearSignal}
        />
      </section>

      <aside className="grid grid-rows-[auto,1fr] gap-3">
        <PlayersPanel players={state.players} />
        <ChatPanel messages={messages} onSend={(content) => socket.emit(SOCKET_EVENTS.CHAT_SEND, { content })} disabled={canDraw} />
      </aside>
    </main>
  );
}
