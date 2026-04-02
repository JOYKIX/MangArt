import { describe, expect, it } from "vitest";
import { RoomManager } from "../src/game/RoomManager";

describe("RoomManager", () => {
  it("creates room and joins second player", () => {
    const manager = new RoomManager();
    const room = manager.createRoom("p1", "HostGuy");
    expect(room.players).toHaveLength(1);

    const joined = manager.joinRoom("p2", room.roomCode, "Guest123");
    expect(joined.players).toHaveLength(2);
  });

  it("scores correct guesses", () => {
    const manager = new RoomManager();
    const room = manager.createRoom("p1", "HostGuy");
    manager.joinRoom("p2", room.roomCode, "Guest123");
    const started = manager.startGame("p1");
    const drawerId = started.round.drawerId!;
    const choices = manager.getWordChoicesForDrawer(drawerId);
    manager.pickWord(drawerId, choices[0]);

    const guesserId = drawerId === "p1" ? "p2" : "p1";
    const result = manager.processGuess(guesserId, choices[0]);
    expect(result.correct).toBe(true);
    expect(result.points).toBeGreaterThan(0);
  });
});
