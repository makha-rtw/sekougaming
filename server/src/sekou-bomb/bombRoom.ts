import crypto from 'node:crypto';
import {
  BombDifficulty,
  BombGameStatus,
  BombLanguage,
  BombLastEvent,
  BombPlayerPublic,
  BombRoomSettings,
  BombRoomStatePublic,
  BombValidationErrorCode,
  DEFAULT_BOMB_ALPHABET,
  DEFAULT_BOMB_SETTINGS,
} from '../../../shared/sekouBombTypes.js';
import { getDictionary } from './dictionary.js';
import { getPromptGenerator } from './promptGenerator.js';

export interface BombPlayerInternal extends BombPlayerPublic {
  socketId: string;
  sessionToken: string;
  disconnectedAt: number | null;
  submissionTimestamps: number[];
}

export interface BombRoomOptions {
  countdownDurationMs?: number;
  transitionDurationMs?: number;
}

export function sanitizePlayerName(rawName: string): { valid: boolean; name: string; error?: string } {
  if (typeof rawName !== 'string') {
    return { valid: false, name: '', error: 'Pseudonyme invalide.' };
  }
  // Strip HTML tags and control characters
  const cleaned = rawName
    .replace(/[<>[\]{}\\/]/g, '')
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (cleaned.length < 2) {
    return { valid: false, name: '', error: 'Le pseudonyme doit contenir au moins 2 caractères.' };
  }
  if (cleaned.length > 20) {
    return { valid: false, name: '', error: 'Le pseudonyme ne peut pas dépasser 20 caractères.' };
  }
  return { valid: true, name: cleaned };
}

export function sanitizeSettings(
  partial: Partial<BombRoomSettings>,
  current: BombRoomSettings = DEFAULT_BOMB_SETTINGS
): BombRoomSettings {
  const language: BombLanguage =
    partial.language === 'en' || partial.language === 'fr' ? partial.language : current.language;

  const initialLives = Math.max(1, Math.min(5, Math.round(Number(partial.initialLives ?? current.initialLives) || 3)));
  const maxLives = Math.max(
    initialLives,
    Math.min(7, Math.round(Number(partial.maxLives ?? current.maxLives) || 5))
  );

  const minTurnDurationSec = Math.max(
    3,
    Math.min(15, Math.round(Number(partial.minTurnDurationSec ?? current.minTurnDurationSec) || 5))
  );
  const maxBombDurationSec = Math.max(
    minTurnDurationSec + 2,
    Math.min(30, Math.round(Number(partial.maxBombDurationSec ?? current.maxBombDurationSec) || 15))
  );

  const difficulty: BombDifficulty =
    partial.difficulty === 'easy' || partial.difficulty === 'normal' || partial.difficulty === 'hard'
      ? partial.difficulty
      : current.difficulty;

  const maxPromptFailures = Math.max(
    1,
    Math.min(5, Math.round(Number(partial.maxPromptFailures ?? current.maxPromptFailures) || 2))
  );

  const bonusAlphabetEnabled =
    typeof partial.bonusAlphabetEnabled === 'boolean'
      ? partial.bonusAlphabetEnabled
      : current.bonusAlphabetEnabled;

  let bonusAlphabetLetters = current.bonusAlphabetLetters;
  if (typeof partial.bonusAlphabetLetters === 'string') {
    const cleanedLetters = Array.from(
      new Set(
        partial.bonusAlphabetLetters
          .toUpperCase()
          .replace(/[^A-Z]/g, '')
          .split('')
      )
    ).join('');
    if (cleanedLetters.length >= 3 && cleanedLetters.length <= 26) {
      bonusAlphabetLetters = cleanedLetters;
    }
  } else if (partial.language && partial.language !== current.language) {
    bonusAlphabetLetters = DEFAULT_BOMB_ALPHABET[language];
  }

  const wordRepetitionPolicy =
    partial.wordRepetitionPolicy === 'allow' || partial.wordRepetitionPolicy === 'forbid'
      ? partial.wordRepetitionPolicy
      : current.wordRepetitionPolicy;

  const invalidAttemptPolicy =
    partial.invalidAttemptPolicy === 'lose_life' || partial.invalidAttemptPolicy === 'retry'
      ? partial.invalidAttemptPolicy
      : current.invalidAttemptPolicy;

  const maxPlayers = Math.max(
    2,
    Math.min(16, Math.round(Number(partial.maxPlayers ?? current.maxPlayers) || 16))
  );

  return {
    language,
    initialLives,
    maxLives,
    minTurnDurationSec,
    maxBombDurationSec,
    difficulty,
    maxPromptFailures,
    bonusAlphabetEnabled,
    bonusAlphabetLetters,
    wordRepetitionPolicy,
    invalidAttemptPolicy,
    maxPlayers,
    gameMode: 'classic',
  };
}

