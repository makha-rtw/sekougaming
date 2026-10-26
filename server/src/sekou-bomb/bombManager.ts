import { BombRoomSettings } from '../../../shared/sekouBombTypes.js';
import { BombPlayerInternal, BombRoomOptions, SekouBombRoom } from './bombRoom.js';

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export class SekouBombManager {
  private rooms: Map<string, SekouBombRoom> = new Map();
  private onRoomStateChange: (roomCode: string) => void;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private roomOptions?: BombRoomOptions;

  constructor(onRoomStateChange: (roomCode: string) => void, roomOptions?: BombRoomOptions) {
    this.onRoomStateChange = onRoomStateChange;
    this.roomOptions = roomOptions;

    // Periodic cleanup of inactive or empty rooms every 2 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupInactiveRooms();
    }, 2 * 60 * 1000);
    this.cleanupInterval.unref?.();
  }

  private generateUniqueCode(): string {
    let code = '';
    do {
      code = '';
      for (let i = 0; i < 6; i++) {
        code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
      }
    } while (this.rooms.has(code));
    return code;
  }

  public createRoom(initialSettings?: Partial<BombRoomSettings>): SekouBombRoom {
    const code = this.generateUniqueCode();
    const room = new SekouBombRoom(
      code,
      (roomCode) => this.onRoomStateChange(roomCode),
      initialSettings,
      this.roomOptions
    );
    this.rooms.set(code, room);
    return room;
  }

  public getRoom(code: string): SekouBombRoom | undefined {
    if (!code || typeof code !== 'string') return undefined;
    return this.rooms.get(code.trim().toUpperCase());
  }

  public removeRoom(code: string): void {
    const room = this.getRoom(code);
    if (room) {
      room.clearAllTimers();
      this.rooms.delete(room.code);
    }
  }

  public getSessionBySocketId(
    socketId: string
  ): { room: SekouBombRoom; player: BombPlayerInternal } | null {
    for (const room of this.rooms.values()) {
      for (const player of room.players.values()) {
        if (player.socketId === socketId) {
          return { room, player };
        }
      }
    }
    return null;
  }

  public cleanupInactiveRooms(maxIdleMs: number = 30 * 60 * 1000): void {
    const now = Date.now();
    for (const [code, room] of this.rooms.entries()) {
      const anyConnected = Array.from(room.players.values()).some((p) => p.isConnected);
      const idleMs = now - room.lastActivityAt;

      if (room.players.size === 0 || (!anyConnected && idleMs > 5 * 60 * 1000) || idleMs > maxIdleMs) {
        room.clearAllTimers();
        this.rooms.delete(code);
      }
    }
  }
}
