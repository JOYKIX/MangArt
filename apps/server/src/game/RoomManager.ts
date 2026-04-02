import { mangaWords, GameSettings, Player, RoomState, WordEntry, sanitizeMessage } from "@mangart/shared";
import { randomCode, shuffle } from "../utils/helpers";

const DEFAULT_SETTINGS: GameSettings = {
  rounds: 3,
  roundDurationSec: 80,
  maxPlayers: 8
};

interface RoomInternal {
  state: RoomState;
  playerOrder: string[];
  wordChoices: string[];
  guessedPlayers: Set<string>;
  timer?: NodeJS.Timeout;
}

export class RoomManager {
  private rooms = new Map<string, RoomInternal>();
  private playerRoomMap = new Map<string, string>();

  createRoom(playerId: string, username: string, avatar = "🎨", settings?: Partial<GameSettings>): RoomState {
    const roomCode = this.generateRoomCode();
    const host: Player = {
      id: playerId,
      username,
      score: 0,
      isHost: true,
      isDrawer: false,
      hasGuessedCorrectly: false,
      connected: true,
      avatar
    };
    const state: RoomState = {
      roomCode,
      players: [host],
      hostId: host.id,
      phase: "lobby",
      settings: { ...DEFAULT_SETTINGS, ...settings },
      round: {
        roundNumber: 0,
        turnNumber: 0,
        drawerId: null,
        chosenWord: null,
        maskedWord: "",
        startedAt: null,
        endsAt: null,
        hintsRevealed: 0
      },
      chat: [],
      leaderboard: []
    };

    this.rooms.set(roomCode, {
      state,
      playerOrder: [playerId],
      wordChoices: [],
      guessedPlayers: new Set<string>()
    });
    this.playerRoomMap.set(playerId, roomCode);
    return this.publicState(roomCode);
  }

  joinRoom(playerId: string, roomCode: string, username: string, avatar = "🖌️"): RoomState {
    const room = this.getRoomInternal(roomCode);
    if (room.state.players.length >= room.state.settings.maxPlayers) {
      throw new Error("Room is full");
    }
    if (room.state.phase !== "lobby") {
      throw new Error("Game already started");
    }

    const player: Player = {
      id: playerId,
      username,
      score: 0,
      isHost: false,
      isDrawer: false,
      hasGuessedCorrectly: false,
      connected: true,
      avatar
    };

    room.state.players.push(player);
    room.playerOrder.push(playerId);
    this.playerRoomMap.set(playerId, roomCode);
    return this.publicState(roomCode);
  }

  leaveRoom(playerId: string): { roomCode: string | null; deleted: boolean } {
    const roomCode = this.playerRoomMap.get(playerId);
    if (!roomCode) return { roomCode: null, deleted: false };
    const room = this.rooms.get(roomCode);
    if (!room) return { roomCode, deleted: false };

    room.state.players = room.state.players.filter((p) => p.id !== playerId);
    room.playerOrder = room.playerOrder.filter((id) => id !== playerId);
    room.guessedPlayers.delete(playerId);
    this.playerRoomMap.delete(playerId);

    if (room.state.players.length === 0) {
      if (room.timer) clearInterval(room.timer);
      this.rooms.delete(roomCode);
      return { roomCode, deleted: true };
    }

    if (room.state.hostId === playerId) {
      room.state.hostId = room.state.players[0].id;
      room.state.players[0].isHost = true;
    }

    if (room.state.round.drawerId === playerId && room.state.phase === "drawing") {
      this.endRound(roomCode);
    }

    return { roomCode, deleted: false };
  }

  getRoomState(roomCode: string): RoomState {
    return this.publicState(roomCode);
  }

  getPlayerRoomCode(playerId: string): string | undefined {
    return this.playerRoomMap.get(playerId);
  }

  updateSettings(playerId: string, settings: Partial<GameSettings>) {
    const room = this.getRoomByPlayer(playerId);
    if (room.state.hostId !== playerId) throw new Error("Only host can update settings");
    if (room.state.phase !== "lobby") throw new Error("Cannot update settings after game starts");

    room.state.settings.rounds = Math.max(1, Math.min(8, settings.rounds ?? room.state.settings.rounds));
    room.state.settings.roundDurationSec = Math.max(30, Math.min(180, settings.roundDurationSec ?? room.state.settings.roundDurationSec));
    room.state.settings.maxPlayers = Math.max(2, Math.min(12, settings.maxPlayers ?? room.state.settings.maxPlayers));
  }

  startGame(playerId: string): RoomState {
    const roomCode = this.playerRoomMap.get(playerId);
    if (!roomCode) throw new Error("Player not in room");
    const room = this.getRoomInternal(roomCode);
    if (room.state.hostId !== playerId) throw new Error("Only host can start");
    if (room.state.players.length < 2) throw new Error("Need at least 2 players");

    room.state.phase = "wordPicking";
    room.state.round.roundNumber = 1;
    room.state.round.turnNumber = 1;
    this.assignDrawer(roomCode);
    this.generateWordChoices(roomCode);
    return this.publicState(roomCode);
  }

  getWordChoicesForDrawer(playerId: string): string[] {
    const room = this.getRoomByPlayer(playerId);
    if (room.state.round.drawerId !== playerId) return [];
    return room.wordChoices;
  }

