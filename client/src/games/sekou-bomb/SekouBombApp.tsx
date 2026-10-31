import React, { useState, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import confetti from 'canvas-confetti';
import {
  ArrowLeft,
  Fire,
  Heart,
  CrownSimple,
  Copy,
  Check,
  ShareNetwork,
  QrCode,
  SpeakerHigh,
  SpeakerSlash,
  BookOpenText,
  Sliders,
  UsersThree,
  PaperPlaneRight,
  Trophy,
  ArrowCounterClockwise,
  Sparkle,
  Skull,
  X,
  WarningOctagon,
  CheckCircle,
  ArrowsClockwise,
  Lightning,
} from '@phosphor-icons/react';
import {
  BombDifficulty,
  BombLanguage,
  BombRoomSettings,
  BombRoomStatePublic,
  BombValidationErrorCode,
  DEFAULT_BOMB_ALPHABET,
} from '../../../../shared/sekouBombTypes.js';
import { getBombTranslation } from './i18n.js';
import { bombSounds } from './sound.js';
import {
  BrutalistCard,
  BrutalistButton,
  BrutalistBadge,
  BrutalistChallengeBox,
  BrutalistFuseBar,
  BrutalistPlayerTag,
  BrutalistDialog,
  PopColor,
  POP_COLOR_MAP,
} from './components/BrutalistUI.js';

interface SekouBombAppProps {
  socket: Socket;
  initialRoomCode?: string | null;
  onBackToHub: () => void;
}

interface SavedBombSession {
  roomCode: string;
  playerId: string;
  sessionToken: string;
  playerName: string;
}

const SESSION_KEY = 'sekou_bomb_session_v1';
const NAME_KEY = 'sekou_bomb_player_name_v1';
const UI_LANG_KEY = 'sekou_bomb_ui_lang_v1';

const DEMO_SPECIMENS: Record<BombLanguage, { prompt: string; sample: string }[]> = {
  fr: [
    { prompt: 'TRE', sample: 'CONTRETEMPS' },
    { prompt: 'EAU', sample: 'CHAPITEAU' },
    { prompt: 'OUR', sample: 'TOURBILLON' },
    { prompt: 'ION', sample: 'IMPULSION' },
  ],
  en: [
    { prompt: 'ING', sample: 'LIGHTNING' },
    { prompt: 'STR', sample: 'ASTRONAUT' },
    { prompt: 'GHT', sample: 'SPOTLIGHT' },
    { prompt: 'OUS', sample: 'MARVELOUS' },
  ],
};

function normalizeLetters(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
}

function loadSavedSession(): SavedBombSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveBombSession(s: SavedBombSession) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    localStorage.setItem(NAME_KEY, s.playerName);
  } catch {}
}

function clearBombSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {}
}

/**
 * Highlights required prompt letters inside a word using Neo-Brutalist Pop yellow badge.
 */
const HighlightedWord: React.FC<{ word: string; prompt: string }> = ({ word, prompt }) => {
  if (!word) return null;
  const upperWord = word.toUpperCase();
  const normWord = normalizeLetters(word);
  const normPrompt = normalizeLetters(prompt);
  const idx = normPrompt ? normWord.indexOf(normPrompt) : -1;

  if (idx === -1 || !normPrompt) {
    return <span>{upperWord}</span>;
  }

  const before = upperWord.slice(0, idx);
  const match = upperWord.slice(idx, idx + normPrompt.length);
  const after = upperWord.slice(idx + normPrompt.length);

  return (
    <span>
      {before}
      <span className="bg-[#FFE600] text-black px-1.5 py-0.5 rounded-md font-black border border-black shadow-[1px_1px_0_#000]">
        {match}
      </span>
      {after}
    </span>
  );
};

