"use client";

import { io } from "socket.io-client";

const url = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:4000";

export const socket = io(url, {
  autoConnect: false
});
