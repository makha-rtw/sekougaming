import crypto from 'node:crypto';
import { UnoGame } from '../engine/unoEngine.js';
import {
  GameStatePublic,
  PlayerPrivate,
  ActionResponse,
  ClientGameState,
} from '../../../shared/types.js';

export interface RoomPlayer {
  id: string;
  sessionToken: string;
  name: string;
  socketId: string | null;
  isConnected: boolean;
  isHost: boolean;
  joinedAt: number;
}

export class Room {
  public code: string;
  public players: Map<string, RoomPlayer> = new Map(); // key: playerId
  public sessionToPlayerId: Map<string, string> = new Map(); // key: sessionToken -> playerId
  public socketToPlayerId: Map<string, string> = new Map(); // key: socketId -> playerId
  public game: UnoGame | null = null;
  public createdAt: number;
  public lastActivityAt: number;

  constructor(code: string) {
    this.code = code;
    this.createdAt = Date.now();
    this.lastActivityAt = Date.now();
  }

  public getHost(): RoomPlayer | undefined {
    return Array.from(this.players.values()).find(p => p.isHost);
  }

  public addPlayer(name: string, socketId: string): { success: boolean; player?: RoomPlayer; error?: string } {
    this.lastActivityAt = Date.now();

    const trimmedName = name.trim();
    if (!trimmedName || trimmedName.length < 2) {
      return { success: false, error: 'Le pseudonyme doit comporter au moins 2 caractères.' };
    }
    if (trimmedName.length > 20) {
      return { success: false, error: 'Le pseudonyme ne peut pas dépasser 20 caractères.' };
    }

    if (this.players.size >= 15) {
      return { success: false, error: 'La salle est pleine (maximum 15 joueurs).' };
    }

    if (this.game && this.game.status === 'in_game') {
      return { success: false, error: 'La partie a déjà commencé. Impossible de rejoindre un jeu en cours.' };
    }

    // Check duplicate name
    let finalName = trimmedName;
    const existingNames = new Set(Array.from(this.players.values()).map(p => p.name.toLowerCase()));
    if (existingNames.has(finalName.toLowerCase())) {
      let counter = 2;
      while (existingNames.has(`${trimmedName} (${counter})`.toLowerCase())) {
        counter++;
      }
      finalName = `${trimmedName} (${counter})`;
    }

    const playerId = `p_${crypto.randomUUID().slice(0, 8)}`;
    const sessionToken = crypto.randomBytes(16).toString('hex');
    const isFirst = this.players.size === 0;

    const player: RoomPlayer = {
      id: playerId,
      sessionToken,
      name: finalName,
      socketId,
      isConnected: true,
      isHost: isFirst,
      joinedAt: Date.now(),
    };

    this.players.set(playerId, player);
    this.sessionToPlayerId.set(sessionToken, playerId);
    this.socketToPlayerId.set(socketId, playerId);

    return { success: true, player };
  }

  public reconnectPlayer(sessionToken: string, newSocketId: string): { success: boolean; player?: RoomPlayer; error?: string } {
    this.lastActivityAt = Date.now();
    const playerId = this.sessionToPlayerId.get(sessionToken);
    if (!playerId) {
      return { success: false, error: 'Session invalide ou expirée.' };
    }

    const player = this.players.get(playerId);
    if (!player) {
      return { success: false, error: 'Joueur introuvable.' };
    }

    // Update socket mapping
    if (player.socketId) {
      this.socketToPlayerId.delete(player.socketId);
    }
    player.socketId = newSocketId;
    player.isConnected = true;
    this.socketToPlayerId.set(newSocketId, playerId);

    // Update in game if active
    if (this.game) {
      const gamePlayer = this.game.players.find(p => p.id === playerId);
      if (gamePlayer) {
        gamePlayer.isConnected = true;
      }
    }

    return { success: true, player };
  }

