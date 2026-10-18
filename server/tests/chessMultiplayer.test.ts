import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import express from 'express';
import { Server } from 'socket.io';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import polychessAuthRouter from '../src/polychess/authRoutes.js';
import { setupPolychessSockets } from '../src/polychess/chessSockets.js';
import { getPolychessDB } from '../src/polychess/db.js';

describe('POLYCHESS Online Socket.IO Multiplayer & Matchmaking', () => {
  let server: http.Server;
  let io: Server;
  let port: number;
  let user1Token: string;
  let user2Token: string;
  let user1: any;
  let user2: any;

  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/polychess', polychessAuthRouter);

    server = http.createServer(app);
    io = new Server(server, { cors: { origin: '*' } });
    setupPolychessSockets(io);

    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const addr = server.address() as any;
        port = addr.port;
        resolve();
      });
    });

    // Create 2 test users (or fetch if already created)
    const db = getPolychessDB();
    const u1 = db.createUser('Magnus', 'pass123', 'INF');
    const u2 = db.createUser('Hikaru', 'pass123', 'TR');

    user1 = (u1.user || db.verifyUser('Magnus', 'pass123').user)!;
    user2 = (u2.user || db.verifyUser('Hikaru', 'pass123').user)!;

    // Login to get tokens
    const res1: any = await fetch(`http://localhost:${port}/api/polychess/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'Magnus', password: 'pass123' }),
    }).then((r) => r.json());
    user1Token = res1.token;

    const res2: any = await fetch(`http://localhost:${port}/api/polychess/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'Hikaru', password: 'pass123' }),
    }).then((r) => r.json());
    user2Token = res2.token;
  });

  afterAll(async () => {
    io.close();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('matches 2 players through quick matchmaking queue and validates moves', async () => {
    const client1: ClientSocket = Client(`http://localhost:${port}`);
    const client2: ClientSocket = Client(`http://localhost:${port}`);

    await Promise.all([
      new Promise<void>((resolve) => client1.on('connect', resolve)),
      new Promise<void>((resolve) => client2.on('connect', resolve)),
    ]);

    // Player 1 queues
    const queue1Res = await new Promise<any>((resolve) => {
      client1.emit('chess_find_match', { token: user1Token, timeControl: 'none' }, resolve);
    });
    expect(queue1Res.success).toBe(true);
    expect(queue1Res.matched).toBe(false);

    // Player 2 queues and matches!
    const gameStatePromise1 = new Promise<any>((resolve) => {
      client1.on('chess_state', resolve);
    });
    const gameStatePromise2 = new Promise<any>((resolve) => {
      client2.on('chess_state', resolve);
    });

    const queue2Res = await new Promise<any>((resolve) => {
      client2.emit('chess_find_match', { token: user2Token, timeControl: 'none' }, resolve);
    });
    expect(queue2Res.success).toBe(true);
    expect(queue2Res.matched).toBe(true);

    const [state1, state2] = await Promise.all([gameStatePromise1, gameStatePromise2]);
    expect(state1.gameId).toBe(state2.gameId);
    expect(state1.whitePlayer).toBeDefined();
    expect(state1.blackPlayer).toBeDefined();
    expect(state1.currentTurn).toBe('w');

    // Identify who is white
    const isClient1White = state1.whitePlayer.id === user1.id;
    const whiteClient = isClient1White ? client1 : client2;
    const whiteToken = isClient1White ? user1Token : user2Token;
    const blackClient = isClient1White ? client2 : client1;
    const blackToken = isClient1White ? user2Token : user1Token;

    // White plays e4 (e2 -> e4)
    const moveRes1 = await new Promise<any>((resolve) => {
      whiteClient.emit(
        'chess_move',
        { token: whiteToken, gameId: state1.gameId, from: 'e2', to: 'e4' },
        resolve
      );
    });
    expect(moveRes1.success).toBe(true);

    // White cannot play again out of turn
    const moveResIllegalTurn = await new Promise<any>((resolve) => {
      whiteClient.emit(
        'chess_move',
        { token: whiteToken, gameId: state1.gameId, from: 'e4', to: 'e5' },
        resolve
      );
    });
    expect(moveResIllegalTurn.success).toBe(false);
    expect(moveResIllegalTurn.error).toContain("tour");

    // Black plays e5 (e7 -> e5)
    const moveRes2 = await new Promise<any>((resolve) => {
      blackClient.emit(
        'chess_move',
        { token: blackToken, gameId: state1.gameId, from: 'e7', to: 'e5' },
        resolve
      );
    });
    expect(moveRes2.success).toBe(true);

    // Black resigns -> White wins
    const resignPromise = new Promise<any>((resolve) => {
      whiteClient.on('chess_state', (st) => {
        if (st.isGameOver) resolve(st);
      });
    });

    const resignRes = await new Promise<any>((resolve) => {
      blackClient.emit('chess_resign', { token: blackToken, gameId: state1.gameId }, resolve);
    });
    expect(resignRes.success).toBe(true);

    const finalState = await resignPromise;
    expect(finalState.isGameOver).toBe(true);
    expect(finalState.winner).toBe('w');
    expect(finalState.terminationReason).toBe('resignation');
    expect(finalState.whiteEloChange).toBeGreaterThan(0);
    expect(finalState.blackEloChange).toBeLessThan(0);

    client1.disconnect();
    client2.disconnect();
  });

  it('creates and joins a private room with 6-char code', async () => {
    const hostClient: ClientSocket = Client(`http://localhost:${port}`);
    const guestClient: ClientSocket = Client(`http://localhost:${port}`);

    await Promise.all([
      new Promise<void>((resolve) => hostClient.on('connect', resolve)),
      new Promise<void>((resolve) => guestClient.on('connect', resolve)),
    ]);

    // Host creates private room
    const createRes = await new Promise<any>((resolve) => {
      hostClient.emit('chess_create_private_room', { token: user1Token, timeControl: '10m' }, resolve);
    });
    expect(createRes.success).toBe(true);
    expect(createRes.roomCode).toBeDefined();
    expect(createRes.roomCode.length).toBe(6);

    // Guest joins private room
    const hostStatePromise = new Promise<any>((resolve) => {
      hostClient.on('chess_state', resolve);
    });

    const joinRes = await new Promise<any>((resolve) => {
      guestClient.emit(
        'chess_join_private_room',
        { token: user2Token, roomCode: createRes.roomCode },
        resolve
      );
    });
    expect(joinRes.success).toBe(true);

    const gameState = await hostStatePromise;
    expect(gameState.isPrivate).toBe(true);
    expect(gameState.roomCode).toBe(createRes.roomCode);

    hostClient.disconnect();
    guestClient.disconnect();
  });
});
