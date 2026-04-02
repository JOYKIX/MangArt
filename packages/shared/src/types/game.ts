export type Category = "characters" | "powers" | "items" | "expressions" | "archetypes";

export interface WordEntry {
  value: string;
  category: Category;
}

export interface Player {
  id: string;
  username: string;
  score: number;
  isHost: boolean;
  isDrawer: boolean;
  hasGuessedCorrectly: boolean;
  connected: boolean;
  avatar: string;
}

export interface GameSettings {
  rounds: number;
  roundDurationSec: number;
  maxPlayers: number;
}

export interface ChatMessage {
  id: string;
  playerId: string;
  username: string;
  content: string;
  isSystem: boolean;
  timestamp: number;
  isCorrectGuess?: boolean;
}

export type GamePhase = "lobby" | "wordPicking" | "drawing" | "roundEnd" | "gameEnd";

export interface RoundState {
  roundNumber: number;
  turnNumber: number;
  drawerId: string | null;
  chosenWord: string | null;
  maskedWord: string;
  startedAt: number | null;
  endsAt: number | null;
  hintsRevealed: number;
}

export interface RoomState {
  roomCode: string;
  players: Player[];
  hostId: string;
  phase: GamePhase;
  settings: GameSettings;
  round: RoundState;
  chat: ChatMessage[];
  leaderboard: Array<{ playerId: string; username: string; score: number }>;
}

export interface StrokePoint {
  x: number;
  y: number;
}

export interface StrokePayload {
  points: StrokePoint[];
  color: string;
  size: number;
  mode: "draw" | "erase";
}
