import express from 'express';
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import QRCode from 'qrcode';
import { RoomManager } from './rooms/roomManager.js';
import { PlayableColor } from '../../shared/types.js';
import polychessAuthRouter from './polychess/authRoutes.js';
import { setupPolychessSockets } from './polychess/chessSockets.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 3001;
const CLIENT_URL = process.env.CLIENT_URL || '*';

app.use(cors({ origin: CLIENT_URL, credentials: true }));
app.use(express.json());

// Serve static frontend files if built (works in both tsx dev and compiled production)
const candidateDistPaths = [
  path.resolve(process.cwd(), 'client/dist'),
  path.resolve(__dirname, '../../../../client/dist'),
  path.resolve(__dirname, '../../client/dist'),
];
const clientDistPath = candidateDistPaths.find(p => fs.existsSync(p)) || candidateDistPaths[0];
app.use(express.static(clientDistPath));

// API health endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Polychess API routes
app.use('/api/polychess', polychessAuthRouter);

// QR Code generation endpoint
app.get('/api/qrcode', async (req, res) => {
  const text = req.query.text as string;
  if (!text) {
    return res.status(400).json({ error: 'Text query parameter is required' });
  }
  try {
    const dataUrl = await QRCode.toDataURL(text, {
      margin: 1,
      width: 256,
      color: {
        dark: '#1e1b4b',
        light: '#ffffff',
      },
    });
    res.json({ dataUrl });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
});

const io = new Server(server, {
  cors: {
    origin: CLIENT_URL,
    methods: ['GET', 'POST'],
  },
  pingTimeout: 20000,
  pingInterval: 10000,
});

setupPolychessSockets(io);

const roomManager = new RoomManager();

/**
 * Broadcasts the personalized game state to each player in the room.
 * This guarantees strict secrecy: each player only receives their own hand,
 * and only public card counts for opponents.
 */
function broadcastRoomState(roomCode: string) {
  const room = roomManager.getRoom(roomCode);
  if (!room) return;

  for (const player of room.players.values()) {
    if (player.socketId && player.isConnected) {
      const clientState = room.getClientState(player.id);
      if (clientState) {
        io.to(player.socketId).emit('game_state', clientState);
      }
    }
  }
}

io.on('connection', (socket: Socket) => {
  // 1. Create Room
  socket.on('create_room', ({ playerName }: { playerName: string }, callback) => {
    try {
      const room = roomManager.createRoom();
      const addRes = room.addPlayer(playerName, socket.id);
      if (!addRes.success || !addRes.player) {
        return callback?.({ success: false, error: addRes.error || 'Erreur lors de la création de la salle.' });
      }

      socket.join(room.code);
      callback?.({
        success: true,
        roomCode: room.code,
        playerId: addRes.player.id,
        sessionToken: addRes.player.sessionToken,
      });

      broadcastRoomState(room.code);
    } catch (err: any) {
      callback?.({ success: false, error: err.message || 'Erreur serveur.' });
    }
  });

  // 2. Join Room
  socket.on('join_room', ({ roomCode, playerName }: { roomCode: string; playerName: string }, callback) => {
    try {
      if (!roomCode) {
        return callback?.({ success: false, error: 'Code de salle obligatoire.' });
      }
      const room = roomManager.getRoom(roomCode);
      if (!room) {
        return callback?.({ success: false, error: 'Salle introuvable ou fermée.' });
      }

      const addRes = room.addPlayer(playerName, socket.id);
      if (!addRes.success || !addRes.player) {
        return callback?.({ success: false, error: addRes.error });
      }

      socket.join(room.code);
      callback?.({
        success: true,
        roomCode: room.code,
        playerId: addRes.player.id,
        sessionToken: addRes.player.sessionToken,
      });

      broadcastRoomState(room.code);
    } catch (err: any) {
      callback?.({ success: false, error: err.message || 'Erreur serveur.' });
    }
  });

  // 3. Reconnect Session
  socket.on('reconnect_session', ({ roomCode, sessionToken }: { roomCode: string; sessionToken: string }, callback) => {
    try {
      if (!roomCode || !sessionToken) {
        return callback?.({ success: false, error: 'Informations de session incomplètes.' });
      }
      const room = roomManager.getRoom(roomCode);
      if (!room) {
        return callback?.({ success: false, error: 'La salle n\'existe plus.' });
      }

      const reconnRes = room.reconnectPlayer(sessionToken, socket.id);
      if (!reconnRes.success || !reconnRes.player) {
        return callback?.({ success: false, error: reconnRes.error });
      }

      socket.join(room.code);
      callback?.({
        success: true,
        roomCode: room.code,
        playerId: reconnRes.player.id,
        name: reconnRes.player.name,
      });

      broadcastRoomState(room.code);
    } catch (err: any) {
      callback?.({ success: false, error: err.message || 'Erreur de reconnexion.' });
    }
  });

  // 4. Start Game (Host only)
  socket.on('start_game', (callback) => {
    const session = roomManager.getRoomBySocketId(socket.id);
    if (!session) return callback?.({ success: false, error: 'Joueur non connecté à une salle.' });

    const { room, player } = session;
    const res = room.startGame(player.id);
    callback?.(res);

    if (res.success) {
      broadcastRoomState(room.code);
    }
  });

  // 5. Play Card
  socket.on('play_card', ({ cardId, chosenColor }: { cardId: string; chosenColor?: PlayableColor }, callback) => {
    const session = roomManager.getRoomBySocketId(socket.id);
    if (!session) return callback?.({ success: false, error: 'Joueur non connecté.' });

    const { room, player } = session;
    if (!room.game) return callback?.({ success: false, error: 'Aucune partie en cours.' });

    const res = room.game.playCard(player.id, cardId, chosenColor);
    callback?.(res);

    if (res.success) {
      broadcastRoomState(room.code);
    }
  });

  // 6. Draw Card
  socket.on('draw_card', (callback) => {
    const session = roomManager.getRoomBySocketId(socket.id);
    if (!session) return callback?.({ success: false, error: 'Joueur non connecté.' });

    const { room, player } = session;
    if (!room.game) return callback?.({ success: false, error: 'Aucune partie en cours.' });

    const res = room.game.drawCard(player.id);
    callback?.(res);

    if (res.success) {
      broadcastRoomState(room.code);
    }
  });

  // 6b. Pass Turn (Only after drawing a playable card)
  socket.on('pass_turn', (callback) => {
    const session = roomManager.getRoomBySocketId(socket.id);
    if (!session) return callback?.({ success: false, error: 'Joueur non connecté.' });

    const { room, player } = session;
    if (!room.game) return callback?.({ success: false, error: 'Aucune partie en cours.' });

    const res = room.game.passTurn(player.id);
    callback?.(res);

    if (res.success) {
      broadcastRoomState(room.code);
    }
  });

  // 7. Call UNO
  socket.on('call_uno', (callback) => {
    const session = roomManager.getRoomBySocketId(socket.id);
    if (!session) return callback?.({ success: false, error: 'Joueur non connecté.' });

    const { room, player } = session;
    if (!room.game) return callback?.({ success: false, error: 'Aucune partie en cours.' });

    const res = room.game.callUno(player.id);
    callback?.(res);

    if (res.success) {
      broadcastRoomState(room.code);
    }
  });

  // 8. Catch UNO (Contre-UNO)
  socket.on('catch_uno', ({ targetPlayerId }: { targetPlayerId: string }, callback) => {
    const session = roomManager.getRoomBySocketId(socket.id);
    if (!session) return callback?.({ success: false, error: 'Joueur non connecté.' });

    const { room, player } = session;
    if (!room.game) return callback?.({ success: false, error: 'Aucune partie en cours.' });

    const res = room.game.catchUno(player.id, targetPlayerId);
    callback?.(res);

    if (res.success) {
      broadcastRoomState(room.code);
    }
  });

  // 9. Restart Game
  socket.on('restart_game', (callback) => {
    const session = roomManager.getRoomBySocketId(socket.id);
    if (!session) return callback?.({ success: false, error: 'Joueur non connecté.' });

    const { room, player } = session;
    const res = room.restartGame(player.id);
    callback?.(res);

    if (res.success) {
      broadcastRoomState(room.code);
    }
  });

  // 10. Return to Lobby
  socket.on('return_to_lobby', (callback) => {
    const session = roomManager.getRoomBySocketId(socket.id);
    if (!session) return callback?.({ success: false, error: 'Joueur non connecté.' });

    const { room, player } = session;
    const res = room.returnToLobby(player.id);
    callback?.(res);

    if (res.success) {
      broadcastRoomState(room.code);
    }
  });

  // 11. Leave Room
  socket.on('leave_room', (callback) => {
    const session = roomManager.getRoomBySocketId(socket.id);
    if (session) {
      const { room, player } = session;
      socket.leave(room.code);
      room.removePlayer(player.id);
      broadcastRoomState(room.code);
    }
    callback?.({ success: true });
  });

  // 12. Host Give Penalty
  socket.on('host_give_penalty', ({ targetPlayerId, count }: { targetPlayerId: string; count?: number }, callback) => {
    const session = roomManager.getRoomBySocketId(socket.id);
    if (!session) return callback?.({ success: false, error: 'Joueur non connecté.' });
    const { room, player } = session;
    const res = room.hostGivePenalty(player.id, targetPlayerId, count || 2);
    callback?.(res);
    if (res.success) {
      broadcastRoomState(room.code);
    }
  });

  // 13. Close Room (Host only)
  socket.on('close_room', (callback) => {
    const session = roomManager.getRoomBySocketId(socket.id);
    if (!session) return callback?.({ success: false, error: 'Joueur non connecté.' });
    const { room, player } = session;
    if (!player.isHost) {
      return callback?.({ success: false, error: "Seul l'hôte peut fermer le salon." });
    }
    io.to(room.code).emit('room_closed', { message: "Le salon a été fermé par l'hôte." });
    roomManager.removeRoom(room.code);
    callback?.({ success: true });
  });

  // Handle Disconnect
  socket.on('disconnect', () => {
    const session = roomManager.getRoomBySocketId(socket.id);
    if (session) {
      const { room } = session;
      room.handleDisconnect(socket.id);
      broadcastRoomState(room.code);
    }
  });
});

// Fallback to client index.html for SPA routing (Express 5 / path-to-regexp v8 compatible)
app.get('{*path}', (req, res, next) => {
  // Avoid intercepting API routes or Socket.IO requests
  if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
    return next();
  }
  const indexPath = path.join(clientDistPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(200).send('Sekou-Gaming — Sekouno: Serveur backend opérationnel. En développement, utilisez http://localhost:3000.');
  }
});

server.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`[SEKOUNO] Serveur temps réel démarré sur http://localhost:${PORT}`);
});