export const SekouBombApp: React.FC<SekouBombAppProps> = ({
  socket,
  initialRoomCode,
  onBackToHub,
}) => {
  const reduceMotion = useReducedMotion();

  const [uiLang, setUiLang] = useState<BombLanguage>(() => {
    try {
      const saved = localStorage.getItem(UI_LANG_KEY);
      if (saved === 'en' || saved === 'fr') return saved;
    } catch {}
    return 'fr';
  });

  const t = getBombTranslation(uiLang);

  const [playerName, setPlayerName] = useState<string>(() => {
    try {
      return localStorage.getItem(NAME_KEY) || localStorage.getItem('sekouno_last_name') || '';
    } catch {
      return '';
    }
  });

  const [entryMode, setEntryMode] = useState<'create' | 'join'>(() =>
    initialRoomCode ? 'join' : 'create'
  );
  const [createDictLang, setCreateDictLang] = useState<BombLanguage>('fr');
  const [joinCodeInput, setJoinCodeInput] = useState<string>(initialRoomCode || '');
  const [demoIndex, setDemoIndex] = useState<number>(0);

  const [roomState, setRoomState] = useState<BombRoomStatePublic | null>(null);
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [inlineInputError, setInlineInputError] = useState<string | null>(null);

  const [wordInput, setWordInput] = useState<string>('');
  const [isMuted, setIsMuted] = useState<boolean>(bombSounds.isMuted());
  const [showRulesModal, setShowRulesModal] = useState<boolean>(false);
  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copiedType, setCopiedType] = useState<'code' | 'link' | null>(null);

  // Server clock offset (serverNowMs - Date.now()) for authoritative timer display
  const serverOffsetMsRef = useRef<number>(0);
  const [remainingMs, setRemainingMs] = useState<number>(0);
  const [countdownSec, setCountdownSec] = useState<number>(3);
  const lastEventIdRef = useRef<string | null>(null);
  const lastTickSecondRef = useRef<number>(-1);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Cycle the demonstration specimen on Home screen when idle
  useEffect(() => {
    if (roomState || reduceMotion) return;
    const id = window.setInterval(() => {
      setDemoIndex((prev) => (prev + 1) % DEMO_SPECIMENS[uiLang].length);
    }, 3200);
    return () => window.clearInterval(id);
  }, [roomState, uiLang, reduceMotion]);

  // Confetti on game over
  useEffect(() => {
    if (roomState?.status === 'GAME_OVER') {
      try {
        confetti({
          particleCount: 90,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#FFE600', '#CCFF00', '#FF5B36', '#00F0FF', '#FF66C4', '#B8A1FF'],
        });
      } catch {}
    }
  }, [roomState?.status]);

  const toggleUiLang = () => {
    const next: BombLanguage = uiLang === 'fr' ? 'en' : 'fr';
    setUiLang(next);
    try {
      localStorage.setItem(UI_LANG_KEY, next);
    } catch {}
  };

  // Connect & Reconnect listener
  useEffect(() => {
    if (!socket.connected) {
      socket.connect();
    }

    const attemptReconnect = () => {
      const saved = loadSavedSession();
      if (!saved) return;
      if (initialRoomCode && saved.roomCode !== initialRoomCode.toUpperCase()) {
        clearBombSession();
        return;
      }

      socket.emit(
        'bomb_reconnect',
        {
          roomCode: saved.roomCode,
          sessionToken: saved.sessionToken,
        },
        (res: any) => {
          if (res?.success && res.state) {
            serverOffsetMsRef.current = (res.state.serverNowMs || Date.now()) - Date.now();
            setMyPlayerId(res.playerId);
            setRoomState(res.state);
            setErrorBanner(null);
          } else {
            clearBombSession();
          }
        }
      );
    };

    const onBombState = (state: BombRoomStatePublic) => {
      serverOffsetMsRef.current = (state.serverNowMs || Date.now()) - Date.now();
      setRoomState(state);

      // If this player was removed or kicked from the room:
      if (myPlayerId && !state.players.some((p) => p.id === myPlayerId)) {
        clearBombSession();
        setRoomState(null);
        setMyPlayerId(null);
        setErrorBanner(
          uiLang === 'fr'
            ? 'Vous avez quitté ou été retiré du salon.'
            : 'You have left or were removed from the room.'
        );
        return;
      }

      if (state.lastEvent && state.lastEvent.id !== lastEventIdRef.current) {
        lastEventIdRef.current = state.lastEvent.id;
        const ev = state.lastEvent;
        if (ev.type === 'word_accepted') {
          bombSounds.playWordValid();
        } else if (ev.type === 'bonus_life_earned') {
          bombSounds.playBonusLife();
        } else if (ev.type === 'word_rejected') {
          bombSounds.playWordInvalid();
        } else if (ev.type === 'timeout_life_lost' || ev.type === 'player_eliminated') {
          bombSounds.playExplosion();
        } else if (ev.type === 'game_over') {
          bombSounds.playVictory();
        }
      }
    };

    socket.on('connect', attemptReconnect);
    socket.on('bomb_state', onBombState);

    return () => {
      socket.off('connect', attemptReconnect);
      socket.off('bomb_state', onBombState);
    };
  }, [socket, initialRoomCode]);

  const isMyTurn = Boolean(
    roomState &&
      roomState.status === 'PLAYING' &&
      myPlayerId &&
      roomState.activePlayerId === myPlayerId
  );

  // Auto-focus word input whenever it becomes my turn
  useEffect(() => {
    if (isMyTurn) {
      setWordInput('');
      setInlineInputError(null);
      window.setTimeout(() => {
        inputRef.current?.focus();
      }, 40);
    }
  }, [isMyTurn, roomState?.currentPrompt]);

  // High-precision rAF loop synchronized to server deadline
  useEffect(() => {
    if (!roomState) return;

    let frameId: number;
    const updateClock = () => {
      const estimatedServerNow = Date.now() + serverOffsetMsRef.current;

      if (roomState.status === 'COUNTDOWN' && roomState.countdownEndsAtServerMs) {
        const rem = Math.max(0, roomState.countdownEndsAtServerMs - estimatedServerNow);
        setCountdownSec(Math.max(1, Math.ceil(rem / 1000)));
      } else if (roomState.status === 'PLAYING') {
        const rem = Math.max(0, roomState.turnDeadlineServerMs - estimatedServerNow);
        setRemainingMs(rem);

        const secLeft = Math.ceil(rem / 1000);
        if (secLeft > 0 && secLeft !== lastTickSecondRef.current) {
          lastTickSecondRef.current = secLeft;
          const totalSec = Math.max(1, roomState.turnDurationMs / 1000);
          const urgency = 1 - Math.min(1, secLeft / totalSec);
          bombSounds.playTick(urgency);
        }
      }

      frameId = requestAnimationFrame(updateClock);
    };

    frameId = requestAnimationFrame(updateClock);
    return () => cancelAnimationFrame(frameId);
  }, [
    roomState?.status,
    roomState?.turnDeadlineServerMs,
    roomState?.countdownEndsAtServerMs,
    roomState?.turnDurationMs,
  ]);

  // Handlers
  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = playerName.trim();
    if (trimmed.length < 2) {
      setErrorBanner(
        uiLang === 'fr'
          ? 'Veuillez saisir un pseudonyme (2 caractères minimum).'
          : 'Please enter a nickname (at least 2 characters).'
      );
      return;
    }

    setIsLoading(true);
    setErrorBanner(null);
    socket.emit(
      'bomb_create_room',
      {
        playerName: trimmed,
        settings: {
          language: createDictLang,
          bonusAlphabetLetters: DEFAULT_BOMB_ALPHABET[createDictLang],
        },
      },
      (res: any) => {
        setIsLoading(false);
        if (res?.success) {
          setMyPlayerId(res.playerId);
          setRoomState(res.state);
          saveBombSession({
            roomCode: res.roomCode,
            playerId: res.playerId,
            sessionToken: res.sessionToken,
            playerName: res.playerName,
          });
          if (typeof window !== 'undefined') {
            window.history.replaceState({}, '', `${window.location.pathname}?game=sekou_bomb`);
          }
        } else {
          setErrorBanner(res?.error || 'Erreur lors de la création du salon.');
        }
      }
    );
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = playerName.trim();
    const trimmedCode = joinCodeInput.trim().toUpperCase();

    if (trimmedName.length < 2) {
      setErrorBanner(
        uiLang === 'fr'
          ? 'Veuillez saisir un pseudonyme (2 caractères minimum).'
          : 'Please enter a nickname (at least 2 characters).'
      );
      return;
    }
    if (trimmedCode.length !== 6) {
      setErrorBanner(
        uiLang === 'fr'
          ? 'Le code du salon doit comporter 6 caractères.'
          : 'Room code must be 6 characters.'
      );
      return;
    }

    setIsLoading(true);
    setErrorBanner(null);
    socket.emit(
      'bomb_join_room',
      {
        roomCode: trimmedCode,
        playerName: trimmedName,
      },
      (res: any) => {
        setIsLoading(false);
        if (res?.success) {
          setMyPlayerId(res.playerId);
          setRoomState(res.state);
          saveBombSession({
            roomCode: res.roomCode,
            playerId: res.playerId,
            sessionToken: res.sessionToken,
            playerName: res.playerName,
          });
          if (typeof window !== 'undefined') {
            window.history.replaceState({}, '', `${window.location.pathname}?game=sekou_bomb`);
          }
        } else {
          setErrorBanner(res?.error || 'Impossible de rejoindre ce salon.');
        }
      }
    );
  };

  const handleLeaveRoom = () => {
    socket.emit(
      'bomb_leave_room',
      { roomCode: roomState?.roomCode, playerId: myPlayerId },
      () => {
        clearBombSession();
        setRoomState(null);
        setMyPlayerId(null);
        setErrorBanner(null);
      }
    );
  };

  const handleKickPlayer = (targetPlayerId: string) => {
    socket.emit('bomb_kick_player', { targetPlayerId }, (res: any) => {
      if (!res?.success && res?.error) {
        setErrorBanner(res.error);
      }
    });
  };

  const handleUpdateSettings = (partial: Partial<BombRoomSettings>) => {
    socket.emit('bomb_update_settings', { settings: partial }, (res: any) => {
      if (!res?.success && res?.error) {
        setErrorBanner(res.error);
      }
    });
  };

  const handleStartGame = () => {
    setErrorBanner(null);
    socket.emit('bomb_start_game', (res: any) => {
      if (!res?.success && res?.error) {
        setErrorBanner(res.error);
      }
    });
  };

  const handleReturnToLobby = () => {
    socket.emit('bomb_return_to_lobby', (res: any) => {
      if (!res?.success && res?.error) {
        setErrorBanner(res.error);
      }
    });
  };

  const handleWordInputChange = (val: string) => {
    setWordInput(val);
    if (inlineInputError) setInlineInputError(null);
    if (isMyTurn) {
      socket.emit('bomb_typing', { text: val });
    }
  };

  const handleSubmitWord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isMyTurn || !wordInput.trim()) return;

    const submitted = wordInput.trim();
    socket.emit('bomb_submit_word', { word: submitted }, (res: any) => {
      if (res?.valid) {
        setWordInput('');
        setInlineInputError(null);
      } else if (res?.errorCode) {
        const msg =
          t.errors[res.errorCode as BombValidationErrorCode] ||
          res.error ||
          'Mot invalide';
        setInlineInputError(msg);
        setWordInput('');
        inputRef.current?.focus();
      }
    });
  };

  const getInviteUrl = () => {
    if (typeof window === 'undefined' || !roomState) return '';
    return `${window.location.origin}${window.location.pathname}?bombRoom=${roomState.roomCode}`;
  };

  const handleCopyCode = () => {
    if (!roomState) return;
    navigator.clipboard.writeText(roomState.roomCode);
    setCopiedType('code');
    window.setTimeout(() => setCopiedType(null), 2000);
  };

  const handleCopyLink = () => {
    const url = getInviteUrl();
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopiedType('link');
    window.setTimeout(() => setCopiedType(null), 2000);
  };

  const handleShareLink = async () => {
    const url = getInviteUrl();
    if (!url || !roomState) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Sekou Bomb | SekouGaming',
          text:
            uiLang === 'fr'
              ? `Rejoins ma partie Sekou Bomb (Code : ${roomState.roomCode}) !`
              : `Join my Sekou Bomb game (Code: ${roomState.roomCode})!`,
          url,
        });
        return;
      } catch {}
    }
    handleCopyLink();
  };

  const handleOpenQrModal = async () => {
    const url = getInviteUrl();
    if (!url) return;
    setShowQrModal(true);
    try {
      const res = await fetch(`/api/qrcode?text=${encodeURIComponent(url)}`);
      const data = await res.json();
      if (data.dataUrl) {
        setQrDataUrl(data.dataUrl);
      }
    } catch {}
  };

  const myPlayer = roomState?.players.find((p) => p.id === myPlayerId) || null;
  const isHost = Boolean(myPlayer?.isHost);
  const activePlayer = roomState?.players.find((p) => p.id === roomState.activePlayerId) || null;

  const progressRatio =
    roomState && roomState.turnDurationMs > 0
      ? Math.max(0, Math.min(1, remainingMs / roomState.turnDurationMs))
      : 1;
  const isCriticalTime = remainingMs > 0 && remainingMs <= 3500;

  const isInArena = Boolean(
    roomState &&
      (roomState.status === 'COUNTDOWN' ||
        roomState.status === 'PLAYING' ||
        roomState.status === 'PLAYER_ELIMINATED' ||
        roomState.status === 'ROUND_TRANSITION')
  );

  const demoList = DEMO_SPECIMENS[uiLang];
  const currentDemo = demoList[demoIndex % demoList.length];
  const wordContainsPrompt = Boolean(
    roomState?.currentPrompt &&
      wordInput.trim().length > 0 &&
      normalizeLetters(wordInput).includes(normalizeLetters(roomState.currentPrompt))
  );

  return (
    <div
      className="sekou-bomb-world min-h-[100dvh] w-full flex flex-col justify-between overflow-x-hidden select-none"
      style={{
        paddingTop: 'max(env(safe-area-inset-top, 0px), 0.75rem)',
        paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 1rem)',
      }}
    >
      {/* ==================== 1. TOP HEADER / APP BAR (NEO-BRUTALIST) ==================== */}
      <header className="w-full max-w-4xl mx-auto px-4 py-2 shrink-0">
        <div className="flex items-center justify-between gap-3 bg-white border-3 border-black rounded-2xl sm:rounded-3xl px-3.5 sm:px-5 py-2.5 shadow-[4px_4px_0_#000]">
          {/* Back Button */}
          <button
            type="button"
            onClick={roomState ? handleLeaveRoom : onBackToHub}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black text-white hover:bg-[#FF5B36] font-black text-xs uppercase tracking-wider border-2 border-black shadow-[2px_2px_0_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0_#000] transition-colors cursor-pointer"
          >
            <ArrowLeft weight="bold" className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{roomState ? t.leaveRoom : t.backToHub}</span>
          </button>

          {/* Logo */}
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-xl bg-[#FFE600] border-2 border-black flex items-center justify-center font-black shadow-[2px_2px_0_#000]">
              <Fire weight="fill" className="w-4 h-4 text-[#FF5B36]" />
            </span>
            <span className="font-black text-lg sm:text-xl tracking-tight text-black uppercase">
              SEKOU <span className="text-[#FF5B36]">BOMB</span>
            </span>
          </div>

          {/* Utilities (Lang, Rules, Mute) */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={toggleUiLang}
              aria-label="Changer de langue"
              className="px-2.5 py-1.5 rounded-xl bg-[#00F0FF] text-black font-black text-xs uppercase border-2 border-black shadow-[2px_2px_0_#000] active:translate-x-[1px] active:translate-y-[1px] cursor-pointer hover:bg-[#FFE600] transition-colors"
            >
              {uiLang.toUpperCase()}
            </button>

            <button
              type="button"
              onClick={() => setShowRulesModal(true)}
              aria-label={t.rulesBtn}
              title={t.rulesBtn}
              className="px-2.5 py-1.5 rounded-xl bg-[#B8A1FF] text-black font-black text-xs uppercase border-2 border-black shadow-[2px_2px_0_#000] active:translate-x-[1px] active:translate-y-[1px] flex items-center gap-1.5 cursor-pointer hover:bg-[#FFE600] transition-colors"
            >
              <BookOpenText weight="bold" className="w-4 h-4" />
              <span className="hidden sm:inline">{t.rulesBtn}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsMuted(bombSounds.toggleMute())}
              aria-label={isMuted ? 'Activer le son' : 'Couper le son'}
              className={`p-2 rounded-xl border-2 border-black font-black text-xs shadow-[2px_2px_0_#000] active:translate-x-[1px] active:translate-y-[1px] transition-colors cursor-pointer ${
                isMuted
                  ? 'bg-[#FF5B36] text-white'
                  : 'bg-white text-black hover:bg-[#CCFF00]'
              }`}
            >
              {isMuted ? (
                <SpeakerSlash weight="bold" className="w-4 h-4" />
              ) : (
                <SpeakerHigh weight="bold" className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Global Error Banner */}
      {errorBanner && (
        <div className="w-full max-w-md mx-auto px-4 mt-2">
          <div
            role="alert"
            className="px-4 py-3 rounded-2xl bg-[#FF5B36] text-white border-3 border-black text-xs font-black uppercase tracking-wider flex items-center justify-between gap-3 shadow-[4px_4px_0_#000]"
          >
            <div className="flex items-center gap-2">
              <WarningOctagon weight="fill" className="w-5 h-5 shrink-0" />
              <span>{errorBanner}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorBanner(null)}
              aria-label={t.close}
              className="p-1 rounded-lg hover:bg-black/20 cursor-pointer"
            >
              <X weight="bold" className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ==================== 2. ACCUEIL (HOME) : PURE POP BRUTALISM ==================== */}
      {!roomState && (
        <main className="flex-1 w-full max-w-md mx-auto px-4 py-4 sm:py-6 flex items-center">
          <BrutalistCard color="white" depth="lg" className="w-full p-6 sm:p-8 text-center space-y-5">
            {/* Top Badges */}
            <div className="flex items-center justify-between gap-2">
              <BrutalistBadge color="lime" icon={<Lightning weight="fill" className="w-3.5 h-3.5" />}>
                Party Game
              </BrutalistBadge>
              <BrutalistBadge color="yellow">
                2 à 16 Joueurs
              </BrutalistBadge>
            </div>

            {/* Title */}
            <div>
              <h1 className="text-4xl sm:text-5xl font-black text-black tracking-tight uppercase leading-none">
                SEKOU{' '}
                <span className="bg-[#FF5B36] text-white px-2 py-0.5 rounded-xl inline-block border-3 border-black shadow-[3px_3px_0_#000]">
                  BOMB
                </span>
              </h1>
              <p className="mt-2 text-black/75 font-bold text-xs sm:text-sm">
                {t.subtitle}
              </p>
            </div>

            {/* Syllable Specimen Preview Box */}
            <div className="p-3.5 rounded-2xl bg-[#00F0FF] border-3 border-black shadow-[4px_4px_0_#000] text-left space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-black">
                  Exemple de Défi
                </span>
                <button
                  type="button"
                  onClick={() => setDemoIndex((i) => (i + 1) % demoList.length)}
                  className="p-1 rounded-lg bg-white text-black border border-black shadow-[1px_1px_0_#000] hover:bg-[#FFE600] cursor-pointer"
                  title="Changer d'exemple"
                >
                  <ArrowsClockwise weight="bold" className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center justify-between gap-2 bg-white rounded-xl p-2.5 border-2 border-black">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-black uppercase text-black/60">Syllabe:</span>
                  <span className="px-2 py-0.5 rounded-lg bg-[#FFE600] text-black font-black text-sm border border-black shadow-[1px_1px_0_#000]">
                    {currentDemo.prompt}
                  </span>
                </div>
                <div className="text-xs font-black text-black flex items-center gap-1">
                  <CheckCircle weight="fill" className="w-3.5 h-3.5 text-[#0B7A53]" />
                  <HighlightedWord word={currentDemo.sample} prompt={currentDemo.prompt} />
                </div>
              </div>
            </div>

            {/* Nickname Input */}
            <div className="text-left space-y-1.5">
              <div className="flex items-center justify-between text-xs font-black uppercase text-black">
                <label htmlFor="bomb-nickname-input">{t.yourNickname}</label>
                <span className="text-black/50">{playerName.trim().length}/20</span>
              </div>
              <input
                id="bomb-nickname-input"
                type="text"
                maxLength={20}
                autoComplete="nickname"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder={t.nicknamePlaceholder}
                className="w-full h-12 px-4 rounded-2xl bg-white border-3 border-black text-black font-black text-base outline-none shadow-[3px_3px_0_#000] focus:bg-[#FFFDE6] transition-colors placeholder:text-black/35"
              />
            </div>

            {/* Segmented Mode Tabs */}
            <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-black/5 border-2 border-black">
              <button
                type="button"
                onClick={() => setEntryMode('create')}
                className={`py-2 px-3 rounded-xl font-black text-xs uppercase tracking-wider border-2 transition-all cursor-pointer ${
                  entryMode === 'create'
                    ? 'bg-[#FF5B36] text-white border-black shadow-[2px_2px_0_#000] -translate-y-0.5'
                    : 'bg-transparent text-black border-transparent hover:bg-black/5'
                }`}
              >
                {t.modeCreateTab}
              </button>
              <button
                type="button"
                onClick={() => setEntryMode('join')}
                className={`py-2 px-3 rounded-xl font-black text-xs uppercase tracking-wider border-2 transition-all cursor-pointer ${
                  entryMode === 'join'
                    ? 'bg-[#00F0FF] text-black border-black shadow-[2px_2px_0_#000] -translate-y-0.5'
                    : 'bg-transparent text-black border-transparent hover:bg-black/5'
                }`}
              >
                {t.modeJoinTab}
              </button>
            </div>

            {/* Mode Actions */}
            {entryMode === 'create' ? (
              <form onSubmit={handleCreateRoom} className="space-y-4">
                <div className="text-left">
                  <span className="block text-xs font-black uppercase text-black mb-1.5">
                    {t.dictLanguageLabel}
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {(['fr', 'en'] as const).map((lang) => (
                      <button
                        key={lang}
                        type="button"
                        onClick={() => setCreateDictLang(lang)}
                        className={`py-2.5 px-3 rounded-xl border-3 border-black font-black text-xs uppercase transition-all cursor-pointer ${
                          createDictLang === lang
                            ? 'bg-[#FFE600] text-black shadow-[3px_3px_0_#000] -translate-y-0.5'
                            : 'bg-white text-black/60 shadow-[1px_1px_0_#000]'
                        }`}
                      >
                        {lang === 'fr' ? 'Français (FR)' : 'English (EN)'}
                      </button>
                    ))}
                  </div>
                </div>

                <BrutalistButton
                  type="submit"
                  color="coral"
                  size="lg"
                  disabled={isLoading}
                  className="w-full text-base"
                >
                  <Fire weight="fill" className="w-5 h-5" />
                  <span>{isLoading ? t.creating : t.createRoomBtn}</span>
                </BrutalistButton>
              </form>
            ) : (
              <form onSubmit={handleJoinRoom} className="space-y-4">
                <div className="text-left">
                  <label
                    htmlFor="bomb-join-code-input"
                    className="block text-xs font-black uppercase text-black mb-1.5"
                  >
                    {t.roomCodeLabel} (6 {uiLang === 'fr' ? 'lettres' : 'letters'})
                  </label>
                  <input
                    id="bomb-join-code-input"
                    type="text"
                    maxLength={6}
                    autoCapitalize="characters"
                    autoComplete="off"
                    spellCheck={false}
                    value={joinCodeInput}
                    onChange={(e) =>
                      setJoinCodeInput(
                        e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
                      )
                    }
                    placeholder={t.roomCodePlaceholder}
                    className="w-full h-14 px-4 rounded-2xl bg-white border-3 border-black font-mono text-3xl font-black tracking-[0.25em] uppercase text-center text-black placeholder:text-black/30 shadow-[3px_3px_0_#000] focus:bg-[#FFFDE6] outline-none"
                  />
                </div>

                <BrutalistButton
                  type="submit"
                  color="cyan"
                  size="lg"
                  disabled={isLoading}
                  className="w-full text-base"
                >
                  <Lightning weight="fill" className="w-5 h-5" />
                  <span>{isLoading ? t.joining : t.joinRoomBtn}</span>
                </BrutalistButton>
              </form>
            )}
          </BrutalistCard>
        </main>
      )}

      {/* ==================== 3. SALON (LOBBY) : RADICAL SIMPLICITY ==================== */}
      {roomState && roomState.status === 'LOBBY' && (
        <main className="flex-1 w-full max-w-lg mx-auto px-4 py-4 space-y-5">
          {/* Room Code Hero Card */}
          <BrutalistCard color="yellow" depth="lg" className="p-6 text-center space-y-4">
            <div className="flex items-center justify-between">
              <BrutalistBadge color="lime">{t.roomCodeLabel}</BrutalistBadge>
              <BrutalistBadge color="white">
                {roomState.settings.language.toUpperCase()}
              </BrutalistBadge>
            </div>

            {/* Room Code */}
            <div className="py-4 px-4 rounded-2xl bg-white border-3 border-black text-center shadow-[4px_4px_0_#000]">
              <span className="font-mono text-4xl sm:text-5xl font-black text-black tracking-[0.2em]">
                {roomState.roomCode}
              </span>
            </div>

            {/* 4 Action Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={handleCopyCode}
                className="py-2.5 px-2 rounded-xl bg-white hover:bg-[#CCFF00] text-black font-black text-xs uppercase border-2 border-black shadow-[2px_2px_0_#000] flex items-center justify-center gap-1 active:translate-x-[1px] active:translate-y-[1px] cursor-pointer transition-colors"
              >
                {copiedType === 'code' ? (
                  <Check weight="bold" className="w-4 h-4 text-[#0B7A53]" />
                ) : (
                  <Copy weight="bold" className="w-4 h-4" />
                )}
                <span>{copiedType === 'code' ? t.copied : t.copyCode}</span>
              </button>

              <button
                type="button"
                onClick={handleCopyLink}
                className="py-2.5 px-2 rounded-xl bg-white hover:bg-[#00F0FF] text-black font-black text-xs uppercase border-2 border-black shadow-[2px_2px_0_#000] flex items-center justify-center gap-1 active:translate-x-[1px] active:translate-y-[1px] cursor-pointer transition-colors"
              >
                {copiedType === 'link' ? (
                  <Check weight="bold" className="w-4 h-4 text-[#0B7A53]" />
                ) : (
                  <Copy weight="bold" className="w-4 h-4" />
                )}
                <span>{copiedType === 'link' ? t.copied : t.copyLink}</span>
              </button>

              <button
                type="button"
                onClick={handleShareLink}
                className="py-2.5 px-2 rounded-xl bg-white hover:bg-[#FF66C4] text-black font-black text-xs uppercase border-2 border-black shadow-[2px_2px_0_#000] flex items-center justify-center gap-1 active:translate-x-[1px] active:translate-y-[1px] cursor-pointer transition-colors"
              >
                <ShareNetwork weight="bold" className="w-4 h-4" />
                <span>{t.shareLink}</span>
              </button>

              <button
                type="button"
                onClick={handleOpenQrModal}
                className="py-2.5 px-2 rounded-xl bg-white hover:bg-[#B8A1FF] text-black font-black text-xs uppercase border-2 border-black shadow-[2px_2px_0_#000] flex items-center justify-center gap-1 active:translate-x-[1px] active:translate-y-[1px] cursor-pointer transition-colors"
              >
                <QrCode weight="bold" className="w-4 h-4" />
                <span>{t.qrCode}</span>
              </button>
            </div>
          </BrutalistCard>

          {/* Players List Card */}
          <BrutalistCard color="white" depth="md" className="p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b-2 border-black">
              <div className="flex items-center gap-2">
                <UsersThree weight="bold" className="w-5 h-5 text-black" />
                <h2 className="text-lg sm:text-xl font-black text-black uppercase tracking-tight">
                  {t.playersTitle}
                </h2>
              </div>
              <BrutalistBadge color="yellow">
                {roomState.players.length}/{roomState.settings.maxPlayers}
              </BrutalistBadge>
            </div>

            {/* Player chips */}
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {roomState.players.map((p, idx) => {
                const colors: PopColor[] = ['lime', 'yellow', 'cyan', 'lavender', 'pink', 'coral'];
                const tagColor = colors[idx % colors.length];
                return (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-2xl border-2 border-black transition-all ${
                      p.id === myPlayerId
                        ? 'bg-[#FFFDE6] shadow-[3px_3px_0_#000]'
                        : 'bg-white shadow-[2px_2px_0_#000]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`w-7 h-7 rounded-lg border border-black text-black font-black text-xs flex items-center justify-center shrink-0 ${
                          POP_COLOR_MAP[tagColor].bg
                        }`}
                      >
                        {p.name.slice(0, 1).toUpperCase()}
                      </span>
                      <span className="font-black text-sm truncate text-black">{p.name}</span>
                      {p.isHost && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#FFE600] text-black border border-black text-[10px] font-black uppercase shrink-0">
                          <CrownSimple weight="fill" className="w-3 h-3" />
                          {t.hostBadge}
                        </span>
                      )}
                      {p.id === myPlayerId && (
                        <span className="text-[10px] font-black uppercase text-[#0B7A53] shrink-0">
                          [{t.youBadge}]
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-lg border border-black shrink-0 ${
                          p.isConnected
                            ? 'bg-[#CCFF00] text-black'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {p.isConnected ? t.online : t.offline}
                      </span>

                      {isHost && p.id !== myPlayerId && (
                        <button
                          type="button"
                          onClick={() => handleKickPlayer(p.id)}
                          title={uiLang === 'fr' ? 'Expulser du salon' : 'Kick from lobby'}
                          aria-label="Expulser"
                          className="w-6 h-6 rounded-lg bg-black text-white hover:bg-[#FF5B36] flex items-center justify-center text-xs font-black transition-colors cursor-pointer"
                        >
                          <X weight="bold" className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Launch & Settings Buttons */}
            <div className="pt-2 space-y-2.5">
              {isHost ? (
                <>
                  <BrutalistButton
                    type="button"
                    color="lime"
                    size="lg"
                    disabled={roomState.players.length < 2}
                    onClick={handleStartGame}
                    className="w-full text-lg"
                  >
                    <Fire weight="fill" className="w-5 h-5 text-[#FF5B36]" />
                    <span>
                      {roomState.players.length < 2 ? t.needTwoPlayers : t.startGameBtn}
                    </span>
                  </BrutalistButton>

                  <BrutalistButton
                    type="button"
                    color="white"
                    size="md"
                    onClick={() => setShowSettingsModal(true)}
                    className="w-full text-xs"
                  >
                    <Sliders weight="bold" className="w-4 h-4" />
                    <span>{t.settingsTitle}</span>
                  </BrutalistButton>
                </>
              ) : (
                <div className="py-3 px-4 rounded-2xl bg-white border-2 border-black text-center text-xs font-black uppercase text-black/60 shadow-[2px_2px_0_#000]">
                  {t.waitingForHost}
                </div>
              )}
            </div>
          </BrutalistCard>
        </main>
      )}

      {/* ==================== 4. ARÈNE DE JEU (GAME ARENA) ==================== */}
      {roomState && isInArena && (
        <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-2 flex flex-col justify-start gap-4">
          {/* Top Telemetry Header */}
          <div className="flex items-center justify-between gap-2 px-4 py-2.5 rounded-2xl bg-white border-3 border-black text-xs font-black uppercase text-black shadow-[3px_3px_0_#000]">
            <div className="flex items-center gap-2">
              <BrutalistBadge color="cyan">
                {t.roundLabel} #{roomState.roundNumber}
              </BrutalistBadge>
              <BrutalistBadge color="yellow">
                {roomState.settings.language.toUpperCase()}
              </BrutalistBadge>
            </div>
            <div className="flex items-center gap-1.5">
              <span>{t.wordsPlayedLabel}:</span>
              <span className="px-2 py-0.5 rounded-lg bg-[#CCFF00] border border-black font-black text-black">
                {roomState.totalWordsPlayed}
              </span>
            </div>
          </div>

          {/* Players Carousel Strip */}
          <div className="flex items-stretch gap-2.5 overflow-x-auto pb-1 no-scrollbar">
            {roomState.players.map((p, idx) => (
              <BrutalistPlayerTag
                key={p.id}
                id={p.id}
                name={p.name}
                lives={p.lives}
                maxLives={p.maxLives}
                isHolder={roomState.activePlayerId === p.id && roomState.status === 'PLAYING'}
                isEliminated={p.isEliminated}
                isHost={p.isHost}
                isMe={p.id === myPlayerId}
                currentTyping={p.currentTyping}
                lastWord={p.lastWordSubmitted}
                lastWordStatus={p.lastWordStatus}
                avatarIndex={idx}
              />
            ))}
          </div>

          {/* Central Challenge Arena Card */}
          <BrutalistCard color="white" depth="lg" className="p-5 sm:p-7 space-y-4">
            {roomState.status === 'COUNTDOWN' ? (
              <div className="py-8 flex flex-col items-center justify-center text-center gap-4">
                <BrutalistBadge color="yellow">{t.countdownTitle}</BrutalistBadge>
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-[#FF5B36] text-white border-3 border-black font-black text-6xl sm:text-7xl flex items-center justify-center shadow-[6px_6px_0_#000] animate-bounce">
                  {countdownSec}
                </div>
                <p className="text-sm font-black uppercase text-black/70">
                  {t.countdownSub}...
                </p>
              </div>
            ) : (
              <>
                {/* Turn Header Banner */}
                <div className="flex items-center justify-between">
                  <span
                    className={`px-3.5 py-1 rounded-xl text-xs font-black uppercase tracking-wider border-2 border-black ${
                      isMyTurn
                        ? 'bg-[#FF5B36] text-white shadow-[3px_3px_0_#000] animate-bounce'
                        : 'bg-white text-black shadow-[2px_2px_0_#000]'
                    }`}
                  >
                    {isMyTurn
                      ? t.yourTurnBanner
                      : `${activePlayer?.name || ''} ${t.otherTurnBanner}`}
                  </span>
                </div>

                {/* Fuse Progress Gauge */}
                <BrutalistFuseBar
                  progressRatio={progressRatio}
                  remainingMs={remainingMs}
                  isCritical={isCriticalTime}
                />

                {/* Monumental Syllable Display */}
                <BrutalistChallengeBox
                  prompt={roomState.currentPrompt || '...'}
                  isCritical={isCriticalTime}
                  isMyTurn={isMyTurn}
                  onClick={() => isMyTurn && inputRef.current?.focus()}
                />

                {/* Watching Other Player Live Typing Monitor */}
                {!isMyTurn && activePlayer && (
                  <div className="min-h-[44px] px-4 py-2.5 rounded-2xl bg-[#FFFDE6] border-2 border-black text-center shadow-[2px_2px_0_#000] flex items-center justify-center">
                    {activePlayer.currentTyping ? (
                      <span className="text-base font-black text-black">
                        <HighlightedWord
                          word={activePlayer.currentTyping}
                          prompt={roomState.currentPrompt}
                        />
                      </span>
                    ) : (
                      <span className="text-xs text-black/60 font-bold uppercase">
                        {activePlayer.name} {t.waitingInput}
                      </span>
                    )}
                  </div>
                )}

                {/* Word Submission Form (When my turn) */}
                {isMyTurn ? (
                  <form onSubmit={handleSubmitWord} className="space-y-2.5">
                    {/* Syllable match status pill (placed above the input so it never shrinks the typing area) */}
                    <div className="flex items-center justify-between text-xs font-black uppercase text-black px-1">
                      <span>Ton mot :</span>
                      {wordInput.trim().length > 0 && (
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-black uppercase tracking-wider border-2 border-black ${
                            wordContainsPrompt
                              ? 'bg-[#CCFF00] text-black shadow-[1px_1px_0_#000]'
                              : 'bg-[#FF5B36] text-white shadow-[1px_1px_0_#000]'
                          }`}
                        >
                          {wordContainsPrompt ? (
                            <>
                              <CheckCircle weight="fill" className="w-3.5 h-3.5" />
                              <span>{t.promptMatchedHint}</span>
                            </>
                          ) : (
                            <>
                              <WarningOctagon weight="fill" className="w-3.5 h-3.5" />
                              <span>{t.promptMissingHint}</span>
                            </>
                          )}
                        </span>
                      )}
                    </div>

                    <div className="flex items-stretch gap-2">
                      <input
                        ref={inputRef}
                        type="text"
                        inputMode="text"
                        autoCapitalize="characters"
                        autoComplete="off"
                        autoCorrect="off"
                        spellCheck={false}
                        enterKeyHint="send"
                        value={wordInput}
                        onChange={(e) => handleWordInputChange(e.target.value)}
                        placeholder={`${t.inputPlaceholder} « ${roomState.currentPrompt} »...`}
                        className="flex-1 min-w-0 h-14 sm:h-16 px-4 sm:px-5 rounded-2xl bg-white border-3 border-black text-black font-black text-xl sm:text-2xl uppercase tracking-wider placeholder:text-black/35 placeholder:text-sm placeholder:normal-case outline-none shadow-[4px_4px_0_#000] focus:bg-[#FFFDE6]"
                      />

                      <BrutalistButton
                        type="submit"
                        color="lime"
                        size="md"
                        className="px-4 sm:px-7 h-14 sm:h-16 text-sm sm:text-base font-black shrink-0"
                      >
                        <span>{t.validateBtn}</span>
                        <PaperPlaneRight weight="fill" className="w-4 h-4 sm:w-5 sm:h-5" />
                      </BrutalistButton>
                    </div>

                    <AnimatePresence mode="wait">
                      {inlineInputError && (
                        <motion.div
                          key={inlineInputError}
                          initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          role="alert"
                          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#FF5B36] text-white border-2 border-black text-xs font-black uppercase shadow-[2px_2px_0_#000]"
                        >
                          <WarningOctagon weight="fill" className="w-4 h-4 shrink-0" />
                          <span>{inlineInputError}</span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </form>
                ) : (
                  myPlayer?.isEliminated && (
                    <div className="py-3 px-4 rounded-2xl bg-slate-200 border-2 border-black text-center text-xs font-black uppercase text-slate-700 shadow-[2px_2px_0_#000]">
                      {t.eliminatedBanner}
                    </div>
                  )
                )}

                {/* Event Notice */}
                {roomState.lastEvent && (
                  <div className="pt-2 border-t-2 border-black text-center text-xs font-black uppercase">
                    {roomState.lastEvent.type === 'word_accepted' && (
                      <span className="text-[#0B7A53] flex items-center justify-center gap-1.5">
                        <CheckCircle weight="fill" className="w-4 h-4 shrink-0" />
                        <span>
                          {roomState.lastEvent.playerName} {t.events.word_accepted}{' '}
                          « {roomState.lastEvent.word} »
                        </span>
                      </span>
                    )}
                    {roomState.lastEvent.type === 'bonus_life_earned' && (
                      <span className="text-[#00F0FF] flex items-center justify-center gap-1.5">
                        <Sparkle weight="fill" className="w-4 h-4 shrink-0 text-black" />
                        <span>
                          {roomState.lastEvent.playerName} {t.events.bonus_life_earned}
                        </span>
                      </span>
                    )}
                    {roomState.lastEvent.type === 'timeout_life_lost' && (
                      <span className="text-[#FF5B36] flex items-center justify-center gap-1.5">
                        <Fire weight="fill" className="w-4 h-4 shrink-0" />
                        <span>
                          {t.events.timeout_life_lost} {roomState.lastEvent.playerName} (-1 ❤️)
                        </span>
                      </span>
                    )}
                    {roomState.lastEvent.type === 'player_eliminated' && (
                      <span className="text-[#FF5B36] flex items-center justify-center gap-1.5">
                        <Skull weight="fill" className="w-4 h-4 shrink-0 text-black" />
                        <span>
                          {roomState.lastEvent.playerName} {t.events.player_eliminated}
                        </span>
                      </span>
                    )}
                  </div>
                )}
              </>
            )}
          </BrutalistCard>

          {/* Bottom Panels: Bonus Alphabet & Recent Words */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            {roomState.settings.bonusAlphabetEnabled && myPlayer && (
              <BrutalistCard
                color="white"
                depth="sm"
                className="sm:col-span-7 p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-black flex items-center gap-1.5">
                    <Sparkle weight="fill" className="w-4 h-4 text-[#FFE600]" />
                    {t.bonusAlphabetHeader}
                  </span>
                  <BrutalistBadge color="lime">
                    {myPlayer.bonusLettersUsed.length}/{roomState.bonusAlphabetTarget.length}
                  </BrutalistBadge>
                </div>

                <div className="flex flex-wrap gap-1">
                  {roomState.bonusAlphabetTarget.map((letter) => {
                    const collected = myPlayer.bonusLettersUsed.includes(letter);
                    return (
                      <span
                        key={letter}
                        className={`w-6 h-6 rounded-lg font-black text-xs flex items-center justify-center border-2 border-black transition-all ${
                          collected
                            ? 'bg-[#CCFF00] text-black shadow-[1px_1px_0_#000]'
                            : 'bg-white text-black/30'
                        }`}
                      >
                        {letter}
                      </span>
                    );
                  })}
                </div>
              </BrutalistCard>
            )}

            <BrutalistCard
              color="white"
              depth="sm"
              className={`${
                roomState.settings.bonusAlphabetEnabled && myPlayer
                  ? 'sm:col-span-5'
                  : 'sm:col-span-12'
              } p-4 space-y-2`}
            >
              <span className="block text-xs font-black uppercase tracking-wider text-black">
                {t.recentWordsHeader}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {roomState.recentValidWords.length === 0 ? (
                  <span className="text-xs text-black/40 italic font-bold">
                    {t.noRecentWords}
                  </span>
                ) : (
                  roomState.recentValidWords.slice(0, 5).map((item, i) => (
                    <span
                      key={`${item.word}-${i}`}
                      className="px-2 py-0.5 rounded-lg bg-white border border-black text-xs font-black text-black shadow-[1px_1px_0_#000]"
                    >
                      <HighlightedWord word={item.word} prompt={item.prompt} />
                    </span>
                  ))
                )}
              </div>
            </BrutalistCard>
          </div>
        </main>
      )}

      {/* ==================== 5. FIN DE PARTIE (GAME OVER / PODIUM) ==================== */}
      {roomState && roomState.status === 'GAME_OVER' && (
        <main className="flex-1 w-full max-w-lg mx-auto px-4 py-6 flex flex-col justify-center">
          <BrutalistCard color="yellow" depth="lg" className="p-6 sm:p-8 space-y-6 text-center">
            {/* Winner Trophy Spotlight */}
            <div className="space-y-3">
              <div className="w-20 h-20 rounded-3xl bg-white text-black border-3 border-black flex items-center justify-center mx-auto shadow-[6px_6px_0_#000]">
                <Trophy weight="fill" className="w-10 h-10 text-[#FF5B36]" />
              </div>
              <BrutalistBadge color="coral">{t.gameOverTitle}</BrutalistBadge>
              <h1 className="text-3xl sm:text-4xl font-black text-black uppercase tracking-tight">
                {roomState.winnerName
                  ? `${roomState.winnerName} ${t.winnerAnnouncement}`
                  : t.noWinner}
              </h1>
            </div>

            {/* Standings Table */}
            <div className="space-y-2.5 text-left">
              <h2 className="text-xs font-black uppercase tracking-wider text-black">
                {t.finalRanking}
              </h2>

              <div className="space-y-2">
                {[...roomState.players]
                  .sort((a, b) => (a.finalRank || 99) - (b.finalRank || 99))
                  .map((p, idx) => {
                    const isWinner = p.id === roomState.winnerId;
                    return (
                      <div
                        key={p.id}
                        className={`flex items-center justify-between px-3.5 py-2.5 rounded-2xl border-3 border-black transition-all ${
                          isWinner
                            ? 'bg-white shadow-[4px_4px_0_#000]'
                            : 'bg-white/70 shadow-[2px_2px_0_#000]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className={`w-7 h-7 rounded-xl font-black text-xs flex items-center justify-center border-2 border-black shrink-0 ${
                              isWinner ? 'bg-[#FFE600] text-black' : 'bg-white text-black'
                            }`}
                          >
                            #{p.finalRank || idx + 1}
                          </span>
                          <div className="min-w-0">
                            <div className="font-black text-sm truncate text-black">
                              {p.name}
                            </div>
                            {p.longestWord && (
                              <div className="text-[10px] text-black/60 font-bold">
                                {t.longestWordCol}: <strong className="text-black">{p.longestWord}</strong>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 text-xs font-black shrink-0">
                          <span className="px-2 py-0.5 rounded-lg bg-black text-white border border-black">
                            {p.wordsValidated} {t.wordsCountCol}
                          </span>
                          {p.bonusLivesEarned > 0 && (
                            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-lg bg-[#CCFF00] text-black border border-black">
                              <span>+{p.bonusLivesEarned}</span>
                              <Heart weight="fill" className="w-3 h-3 text-[#FF5B36]" />
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {isHost ? (
                <>
                  <BrutalistButton
                    type="button"
                    color="lime"
                    size="lg"
                    onClick={handleStartGame}
                    className="w-full text-base"
                  >
                    <ArrowCounterClockwise weight="bold" className="w-5 h-5" />
                    <span>{t.playAgainBtn}</span>
                  </BrutalistButton>
                  <BrutalistButton
                    type="button"
                    color="white"
                    size="md"
                    onClick={handleReturnToLobby}
                    className="w-full text-xs"
                  >
                    <span>{t.backToLobbyBtn}</span>
                  </BrutalistButton>
                </>
              ) : (
                <BrutalistButton
                  type="button"
                  color="white"
                  size="md"
                  onClick={handleLeaveRoom}
                  className="sm:col-span-2 w-full text-xs"
                >
                  <span>{t.waitingForHost} ({t.leaveRoom})</span>
                </BrutalistButton>
              )}
            </div>
          </BrutalistCard>
        </main>
      )}

      {/* ==================== 6. MODALS (RULES, QR, SETTINGS) ==================== */}
      {/* 6.1 Rules Modal */}
      <BrutalistDialog
        open={showRulesModal}
        onClose={() => setShowRulesModal(false)}
        title={t.rulesTitle}
        color="white"
      >
        <div className="space-y-4 text-left">
          <ol className="space-y-2.5 text-xs sm:text-sm font-bold text-black leading-relaxed">
            {t.rulesSteps.map((step, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[#FFFDE6] border-2 border-black shadow-[2px_2px_0_#000]"
              >
                <span className="w-6 h-6 rounded-lg bg-[#FF5B36] text-white border border-black font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>

          <BrutalistButton
            type="button"
            color="yellow"
            size="md"
            onClick={() => setShowRulesModal(false)}
            className="w-full"
          >
            {t.close}
          </BrutalistButton>
        </div>
      </BrutalistDialog>

      {/* 6.2 QR Code Modal */}
      <BrutalistDialog
        open={Boolean(showQrModal && roomState)}
        onClose={() => setShowQrModal(false)}
        title={t.qrCode}
        color="yellow"
        maxWidthClass="max-w-xs"
      >
        {roomState && (
          <div className="text-center space-y-4">
            <div className="font-mono text-3xl font-black text-black tracking-widest bg-white border-2 border-black rounded-xl py-2 shadow-[3px_3px_0_#000]">
              {roomState.roomCode}
            </div>

            <div className="bg-white p-3 rounded-2xl border-3 border-black inline-block mx-auto shadow-[4px_4px_0_#000]">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="QR Code" className="w-44 h-44 mx-auto" />
              ) : (
                <div className="w-44 h-44 flex items-center justify-center font-mono text-xs text-black">
                  Chargement...
                </div>
              )}
            </div>

            <p className="text-xs text-black font-bold uppercase">{t.scanToJoin}</p>

            <BrutalistButton
              type="button"
              color="white"
              size="md"
              onClick={() => setShowQrModal(false)}
              className="w-full"
            >
              {t.close}
            </BrutalistButton>
          </div>
        )}
      </BrutalistDialog>

      {/* 6.3 Host Settings Modal */}
      {roomState && (
        <BrutalistDialog
          open={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          title={t.settingsTitle}
          color="white"
          maxWidthClass="max-w-md"
        >
          <div className="space-y-4 text-left text-xs font-black uppercase text-black">
            {/* Dictionary */}
            <div className="p-3 rounded-xl bg-white border-2 border-black shadow-[2px_2px_0_#000] space-y-1.5">
              <span>{t.dictLanguageLabel}</span>
              <div className="grid grid-cols-2 gap-2">
                {(['fr', 'en'] as const).map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    disabled={!isHost}
                    onClick={() => handleUpdateSettings({ language: lang })}
                    className={`py-2 px-2 rounded-lg border-2 border-black font-black transition-colors cursor-pointer ${
                      roomState.settings.language === lang
                        ? 'bg-[#FFE600] text-black shadow-[2px_2px_0_#000]'
                        : 'bg-white text-black/60'
                    }`}
                  >
                    {lang === 'fr' ? t.langFr : t.langEn}
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulty */}
            <div className="p-3 rounded-xl bg-white border-2 border-black shadow-[2px_2px_0_#000] space-y-1.5">
              <span>{t.difficultyLabel}</span>
              <div className="grid grid-cols-3 gap-1.5">
                {(
                  [
                    { id: 'easy', label: t.diffEasy },
                    { id: 'normal', label: t.diffNormal },
                    { id: 'hard', label: t.diffHard },
                  ] as { id: BombDifficulty; label: string }[]
                ).map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    disabled={!isHost}
                    onClick={() => handleUpdateSettings({ difficulty: d.id })}
                    className={`py-1.5 rounded-lg border-2 border-black font-black text-center transition-colors cursor-pointer ${
                      roomState.settings.difficulty === d.id
                        ? 'bg-[#FF5B36] text-white shadow-[2px_2px_0_#000]'
                        : 'bg-white text-black/60'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Initial Lives */}
            <div className="p-3 rounded-xl bg-white border-2 border-black shadow-[2px_2px_0_#000] flex items-center justify-between">
              <span>{t.initialLivesLabel}</span>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((val) => (
                  <button
                    key={val}
                    type="button"
                    disabled={!isHost}
                    onClick={() => handleUpdateSettings({ initialLives: val })}
                    className={`w-7 h-7 rounded-lg border-2 border-black font-black text-xs transition-colors cursor-pointer ${
                      roomState.settings.initialLives === val
                        ? 'bg-[#FF5B36] text-white shadow-[2px_2px_0_#000]'
                        : 'bg-white text-black/50'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>

            {/* Max Lives */}
            <div className="p-3 rounded-xl bg-white border-2 border-black shadow-[2px_2px_0_#000] flex items-center justify-between">
              <span>{t.maxLivesLabel}</span>
              <div className="flex items-center gap-1">
                {[3, 4, 5, 6].map((val) => (
                  <button
                    key={val}
                    type="button"
                    disabled={!isHost}
                    onClick={() => handleUpdateSettings({ maxLives: val })}
                    className={`w-7 h-7 rounded-lg border-2 border-black font-black text-xs transition-colors cursor-pointer ${
                      roomState.settings.maxLives === val
                        ? 'bg-[#FFE600] text-black shadow-[2px_2px_0_#000]'
                        : 'bg-white text-black/50'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>

            {/* Durations */}
            <div className="p-3 rounded-xl bg-white border-2 border-black shadow-[2px_2px_0_#000] flex items-center justify-between">
              <span>{t.maxBombSecLabel}</span>
              <select
                disabled={!isHost}
                value={roomState.settings.maxBombDurationSec}
                onChange={(e) =>
                  handleUpdateSettings({ maxBombDurationSec: Number(e.target.value) })
                }
                className="px-2.5 py-1 rounded-lg bg-white border-2 border-black font-black text-black outline-none"
              >
                {[10, 12, 15, 18, 20, 25].map((s) => (
                  <option key={s} value={s}>
                    {s}s
                  </option>
                ))}
              </select>
            </div>

            {/* Repetition Policy */}
            <div className="p-3 rounded-xl bg-white border-2 border-black shadow-[2px_2px_0_#000] flex items-center justify-between">
              <span>{t.wordRepetitionLabel}</span>
              <button
                type="button"
                disabled={!isHost}
                onClick={() =>
                  handleUpdateSettings({
                    wordRepetitionPolicy:
                      roomState.settings.wordRepetitionPolicy === 'forbid'
                        ? 'allow'
                        : 'forbid',
                  })
                }
                className="px-3 py-1 rounded-lg bg-[#00F0FF] text-black border-2 border-black font-black shadow-[2px_2px_0_#000] cursor-pointer"
              >
                {roomState.settings.wordRepetitionPolicy === 'forbid'
                  ? t.repForbid
                  : t.repAllow}
              </button>
            </div>

            {/* Bonus Alphabet */}
            <div className="p-3 rounded-xl bg-white border-2 border-black shadow-[2px_2px_0_#000] flex items-center justify-between">
              <span>{t.bonusAlphabetLabel}</span>
              <button
                type="button"
                disabled={!isHost}
                onClick={() =>
                  handleUpdateSettings({
                    bonusAlphabetEnabled: !roomState.settings.bonusAlphabetEnabled,
                  })
                }
                className={`px-3 py-1 rounded-lg border-2 border-black font-black shadow-[2px_2px_0_#000] cursor-pointer ${
                  roomState.settings.bonusAlphabetEnabled
                    ? 'bg-[#CCFF00] text-black'
                    : 'bg-white text-black/50'
                }`}
              >
                {roomState.settings.bonusAlphabetEnabled ? t.enabled : t.disabled}
              </button>
            </div>

            <BrutalistButton
              type="button"
              color="coral"
              size="md"
              onClick={() => setShowSettingsModal(false)}
              className="w-full"
            >
              {t.close}
            </BrutalistButton>
          </div>
        </BrutalistDialog>
      )}
    </div>
  );
};

export default SekouBombApp;