  public handleDisconnect(socketId: string): RoomPlayer | null {
    this.lastActivityAt = Date.now();
    const playerId = this.socketToPlayerId.get(socketId);
    if (!playerId) return null;

    const player = this.players.get(playerId);
    if (!player) return null;

    player.isConnected = false;
    player.socketId = null;
    this.socketToPlayerId.delete(socketId);

    if (this.game) {
      const gp = this.game.players.find(p => p.id === playerId);
      if (gp) gp.isConnected = false;
    }

    // If host disconnected and in waiting room, transfer host immediately to another connected player
    if (player.isHost) {
      const nextConnected = Array.from(this.players.values()).find(p => p.id !== playerId && p.isConnected);
      if (nextConnected) {
        player.isHost = false;
        nextConnected.isHost = true;
        if (this.game) {
          const oldHostGp = this.game.players.find(p => p.id === playerId);
          const newHostGp = this.game.players.find(p => p.id === nextConnected.id);
          if (oldHostGp) oldHostGp.isHost = false;
          if (newHostGp) newHostGp.isHost = true;
        }
      }
    }

    return player;
  }

  public removePlayer(playerId: string): boolean {
    this.lastActivityAt = Date.now();
    const player = this.players.get(playerId);
    if (!player) return false;

    if (player.socketId) {
      this.socketToPlayerId.delete(player.socketId);
    }
    this.sessionToPlayerId.delete(player.sessionToken);
    this.players.delete(playerId);

    if (player.isHost) {
      const next = Array.from(this.players.values())[0];
      if (next) {
        next.isHost = true;
      }
    }

    // If game was running with removed player, remove them from game
    if (this.game) {
      this.game.players = this.game.players.filter(p => p.id !== playerId);
      if (this.game.players.length < 2) {
        this.game.status = 'game_over';
        this.game.lastActionMessage = 'Partie interrompue : nombre insuffisant de joueurs.';
      }
    }

    return true;
  }

  public startGame(requestingPlayerId: string): ActionResponse {
    this.lastActivityAt = Date.now();
    const player = this.players.get(requestingPlayerId);
    if (!player) {
      return { success: false, error: 'Joueur introuvable.' };
    }
    if (!player.isHost) {
      return { success: false, error: 'Seul l\'hôte peut démarrer la partie.' };
    }

    const connectedPlayers = Array.from(this.players.values()).filter(p => p.isConnected);
    if (connectedPlayers.length < 2) {
      return { success: false, error: 'Il faut au moins 2 joueurs connectés pour démarrer.' };
    }
    if (connectedPlayers.length > 15) {
      return { success: false, error: 'Le nombre maximal de 15 joueurs est dépassé.' };
    }

    const gamePlayers = connectedPlayers.map(p => ({
      id: p.id,
      name: p.name,
      sessionToken: p.sessionToken,
      isHost: p.isHost,
    }));

    this.game = new UnoGame(this.code, gamePlayers);
    const startResult = this.game.startGame();
    return startResult;
  }

  public restartGame(requestingPlayerId: string): ActionResponse {
    this.lastActivityAt = Date.now();
    const player = this.players.get(requestingPlayerId);
    if (!player) {
      return { success: false, error: 'Joueur introuvable.' };
    }
    if (!player.isHost) {
      return { success: false, error: 'Seul l\'hôte peut relancer la partie.' };
    }

    return this.startGame(requestingPlayerId);
  }

  public returnToLobby(requestingPlayerId: string): ActionResponse {
    this.lastActivityAt = Date.now();
    const player = this.players.get(requestingPlayerId);
    if (!player) {
      return { success: false, error: 'Joueur introuvable.' };
    }
    // Host can return anytime; any player can return if game is over
    if (!player.isHost && (!this.game || this.game.status !== 'game_over')) {
      return { success: false, error: 'Seul l\'hôte peut renvoyer les joueurs au salon.' };
    }

    this.game = null;
    return { success: true };
  }

