import { Chess } from 'chess.js';
import crypto from 'node:crypto';
import {
  ChessGameStatePublic,
  ChessMoveRecord,
  GameTerminationReason,
  PieceColor,
  TimeControlKey,
  TIME_CONTROLS,
  UserPublic,
} from '../../../shared/chessTypes.js';
import { PolychessDatabase, getPolychessDB } from './db.js';

export interface ChessPlayerSession {
  user: UserPublic;
  socketId: string;
  color: PieceColor;
  isConnected: boolean;
  disconnectedAt: number | null;
}

export class PolychessGame {
  public id: string;
  public roomCode?: string;
  public isPrivate: boolean;
  public timeControl: TimeControlKey;
  public chess: Chess;

  public whitePlayer: ChessPlayerSession;
  public blackPlayer: ChessPlayerSession;

  public whiteTimeRemainingMs: number | null;
  public blackTimeRemainingMs: number | null;
  public lastMoveTimestamp: number;

  public moves: ChessMoveRecord[] = [];
  public isGameOver: boolean = false;
  public winner: PieceColor | 'draw' | null = null;
  public terminationReason: GameTerminationReason | null = null;

  public whiteEloChange?: number;
  public blackEloChange?: number;

  public drawOfferedBy: PieceColor | null = null;

  private clockInterval: NodeJS.Timeout | null = null;
  private disconnectGraceTimeout: NodeJS.Timeout | null = null;
  private onStateChange: (state: ChessGameStatePublic) => void;

  constructor(
    id: string,
    whiteUser: UserPublic,
    whiteSocketId: string,
    blackUser: UserPublic,
    blackSocketId: string,
    timeControl: TimeControlKey,
    onStateChange: (state: ChessGameStatePublic) => void,
    roomCode?: string,
    isPrivate: boolean = false
  ) {
    this.id = id;
    this.roomCode = roomCode;
    this.isPrivate = isPrivate;
    this.timeControl = timeControl;
    this.chess = new Chess();
    this.onStateChange = onStateChange;

    this.whitePlayer = {
      user: whiteUser,
      socketId: whiteSocketId,
      color: 'w',
      isConnected: true,
      disconnectedAt: null,
    };

    this.blackPlayer = {
      user: blackUser,
      socketId: blackSocketId,
      color: 'b',
      isConnected: true,
      disconnectedAt: null,
    };

    const seconds = TIME_CONTROLS[timeControl].seconds;
    this.whiteTimeRemainingMs = seconds ? seconds * 1000 : null;
    this.blackTimeRemainingMs = seconds ? seconds * 1000 : null;
    this.lastMoveTimestamp = Date.now();

    // Start server authoritative clock loop if timed game
    if (this.whiteTimeRemainingMs !== null) {
      this.startClock();
    }
  }

  private startClock() {
    this.stopClock();
    let lastTick = Date.now();

    this.clockInterval = setInterval(() => {
      if (this.isGameOver) {
        this.stopClock();
        return;
      }

      const now = Date.now();
      const delta = now - lastTick;
      lastTick = now;

      // Only decrement clock if game has started (at least 1 move or active turn)
      const turn = this.chess.turn();
      if (turn === 'w' && this.whiteTimeRemainingMs !== null) {
        this.whiteTimeRemainingMs = Math.max(0, this.whiteTimeRemainingMs - delta);
        if (this.whiteTimeRemainingMs <= 0) {
          this.endGame('b', 'timeout');
          return;
        }
      } else if (turn === 'b' && this.blackTimeRemainingMs !== null) {
        this.blackTimeRemainingMs = Math.max(0, this.blackTimeRemainingMs - delta);
        if (this.blackTimeRemainingMs <= 0) {
          this.endGame('w', 'timeout');
          return;
        }
      }
    }, 200);
  }

  public stopClock() {
    if (this.clockInterval) {
      clearInterval(this.clockInterval);
      this.clockInterval = null;
    }
  }

  public getPlayerColor(userId: string): PieceColor | null {
    if (this.whitePlayer.user.id === userId) return 'w';
    if (this.blackPlayer.user.id === userId) return 'b';
    return null;
  }

  public getPlayerBySocket(socketId: string): ChessPlayerSession | null {
    if (this.whitePlayer.socketId === socketId) return this.whitePlayer;
    if (this.blackPlayer.socketId === socketId) return this.blackPlayer;
    return null;
  }

