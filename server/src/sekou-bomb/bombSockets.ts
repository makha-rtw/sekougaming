import { Server, Socket } from 'socket.io';
import { BombRoomSettings } from '../../../shared/sekouBombTypes.js';
import { SekouBombManager } from './bombManager.js';

export function setupSekouBombSockets(io: Server): SekouBombManager {
  const bombManager = new SekouBombManager((roomCode) => {
    const room = bombManager.getRoom(roomCode);
    if (!room) return;
    const state = room.toPublicState();
    for (const player of room.players.values()) {
      if (player.socketId && player.isConnected) {
        io.to(player.socketId).emit('bomb_state', state);
      }
    }
  });

  io.on('connection', (socket: Socket) => {
    // 1. Create a Sekou Bomb room
    socket.on(
      'bomb_create_room',
      (
        {
          playerName,
          settings,
        }: {
          playerName: string;
          settings?: Partial<BombRoomSettings>;
        },
        callback
      ) => {
        try {
          const room = bombManager.createRoom(settings);
          const addRes = room.addPlayer(playerName, socket.id);
          if (!addRes.success || !addRes.player) {
            bombManager.removeRoom(room.code);
            return callback?.({
              success: false,
              error: addRes.error || 'Impossible de créer le salon.',
              errorCode: addRes.errorCode,
            });
          }

          socket.join(`bomb_${room.code}`);
          callback?.({
            success: true,
            roomCode: room.code,
            playerId: addRes.player.id,
            playerName: addRes.player.name,
            sessionToken: addRes.player.sessionToken,
            state: room.toPublicState(),
          });
          room.notify();
        } catch (err: any) {
          callback?.({ success: false, error: err.message || 'Erreur serveur.' });
        }
      }
    );

    // 2. Join an existing Sekou Bomb room
    socket.on(
      'bomb_join_room',
      (
        {
          roomCode,
          playerName,
        }: {
          roomCode: string;
          playerName: string;
        },
        callback
      ) => {
        try {
          const cleanedCode = String(roomCode || '')
            .trim()
            .toUpperCase();
          if (!/^[A-Z0-9]{6}$/.test(cleanedCode)) {
            return callback?.({
              success: false,
              error: 'Code de salon invalide (6 caractères requis).',
              errorCode: 'invalid_code',
            });
          }

          const room = bombManager.getRoom(cleanedCode);
          if (!room) {
            return callback?.({
              success: false,
              error: 'Salon introuvable ou expiré.',
              errorCode: 'room_not_found',
            });
          }

          const addRes = room.addPlayer(playerName, socket.id);
          if (!addRes.success || !addRes.player) {
            return callback?.({
              success: false,
              error: addRes.error || 'Impossible de rejoindre ce salon.',
              errorCode: addRes.errorCode,
            });
          }

          socket.join(`bomb_${room.code}`);
          callback?.({
            success: true,
            roomCode: room.code,
            playerId: addRes.player.id,
            playerName: addRes.player.name,
            sessionToken: addRes.player.sessionToken,
            state: room.toPublicState(),
          });
          room.notify();
        } catch (err: any) {
          callback?.({ success: false, error: err.message || 'Erreur serveur.' });
        }
      }
    );

    // 3. Reconnect Session
    socket.on(
      'bomb_reconnect',
      (
        {
          roomCode,
          sessionToken,
        }: {
          roomCode: string;
          sessionToken: string;
        },
        callback
      ) => {
        try {
          if (!roomCode || !sessionToken) {
            return callback?.({ success: false, error: 'Données de session incomplètes.' });
          }

          const room = bombManager.getRoom(roomCode);
          if (!room) {
            return callback?.({ success: false, error: 'Ce salon a expiré.' });
          }

          const reconn = room.reconnectPlayer(sessionToken, socket.id);
          if (!reconn.success || !reconn.player) {
            return callback?.({ success: false, error: reconn.error });
          }

          socket.join(`bomb_${room.code}`);
          callback?.({
            success: true,
            roomCode: room.code,
            playerId: reconn.player.id,
            playerName: reconn.player.name,
            state: room.toPublicState(),
          });
          room.notify();
        } catch (err: any) {
          callback?.({ success: false, error: err.message || 'Erreur de reconnexion.' });
        }
      }
    );

    // 4. Update Room Settings (Host only, in LOBBY)
    socket.on(
      'bomb_update_settings',
      ({ settings }: { settings: Partial<BombRoomSettings> }, callback) => {
        const session = bombManager.getSessionBySocketId(socket.id);
        if (!session) {
          return callback?.({ success: false, error: 'Non connecté à un salon.' });
        }
        const res = session.room.updateSettings(session.player.id, settings || {});
        callback?.(res);
      }
    );

    // 5. Start or Restart Game (Host only)
    socket.on('bomb_start_game', (callback) => {
      const session = bombManager.getSessionBySocketId(socket.id);
      if (!session) {
        return callback?.({ success: false, error: 'Non connecté à un salon.' });
      }
      const res = session.room.startGame(session.player.id);
      callback?.(res);
    });

    // 6. Live Typing Preview (Active player only)
    socket.on('bomb_typing', ({ text }: { text: string }) => {
      const session = bombManager.getSessionBySocketId(socket.id);
      if (!session) return;
      session.room.updateTyping(session.player.id, text);
    });

    // 7. Submit Word (Active player only)
    socket.on('bomb_submit_word', ({ word }: { word: string }, callback) => {
      const session = bombManager.getSessionBySocketId(socket.id);
      if (!session) {
        return callback?.({ success: false, error: 'Non connecté à un salon.' });
      }
      const res = session.room.submitWord(session.player.id, word);
      callback?.(res);
    });

    // 8. Return to Lobby after Game Over (Host only)
    socket.on('bomb_return_to_lobby', (callback) => {
      const session = bombManager.getSessionBySocketId(socket.id);
      if (!session) {
        return callback?.({ success: false, error: 'Non connecté à un salon.' });
      }
      const res = session.room.returnToLobby(session.player.id);
      callback?.(res);
    });

    // 9. Leave Room
    socket.on('bomb_leave_room', (callback) => {
      const session = bombManager.getSessionBySocketId(socket.id);
      if (session) {
        const { room, player } = session;
        socket.leave(`bomb_${room.code}`);
        room.removePlayer(player.id);
        if (room.players.size === 0) {
          bombManager.removeRoom(room.code);
        }
      }
      callback?.({ success: true });
    });

    // 10. Disconnect
    socket.on('disconnect', () => {
      const session = bombManager.getSessionBySocketId(socket.id);
      if (session) {
        session.room.handleDisconnect(socket.id);
      }
    });
  });

  return bombManager;
}
