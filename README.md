# MangArt Duel (MVP)

Online multiplayer drawing-and-guessing browser game inspired by skribbl.io with an anime/manga flavor.

## Stack
- Frontend: Next.js + React + TypeScript + Tailwind
- Entrypoint UI: App Router Next.js (pas de page `index.html` statique à la racine)
- Backend: Node.js + Express + Socket.IO
- Shared package: types/events/validation/word list
- Storage: in-memory room state (PostgreSQL-ready architecture via `RoomManager`)

## Monorepo structure

```
apps/
  client/   # Next.js UI, canvas, chat, room flow
  server/   # Express + Socket.IO + deterministic game engine
packages/
  shared/   # shared types, socket events, validators, manga words JSON
```

## Features included in MVP
- Home page with username, create room, join room with code
- Private room lifecycle + player list + host role
- Turn-based rounds with one drawer at a time
- 3 secret word choices for drawer only
- Round timer and round transition
- Chat guesses with answer matching + message sanitization
- Scoring (speed bonus for guessers, support points for drawer)
- Round summary + leaderboard
- Real-time synchronized canvas (pencil, size, color, eraser, clear)
- Cheating guards:
  - drawer cannot score guesses
  - only drawer can draw/clear
  - non-drawers only see masked word
- Host-managed game settings in room state (`rounds`, `duration`, `maxPlayers`)
- Basic test coverage for core game logic

## Setup

### 1) Install
```bash
npm install
```

### 2) Environment
```bash
cp .env.example .env
```

### 3) Run dev (client + server)
```bash
npm run dev
```

- Client: http://localhost:3000
- Server: http://localhost:4000

## Scripts
- `npm run dev` -> run client+server concurrently
- `npm run build` -> build shared + server + client
- `npm run test` -> run server game logic tests
- `npm run lint` -> run Next.js lint

## Core architecture

### Shared contracts
All socket names live in: `packages/shared/src/constants/socketEvents.ts`.

All payload types live in: `packages/shared/src/types/*`.

### Server logic
`RoomManager` is the deterministic source of truth:
- room/player lifecycle
- round state
- scoring
- drawer assignment
- game progression

Socket layer (`registerHandlers.ts`) only validates transport + emits events.

### Client logic
- Local React state/hooks for UI + socket-driven state
- Main room page consumes room state and renders board/chat/player list
- Canvas emits strokes only for current drawer

## Deployment notes
- Deploy server as a Node service with WebSocket support.
- Deploy Next client separately and set:
  - `CLIENT_URL` on server
  - `NEXT_PUBLIC_SERVER_URL` on client
- Replace in-memory manager with PostgreSQL repositories for persistence/reconnect history.

## V2 ideas
- spectator mode
- robust reconnect token/session resume
- progressive hint reveal over time
- SFX hooks and mute toggles
- avatar selection UI
- anti-spam/rate-limit for chat and draw events