  public updateSocket(userId: string, newSocketId: string): boolean {
    if (this.whitePlayer.user.id === userId) {
      this.whitePlayer.socketId = newSocketId;
      this.whitePlayer.isConnected = true;
      this.whitePlayer.disconnectedAt = null;
      this.clearDisconnectGrace();
      this.notifyState();
      return true;
    }
    if (this.blackPlayer.user.id === userId) {
      this.blackPlayer.socketId = newSocketId;
      this.blackPlayer.isConnected = true;
      this.blackPlayer.disconnectedAt = null;
      this.clearDisconnectGrace();
      this.notifyState();
      return true;
    }
    return false;
  }

  public handleDisconnect(socketId: string) {
    const player = this.getPlayerBySocket(socketId);
    if (!player || this.isGameOver) return;

    player.isConnected = false;
    player.disconnectedAt = Date.now();
    this.notifyState();

    // 60-second grace period before claiming abandonment loss
    this.clearDisconnectGrace();
    this.disconnectGraceTimeout = setTimeout(() => {
      if (!player.isConnected && !this.isGameOver) {
        const winner = player.color === 'w' ? 'b' : 'w';
        this.endGame(winner, 'abandonment');
      }
    }, 60000);
  }

  private clearDisconnectGrace() {
    if (this.disconnectGraceTimeout) {
      clearTimeout(this.disconnectGraceTimeout);
      this.disconnectGraceTimeout = null;
    }
  }