  pickWord(playerId: string, word: string): RoomState {
    const roomCode = this.playerRoomMap.get(playerId);
    if (!roomCode) throw new Error("Player not in room");
    const room = this.getRoomInternal(roomCode);
    if (room.state.round.drawerId !== playerId) throw new Error("Only drawer can pick word");
    if (!room.wordChoices.includes(word)) throw new Error("Word not in choices");

    room.state.round.chosenWord = word;
    room.state.round.maskedWord = this.maskWord(word);
    room.state.phase = "drawing";
    room.state.round.startedAt = Date.now();
    room.state.round.endsAt = room.state.round.startedAt + room.state.settings.roundDurationSec * 1000;
    room.state.players = room.state.players.map((p) => ({ ...p, isDrawer: p.id === playerId, hasGuessedCorrectly: false }));
    room.guessedPlayers.clear();

    this.startTimer(roomCode);
    return this.publicState(roomCode);
  }

  processGuess(playerId: string, content: string): { correct: boolean; points: number; sanitized: string } {
    const room = this.getRoomByPlayer(playerId);
    const sanitized = sanitizeMessage(content);
    if (!sanitized) return { correct: false, points: 0, sanitized: "" };
    if (room.state.phase !== "drawing") return { correct: false, points: 0, sanitized };
    if (room.state.round.drawerId === playerId) return { correct: false, points: 0, sanitized: "The drawer cannot guess." };

    const answer = room.state.round.chosenWord?.toLowerCase();
    const normalizedGuess = sanitized.toLowerCase();
    if (!answer || answer !== normalizedGuess || room.guessedPlayers.has(playerId)) {
      return { correct: false, points: 0, sanitized };
    }

    const now = Date.now();
    const secondsLeft = Math.max(0, Math.floor(((room.state.round.endsAt ?? now) - now) / 1000));
    const points = 50 + secondsLeft * 2;
    const player = room.state.players.find((p) => p.id === playerId);
    if (!player) return { correct: false, points: 0, sanitized };
    player.score += points;
    player.hasGuessedCorrectly = true;
    room.guessedPlayers.add(playerId);

    const drawer = room.state.players.find((p) => p.id === room.state.round.drawerId);
    if (drawer) drawer.score += 20;

    const guessersCount = room.state.players.filter((p) => p.id !== room.state.round.drawerId).length;
    if (room.guessedPlayers.size === guessersCount) {
      this.endRound(room.state.roomCode);
    }

    return { correct: true, points, sanitized };
  }

  endRound(roomCode: string): RoomState {
    const room = this.getRoomInternal(roomCode);
    if (room.timer) clearInterval(room.timer);
    room.state.phase = "roundEnd";
    room.state.leaderboard = this.getLeaderboard(roomCode);
    return this.publicState(roomCode);
  }

  nextTurn(roomCode: string): RoomState {
    const room = this.getRoomInternal(roomCode);
    const playersCount = room.playerOrder.length;

    if (room.state.round.turnNumber >= playersCount) {
      if (room.state.round.roundNumber >= room.state.settings.rounds) {
        room.state.phase = "gameEnd";
        room.state.leaderboard = this.getLeaderboard(roomCode);
        return this.publicState(roomCode);
      }
      room.state.round.roundNumber += 1;
      room.state.round.turnNumber = 1;
    } else {
      room.state.round.turnNumber += 1;
    }

    room.state.phase = "wordPicking";
    room.state.round.chosenWord = null;
    room.state.round.maskedWord = "";
    room.state.round.startedAt = null;
    room.state.round.endsAt = null;
    room.state.players = room.state.players.map((p) => ({ ...p, isDrawer: false, hasGuessedCorrectly: false }));
    this.assignDrawer(roomCode);
    this.generateWordChoices(roomCode);
    return this.publicState(roomCode);
  }

  private startTimer(roomCode: string) {
    const room = this.getRoomInternal(roomCode);
    if (room.timer) clearInterval(room.timer);
    room.timer = setInterval(() => {
      const now = Date.now();
      if (!room.state.round.endsAt) return;
      if (now >= room.state.round.endsAt) {
        this.endRound(roomCode);
      }
    }, 1000);
  }

  private generateWordChoices(roomCode: string) {
    const room = this.getRoomInternal(roomCode);
    room.wordChoices = shuffle((mangaWords as WordEntry[]).map((w) => w.value)).slice(0, 3);
  }

  private assignDrawer(roomCode: string) {
    const room = this.getRoomInternal(roomCode);
    const idx = (room.state.round.turnNumber - 1) % room.playerOrder.length;
    room.state.round.drawerId = room.playerOrder[idx];
  }

  private getLeaderboard(roomCode: string) {
    const room = this.getRoomInternal(roomCode);
    return [...room.state.players]
      .sort((a, b) => b.score - a.score)
      .map((p) => ({ playerId: p.id, username: p.username, score: p.score }));
  }

  private publicState(roomCode: string): RoomState {
    const room = this.getRoomInternal(roomCode);
    return {
      ...room.state,
      round: {
        ...room.state.round,
        chosenWord: room.state.phase === "gameEnd" || room.state.phase === "roundEnd" ? room.state.round.chosenWord : null
      }
    };
  }

  private maskWord(word: string): string {
    return word
      .split("")
      .map((char) => (char === " " ? " " : "_"))
      .join("");
  }

  private generateRoomCode(): string {
    let code = randomCode();
    while (this.rooms.has(code)) code = randomCode();
    return code;
  }

  private getRoomInternal(roomCode: string): RoomInternal {
    const room = this.rooms.get(roomCode);
    if (!room) throw new Error("Room not found");
    return room;
  }

  private getRoomByPlayer(playerId: string): RoomInternal {
    const roomCode = this.playerRoomMap.get(playerId);
    if (!roomCode) throw new Error("Player not in any room");
    return this.getRoomInternal(roomCode);
  }
}
