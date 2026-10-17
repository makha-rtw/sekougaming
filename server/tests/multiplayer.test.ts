import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import express from 'express';
import { Server } from 'socket.io';
import { io as ClientSocket, Socket as ClientSocketType } from 'socket.io-client';
import { RoomManager } from '../src/rooms/roomManager.js';
import { ClientGameState } from '../../shared/types.js';

describe('Sekouno Multiplayer Socket.IO Integration Test', () => {
  let server: http.Server;
  let ioServer: Server;
  let port: number;
  let roomManager: RoomManager;

  beforeAll(async () => {
    const app = express();
    server = http.createServer(app);
    ioServer = new Server(server, { cors: { origin: '*' } });
    roomManager = new RoomManager();

    function broadcastRoomState(roomCode: string) {
      const room = roomManager.getRoom(roomCode);
      if (!room) return;
      for (const player of room.players.values()) {
        if (player.socketId && player.isConnected) {
          const clientState = room.getClientState(player.id);
          if (clientState) {
            ioServer.to(player.socketId).emit('game_state', clientState);
          }
        }
      }
    }

    ioServer.on('connection', (socket) => {
      socket.on('create_room', ({ playerName }, cb) => {
        const room = roomManager.createRoom();
        const add = room.addPlayer(playerName, socket.id);
        socket.join(room.code);
        cb({ success: true, roomCode: room.code, playerId: add.player?.id, sessionToken: add.player?.sessionToken });
        broadcastRoomState(room.code);
      });

      socket.on('join_room', ({ roomCode, playerName }, cb) => {
        const room = roomManager.getRoom(roomCode);
        if (!room) return cb({ success: false, error: 'Salle introuvable' });
        const add = room.addPlayer(playerName, socket.id);
        if (!add.success) return cb(add);
        socket.join(room.code);
        cb({ success: true, roomCode: room.code, playerId: add.player?.id, sessionToken: add.player?.sessionToken });
        broadcastRoomState(room.code);
      });

      socket.on('start_game', (cb) => {
        const session = roomManager.getRoomBySocketId(socket.id);
        if (!session) return cb({ success: false });
        const res = session.room.startGame(session.player.id);
        cb(res);
        if (res.success) broadcastRoomState(session.room.code);
      });

      socket.on('play_card', ({ cardId, chosenColor }, cb) => {
        const session = roomManager.getRoomBySocketId(socket.id);
        if (!session || !session.room.game) return cb({ success: false });
        const res = session.room.game.playCard(session.player.id, cardId, chosenColor);
        cb(res);
        if (res.success) broadcastRoomState(session.room.code);
      });

      socket.on('draw_card', (cb) => {
        const session = roomManager.getRoomBySocketId(socket.id);
        if (!session || !session.room.game) return cb({ success: false });
        const res = session.room.game.drawCard(session.player.id);
        cb(res);
        if (res.success) broadcastRoomState(session.room.code);
      });

      socket.on('disconnect', () => {
        const session = roomManager.getRoomBySocketId(socket.id);
        if (session) {
          session.room.handleDisconnect(socket.id);
          broadcastRoomState(session.room.code);
        }
      });
    });

    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const addr = server.address() as any;
        port = addr.port;
        resolve();
      });
    });
  });

  afterAll(async () => {
    ioServer.close();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('connecte 3 clients simultanés, crée un salon, rejoint, démarre et joue', async () => {
    const url = `http://localhost:${port}`;
    const client1: ClientSocketType = ClientSocket(url);
    const client2: ClientSocketType = ClientSocket(url);
    const client3: ClientSocketType = ClientSocket(url);

    await Promise.all([
      new Promise<void>((res) => client1.on('connect', () => res())),
      new Promise<void>((res) => client2.on('connect', () => res())),
      new Promise<void>((res) => client3.on('connect', () => res())),
    ]);

    // 1. Client 1 creates room
    let roomCode = '';
    await new Promise<void>((resolve) => {
      client1.emit('create_room', { playerName: 'Sekou' }, (res: any) => {
        expect(res.success).toBe(true);
        expect(res.roomCode).toBeDefined();
        roomCode = res.roomCode;
        resolve();
      });
    });

    // 2. Client 2 and 3 join room
    await new Promise<void>((resolve) => {
      client2.emit('join_room', { roomCode, playerName: 'Aicha' }, (res: any) => {
        expect(res.success).toBe(true);
        resolve();
      });
    });

    await new Promise<void>((resolve) => {
      client3.emit('join_room', { roomCode, playerName: 'Moussa' }, (res: any) => {
        expect(res.success).toBe(true);
        resolve();
      });
    });

    // 3. Start game
    const client1States: ClientGameState[] = [];
    const client2States: ClientGameState[] = [];
    const client3States: ClientGameState[] = [];

    client1.on('game_state', (s) => client1States.push(s));
    client2.on('game_state', (s) => client2States.push(s));
    client3.on('game_state', (s) => client3States.push(s));

    await new Promise<void>((resolve) => {
      client1.emit('start_game', (res: any) => {
        expect(res.success).toBe(true);
        resolve();
      });
    });

    // Wait for game_state event to arrive
    await new Promise((r) => setTimeout(r, 200));

    const latest1 = client1States[client1States.length - 1];
    const latest2 = client2States[client2States.length - 1];
    const latest3 = client3States[client3States.length - 1];

    expect(latest1.public.status).toBe('in_game');
    expect(latest1.myHand.length).toBe(7);
    expect(latest2.myHand.length).toBe(7);
    expect(latest3.myHand.length).toBe(7);

    // Verify privacy: client 1 only sees opponent card counts, not their cards
    expect(latest1.public.players[1].cardCount).toBe(7);
    // @ts-expect-error
    expect(latest1.public.players[1].hand).toBeUndefined();

    // Verify current player can play or draw
    const turnPlayerId = latest1.public.currentTurnPlayerId;
    const activeClient = turnPlayerId === latest1.myPlayerId ? client1 : turnPlayerId === latest2.myPlayerId ? client2 : client3;

    // Active player draws a card
    await new Promise<void>((resolve) => {
      activeClient.emit('draw_card', (res: any) => {
        expect(res.success).toBe(true);
        resolve();
      });
    });

    await new Promise((r) => setTimeout(r, 100));

    // Cleanup
    client1.disconnect();
    client2.disconnect();
    client3.disconnect();
  });
});
