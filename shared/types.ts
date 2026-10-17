export type CardColor = 'red' | 'blue' | 'green' | 'yellow' | 'black';
export type PlayableColor = 'red' | 'blue' | 'green' | 'yellow';

export type CardValue =
  | '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'
  | 'skip'
  | 'reverse'
  | 'draw2'
  | 'wild'
  | 'wild4';

export interface Card {
  id: string;
  color: CardColor;
  value: CardValue;
}

export interface PlayerPublic {
  id: string;
  name: string;
  cardCount: number;
  isConnected: boolean;
  isHost: boolean;
  hasCalledUno: boolean;
  avatarIndex?: number;
}

export interface PlayerPrivate extends PlayerPublic {
  sessionToken: string;
  hand: Card[];
}

export type GameStatus = 'waiting' | 'in_game' | 'game_over';

export interface PenaltyStack {
  cardType: 'draw2' | 'wild4';
  totalCards: number;
  targetPlayerId: string;
}

export interface GameStatePublic {
  roomCode: string;
  status: GameStatus;
  hostId: string;
  players: PlayerPublic[];
  currentTurnPlayerId: string | null;
  direction: 1 | -1; // 1 = clockwise, -1 = counter-clockwise
  topDiscard: Card | null;
  currentColor: PlayableColor | null;
  drawPileCount: number;
  discardPileCount: number;
  penaltyStack: PenaltyStack | null;
  winner: PlayerPublic | null;
  lastActionMessage: string | null;
  unoNotice: { playerId: string; playerName: string; timestamp: number } | null;
  drawnCardPlayableId: string | null;
}

export interface ClientGameState {
  public: GameStatePublic;
  myHand: Card[];
  myPlayerId: string;
  isMyTurn: boolean;
  canCallUno: boolean;
  canPassTurn: boolean;
}

export interface ActionResponse {
  success: boolean;
  error?: string;
  message?: string;
}