export class SekouBombRoom {
  public readonly code: string;
  public status: BombGameStatus = 'LOBBY';
  public settings: BombRoomSettings;
  public players: Map<string, BombPlayerInternal> = new Map();

  public activePlayerId: string | null = null;
  public currentPrompt: string = '';
  public currentPromptDifficulty: BombDifficulty = 'normal';
  public promptFailuresCount: number = 0;

  public turnStartedAtServerMs: number = 0;
  public turnDeadlineServerMs: number = 0;
  public turnDurationMs: number = 0;
  public currentFuseMs: number = 0;
  public countdownEndsAtServerMs: number | null = null;

  public roundNumber: number = 0;
  public totalWordsPlayed: number = 0;
  public usedWords: Set<string> = new Set();
  public usedPrompts: Set<string> = new Set();
  public recentValidWords: { playerName: string; word: string; prompt: string }[] = [];

  public winnerId: string | null = null;
  public winnerName: string | null = null;
  public lastEvent: BombLastEvent | null = null;
  public lastActivityAt: number = Date.now();

  private countdownTimeout: NodeJS.Timeout | null = null;
  private turnTimeout: NodeJS.Timeout | null = null;
  private transitionTimeout: NodeJS.Timeout | null = null;
  private isProcessingAction: boolean = false;

  private readonly countdownDurationMs: number;
  private readonly transitionDurationMs: number;
  private readonly onStateChange: (roomCode: string) => void;

  constructor(
    code: string,
    onStateChange: (roomCode: string) => void,
    initialSettings?: Partial<BombRoomSettings>,
    options?: BombRoomOptions
  ) {
    this.code = code;
    this.onStateChange = onStateChange;
    this.settings = sanitizeSettings(initialSettings || {}, DEFAULT_BOMB_SETTINGS);
    this.countdownDurationMs = options?.countdownDurationMs ?? 3000;
    this.transitionDurationMs = options?.transitionDurationMs ?? 450;
  }

  public getBonusAlphabetTarget(): string[] {
    return Array.from(
      new Set(
        this.settings.bonusAlphabetLetters
          .toUpperCase()
          .replace(/[^A-Z]/g, '')
          .split('')
      )
    );
  }

  public addPlayer(
    rawName: string,
    socketId: string
  ): { success: boolean; player?: BombPlayerInternal; error?: string; errorCode?: string } {
    this.lastActivityAt = Date.now();

    const nameCheck = sanitizePlayerName(rawName);
    if (!nameCheck.valid) {
      return { success: false, error: nameCheck.error, errorCode: 'invalid_name' };
    }

    // Prevent same socket from registering twice
    for (const existing of this.players.values()) {
      if (existing.socketId === socketId && existing.isConnected) {
        return { success: true, player: existing };
      }
    }

    if (this.status !== 'LOBBY') {
      return {
        success: false,
        error: 'Une partie est déjà en cours dans ce salon.',
        errorCode: 'game_in_progress',
      };
    }

    if (this.players.size >= this.settings.maxPlayers) {
      return {
        success: false,
        error: `Ce salon est complet (${this.settings.maxPlayers}/${this.settings.maxPlayers}).`,
        errorCode: 'room_full',
      };
    }

    // Deduplicate player display name if already taken in room
    let finalName = nameCheck.name;
    const existingNames = new Set(Array.from(this.players.values()).map((p) => p.name.toLowerCase()));
    if (existingNames.has(finalName.toLowerCase())) {
      let suffix = 2;
      while (existingNames.has(`${finalName.toLowerCase()} #${suffix}`)) {
        suffix++;
      }
      finalName = `${finalName} #${suffix}`.slice(0, 20);
    }

    const id = `bp_${crypto.randomUUID().slice(0, 8)}`;
    const sessionToken = crypto.randomBytes(18).toString('hex');
    const isHost = this.players.size === 0;

    const player: BombPlayerInternal = {
      id,
      name: finalName,
      socketId,
      sessionToken,
      isHost,
      isConnected: true,
      isSpectator: false,
      orderIndex: this.players.size,
      lives: this.settings.initialLives,
      maxLives: this.settings.maxLives,
      isEliminated: false,
      eliminatedAtRound: null,
      finalRank: null,
      wordsValidated: 0,
      longestWord: '',
      bonusLettersUsed: [],
      bonusLivesEarned: 0,
      lastWordSubmitted: null,
      lastWordStatus: null,
      currentTyping: '',
      disconnectedAt: null,
      submissionTimestamps: [],
    };

    this.players.set(id, player);
    this.notify();
    return { success: true, player };
  }