  public makeMove(
    userId: string,
    moveAttempt: { from: string; to: string; promotion?: string }
  ): { success: boolean; error?: string } {
    if (this.isGameOver) {
      return { success: false, error: 'La partie est déjà terminée.' };
    }

    const playerColor = this.getPlayerColor(userId);
    if (!playerColor) {
      return { success: false, error: 'Vous ne participez pas à cette partie.' };
    }

    if (this.chess.turn() !== playerColor) {
      return { success: false, error: "Ce n'est pas votre tour de jouer." };
    }

    try {
      const move = this.chess.move({
        from: moveAttempt.from,
        to: moveAttempt.to,
        promotion: moveAttempt.promotion || 'q',
      });

      if (!move) {
        return { success: false, error: 'Coup illégal.' };
      }

      this.lastMoveTimestamp = Date.now();
      this.drawOfferedBy = null; // Clear draw offer when a move is played

      // Record move
      this.moves.push({
        from: move.from,
        to: move.to,
        promotion: move.promotion,
        san: move.san,
        playedBy: playerColor,
        timestamp: Date.now(),
        whiteTimeRemaining: this.whiteTimeRemainingMs,
        blackTimeRemaining: this.blackTimeRemainingMs,
      });

      // Check game termination
      if (this.chess.isCheckmate()) {
        this.endGame(playerColor, 'checkmate');
      } else if (this.chess.isStalemate()) {
        this.endGame('draw', 'stalemate');
      } else if (this.chess.isThreefoldRepetition()) {
        this.endGame('draw', 'threefold_repetition');
      } else if (this.chess.isInsufficientMaterial()) {
        this.endGame('draw', 'insufficient_material');
      } else if (this.chess.isDraw()) {
        this.endGame('draw', 'fifty_moves');
      } else {
        this.notifyState();
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Coup invalide.' };
    }
  }

  public resign(userId: string): { success: boolean; error?: string } {
    if (this.isGameOver) return { success: false, error: 'Partie terminée.' };
    const playerColor = this.getPlayerColor(userId);
    if (!playerColor) return { success: false, error: 'Joueur non autorisé.' };

    const winner: PieceColor = playerColor === 'w' ? 'b' : 'w';
    this.endGame(winner, 'resignation');
    return { success: true };
  }

  public offerDraw(userId: string): { success: boolean; error?: string } {
    if (this.isGameOver) return { success: false, error: 'Partie terminée.' };
    const playerColor = this.getPlayerColor(userId);
    if (!playerColor) return { success: false, error: 'Joueur non autorisé.' };

    this.drawOfferedBy = playerColor;
    this.notifyState();
    return { success: true };
  }

  public acceptDraw(userId: string): { success: boolean; error?: string } {
    if (this.isGameOver) return { success: false, error: 'Partie terminée.' };
    const playerColor = this.getPlayerColor(userId);
    if (!playerColor) return { success: false, error: 'Joueur non autorisé.' };
    if (!this.drawOfferedBy || this.drawOfferedBy === playerColor) {
      return { success: false, error: "Aucune proposition de nulle à accepter." };
    }

    this.endGame('draw', 'mutual_agreement');
    return { success: true };
  }

  public declineDraw(userId: string): { success: boolean; error?: string } {
    if (this.isGameOver) return { success: false, error: 'Partie terminée.' };
    const playerColor = this.getPlayerColor(userId);
    if (!playerColor) return { success: false, error: 'Joueur non autorisé.' };

    this.drawOfferedBy = null;
    this.notifyState();
    return { success: true };
  }

  private endGame(winner: PieceColor | 'draw', reason: GameTerminationReason) {
    if (this.isGameOver) return;
    this.isGameOver = true;
    this.winner = winner;
    this.terminationReason = reason;
    this.stopClock();
    this.clearDisconnectGrace();

    // Finalize in Database with Elo calculations
    const db = getPolychessDB();
    const dbWinner = winner === 'w' ? 'white' : winner === 'b' ? 'black' : 'draw';
    const finRes = db.finalizeGame(
      this.id,
      dbWinner,
      reason,
      JSON.stringify(this.moves),
      this.chess.fen()
    );

    if (finRes.success) {
      this.whiteEloChange = finRes.whiteEloChange;
      this.blackEloChange = finRes.blackEloChange;
      if (finRes.whiteNewElo !== undefined) this.whitePlayer.user.elo = finRes.whiteNewElo;
      if (finRes.blackNewElo !== undefined) this.blackPlayer.user.elo = finRes.blackNewElo;
    }

    this.notifyState();
  }

  public toPublicState(): ChessGameStatePublic {
    return {
      gameId: this.id,
      roomCode: this.roomCode,
      isPrivate: this.isPrivate,
      timeControl: this.timeControl,
      whitePlayer: this.whitePlayer.user,
      blackPlayer: this.blackPlayer.user,
      whiteConnected: this.whitePlayer.isConnected,
      blackConnected: this.blackPlayer.isConnected,
      currentTurn: this.chess.turn() as PieceColor,
      fen: this.chess.fen(),
      isCheck: this.chess.inCheck(),
      isGameOver: this.isGameOver,
      winner: this.winner,
      terminationReason: this.terminationReason,
      whiteTimeMs: this.whiteTimeRemainingMs,
      blackTimeMs: this.blackTimeRemainingMs,
      moves: this.moves,
      whiteEloChange: this.whiteEloChange,
      blackEloChange: this.blackEloChange,
      drawOfferedBy: this.drawOfferedBy,
    };
  }

  public notifyState() {
    this.onStateChange(this.toPublicState());
  }
}

export interface WaitingQueueEntry {
  user: UserPublic;
  socketId: string;
  timeControl: TimeControlKey;
  queuedAt: number;
}

export interface PrivateRoomEntry {
  roomCode: string;
  timeControl: TimeControlKey;
  hostUser: UserPublic;
  hostSocketId: string;
  createdAt: number;
}

export class ChessManager {
  private games: Map<string, PolychessGame> = new Map(); // gameId -> game
  private socketToGameId: Map<string, string> = new Map(); // socketId -> gameId
  private userToGameId: Map<string, string> = new Map(); // userId -> gameId
  private matchmakingQueue: WaitingQueueEntry[] = [];
  private privateRooms: Map<string, PrivateRoomEntry> = new Map(); // roomCode -> entry

  private broadcastToGame: (gameId: string, state: ChessGameStatePublic) => void;

  constructor(broadcastToGame: (gameId: string, state: ChessGameStatePublic) => void) {
    this.broadcastToGame = broadcastToGame;

    // Cleanup stale private rooms every 5 minutes
    setInterval(() => {
      const now = Date.now();
      for (const [code, room] of this.privateRooms.entries()) {
        if (now - room.createdAt > 30 * 60 * 1000) {
          this.privateRooms.delete(code);
        }
      }
    }, 5 * 60 * 1000);
  }

  // Quick Matchmaking
  public addToQueue(user: UserPublic, socketId: string, timeControl: TimeControlKey): PolychessGame | null {
    // Remove previous queue entry if any
    this.removeFromQueue(user.id);

    // Look for matching opponent in queue with same timeControl
    const matchIndex = this.matchmakingQueue.findIndex(
      (entry) => entry.timeControl === timeControl && entry.user.id !== user.id
    );

    if (matchIndex >= 0) {
      const opponent = this.matchmakingQueue.splice(matchIndex, 1)[0];
      return this.startGame(user, socketId, opponent.user, opponent.socketId, timeControl);
    }

    // Otherwise add to queue
    this.matchmakingQueue.push({
      user,
      socketId,
      timeControl,
      queuedAt: Date.now(),
    });

    return null;
  }

