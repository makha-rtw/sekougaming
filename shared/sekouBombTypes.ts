export type BombLanguage = 'fr' | 'en';

export type BombDifficulty = 'easy' | 'normal' | 'hard';

export type BombGameStatus =
  | 'LOBBY'
  | 'COUNTDOWN'
  | 'PLAYING'
  | 'PLAYER_ELIMINATED'
  | 'ROUND_TRANSITION'
  | 'GAME_OVER';

export type WordRepetitionPolicy = 'forbid' | 'allow';

export type InvalidAttemptPolicy = 'retry' | 'lose_life';

export type BombGameMode = 'classic';

export type BombValidationErrorCode =
  | 'not_your_turn'
  | 'game_not_active'
  | 'time_expired'
  | 'empty_input'
  | 'malformed_input'
  | 'missing_prompt'
  | 'word_not_in_dictionary'
  | 'already_used'
  | 'rate_limited';

export interface BombRoomSettings {
  language: BombLanguage;
  initialLives: number; // default 3 (1..5)
  maxLives: number; // default 5 (1..7)
  minTurnDurationSec: number; // default 5 (3..15)
  maxBombDurationSec: number; // default 15 (8..30)
  difficulty: BombDifficulty; // 'easy' | 'normal' | 'hard'
  maxPromptFailures: number; // default 2 (1..5)
  bonusAlphabetEnabled: boolean; // default true
  bonusAlphabetLetters: string; // e.g. 'ABCDEFGHIJKLMNOPQRSTUVYZ' (FR) or 'ABCDEFGHIJKLMNOPQRSTUVWY' (EN)
  wordRepetitionPolicy: WordRepetitionPolicy; // default 'forbid'
  invalidAttemptPolicy: InvalidAttemptPolicy; // default 'retry'
  maxPlayers: number; // default 16 (2..16)
  gameMode: BombGameMode; // 'classic'
}

export const DEFAULT_BOMB_ALPHABET: Record<BombLanguage, string> = {
  fr: 'ABCDEFGHIJKLMNOPQRSTUVYZ',
  en: 'ABCDEFGHIJKLMNOPQRSTUVWY',
};

export const DEFAULT_BOMB_SETTINGS: BombRoomSettings = {
  language: 'fr',
  initialLives: 3,
  maxLives: 5,
  minTurnDurationSec: 5,
  maxBombDurationSec: 15,
  difficulty: 'normal',
  maxPromptFailures: 2,
  bonusAlphabetEnabled: true,
  bonusAlphabetLetters: DEFAULT_BOMB_ALPHABET.fr,
  wordRepetitionPolicy: 'forbid',
  invalidAttemptPolicy: 'retry',
  maxPlayers: 16,
  gameMode: 'classic',
};

export interface BombPlayerPublic {
  id: string;
  name: string;
  isHost: boolean;
  isConnected: boolean;
  isSpectator: boolean;
  orderIndex: number;
  lives: number;
  maxLives: number;
  isEliminated: boolean;
  eliminatedAtRound: number | null;
  finalRank: number | null;
  wordsValidated: number;
  longestWord: string;
  bonusLettersUsed: string[];
  bonusLivesEarned: number;
  lastWordSubmitted: string | null;
  lastWordStatus: 'valid' | 'invalid' | 'timeout' | null;
  currentTyping: string;
}

export interface BombLastEvent {
  id: string;
  type:
    | 'word_accepted'
    | 'word_rejected'
    | 'timeout_life_lost'
    | 'player_eliminated'
    | 'bonus_life_earned'
    | 'prompt_replaced'
    | 'game_started'
    | 'game_over';
  playerId?: string;
  playerName?: string;
  word?: string;
  prompt?: string;
  reasonCode?: BombValidationErrorCode;
  livesRemaining?: number;
  timestamp: number;
}

export interface BombRoomStatePublic {
  roomCode: string;
  status: BombGameStatus;
  settings: BombRoomSettings;
  players: BombPlayerPublic[];
  activePlayerId: string | null;
  currentPrompt: string;
  currentPromptDifficulty: BombDifficulty;
  promptFailuresCount: number;
  turnStartedAtServerMs: number;
  turnDeadlineServerMs: number;
  turnDurationMs: number;
  serverNowMs: number;
  countdownEndsAtServerMs: number | null;
  roundNumber: number;
  totalWordsPlayed: number;
  usedWordsCount: number;
  recentValidWords: { playerName: string; word: string; prompt: string }[];
  bonusAlphabetTarget: string[];
  winnerId: string | null;
  winnerName: string | null;
  lastEvent: BombLastEvent | null;
}