  public reconnectPlayer(
    sessionToken: string,
    newSocketId: string
  ): { success: boolean; player?: BombPlayerInternal; error?: string } {
    this.lastActivityAt = Date.now();
    for (const player of this.players.values()) {
      if (player.sessionToken === sessionToken) {
        player.socketId = newSocketId;
        player.isConnected = true;
        player.disconnectedAt = null;
        this.notify();
        return { success: true, player };
      }
    }
    return { success: false, error: 'Session expirée ou introuvable.' };
  }

  public handleDisconnect(socketId: string): void {
    this.lastActivityAt = Date.now();
    for (const player of this.players.values()) {
      if (player.socketId === socketId) {
        player.isConnected = false;
        player.disconnectedAt = Date.now();

        // If host disconnects in LOBBY, reassign host to another connected player if available
        if (player.isHost) {
          this.reassignHostIfPossible(player.id);
        }

        this.notify();
        return;
      }
    }
  }

  public removePlayer(playerId: string): void {
    this.lastActivityAt = Date.now();
    const player = this.players.get(playerId);
    if (!player) return;

    const wasHost = player.isHost;
    const wasActivePlayer = this.activePlayerId === playerId;

    if (this.status === 'LOBBY' || this.status === 'GAME_OVER') {
      this.players.delete(playerId);
      this.reindexPlayers();
      if (wasHost) {
        this.reassignHostIfPossible();
      }
      this.notify();
      return;
    }

    // If game is in progress, mark player as eliminated & disconnected so ranking/history remains coherent
    player.isConnected = false;
    if (!player.isEliminated) {
      const aliveBefore = this.getAlivePlayers().length;
      player.lives = 0;
      player.isEliminated = true;
      player.eliminatedAtRound = this.roundNumber;
      player.finalRank = aliveBefore;
    }

    if (wasHost) {
      player.isHost = false;
      this.reassignHostIfPossible(playerId);
    }

    const aliveAfter = this.getAlivePlayers();
    if (aliveAfter.length <= 1) {
      this.finishGame(aliveAfter[0] || null);
      return;
    }

    if (wasActivePlayer && this.status === 'PLAYING') {
      this.clearTurnTimer();
      this.advanceToNextPlayer(true);
    } else {
      this.notify();
    }
  }

  private reassignHostIfPossible(excludePlayerId?: string): void {
    const all = Array.from(this.players.values());
    const connectedCandidate = all.find((p) => p.id !== excludePlayerId && p.isConnected);
    const fallbackCandidate = all.find((p) => p.id !== excludePlayerId);
    const nextHost = connectedCandidate || fallbackCandidate;

    if (nextHost) {
      for (const p of all) {
        p.isHost = p.id === nextHost.id;
      }
    }
  }

  private reindexPlayers(): void {
    let idx = 0;
    for (const p of this.players.values()) {
      p.orderIndex = idx++;
    }
  }

  public updateSettings(
    playerId: string,
    partial: Partial<BombRoomSettings>
  ): { success: boolean; error?: string } {
    this.lastActivityAt = Date.now();
    const player = this.players.get(playerId);
    if (!player || !player.isHost) {
      return { success: false, error: "Seul l'hôte peut modifier les paramètres." };
    }
    if (this.status !== 'LOBBY') {
      return {
        success: false,
        error: 'Impossible de modifier les paramètres pendant une partie en cours.',
      };
    }

    this.settings = sanitizeSettings(partial, this.settings);

    // Sync lobby players' initial & max lives display
    for (const p of this.players.values()) {
      p.lives = this.settings.initialLives;
      p.maxLives = this.settings.maxLives;
    }

    this.notify();
    return { success: true };
  }