  public hostGivePenalty(hostId: string, targetPlayerId: string, count: number = 2): ActionResponse {
    this.lastActivityAt = Date.now();
    const player = this.players.get(hostId);
    if (!player || !player.isHost) {
      return { success: false, error: "Seul l'hôte peut infliger une pénalité." };
    }
    if (!this.game) {
      return { success: false, error: 'Aucune partie en cours.' };
    }
    return this.game.hostGivePenalty(hostId, targetPlayerId, count);
  }

  public getClientState(playerId: string): ClientGameState | null {
    const player = this.players.get(playerId);
    if (!player) return null;

    const host = this.getHost();
    const hostId = host ? host.id : '';

    let publicState: GameStatePublic;
    let myHand: any[] = [];
    let isMyTurn = false;
    let canCallUno = false;
    let canPassTurn = false;

    if (this.game && (this.game.status === 'in_game' || this.game.status === 'game_over')) {
      publicState = this.game.getPublicState(hostId);
      const gamePlayer = this.game.players.find(p => p.id === playerId);
      if (gamePlayer) {
        myHand = gamePlayer.hand;
        canCallUno = gamePlayer.hand.length <= 2 && !gamePlayer.hasCalledUno;
      }
      isMyTurn = publicState.currentTurnPlayerId === playerId;
      canPassTurn = isMyTurn && this.game.drawnPlayableCard !== null && this.game.drawnPlayableCard.playerId === playerId;
    } else {
      // Waiting lobby
      publicState = {
        roomCode: this.code,
        status: 'waiting',
        hostId,
        players: Array.from(this.players.values()).map(p => ({
          id: p.id,
          name: p.name,
          cardCount: 0,
          isConnected: p.isConnected,
          isHost: p.isHost,
          hasCalledUno: false,
        })),
        currentTurnPlayerId: null,
        direction: 1,
        topDiscard: null,
        currentColor: null,
        drawPileCount: 0,
        discardPileCount: 0,
        penaltyStack: null,
        winner: null,
        lastActionMessage: null,
        unoNotice: null,
        drawnCardPlayableId: null,
      };
    }

    return {
      public: publicState,
      myHand,
      myPlayerId: playerId,
      isMyTurn,
      canCallUno,
      canPassTurn,
    };
  }
}

export class RoomManager {
  private rooms: Map<string, Room> = new Map();

  constructor() {
    // Periodic cleanup of inactive rooms (e.g. inactive for > 2 hours or empty for > 15 mins)
    setInterval(() => this.cleanupInactiveRooms(), 60 * 1000);
  }

  public createRoom(): Room {
    let code: string;
    do {
      code = this.generateRoomCode();
    } while (this.rooms.has(code));

    const room = new Room(code);
    this.rooms.set(code, room);
    return room;
  }

  public getRoom(code: string): Room | undefined {
    return this.rooms.get(code.toUpperCase().trim());
  }

  public removeRoom(code: string): boolean {
    return this.rooms.delete(code.toUpperCase().trim());
  }

  public getRoomBySocketId(socketId: string): { room: Room; player: RoomPlayer } | null {
    for (const room of this.rooms.values()) {
      const playerId = room.socketToPlayerId.get(socketId);
      if (playerId) {
        const player = room.players.get(playerId);
        if (player) {
          return { room, player };
        }
      }
    }
    return null;
  }

  private generateRoomCode(): string {
    // 6 chars alphanumeric without ambiguous characters (no 0, O, 1, I, L)
    const chars = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private cleanupInactiveRooms(): void {
    const now = Date.now();
    for (const [code, room] of this.rooms.entries()) {
      const hasConnectedPlayers = Array.from(room.players.values()).some(p => p.isConnected);
      // Empty room inactive for 15 mins
      if (!hasConnectedPlayers && now - room.lastActivityAt > 15 * 60 * 1000) {
        this.rooms.delete(code);
        continue;
      }
      // Any room inactive for > 3 hours
      if (now - room.lastActivityAt > 3 * 60 * 60 * 1000) {
        this.rooms.delete(code);
      }
    }
  }
}
