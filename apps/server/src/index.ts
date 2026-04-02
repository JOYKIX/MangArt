import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import { registerHandlers } from "./sockets/registerHandlers";
import { env } from "./config/env";

const app = express();
app.use(cors({ origin: env.clientUrl }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: env.clientUrl,
    methods: ["GET", "POST"]
  }
});

io.on("connection", (socket) => {
  registerHandlers(io, socket);
});

httpServer.listen(env.port, () => {
  console.log(`Server listening on http://localhost:${env.port}`);
});