  public startGame(playerId: string): { success: boolean; error?: string } {
    this.lastActivityAt = Date.now();
    const requester = this.players.get(playerId);
    if (!requester || !requester.isHost) {
      return { success: false, error: "Seul l'hôte peut lancer la partie." };
    }

    if (this.status !== 'LOBBY' && this.status !== 'GAME_OVER') {
      return { success: false, error: 'La partie a déjà commencé.' };
    }

    if (this.players.size < 2) {
      return { success: false, error: 'Il faut au moins 2 joueurs pour lancer Sekou Bomb.' };
    }

    this.clearAllTimers();

    // Warm up dictionary & prompt generator
    getDictionary(this.settings.language);
    getPromptGenerator(this.settings.language);

    // Reset room game state
    this.usedWords.clear();
    this.usedPrompts.clear();
    this.recentValidWords = [];
    this.roundNumber = 1;
    this.totalWordsPlayed = 0;
    this.promptFailuresCount = 0;
    this.winnerId = null;
    this.winnerName = null;
    this.activePlayerId = null;
    this.currentPrompt = '';

    let idx = 0;
    for (const p of this.players.values()) {
      p.orderIndex = idx++;
      p.isSpectator = false;
      p.lives = this.settings.initialLives;
      p.maxLives = this.settings.maxLives;
      p.isEliminated = false;
      p.eliminatedAtRound = null;
      p.finalRank = null;
      p.wordsValidated = 0;
      p.longestWord = '';
      p.bonusLettersUsed = [];
      p.bonusLivesEarned = 0;
      p.lastWordSubmitted = null;
      p.lastWordStatus = null;
      p.currentTyping = '';
      p.submissionTimestamps = [];
    }

    this.status = 'COUNTDOWN';
    this.countdownEndsAtServerMs = Date.now() + this.countdownDurationMs;
    this.emitEvent({
      type: 'game_started',
      timestamp: Date.now(),
    });

    if (this.countdownDurationMs <= 0) {
      this.beginPlayingFromCountdown();
    } else {
      this.notify();
      this.countdownTimeout = setTimeout(() => {
        this.beginPlayingFromCountdown();
      }, this.countdownDurationMs);
    }

    return { success: true };
  }

  private beginPlayingFromCountdown(): void {
    this.countdownTimeout = null;
    this.countdownEndsAtServerMs = null;

    const alive = this.getAlivePlayers();
    if (alive.length < 2) {
      this.finishGame(alive[0] || null);
      return;
    }

    this.status = 'PLAYING';
    this.activePlayerId = alive[0].id;
    this.currentFuseMs = this.settings.maxBombDurationSec * 1000;
    this.selectNewPrompt();
    this.startTurnTimer(this.currentFuseMs);
    this.notify();
  }

  private selectNewPrompt(): void {
    const gen = getPromptGenerator(this.settings.language);
    const chosen = gen.pickNextPrompt(
      this.settings.difficulty,
      this.usedPrompts,
      this.currentPrompt,
      this.roundNumber
    );
    this.currentPrompt = chosen.prompt;
    this.currentPromptDifficulty = chosen.difficulty;
    this.promptFailuresCount = 0;
  }

  private startTurnTimer(requestedDurationMs: number): void {
    this.clearTurnTimer();

    const minTurnMs = this.settings.minTurnDurationSec * 1000;
    const maxTurnMs = this.settings.maxBombDurationSec * 1000;
    const durationMs = Math.max(minTurnMs, Math.min(maxTurnMs, Math.round(requestedDurationMs)));

    this.turnDurationMs = durationMs;
    this.turnStartedAtServerMs = Date.now();
    this.turnDeadlineServerMs = this.turnStartedAtServerMs + durationMs;

    this.turnTimeout = setTimeout(() => {
      this.handleTurnTimeout();
    }, durationMs);
  }

  public updateTyping(playerId: string, rawText: string): void {
    if (this.status !== 'PLAYING' || this.activePlayerId !== playerId) return;
    const player = this.players.get(playerId);
    if (!player || player.isEliminated) return;

    const sanitized = String(rawText || '')
      .replace(/[<>[\]{}\\/]/g, '')
      .slice(0, 32)
      .toUpperCase();
    if (player.currentTyping !== sanitized) {
      player.currentTyping = sanitized;
      this.notify();
    }
  }

