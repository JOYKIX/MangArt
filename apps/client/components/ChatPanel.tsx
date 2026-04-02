"use client";

import { ChatMessage } from "@mangart/shared";
import { FormEvent, useState } from "react";

interface Props {
  messages: ChatMessage[];
  onSend: (value: string) => void;
  disabled?: boolean;
}

export function ChatPanel({ messages, onSend, disabled }: Props) {
  const [input, setInput] = useState("");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!input.trim() || disabled) return;
    onSend(input);
    setInput("");
  };

  return (
    <section className="flex h-full flex-col rounded-xl bg-black/30 p-3">
      <h3 className="mb-2 text-lg font-bold">Guess Chat</h3>
      <div className="mb-2 flex-1 space-y-1 overflow-y-auto text-sm">
        {messages.map((msg) => (
          <p key={msg.id} className={msg.isSystem ? "text-neon" : msg.isCorrectGuess ? "text-green-300" : ""}>
            <strong>{msg.username}:</strong> {msg.content}
          </p>
        ))}
      </div>
      <form onSubmit={submit} className="flex gap-2">
        <input
          className="flex-1 rounded bg-black/40 px-2 py-1"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={disabled ? "Drawer cannot send guesses" : "Type your guess"}
          disabled={disabled}
        />
        <button className="rounded bg-sakura px-3 py-1" disabled={disabled}>Send</button>
      </form>
    </section>
  );
}
