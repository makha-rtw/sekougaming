import { DepartmentCode, MatchHistoryItem, UserPublic } from '../../../shared/chessTypes.js';

export interface IPolychessDatabase {
  createUser(
    username: string,
    passwordPlain: string,
    department: DepartmentCode
  ): Promise<{ success: boolean; user?: UserPublic; error?: string }> | { success: boolean; user?: UserPublic; error?: string };

  verifyUser(
    username: string,
    passwordPlain: string
  ): Promise<{ success: boolean; user?: UserPublic; error?: string }> | { success: boolean; user?: UserPublic; error?: string };

  getUserById(id: string): Promise<UserPublic | null> | (UserPublic | null);

  getUserByUsername(username: string): Promise<UserPublic | null> | (UserPublic | null);

  getLeaderboard(department?: DepartmentCode, limit?: number): Promise<UserPublic[]> | UserPublic[];

  createGame(
    gameId: string,
    whiteUserId: string,
    blackUserId: string,
    timeControl: string,
    roomCode?: string
  ): Promise<void> | void;

  finalizeGame(
    gameId: string,
    winner: 'white' | 'black' | 'draw',
    endReason: string,
    movesJson: string,
    finalFen: string
  ): Promise<{
    success: boolean;
    whiteEloChange?: number;
    blackEloChange?: number;
    whiteNewElo?: number;
    blackNewElo?: number;
  }> | {
    success: boolean;
    whiteEloChange?: number;
    blackEloChange?: number;
    whiteNewElo?: number;
    blackNewElo?: number;
  };

  getUserMatchHistory(userId: string, limit?: number): Promise<MatchHistoryItem[]> | MatchHistoryItem[];
}