  public submitWord(
    playerId: string,
    rawWord: string
  ): {
    success: boolean;
    valid?: boolean;
    errorCode?: BombValidationErrorCode;
    error?: string;
    canonicalWord?: string;
    bonusLifeEarned?: boolean;
  } {
    this.lastActivityAt = Date.now();

    if (this.isProcessingAction) {
      return { success: false, valid: false, errorCode: 'rate_limited', error: 'Action déjà en cours.' };
    }

    if (this.status !== 'PLAYING') {
      return {
        success: false,
        valid: false,
        errorCode: 'game_not_active',
        error: "La manche n'est pas active.",
      };
    }

    const player = this.players.get(playerId);
    if (!player || player.isEliminated || this.activePlayerId !== playerId) {
      return {
        success: false,
        valid: false,
        errorCode: 'not_your_turn',
        error: "Ce n'est pas votre tour.",
      };
    }

    const now = Date.now();

    // Check server-authoritative deadline first
    if (now > this.turnDeadlineServerMs) {
      this.handleTurnTimeout();
      return {
        success: false,
        valid: false,
        errorCode: 'time_expired',
        error: 'Temps écoulé !',
      };
    }

    // Rate limit: max 8 attempts within 2000ms
    player.submissionTimestamps = player.submissionTimestamps.filter((t) => now - t < 2000);
    if (player.submissionTimestamps.length >= 8) {
      return {
        success: false,
        valid: false,
        errorCode: 'rate_limited',
        error: 'Trop de tentatives rapprochées.',
      };
    }
    player.submissionTimestamps.push(now);

    this.isProcessingAction = true;
    try {
      const dict = getDictionary(this.settings.language);
      const validation = dict.validateSubmission(
        rawWord,
        this.currentPrompt,
        this.usedWords,
        this.settings.wordRepetitionPolicy
      );

      if (!validation.valid || !validation.normalizedKey || !validation.canonicalWord) {
        const safePreview = String(rawWord || '')
          .replace(/[<>[\]{}\\/]/g, '')
          .trim()
          .slice(0, 28)
          .toUpperCase();

        player.lastWordSubmitted = safePreview || null;
        player.lastWordStatus = 'invalid';

        this.emitEvent({
          type: 'word_rejected',
          playerId: player.id,
          playerName: player.name,
          word: safePreview,
          prompt: this.currentPrompt,
          reasonCode: validation.errorCode,
          timestamp: now,
        });

        // Check if host configured invalid attempts to cost a life immediately
        if (this.settings.invalidAttemptPolicy === 'lose_life') {
          this.clearTurnTimer();
          this.applyLifeLossAndAdvance(player, 'word_rejected', validation.errorCode);
        } else {
          this.notify();
        }

        return {
          success: true,
          valid: false,
          errorCode: validation.errorCode,
        };
      }

      // VALID WORD!
      this.clearTurnTimer();
      this.usedWords.add(validation.normalizedKey);
      this.totalWordsPlayed++;

      player.wordsValidated++;
      player.currentTyping = '';
      player.lastWordSubmitted = validation.canonicalWord.toUpperCase();
      player.lastWordStatus = 'valid';

      if (validation.canonicalWord.length > player.longestWord.length) {
        player.longestWord = validation.canonicalWord.toUpperCase();
      }

      this.recentValidWords.unshift({
        playerName: player.name,
        word: validation.canonicalWord.toUpperCase(),
        prompt: this.currentPrompt,
      });
      if (this.recentValidWords.length > 8) {
        this.recentValidWords.pop();
      }

      // Check Bonus Alphabet Mechanic
      let bonusLifeEarned = false;
      if (this.settings.bonusAlphabetEnabled && validation.lettersInWord) {
        const targetAlphabet = this.getBonusAlphabetTarget();
        const targetSet = new Set(targetAlphabet);
        const usedSet = new Set(player.bonusLettersUsed);

        for (const letter of validation.lettersInWord) {
          if (targetSet.has(letter)) {
            usedSet.add(letter);
          }
        }

        player.bonusLettersUsed = Array.from(usedSet).sort();

        if (targetAlphabet.length > 0 && player.bonusLettersUsed.length >= targetAlphabet.length) {
          // Completed full bonus alphabet! Reset letters and grant +1 life up to maxLives
          player.bonusLettersUsed = [];
          if (player.lives < this.settings.maxLives) {
            player.lives = Math.min(this.settings.maxLives, player.lives + 1);
            player.bonusLivesEarned++;
            bonusLifeEarned = true;
          }
        }
      }

      this.emitEvent({
        type: bonusLifeEarned ? 'bonus_life_earned' : 'word_accepted',
        playerId: player.id,
        playerName: player.name,
        word: validation.canonicalWord.toUpperCase(),
        prompt: this.currentPrompt,
        livesRemaining: player.lives,
        timestamp: now,
      });

      // Shrink remaining fuse slightly to keep tension rising, bounded by minTurnDurationSec
      const elapsedMs = Math.max(200, now - this.turnStartedAtServerMs);
      const shrinkStepMs = this.settings.difficulty === 'hard' ? 900 : 600;
      this.currentFuseMs = Math.max(
        this.settings.minTurnDurationSec * 1000,
        this.currentFuseMs - Math.min(elapsedMs * 0.25, shrinkStepMs)
      );

      this.advanceToNextPlayer(true);

      return {
        success: true,
        valid: true,
        canonicalWord: validation.canonicalWord.toUpperCase(),
        bonusLifeEarned,
      };
    } finally {
      this.isProcessingAction = false;
    }
  }

