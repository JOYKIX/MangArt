"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { isValidUsername } from "@mangart/shared";
import { socket } from "../lib/socket";

export function HomeForm() {
  const [username, setUsername] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const baseConnect = () => {
    if (!socket.connected) socket.connect();
  };

  const createRoom = (event: FormEvent) => {
    event.preventDefault();
    if (!isValidUsername(username)) return setError("Username: 3-16 chars, letters/numbers/_-");
    baseConnect();
    socket.emit("room:create", { username });
    socket.once("room:joined", ({ roomCode: code }) => {
      localStorage.setItem("mangart_username", username);
      router.push(`/room/${code}`);
    });
    socket.once("room:error", ({ message }) => setError(message));
  };

  const joinRoom = () => {
    if (!isValidUsername(username)) return setError("Username invalid");
    if (!roomCode) return setError("Room code required");
    baseConnect();
    socket.emit("room:join", { username, roomCode: roomCode.toUpperCase() });
    socket.once("room:joined", ({ roomCode: code }) => {
      localStorage.setItem("mangart_username", username);
      router.push(`/room/${code}`);
    });
    socket.once("room:error", ({ message }) => setError(message));
  };

  return (
    <form onSubmit={createRoom} className="space-y-3 rounded-xl bg-white/10 p-6 backdrop-blur">
      <input
        className="w-full rounded bg-black/30 px-3 py-2"
        placeholder="Your ninja name"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <div className="flex gap-2">
        <input
          className="flex-1 rounded bg-black/30 px-3 py-2 uppercase"
          placeholder="Room code"
          value={roomCode}
          onChange={(e) => setRoomCode(e.target.value)}
        />
        <button type="button" onClick={joinRoom} className="rounded bg-neon px-4 py-2 font-bold text-ink">
          Join
        </button>
      </div>
      <button className="w-full rounded bg-sakura px-4 py-2 font-bold">Create private room</button>
      {error && <p className="text-sm text-red-300">{error}</p>}
    </form>
  );
}