  public removeFromQueue(userId: string) {
    this.matchmakingQueue = this.matchmakingQueue.filter((e) => e.user.id !== userId);
  }

  // Private Rooms
  public createPrivateRoom(user: UserPublic, socketId: string, timeControl: TimeControlKey): string {
    // Generate 6-char room code
    let roomCode = '';
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    do {
      roomCode = '';
      for (let i = 0; i < 6; i++) {
        roomCode += chars[Math.floor(Math.random() * chars.length)];
      }
    } while (this.privateRooms.has(roomCode));

    this.privateRooms.set(roomCode, {
      roomCode,
      timeControl,
      hostUser: user,
      hostSocketId: socketId,
      createdAt: Date.now(),
    });

    return roomCode;
  }

  public joinPrivateRoom(
    roomCode: string,
    guestUser: UserPublic,
    guestSocketId: string
  ): { success: boolean; game?: PolychessGame; error?: string } {
    const code = roomCode.trim().toUpperCase();
    const entry = this.privateRooms.get(code);

    if (!entry) {
      return { success: false, error: 'Code de partie invalide ou partie expirée.' };
    }

    if (entry.hostUser.id === guestUser.id) {
      return { success: false, error: 'Vous ne pouvez pas rejoindre votre propre partie.' };
    }

    this.privateRooms.delete(code);

    // Start game
    const game = this.startGame(
      entry.hostUser,
      entry.hostSocketId,
      guestUser,
      guestSocketId,
      entry.timeControl,
      code,
      true
    );

    return { success: true, game };
  }

  private startGame(
    user1: UserPublic,
    socket1: string,
    user2: UserPublic,
    socket2: string,
    timeControl: TimeControlKey,
    roomCode?: string,
    isPrivate: boolean = false
  ): PolychessGame {
    const gameId = `cg_${crypto.randomUUID().slice(0, 10)}`;

    // 50/50 Random color assignment
    const isUser1White = Math.random() < 0.5;
    const whiteUser = isUser1White ? user1 : user2;
    const whiteSocket = isUser1White ? socket1 : socket2;
    const blackUser = isUser1White ? user2 : user1;
    const blackSocket = isUser1White ? socket2 : socket1;

    // Create in DB
    const db = getPolychessDB();
    db.createGame(gameId, whiteUser.id, blackUser.id, timeControl, roomCode);

    const game = new PolychessGame(
      gameId,
      whiteUser,
      whiteSocket,
      blackUser,
      blackSocket,
      timeControl,
      (state) => this.broadcastToGame(gameId, state),
      roomCode,
      isPrivate
    );

    this.games.set(gameId, game);
    this.userToGameId.set(whiteUser.id, gameId);
    this.userToGameId.set(blackUser.id, gameId);
    this.socketToGameId.set(whiteSocket, gameId);
    this.socketToGameId.set(blackSocket, gameId);

    return game;
  }

  public getGame(gameId: string): PolychessGame | undefined {
    return this.games.get(gameId);
  }

  public getGameByUserId(userId: string): PolychessGame | undefined {
    const id = this.userToGameId.get(userId);
    return id ? this.games.get(id) : undefined;
  }

  public getGameBySocketId(socketId: string): PolychessGame | undefined {
    const id = this.socketToGameId.get(socketId);
    return id ? this.games.get(id) : undefined;
  }

  public handleSocketDisconnect(socketId: string) {
    this.removeFromQueueBySocket(socketId);

    const game = this.getGameBySocketId(socketId);
    if (game) {
      game.handleDisconnect(socketId);
      this.socketToGameId.delete(socketId);
    }
  }

  private removeFromQueueBySocket(socketId: string) {
    this.matchmakingQueue = this.matchmakingQueue.filter((e) => e.socketId !== socketId);
  }

  public reconnectUser(userId: string, socketId: string): PolychessGame | null {
    const game = this.getGameByUserId(userId);
    if (!game || game.isGameOver) return null;

    game.updateSocket(userId, socketId);
    this.socketToGameId.set(socketId, game.id);
    return game;
  }
}
