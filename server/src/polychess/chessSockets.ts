import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { ChessManager, PolychessGame } from './chessManager.js';
import { getPolychessDB } from './db.js';
import { DepartmentCode, DEPARTMENTS, TimeControlKey, UserPublic } from '../../../shared/chessTypes.js';

const JWT_SECRET = process.env.JWT_SECRET || 'polychess_super_secure_jwt_secret_2026';

async function verifyToken(token?: string): Promise<UserPublic | null> {
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      username?: string;
      department?: DepartmentCode;
    };
    const db = getPolychessDB();
    let user = await db.getUserById(payload.userId);
    if (!user && payload.username) {
      user = await db.getUserByUsername(payload.username);
    }
    if (!user && payload.username) {
      const dept: DepartmentCode = payload.department && DEPARTMENTS[payload.department] ? payload.department : 'INF';
      user = {
        id: payload.userId,
        username: payload.username,
        department: dept,
        departmentName: DEPARTMENTS[dept],
        elo: 1200,
        rankedGames: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        createdAt: Date.now(),
      };
    }
    return user;
  } catch {
    return null;
  }
}

export function setupPolychessSockets(io: Server): ChessManager {
  const chessManager = new ChessManager((gameId, state) => {
    io.to(gameId).emit('chess_state', state);
  });

  io.on('connection', (socket: Socket) => {
    // 1. Quick Matchmaking
    socket.on(
      'chess_find_match',
      async (
        { token, timeControl }: { token: string; timeControl: TimeControlKey },
        callback
      ) => {
        const user = await verifyToken(token);
        if (!user) {
          return callback?.({ success: false, error: 'Authentification requise.' });
        }

        const game = chessManager.addToQueue(user, socket.id, timeControl || '5m');
        if (game) {
          // A match was found immediately!
          socket.join(game.id);
          io.in(game.whitePlayer.socketId).socketsJoin(game.id);
          io.in(game.blackPlayer.socketId).socketsJoin(game.id);

          game.notifyState();
          callback?.({ success: true, matched: true, gameId: game.id });
        } else {
          callback?.({ success: true, matched: false, message: 'En recherche...' });
        }
      }
    );

    socket.on('chess_cancel_match', async ({ token }: { token: string }, callback) => {
      const user = await verifyToken(token);
      if (user) {
        chessManager.removeFromQueue(user.id);
      }
      callback?.({ success: true });
    });

    // 2. Private Room Creation
    socket.on(
      'chess_create_private_room',
      async (
        { token, timeControl }: { token: string; timeControl: TimeControlKey },
        callback
      ) => {
        const user = await verifyToken(token);
        if (!user) {
          return callback?.({ success: false, error: 'Authentification requise.' });
        }

        const roomCode = chessManager.createPrivateRoom(user, socket.id, timeControl || '5m');
        callback?.({ success: true, roomCode });
      }
    );

    // 3. Private Room Joining
    socket.on(
      'chess_join_private_room',
      async (
        { token, roomCode }: { token: string; roomCode: string },
        callback
      ) => {
        const user = await verifyToken(token);
        if (!user) {
          return callback?.({ success: false, error: 'Authentification requise.' });
        }

        const res = chessManager.joinPrivateRoom(roomCode, user, socket.id);
        if (!res.success || !res.game) {
          return callback?.({ success: false, error: res.error });
        }

        const game = res.game;
        socket.join(game.id);
        io.in(game.whitePlayer.socketId).socketsJoin(game.id);
        io.in(game.blackPlayer.socketId).socketsJoin(game.id);

        game.notifyState();
        callback?.({ success: true, gameId: game.id });
      }
    );

    // 4. Reconnect Session
    socket.on('chess_reconnect', async ({ token }: { token: string }, callback) => {
      const user = await verifyToken(token);
      if (!user) {
        return callback?.({ success: false, error: 'Non authentifié.' });
      }

      const game = chessManager.reconnectUser(user.id, socket.id);
      if (game) {
        socket.join(game.id);
        callback?.({ success: true, gameId: game.id, state: game.toPublicState() });
      } else {
        callback?.({ success: false, message: 'Aucune partie active.' });
      }
    });

    // 5. Make Move
    socket.on(
      'chess_move',
      async (
        {
          token,
          gameId,
          from,
          to,
          promotion,
        }: {
          token: string;
          gameId: string;
          from: string;
          to: string;
          promotion?: string;
        },
        callback
      ) => {
        const user = await verifyToken(token);
        if (!user) {
          return callback?.({ success: false, error: 'Non authentifié.' });
        }

        const game = chessManager.getGame(gameId);
        if (!game) {
          return callback?.({ success: false, error: 'Partie introuvable.' });
        }

        const res = game.makeMove(user.id, { from, to, promotion });
        callback?.(res);
      }
    );

    // 6. Resign
    socket.on(
      'chess_resign',
      async ({ token, gameId }: { token: string; gameId: string }, callback) => {
        const user = await verifyToken(token);
        if (!user) return callback?.({ success: false, error: 'Non authentifié.' });

        const game = chessManager.getGame(gameId);
        if (!game) return callback?.({ success: false, error: 'Partie introuvable.' });

        const res = game.resign(user.id);
        callback?.(res);
      }
    );

    // 7. Draw Offer & Response
    socket.on(
      'chess_offer_draw',
      async ({ token, gameId }: { token: string; gameId: string }, callback) => {
        const user = await verifyToken(token);
        if (!user) return callback?.({ success: false, error: 'Non authentifié.' });

        const game = chessManager.getGame(gameId);
        if (!game) return callback?.({ success: false, error: 'Partie introuvable.' });

        const res = game.offerDraw(user.id);
        callback?.(res);
      }
    );

    socket.on(
      'chess_accept_draw',
      async ({ token, gameId }: { token: string; gameId: string }, callback) => {
        const user = await verifyToken(token);
        if (!user) return callback?.({ success: false, error: 'Non authentifié.' });

        const game = chessManager.getGame(gameId);
        if (!game) return callback?.({ success: false, error: 'Partie introuvable.' });

        const res = game.acceptDraw(user.id);
        callback?.(res);
      }
    );

    socket.on(
      'chess_decline_draw',
      async ({ token, gameId }: { token: string; gameId: string }, callback) => {
        const user = await verifyToken(token);
        if (!user) return callback?.({ success: false, error: 'Non authentifié.' });

        const game = chessManager.getGame(gameId);
        if (!game) return callback?.({ success: false, error: 'Partie introuvable.' });

        const res = game.declineDraw(user.id);
        callback?.(res);
      }
    );

    // Handle Disconnect
    socket.on('disconnect', () => {
      chessManager.handleSocketDisconnect(socket.id);
    });
  });

  return chessManager;
}
