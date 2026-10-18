// Shared Types for POLYCHESS (Sekou-Gaming)

export type DepartmentCode = 'INF' | 'TR' | 'Civil' | 'MECA' | 'G' | 'GCBA';

export interface DepartmentInfo {
  code: DepartmentCode;
  name: string;
}

export const DEPARTMENTS: Record<DepartmentCode, string> = {
  INF: 'Informatique',
  TR: 'Télécommunication et Réseaux',
  Civil: 'Génie Civil',
  MECA: 'Génie Mécanique',
  G: 'Gestion',
  GCBA: 'GCBA',
};

export const VALID_DEPARTMENT_CODES: DepartmentCode[] = ['INF', 'TR', 'Civil', 'MECA', 'G', 'GCBA'];

export interface UserPublic {
  id: string;
  username: string;
  department: DepartmentCode;
  departmentName: string;
  elo: number;
  rankedGames: number;
  wins: number;
  draws: number;
  losses: number;
  createdAt: number;
}

export type TimeControlKey = 'none' | '3m' | '5m' | '10m';

export interface TimeControlConfig {
  key: TimeControlKey;
  label: string;
  seconds: number | null; // null for unlimited
}

export const TIME_CONTROLS: Record<TimeControlKey, TimeControlConfig> = {
  none: { key: 'none', label: 'Sans limite', seconds: null },
  '3m': { key: '3m', label: '3 min', seconds: 180 },
  '5m': { key: '5m', label: '5 min', seconds: 300 },
  '10m': { key: '10m', label: '10 min', seconds: 600 },
};

export type PieceColor = 'w' | 'b';

export type GameTerminationReason =
  | 'checkmate'
  | 'resignation'
  | 'timeout'
  | 'stalemate'
  | 'threefold_repetition'
  | 'insufficient_material'
  | 'fifty_moves'
  | 'mutual_agreement'
  | 'abandonment';

export interface ChessMoveRecord {
  from: string;
  to: string;
  promotion?: string;
  san: string;
  playedBy: PieceColor;
  timestamp: number;
  whiteTimeRemaining: number | null;
  blackTimeRemaining: number | null;
}

export interface ChessGameStatePublic {
  gameId: string;
  roomCode?: string;
  isPrivate: boolean;
  timeControl: TimeControlKey;
  whitePlayer: UserPublic | null;
  blackPlayer: UserPublic | null;
  whiteConnected: boolean;
  blackConnected: boolean;
  currentTurn: PieceColor;
  fen: string;
  isCheck: boolean;
  isGameOver: boolean;
  winner: PieceColor | 'draw' | null;
  terminationReason: GameTerminationReason | null;
  whiteTimeMs: number | null;
  blackTimeMs: number | null;
  moves: ChessMoveRecord[];
  whiteEloChange?: number;
  blackEloChange?: number;
  drawOfferedBy?: PieceColor | null;
}

export interface EloUpdate {
  userId: string;
  eloBefore: number;
  eloAfter: number;
  change: number;
  result: 'win' | 'draw' | 'loss';
}

export interface MatchHistoryItem {
  id: string;
  date: number;
  opponentUsername: string;
  opponentDepartment: DepartmentCode;
  myColor: PieceColor;
  result: 'win' | 'loss' | 'draw';
  endReason: GameTerminationReason;
  timeControl: TimeControlKey;
  eloBefore: number;
  eloAfter: number;
  eloChange: number;
}
