import { GameSettings, RoomState, StrokePayload, ChatMessage } from "./game";

export interface CreateRoomPayload {
  username: string;
  settings?: Partial<GameSettings>;
  avatar?: string;
}

export interface JoinRoomPayload {
  roomCode: string;
  username: string;
  avatar?: string;
}

export interface WordPickPayload {
  word: string;
}

export interface ChatPayload {
  content: string;
}

export interface SettingsPayload {
  settings: Partial<GameSettings>;
}

export interface ServerToClientEvents {
  "connection:ack": (payload: { playerId: string }) => void;
  "room:joined": (payload: { roomCode: string; playerId: string; state: RoomState }) => void;
  "room:state": (state: RoomState) => void;
  "room:error": (payload: { message: string }) => void;
  "chat:message": (payload: ChatMessage) => void;
  "word:choices": (payload: { words: string[] }) => void;
  "turn:started": (payload: { drawerId: string; roundNumber: number; turnNumber: number; maskedWord: string }) => void;
  "round:ended": (payload: { answer: string; leaderboard: RoomState["leaderboard"] }) => void;
  "game:ended": (payload: { leaderboard: RoomState["leaderboard"] }) => void;
  "timer:tick": (payload: { secondsLeft: number }) => void;
  "draw:stroke": (payload: StrokePayload) => void;
  "draw:clear": () => void;
  "game:start": () => void;
}

export interface ClientToServerEvents {
  "room:create": (payload: CreateRoomPayload) => void;
  "room:join": (payload: JoinRoomPayload) => void;
  "room:leave": () => void;
  "game:start": () => void;
  "word:picked": (payload: WordPickPayload) => void;
  "chat:send": (payload: ChatPayload) => void;
  "draw:stroke": (payload: StrokePayload) => void;
  "draw:clear": () => void;
  "settings:update": (payload: SettingsPayload) => void;
  "player:reconnect": (payload: { roomCode: string; playerId: string }) => void;
}