  public handleTurnTimeout(): void {
    this.clearTurnTimer();
    if (this.status !== 'PLAYING' || !this.activePlayerId) return;

    const player = this.players.get(this.activePlayerId);
    if (!player || player.isEliminated) return;

    this.applyLifeLossAndAdvance(player, 'timeout_life_lost');
  }

  private applyLifeLossAndAdvance(
    player: BombPlayerInternal,
    cause: 'timeout_life_lost' | 'word_rejected',
    reasonCode?: BombValidationErrorCode
  ): void {
    const aliveBeforeCount = this.getAlivePlayers().length;

    player.lives = Math.max(0, player.lives - 1);
    player.currentTyping = '';
    player.lastWordStatus = 'timeout';
    this.promptFailuresCount++;

    // Reset bomb fuse to max duration after an explosion
    this.currentFuseMs = this.settings.maxBombDurationSec * 1000;

    if (player.lives <= 0) {
      player.isEliminated = true;
      player.eliminatedAtRound = this.roundNumber;
      player.finalRank = aliveBeforeCount;

      this.emitEvent({
        type: 'player_eliminated',
        playerId: player.id,
        playerName: player.name,
        prompt: this.currentPrompt,
        livesRemaining: 0,
        timestamp: Date.now(),
      });
    } else {
      this.emitEvent({
        type: cause,
        playerId: player.id,
        playerName: player.name,
        prompt: this.currentPrompt,
        reasonCode,
        livesRemaining: player.lives,
        timestamp: Date.now(),
      });
    }

    const aliveAfter = this.getAlivePlayers();
    if (aliveAfter.length <= 1) {
      this.finishGame(aliveAfter[0] || null);
      return;
    }

    const shouldReplacePrompt = this.promptFailuresCount >= this.settings.maxPromptFailures;
    this.advanceToNextPlayer(shouldReplacePrompt);
  }

  private advanceToNextPlayer(pickNewPrompt: boolean): void {
    const allOrdered = Array.from(this.players.values()).sort((a, b) => a.orderIndex - b.orderIndex);
    const currentIndex = allOrdered.findIndex((p) => p.id === this.activePlayerId);

    let nextPlayer: BombPlayerInternal | null = null;
    for (let offset = 1; offset <= allOrdered.length; offset++) {
      const candidateIndex = (currentIndex + offset) % allOrdered.length;
      const candidate = allOrdered[candidateIndex];
      if (!candidate.isEliminated && !candidate.isSpectator) {
        if (candidateIndex <= currentIndex) {
          this.roundNumber++;
        }
        nextPlayer = candidate;
        break;
      }
    }

    if (!nextPlayer) {
      this.finishGame(null);
      return;
    }

    this.activePlayerId = nextPlayer.id;
    nextPlayer.currentTyping = '';

    if (pickNewPrompt) {
      this.selectNewPrompt();
    }

    this.status = 'PLAYING';
    this.startTurnTimer(this.currentFuseMs);
    this.notify();
  }

