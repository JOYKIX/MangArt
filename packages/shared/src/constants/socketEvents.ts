export const SOCKET_EVENTS = {
  CONNECTION_ACK: "connection:ack",
  ROOM_CREATE: "room:create",
  ROOM_JOIN: "room:join",
  ROOM_JOINED: "room:joined",
  ROOM_STATE: "room:state",
  ROOM_ERROR: "room:error",
  ROOM_LEAVE: "room:leave",
  PLAYER_UPDATE: "player:update",
  GAME_START: "game:start",
  TURN_STARTED: "turn:started",
  WORD_CHOICES: "word:choices",
  WORD_PICKED: "word:picked",
  CHAT_SEND: "chat:send",
  CHAT_MESSAGE: "chat:message",
  DRAW_STROKE: "draw:stroke",
  DRAW_CLEAR: "draw:clear",
  ROUND_ENDED: "round:ended",
  GAME_ENDED: "game:ended",
  TIMER_TICK: "timer:tick",
  SETTINGS_UPDATE: "settings:update",
  PLAYER_DISCONNECTED: "player:disconnected",
  RECONNECT_ATTEMPT: "player:reconnect"
} as const;

export type SocketEvent = (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS];
