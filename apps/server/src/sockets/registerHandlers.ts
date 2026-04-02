import { Server, Socket } from "socket.io";
import {
  SOCKET_EVENTS,
  ClientToServerEvents,
  ServerToClientEvents,
  CreateRoomPayload,
  JoinRoomPayload,
  ChatPayload,
  isValidRoomCode,
  isValidUsername
} from "@mangart/shared";
import { RoomManager } from "../game/RoomManager";

const roomManager = new RoomManager();

const avatars = ["🎌", "🖋️", "⚡", "🌸", "🔥", "🦊", "🌙"];

const safeEmitState = (io: Server, roomCode: string) => {
  io.to(roomCode).emit(SOCKET_EVENTS.ROOM_STATE, roomManager.getRoomState(roomCode));
};

export const registerHandlers = (
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  socket: Socket<ClientToServerEvents, ServerToClientEvents>
) => {
  socket.emit(SOCKET_EVENTS.CONNECTION_ACK, { playerId: socket.id });

  socket.on(SOCKET_EVENTS.ROOM_CREATE, (payload: CreateRoomPayload) => {
    try {
      if (!isValidUsername(payload.username)) throw new Error("Invalid username");
      const state = roomManager.createRoom(socket.id, payload.username, payload.avatar ?? avatars[Math.floor(Math.random() * avatars.length)], payload.settings);
      socket.join(state.roomCode);
      socket.emit(SOCKET_EVENTS.ROOM_JOINED, { roomCode: state.roomCode, playerId: socket.id, state });
      safeEmitState(io, state.roomCode);
    } catch (error) {
      socket.emit(SOCKET_EVENTS.ROOM_ERROR, { message: (error as Error).message });
    }
  });

  socket.on(SOCKET_EVENTS.ROOM_JOIN, (payload: JoinRoomPayload) => {
    try {
      if (!isValidRoomCode(payload.roomCode)) throw new Error("Invalid room code");
      if (!isValidUsername(payload.username)) throw new Error("Invalid username");
      const state = roomManager.joinRoom(socket.id, payload.roomCode.toUpperCase(), payload.username, payload.avatar ?? avatars[Math.floor(Math.random() * avatars.length)]);
      socket.join(state.roomCode);
      socket.emit(SOCKET_EVENTS.ROOM_JOINED, { roomCode: state.roomCode, playerId: socket.id, state });
      safeEmitState(io, state.roomCode);
    } catch (error) {
      socket.emit(SOCKET_EVENTS.ROOM_ERROR, { message: (error as Error).message });
    }
  });

  socket.on(SOCKET_EVENTS.SETTINGS_UPDATE, ({ settings }) => {
    try {
      roomManager.updateSettings(socket.id, settings);
      const roomCode = roomManager.getPlayerRoomCode(socket.id);
      if (roomCode) safeEmitState(io, roomCode);
    } catch (error) {
      socket.emit(SOCKET_EVENTS.ROOM_ERROR, { message: (error as Error).message });
    }
  });

  socket.on(SOCKET_EVENTS.GAME_START, () => {
    try {
      const state = roomManager.startGame(socket.id);
      io.to(state.roomCode).emit(SOCKET_EVENTS.GAME_START);
      io.to(state.roomCode).emit(SOCKET_EVENTS.TURN_STARTED, {
        drawerId: state.round.drawerId!,
        roundNumber: state.round.roundNumber,
        turnNumber: state.round.turnNumber,
        maskedWord: state.round.maskedWord
      });
      const drawerChoices = roomManager.getWordChoicesForDrawer(state.round.drawerId!);
      io.to(state.round.drawerId!).emit(SOCKET_EVENTS.WORD_CHOICES, { words: drawerChoices });
      safeEmitState(io, state.roomCode);
    } catch (error) {
      socket.emit(SOCKET_EVENTS.ROOM_ERROR, { message: (error as Error).message });
    }
  });

  socket.on(SOCKET_EVENTS.WORD_PICKED, ({ word }) => {
    try {
      const state = roomManager.pickWord(socket.id, word);
      io.to(state.roomCode).emit(SOCKET_EVENTS.TURN_STARTED, {
        drawerId: state.round.drawerId!,
        roundNumber: state.round.roundNumber,
        turnNumber: state.round.turnNumber,
        maskedWord: state.round.maskedWord
      });
      safeEmitState(io, state.roomCode);
    } catch (error) {
      socket.emit(SOCKET_EVENTS.ROOM_ERROR, { message: (error as Error).message });
    }
  });

  socket.on(SOCKET_EVENTS.CHAT_SEND, (payload: ChatPayload) => {
    try {
      const roomCode = roomManager.getPlayerRoomCode(socket.id);
      if (!roomCode) return;
      const state = roomManager.getRoomState(roomCode);
      const sender = state.players.find((p) => p.id === socket.id);
      if (!sender) return;

      const guessResult = roomManager.processGuess(socket.id, payload.content);
      if (!guessResult.sanitized) return;

      io.to(roomCode).emit(SOCKET_EVENTS.CHAT_MESSAGE, {
        id: crypto.randomUUID(),
        playerId: socket.id,
        username: sender.username,
        content: guessResult.sanitized,
        isSystem: false,
        timestamp: Date.now(),
        isCorrectGuess: guessResult.correct
      });

      if (guessResult.correct) {
        io.to(roomCode).emit(SOCKET_EVENTS.CHAT_MESSAGE, {
          id: crypto.randomUUID(),
          playerId: "system",
          username: "System",
          content: `${sender.username} guessed correctly (+${guessResult.points})`,
          isSystem: true,
          timestamp: Date.now()
        });
      }

      const newState = roomManager.getRoomState(roomCode);
      safeEmitState(io, roomCode);

      if (newState.phase === "roundEnd") {
        io.to(roomCode).emit(SOCKET_EVENTS.ROUND_ENDED, {
          answer: newState.round.chosenWord!,
          leaderboard: newState.leaderboard
        });
        setTimeout(() => {
          const progressed = roomManager.nextTurn(roomCode);
          if (progressed.phase === "gameEnd") {
            io.to(roomCode).emit(SOCKET_EVENTS.GAME_ENDED, { leaderboard: progressed.leaderboard });
          } else {
            io.to(roomCode).emit(SOCKET_EVENTS.TURN_STARTED, {
              drawerId: progressed.round.drawerId!,
              roundNumber: progressed.round.roundNumber,
              turnNumber: progressed.round.turnNumber,
              maskedWord: progressed.round.maskedWord
            });
            const choices = roomManager.getWordChoicesForDrawer(progressed.round.drawerId!);
            io.to(progressed.round.drawerId!).emit(SOCKET_EVENTS.WORD_CHOICES, { words: choices });
          }
          safeEmitState(io, roomCode);
        }, 4000);
      }
    } catch (error) {
      socket.emit(SOCKET_EVENTS.ROOM_ERROR, { message: (error as Error).message });
    }
  });

  socket.on(SOCKET_EVENTS.DRAW_STROKE, (payload) => {
    const roomCode = roomManager.getPlayerRoomCode(socket.id);
    if (!roomCode) return;
    const state = roomManager.getRoomState(roomCode);
    if (state.round.drawerId !== socket.id) return;
    socket.to(roomCode).emit(SOCKET_EVENTS.DRAW_STROKE, payload);
  });

  socket.on(SOCKET_EVENTS.DRAW_CLEAR, () => {
    const roomCode = roomManager.getPlayerRoomCode(socket.id);
    if (!roomCode) return;
    const state = roomManager.getRoomState(roomCode);
    if (state.round.drawerId !== socket.id) return;
    io.to(roomCode).emit(SOCKET_EVENTS.DRAW_CLEAR);
  });

  const leaveHandler = () => {
    const result = roomManager.leaveRoom(socket.id);
    if (!result.roomCode || result.deleted) return;
    safeEmitState(io, result.roomCode);
  };

  socket.on(SOCKET_EVENTS.ROOM_LEAVE, leaveHandler);
  socket.on("disconnect", leaveHandler);
};