  private finishGame(winner: BombPlayerInternal | null): void {
    this.clearAllTimers();
    this.status = 'GAME_OVER';
    this.activePlayerId = null;

    if (winner) {
      winner.finalRank = 1;
      this.winnerId = winner.id;
      this.winnerName = winner.name;
    } else {
      this.winnerId = null;
      this.winnerName = null;
    }

    this.emitEvent({
      type: 'game_over',
      playerId: winner?.id,
      playerName: winner?.name,
      timestamp: Date.now(),
    });

    this.notify();
  }

  public returnToLobby(playerId: string): { success: boolean; error?: string } {
    this.lastActivityAt = Date.now();
    const player = this.players.get(playerId);
    if (!player || !player.isHost) {
      return { success: false, error: "Seul l'hôte peut ramener le salon à l'accueil." };
    }

    this.clearAllTimers();
    this.status = 'LOBBY';
    this.activePlayerId = null;
    this.currentPrompt = '';
    this.winnerId = null;
    this.winnerName = null;
    this.usedWords.clear();
    this.usedPrompts.clear();
    this.recentValidWords = [];

    for (const p of this.players.values()) {
      p.isSpectator = false;
      p.lives = this.settings.initialLives;
      p.maxLives = this.settings.maxLives;
      p.isEliminated = false;
      p.eliminatedAtRound = null;
      p.finalRank = null;
      p.wordsValidated = 0;
      p.longestWord = '';
      p.bonusLettersUsed = [];
      p.bonusLivesEarned = 0;
      p.lastWordSubmitted = null;
      p.lastWordStatus = null;
      p.currentTyping = '';
    }

    this.notify();
    return { success: true };
  }

  public getAlivePlayers(): BombPlayerInternal[] {
    return Array.from(this.players.values())
      .filter((p) => !p.isEliminated && !p.isSpectator)
      .sort((a, b) => a.orderIndex - b.orderIndex);
  }

  private emitEvent(event: Omit<BombLastEvent, 'id'>): void {
    this.lastEvent = {
      ...event,
      id: `ev_${crypto.randomUUID().slice(0, 8)}`,
    };
  }

  public clearTurnTimer(): void {
    if (this.turnTimeout) {
      clearTimeout(this.turnTimeout);
      this.turnTimeout = null;
    }
  }

  public clearAllTimers(): void {
    this.clearTurnTimer();
    if (this.countdownTimeout) {
      clearTimeout(this.countdownTimeout);
      this.countdownTimeout = null;
    }
    if (this.transitionTimeout) {
      clearTimeout(this.transitionTimeout);
      this.transitionTimeout = null;
    }
  }

  public toPublicState(): BombRoomStatePublic {
    const publicPlayers: BombPlayerPublic[] = Array.from(this.players.values())
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map((p) => ({
        id: p.id,
        name: p.name,
        isHost: p.isHost,
        isConnected: p.isConnected,
        isSpectator: p.isSpectator,
        orderIndex: p.orderIndex,
        lives: p.lives,
        maxLives: p.maxLives,
        isEliminated: p.isEliminated,
        eliminatedAtRound: p.eliminatedAtRound,
        finalRank: p.finalRank,
        wordsValidated: p.wordsValidated,
        longestWord: p.longestWord,
        bonusLettersUsed: p.bonusLettersUsed,
        bonusLivesEarned: p.bonusLivesEarned,
        lastWordSubmitted: p.lastWordSubmitted,
        lastWordStatus: p.lastWordStatus,
        currentTyping: p.currentTyping,
      }));

    return {
      roomCode: this.code,
      status: this.status,
      settings: this.settings,
      players: publicPlayers,
      activePlayerId: this.activePlayerId,
      currentPrompt: this.currentPrompt,
      currentPromptDifficulty: this.currentPromptDifficulty,
      promptFailuresCount: this.promptFailuresCount,
      turnStartedAtServerMs: this.turnStartedAtServerMs,
      turnDeadlineServerMs: this.turnDeadlineServerMs,
      turnDurationMs: this.turnDurationMs,
      serverNowMs: Date.now(),
      countdownEndsAtServerMs: this.countdownEndsAtServerMs,
      roundNumber: this.roundNumber,
      totalWordsPlayed: this.totalWordsPlayed,
      usedWordsCount: this.usedWords.size,
      recentValidWords: this.recentValidWords,
      bonusAlphabetTarget: this.getBonusAlphabetTarget(),
      winnerId: this.winnerId,
      winnerName: this.winnerName,
      lastEvent: this.lastEvent,
    };
  }

  public notify(): void {
    this.onStateChange(this.code);
  }
}
