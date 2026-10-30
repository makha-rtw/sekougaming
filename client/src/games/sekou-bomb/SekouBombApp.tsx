import React, { useState, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
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
  Ticket,
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
  SolariFlapTile,
  SolariWordStrip,
  BombLightDialog,
} from './components/SolariFlap.js';

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
 * Highlights the required prompt letters inside a word or live typing string
 * using crisp Risograph Vermilion print marking.
 */
const HighlightedWord: React.FC<{ word: string; prompt: string; lightOnDark?: boolean }> = ({
  word,
  prompt,
  lightOnDark = false,
}) => {
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
      <span
        className={
          lightOnDark
            ? 'bg-[#E5382B] text-[#FAF6EE] px-0.5 rounded-[2px] font-black'
            : 'bg-[#E5382B] text-[#FAF6EE] px-1 py-0.5 rounded-[2px] font-black'
        }
      >
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
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copiedType, setCopiedType] = useState<'code' | 'link' | null>(null);

  // Server clock offset (serverNowMs - Date.now()) for authoritative timer display
  const serverOffsetMsRef = useRef<number>(0);
  const [remainingMs, setRemainingMs] = useState<number>(0);
  const [countdownSec, setCountdownSec] = useState<number>(3);
  const lastEventIdRef = useRef<string | null>(null);
  const lastTickSecondRef = useRef<number>(-1);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Cycle the Solari demonstration strip on Home screen when idle
  useEffect(() => {
    if (roomState || reduceMotion) return;
    const id = window.setInterval(() => {
      setDemoIndex((prev) => (prev + 1) % DEMO_SPECIMENS[uiLang].length);
    }, 3400);
    return () => window.clearInterval(id);
  }, [roomState, uiLang, reduceMotion]);

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

    attemptReconnect();

    const onBombState = (state: BombRoomStatePublic) => {
      serverOffsetMsRef.current = (state.serverNowMs || Date.now()) - Date.now();
      setRoomState(state);

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

  // Actions
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
          ? 'Le code du plateau doit comporter 6 caractères.'
          : 'Stage code must be 6 characters.'
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
          setErrorBanner(res?.error || 'Impossible de rejoindre ce plateau.');
        }
      }
    );
  };

  const handleLeaveRoom = () => {
    socket.emit('bomb_leave_room', () => {
      clearBombSession();
      setRoomState(null);
      setMyPlayerId(null);
      setErrorBanner(null);
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
              ? `Rejoins mon plateau Sekou Bomb (Code : ${roomState.roomCode}) !`
              : `Join my Sekou Bomb stage (Code: ${roomState.roomCode})!`,
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
        paddingTop: 'max(env(safe-area-inset-top, 0px), 0.5rem)',
        paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 0.75rem)',
      }}
    >
      {/* ==================== TOP BROADCAST STUDIO RAIL ==================== */}
      <header className="w-full max-w-6xl mx-auto px-3 sm:px-6 py-2 shrink-0">
        <div className="flex items-center justify-between gap-2 bg-[#FAF6EE] border-2 border-[#141312] rounded-[8px] px-2.5 sm:px-4 py-2 shadow-[3px_3px_0_#141312]">
          <button
            type="button"
            onClick={roomState ? handleLeaveRoom : onBackToHub}
            className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-[5px] bg-[#E8E0D0] hover:bg-[#141312] hover:text-[#FAF6EE] border-2 border-[#141312] text-xs font-bold uppercase tracking-wider text-[#141312] transition-[background-color,color,transform] cursor-pointer active:translate-y-[1px]"
          >
            <ArrowLeft weight="bold" className="w-3.5 h-3.5" />
            <span>{roomState ? t.leaveRoom : t.backToHub}</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] bg-[#E5382B] text-[#FAF6EE] border border-[#141312] font-bomb-mono text-[10px] font-bold uppercase tracking-widest">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FAF6EE]" />
              DIRECT
            </span>
            <span className="font-bomb-display font-black text-xl sm:text-2xl tracking-wide uppercase leading-none text-[#141312]">
              SEKOU <span className="text-[#E5382B]">BOMB</span>
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Typographic UI Language Stamp (FR / EN) */}
            <button
              type="button"
              onClick={toggleUiLang}
              aria-label="Basculer la langue (FR / EN)"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-[5px] bg-[#FAF6EE] hover:bg-[#1D4ED8] hover:text-[#FAF6EE] border-2 border-[#141312] font-bomb-mono text-xs font-bold uppercase text-[#141312] transition-[background-color,color] cursor-pointer"
            >
              <span>{uiLang.toUpperCase()}</span>
            </button>

            {/* Rules Sheet Trigger */}
            <button
              type="button"
              onClick={() => setShowRulesModal(true)}
              aria-label={t.rulesBtn}
              title={t.rulesBtn}
              className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-[5px] bg-[#FAF6EE] hover:bg-[#E59A00] border-2 border-[#141312] text-xs font-bold text-[#141312] transition-[background-color,color] cursor-pointer"
            >
              <BookOpenText weight="bold" className="w-4 h-4" />
              <span className="hidden md:inline uppercase tracking-wider">{t.rulesBtn}</span>
            </button>

            {/* Audio Mute Switch */}
            <button
              type="button"
              onClick={() => setIsMuted(bombSounds.toggleMute())}
              aria-label={isMuted ? 'Activer le son' : 'Couper le son'}
              className={`p-1.5 rounded-[5px] border-2 border-[#141312] transition-[background-color,color] cursor-pointer ${
                isMuted
                  ? 'bg-[#E5382B] text-[#FAF6EE]'
                  : 'bg-[#FAF6EE] hover:bg-[#E8E0D0] text-[#141312]'
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

      {/* Error Dispatch Banner */}
      {errorBanner && (
        <div className="w-full max-w-2xl mx-auto px-3 sm:px-6 mt-1">
          <div
            role="alert"
            className="px-3.5 py-2.5 rounded-[6px] bg-[#E5382B] text-[#FAF6EE] border-2 border-[#141312] shadow-[3px_3px_0_#141312] text-xs font-bold flex items-center justify-between gap-2"
          >
            <div className="flex items-center gap-2">
              <WarningOctagon weight="fill" className="w-4 h-4 shrink-0" />
              <span>{errorBanner}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorBanner(null)}
              aria-label={t.close}
              className="p-1 rounded-[4px] hover:bg-black/20 cursor-pointer"
            >
              <X weight="bold" className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ==================== 1. HOME SCREEN : RISOGRAPH POSTER & TICKET ==================== */}
      {!roomState && (
        <main className="flex-1 w-full max-w-6xl mx-auto px-3 sm:px-6 py-3 sm:py-6 flex items-center">
          <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-8 items-stretch">
            {/* Left Column: Editorial Broadcast Poster + Live Solari Specimen */}
            <section className="lg:col-span-6 flex flex-col justify-between bg-[#E8E0D0] border-2 border-[#141312] rounded-[10px] p-5 sm:p-7 shadow-[6px_6px_0_#141312] relative overflow-hidden">
              {/* Top print registration strip */}
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-4 border-b-2 border-[#141312]">
                  <span className="font-bomb-mono text-[11px] font-bold uppercase tracking-widest text-[#141312]">
                    {t.studioKicker}
                  </span>
                  <span className="px-2 py-0.5 bg-[#1D4ED8] text-[#FAF6EE] border border-[#141312] rounded-[3px] font-bomb-mono text-[10px] font-bold uppercase tracking-wider">
                    2..16 JOUEURS
                  </span>
                </div>

                <h1 className="font-bomb-display font-black uppercase leading-[0.88] tracking-tight text-[clamp(3.3rem,9vw,5.6rem)] text-[#141312]">
                  SEKOU{' '}
                  <span className="inline-block px-2.5 pb-1 bg-[#E5382B] text-[#FAF6EE] border-2 border-[#141312] rounded-[6px] shadow-[3px_3px_0_#141312] -rotate-1">
                    BOMB
                  </span>
                </h1>

                <p className="mt-3.5 text-sm sm:text-base font-medium leading-relaxed text-[#2B2926] max-w-lg">
                  {t.subtitle}
                </p>
              </div>

              {/* Interactive Mechanical Solari Specimen Board */}
              <div className="my-5 p-4 rounded-[8px] bg-[#FAF6EE] border-2 border-[#141312]">
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <span className="font-bomb-mono text-[10px] font-bold uppercase tracking-widest text-[#57524A]">
                    {uiLang === 'fr' ? 'Spécimen mécanique en direct' : 'Live split-flap specimen'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setDemoIndex((i) => (i + 1) % demoList.length)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] bg-[#E8E0D0] hover:bg-[#141312] hover:text-[#FAF6EE] border border-[#141312] font-bomb-mono text-[10px] font-bold uppercase transition-[background-color,color] cursor-pointer"
                  >
                    <ArrowsClockwise weight="bold" className="w-3 h-3" />
                    <span>{uiLang === 'fr' ? 'Tourner' : 'Flip'}</span>
                  </button>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <SolariWordStrip
                    text={currentDemo.prompt}
                    size="sm"
                    tone="ink"
                    label={`Syllabe ${currentDemo.prompt}`}
                  />

                  <div className="flex items-center gap-2 font-bomb-mono text-sm sm:text-base font-bold text-[#141312] bg-[#E8E0D0] px-3 py-2 rounded-[5px] border border-[#141312]">
                    <CheckCircle weight="fill" className="w-4 h-4 text-[#0B7A53] shrink-0" />
                    <HighlightedWord word={currentDemo.sample} prompt={currentDemo.prompt} />
                  </div>
                </div>
              </div>

              {/* 3 Editorial Print Columns (No SaaS Cards) */}
              <div className="grid grid-cols-3 gap-3 pt-3 border-t-2 border-[#141312] text-left">
                <div>
                  <div className="font-bomb-mono text-[10px] font-bold text-[#E5382B]">01 / SYLLABE</div>
                  <div className="text-xs font-bold text-[#141312] mt-0.5">
                    {uiLang === 'fr' ? '2 à 4 lettres sur volets' : '2 to 4 split-flap letters'}
                  </div>
                </div>
                <div className="border-l border-[#141312]/25 pl-3">
                  <div className="font-bomb-mono text-[10px] font-bold text-[#1D4ED8]">02 / RELAIS</div>
                  <div className="text-xs font-bold text-[#141312] mt-0.5">
                    {uiLang === 'fr' ? 'Validation instantanée' : 'Instant bomb handoff'}
                  </div>
                </div>
                <div className="border-l border-[#141312]/25 pl-3">
                  <div className="font-bomb-mono text-[10px] font-bold text-[#0B7A53]">03 / ALPHABET</div>
                  <div className="text-xs font-bold text-[#141312] mt-0.5">
                    {uiLang === 'fr' ? '24 lettres = +1 vie' : '24 letters = +1 life'}
                  </div>
                </div>
              </div>
            </section>

            {/* Right Column: Perforated Contestant Registration Ticket */}
            <section className="lg:col-span-6 bg-[#FAF6EE] border-2 border-[#141312] rounded-[10px] shadow-[6px_6px_0_#141312] flex flex-col justify-between overflow-hidden">
              {/* Ticket Top Header Bar */}
              <div className="bg-[#141312] text-[#FAF6EE] px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Ticket weight="fill" className="w-4 h-4 text-[#E59A00]" />
                  <span className="font-bomb-mono text-xs font-bold uppercase tracking-widest">
                    {uiLang === 'fr' ? 'Billet d’engagement candidat' : 'Contestant Entry Pass'}
                  </span>
                </div>
                <span className="font-bomb-mono text-[11px] text-[#E59A00] font-bold">
                  N° 04-SB
                </span>
              </div>

              {/* Step 1: Shared Contestant Identity */}
              <div className="p-5 sm:px-6 sm:pt-5 sm:pb-4">
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="bomb-nickname-input"
                    className="font-bomb-mono text-xs font-bold uppercase tracking-wider text-[#141312]"
                  >
                    01 / {t.yourNickname}
                  </label>
                  <span className="font-bomb-mono text-[11px] font-semibold text-[#57524A]">
                    {playerName.trim().length}/20
                  </span>
                </div>
                <input
                  id="bomb-nickname-input"
                  type="text"
                  maxLength={20}
                  autoComplete="nickname"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder={t.nicknamePlaceholder}
                  className="w-full px-3.5 py-3 rounded-[6px] bg-[#F4EFE6] border-2 border-[#141312] focus:bg-white text-base font-bold text-[#141312] placeholder:text-[#57524A]/60 outline-none transition-[background-color]"
                />
              </div>

              {/* Perforated Tear Line with Circular Hole-Punch Cutouts */}
              <div className="relative flex items-center my-1">
                <div className="w-5 h-5 rounded-full bg-[#F4EFE6] border-2 border-[#141312] -ml-3 shrink-0" />
                <div className="flex-1 border-t-2 border-dashed border-[#141312]/40 mx-2" />
                <div className="w-5 h-5 rounded-full bg-[#F4EFE6] border-2 border-[#141312] -mr-3 shrink-0" />
              </div>

              {/* Step 2: Mode Selector (Create Stage vs Enter Ticket Code) */}
              <div className="p-5 sm:px-6 sm:pt-4 sm:pb-6 flex-1 flex flex-col justify-between gap-4">
                <div>
                  <span className="block font-bomb-mono text-xs font-bold uppercase tracking-wider text-[#141312] mb-2">
                    02 / {uiLang === 'fr' ? 'Mode d’accès' : 'Stage access mode'}
                  </span>

                  <div
                    role="tablist"
                    className="grid grid-cols-2 p-1 rounded-[7px] bg-[#E8E0D0] border-2 border-[#141312] gap-1"
                  >
                    <button
                      type="button"
                      role="tab"
                      aria-selected={entryMode === 'create'}
                      onClick={() => setEntryMode('create')}
                      className={`py-2 px-3 rounded-[4px] font-bomb-mono text-xs font-bold uppercase tracking-wide transition-[background-color,color] cursor-pointer ${
                        entryMode === 'create'
                          ? 'bg-[#141312] text-[#FAF6EE]'
                          : 'text-[#141312] hover:bg-[#FAF6EE]/70'
                      }`}
                    >
                      {t.modeCreateTab}
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={entryMode === 'join'}
                      onClick={() => setEntryMode('join')}
                      className={`py-2 px-3 rounded-[4px] font-bomb-mono text-xs font-bold uppercase tracking-wide transition-[background-color,color] cursor-pointer ${
                        entryMode === 'join'
                          ? 'bg-[#1D4ED8] text-[#FAF6EE]'
                          : 'text-[#141312] hover:bg-[#FAF6EE]/70'
                      }`}
                    >
                      {t.modeJoinTab}
                    </button>
                  </div>
                </div>

                {entryMode === 'create' ? (
                  <form onSubmit={handleCreateRoom} className="space-y-4">
                    <div>
                      <span className="block text-xs font-bold text-[#57524A] mb-2">
                        {t.dictLanguageLabel}
                      </span>
                      <div className="grid grid-cols-2 gap-2.5">
                        {(['fr', 'en'] as const).map((lang) => {
                          const active = createDictLang === lang;
                          return (
                            <button
                              key={lang}
                              type="button"
                              onClick={() => setCreateDictLang(lang)}
                              className={`flex items-center justify-between px-3.5 py-3 rounded-[6px] border-2 border-[#141312] text-left transition-[background-color,color,transform,box-shadow] cursor-pointer ${
                                active
                                  ? 'bg-[#E59A00] text-[#141312] shadow-[3px_3px_0_#141312] -translate-y-[1px]'
                                  : 'bg-[#F4EFE6] text-[#141312] hover:bg-white'
                              }`}
                            >
                              <div>
                                <div className="font-bomb-mono text-[10px] font-bold uppercase opacity-75">
                                  {lang === 'fr' ? 'ÉDITION FR' : 'EDITION EN'}
                                </div>
                                <div className="text-sm font-bold">
                                  {lang === 'fr' ? t.langFr : t.langEn}
                                </div>
                              </div>
                              <span className="px-2 py-0.5 rounded-[3px] bg-[#141312] text-[#FAF6EE] font-bomb-mono text-xs font-bold uppercase">
                                {lang.toUpperCase()}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-3.5 px-5 rounded-[7px] bg-[#E5382B] hover:bg-[#cf2d20] text-[#FAF6EE] border-2 border-[#141312] shadow-[4px_4px_0_#141312] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_#141312] font-bomb-display font-black text-xl uppercase tracking-wider flex items-center justify-center gap-2 transition-[transform,box-shadow,background-color] cursor-pointer disabled:opacity-50"
                    >
                      <Fire weight="fill" className="w-5 h-5" />
                      <span>{isLoading ? t.creating : t.createRoomBtn}</span>
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleJoinRoom} className="space-y-4">
                    <div>
                      <label
                        htmlFor="bomb-join-code-input"
                        className="block text-xs font-bold text-[#57524A] mb-2"
                      >
                        {t.roomCodeLabel} (6 {uiLang === 'fr' ? 'caractères' : 'characters'})
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
                        className="w-full px-4 py-3 rounded-[6px] bg-[#F4EFE6] border-2 border-[#141312] focus:bg-white font-bomb-mono text-2xl font-bold tracking-[0.3em] uppercase text-center text-[#1D4ED8] placeholder:text-[#57524A]/45 placeholder:text-base placeholder:tracking-wider outline-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-3.5 px-5 rounded-[7px] bg-[#1D4ED8] hover:bg-[#1841b8] text-[#FAF6EE] border-2 border-[#141312] shadow-[4px_4px_0_#141312] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_#141312] font-bomb-display font-black text-xl uppercase tracking-wider flex items-center justify-center gap-2 transition-[transform,box-shadow,background-color] cursor-pointer disabled:opacity-50"
                    >
                      <Ticket weight="fill" className="w-5 h-5" />
                      <span>{isLoading ? t.joining : t.joinRoomBtn}</span>
                    </button>
                  </form>
                )}
              </div>
            </section>
          </div>
        </main>
      )}

      {/* ==================== 2. WAITING LOBBY : CONTROL SHEET & CALL LIST ==================== */}
      {roomState && roomState.status === 'LOBBY' && (
        <main className="flex-1 w-full max-w-6xl mx-auto px-3 sm:px-6 py-3 grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Column: Solari Room Code Pass & Registered Contestants */}
          <div className="lg:col-span-5 space-y-4">
            {/* Solari Access Code Ticket */}
            <section className="bg-[#FAF6EE] border-2 border-[#141312] rounded-[10px] p-4 sm:p-5 shadow-[5px_5px_0_#141312]">
              <div className="flex items-center justify-between mb-2.5">
                <span className="font-bomb-mono text-[11px] font-bold uppercase tracking-widest text-[#E5382B]">
                  {t.roomCodeLabel}
                </span>
                <span className="px-2 py-0.5 rounded-[3px] bg-[#141312] text-[#FAF6EE] font-bomb-mono text-[10px] font-bold uppercase">
                  {roomState.settings.language.toUpperCase()}
                </span>
              </div>

              <div className="flex justify-center py-1">
                <SolariWordStrip
                  text={roomState.roomCode}
                  size="sm"
                  tone="ink"
                  label={`Code du salon ${roomState.roomCode}`}
                />
              </div>

              <div className="mt-3.5 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="py-2 px-2.5 rounded-[5px] bg-[#F4EFE6] hover:bg-[#141312] hover:text-[#FAF6EE] border-2 border-[#141312] text-xs font-bold flex items-center justify-center gap-1.5 transition-[background-color,color] cursor-pointer"
                >
                  {copiedType === 'code' ? (
                    <Check weight="bold" className="w-3.5 h-3.5 text-[#0B7A53]" />
                  ) : (
                    <Copy weight="bold" className="w-3.5 h-3.5" />
                  )}
                  <span>{copiedType === 'code' ? t.copied : t.copyCode}</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="py-2 px-2.5 rounded-[5px] bg-[#F4EFE6] hover:bg-[#141312] hover:text-[#FAF6EE] border-2 border-[#141312] text-xs font-bold flex items-center justify-center gap-1.5 transition-[background-color,color] cursor-pointer"
                >
                  {copiedType === 'link' ? (
                    <Check weight="bold" className="w-3.5 h-3.5 text-[#0B7A53]" />
                  ) : (
                    <Copy weight="bold" className="w-3.5 h-3.5" />
                  )}
                  <span>{copiedType === 'link' ? t.copied : t.copyLink}</span>
                </button>

                <button
                  type="button"
                  onClick={handleShareLink}
                  className="py-2 px-2.5 rounded-[5px] bg-[#F4EFE6] hover:bg-[#1D4ED8] hover:text-[#FAF6EE] border-2 border-[#141312] text-xs font-bold flex items-center justify-center gap-1.5 transition-[background-color,color] cursor-pointer"
                >
                  <ShareNetwork weight="bold" className="w-3.5 h-3.5" />
                  <span>{t.shareLink}</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenQrModal}
                  className="py-2 px-2.5 rounded-[5px] bg-[#E59A00] hover:brightness-95 border-2 border-[#141312] text-xs font-bold text-[#141312] flex items-center justify-center gap-1.5 transition-[filter] cursor-pointer"
                >
                  <QrCode weight="bold" className="w-3.5 h-3.5" />
                  <span>{t.qrCode}</span>
                </button>
              </div>
            </section>

            {/* Contestants Call Sheet */}
            <section className="bg-[#FAF6EE] border-2 border-[#141312] rounded-[10px] p-4 sm:p-5 shadow-[5px_5px_0_#141312]">
              <div className="flex items-center justify-between pb-2.5 mb-3 border-b-2 border-[#141312]">
                <div className="flex items-center gap-2">
                  <UsersThree weight="bold" className="w-4 h-4 text-[#141312]" />
                  <h2 className="font-bomb-display font-black text-xl uppercase tracking-wide">
                    {t.playersTitle}
                  </h2>
                </div>
                <span className="px-2 py-0.5 rounded-[4px] bg-[#141312] text-[#FAF6EE] font-bomb-mono text-xs font-bold">
                  {roomState.players.length}/{roomState.settings.maxPlayers}
                </span>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {roomState.players.map((p, idx) => (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between px-3 py-2 rounded-[6px] border-2 border-[#141312] ${
                      p.id === myPlayerId ? 'bg-[#E59A00]/25' : 'bg-[#F4EFE6]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-6 h-6 rounded-[4px] bg-[#141312] text-[#FAF6EE] font-bomb-mono text-[11px] font-bold flex items-center justify-center shrink-0">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <span className="font-bold text-sm truncate text-[#141312]">{p.name}</span>
                      {p.isHost && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[3px] bg-[#E5382B] text-[#FAF6EE] font-bomb-mono text-[10px] font-bold uppercase shrink-0">
                          <CrownSimple weight="fill" className="w-3 h-3" />
                          {t.hostBadge}
                        </span>
                      )}
                      {p.id === myPlayerId && (
                        <span className="font-bomb-mono text-[10px] font-bold uppercase text-[#1D4ED8] shrink-0">
                          [{t.youBadge}]
                        </span>
                      )}
                    </div>

                    <span
                      className={`font-bomb-mono text-[10px] font-bold uppercase px-2 py-0.5 rounded-[3px] border border-[#141312] shrink-0 ${
                        p.isConnected
                          ? 'bg-[#0B7A53] text-[#FAF6EE]'
                          : 'bg-[#E59A00] text-[#141312]'
                      }`}
                    >
                      {p.isConnected ? t.online : t.offline}
                    </span>
                  </div>
                ))}
              </div>

              {/* Start Broadcast Button */}
              <div className="mt-4 pt-3 border-t-2 border-[#141312]">
                {isHost ? (
                  <button
                    type="button"
                    disabled={roomState.players.length < 2}
                    onClick={handleStartGame}
                    className="w-full py-3.5 px-4 rounded-[7px] bg-[#E5382B] hover:bg-[#cf2d20] text-[#FAF6EE] border-2 border-[#141312] shadow-[4px_4px_0_#141312] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_#141312] font-bomb-display font-black text-xl uppercase tracking-wider flex items-center justify-center gap-2 transition-[transform,box-shadow,background-color] cursor-pointer disabled:opacity-45 disabled:shadow-none"
                  >
                    <Fire weight="fill" className="w-5 h-5" />
                    <span>
                      {roomState.players.length < 2 ? t.needTwoPlayers : t.startGameBtn}
                    </span>
                  </button>
                ) : (
                  <div className="py-3 px-4 rounded-[6px] bg-[#E8E0D0] border-2 border-[#141312] text-center font-bomb-mono text-xs font-bold text-[#141312]">
                    {t.waitingForHost}
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Right Column: Stage Director Control Ledger */}
          <section className="lg:col-span-7 bg-[#FAF6EE] border-2 border-[#141312] rounded-[10px] p-4 sm:p-6 shadow-[5px_5px_0_#141312]">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-4 border-b-2 border-[#141312]">
              <div className="flex items-center gap-2">
                <Sliders weight="bold" className="w-5 h-5 text-[#1D4ED8]" />
                <h2 className="font-bomb-display font-black text-2xl uppercase tracking-wide">
                  {t.settingsTitle}
                </h2>
              </div>
              {!isHost && (
                <span className="px-2 py-0.5 rounded-[4px] bg-[#E8E0D0] border border-[#141312] font-bomb-mono text-[10px] font-bold uppercase text-[#57524A]">
                  {t.hostOnlyNote}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
              {/* 1. Official Dictionary */}
              <div className="p-3.5 rounded-[7px] bg-[#F4EFE6] border-2 border-[#141312]">
                <span className="block font-bomb-mono text-[11px] font-bold uppercase tracking-wider text-[#57524A] mb-2">
                  {t.dictLanguageLabel}
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  {(['fr', 'en'] as const).map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      disabled={!isHost}
                      onClick={() => handleUpdateSettings({ language: lang })}
                      className={`py-2 px-2.5 rounded-[5px] font-bold border-2 border-[#141312] flex items-center justify-between transition-[background-color,color] cursor-pointer disabled:cursor-default ${
                        roomState.settings.language === lang
                          ? 'bg-[#141312] text-[#FAF6EE]'
                          : 'bg-[#FAF6EE] text-[#141312]'
                      }`}
                    >
                      <span>{lang === 'fr' ? t.langFr : t.langEn}</span>
                      <span className="font-bomb-mono text-[10px] uppercase opacity-80">
                        {lang}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Syllable Caliber / Difficulty */}
              <div className="p-3.5 rounded-[7px] bg-[#F4EFE6] border-2 border-[#141312]">
                <span className="block font-bomb-mono text-[11px] font-bold uppercase tracking-wider text-[#57524A] mb-2">
                  {t.difficultyLabel}
                </span>
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
                      className={`py-2 px-2 rounded-[5px] font-bold border-2 border-[#141312] transition-[background-color,color] cursor-pointer disabled:cursor-default ${
                        roomState.settings.difficulty === d.id
                          ? 'bg-[#E5382B] text-[#FAF6EE]'
                          : 'bg-[#FAF6EE] text-[#141312]'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Starting Lives & Max Lives */}
              <div className="p-3.5 rounded-[7px] bg-[#F4EFE6] border-2 border-[#141312] space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-[#141312]">{t.initialLivesLabel}</span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((val) => (
                      <button
                        key={val}
                        type="button"
                        disabled={!isHost}
                        onClick={() => handleUpdateSettings({ initialLives: val })}
                        className={`w-7 h-7 rounded-[4px] font-bomb-mono font-bold border-2 border-[#141312] cursor-pointer disabled:cursor-default ${
                          roomState.settings.initialLives === val
                            ? 'bg-[#E5382B] text-[#FAF6EE]'
                            : 'bg-[#FAF6EE] text-[#141312]'
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#141312]/15">
                  <span className="font-bold text-[#141312]">{t.maxLivesLabel}</span>
                  <div className="flex items-center gap-1">
                    {[3, 4, 5, 6].map((val) => (
                      <button
                        key={val}
                        type="button"
                        disabled={!isHost}
                        onClick={() => handleUpdateSettings({ maxLives: val })}
                        className={`w-7 h-7 rounded-[4px] font-bomb-mono font-bold border-2 border-[#141312] cursor-pointer disabled:cursor-default ${
                          roomState.settings.maxLives === val
                            ? 'bg-[#141312] text-[#FAF6EE]'
                            : 'bg-[#FAF6EE] text-[#141312]'
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 4. Fuse Min & Max Duration */}
              <div className="p-3.5 rounded-[7px] bg-[#F4EFE6] border-2 border-[#141312] space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-[#141312]">{t.minTurnSecLabel}</span>
                  <select
                    disabled={!isHost}
                    value={roomState.settings.minTurnDurationSec}
                    onChange={(e) =>
                      handleUpdateSettings({ minTurnDurationSec: Number(e.target.value) })
                    }
                    className="px-2.5 py-1 rounded-[4px] bg-[#FAF6EE] border-2 border-[#141312] font-bomb-mono font-bold text-[#141312]"
                  >
                    {[3, 4, 5, 6, 8, 10].map((s) => (
                      <option key={s} value={s}>
                        {s}s
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#141312]/15">
                  <span className="font-bold text-[#141312]">{t.maxBombSecLabel}</span>
                  <select
                    disabled={!isHost}
                    value={roomState.settings.maxBombDurationSec}
                    onChange={(e) =>
                      handleUpdateSettings({ maxBombDurationSec: Number(e.target.value) })
                    }
                    className="px-2.5 py-1 rounded-[4px] bg-[#FAF6EE] border-2 border-[#141312] font-bomb-mono font-bold text-[#141312]"
                  >
                    {[10, 12, 15, 18, 20, 25].map((s) => (
                      <option key={s} value={s}>
                        {s}s
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 5. Word Reuse & Invalid Word Penalty */}
              <div className="p-3.5 rounded-[7px] bg-[#F4EFE6] border-2 border-[#141312] space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-[#141312]">{t.wordRepetitionLabel}</span>
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
                    className="px-2.5 py-1 rounded-[4px] bg-[#FAF6EE] border-2 border-[#141312] font-bomb-mono font-bold text-[#1D4ED8] cursor-pointer disabled:cursor-default"
                  >
                    {roomState.settings.wordRepetitionPolicy === 'forbid'
                      ? t.repForbid
                      : t.repAllow}
                  </button>
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#141312]/15">
                  <span className="font-bold text-[#141312]">{t.invalidPolicyLabel}</span>
                  <button
                    type="button"
                    disabled={!isHost}
                    onClick={() =>
                      handleUpdateSettings({
                        invalidAttemptPolicy:
                          roomState.settings.invalidAttemptPolicy === 'retry'
                            ? 'lose_life'
                            : 'retry',
                      })
                    }
                    className={`px-2.5 py-1 rounded-[4px] border-2 border-[#141312] font-bomb-mono font-bold cursor-pointer disabled:cursor-default ${
                      roomState.settings.invalidAttemptPolicy === 'lose_life'
                        ? 'bg-[#E5382B] text-[#FAF6EE]'
                        : 'bg-[#FAF6EE] text-[#141312]'
                    }`}
                  >
                    {roomState.settings.invalidAttemptPolicy === 'retry'
                      ? t.policyRetry
                      : t.policyLoseLife}
                  </button>
                </div>
              </div>

              {/* 6. Fails Before Flip & Capacity */}
              <div className="p-3.5 rounded-[7px] bg-[#F4EFE6] border-2 border-[#141312] space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-[#141312]">{t.maxPromptFailuresLabel}</span>
                  <select
                    disabled={!isHost}
                    value={roomState.settings.maxPromptFailures}
                    onChange={(e) =>
                      handleUpdateSettings({ maxPromptFailures: Number(e.target.value) })
                    }
                    className="px-2.5 py-1 rounded-[4px] bg-[#FAF6EE] border-2 border-[#141312] font-bomb-mono font-bold text-[#141312]"
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#141312]/15">
                  <span className="font-bold text-[#141312]">{t.maxPlayersLabel}</span>
                  <select
                    disabled={!isHost}
                    value={roomState.settings.maxPlayers}
                    onChange={(e) =>
                      handleUpdateSettings({ maxPlayers: Number(e.target.value) })
                    }
                    className="px-2.5 py-1 rounded-[4px] bg-[#FAF6EE] border-2 border-[#141312] font-bomb-mono font-bold text-[#141312]"
                  >
                    {[4, 6, 8, 10, 12, 16].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 7. Bonus Alphabet Stamp Card Config */}
              <div className="sm:col-span-2 p-3.5 rounded-[7px] bg-[#F4EFE6] border-2 border-[#141312] space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Sparkle weight="fill" className="w-4 h-4 text-[#0B7A53]" />
                    <span className="font-bold text-[#141312]">{t.bonusAlphabetLabel}</span>
                  </div>
                  <button
                    type="button"
                    disabled={!isHost}
                    onClick={() =>
                      handleUpdateSettings({
                        bonusAlphabetEnabled: !roomState.settings.bonusAlphabetEnabled,
                      })
                    }
                    className={`px-3 py-1 rounded-[4px] font-bomb-mono font-bold border-2 border-[#141312] cursor-pointer disabled:cursor-default ${
                      roomState.settings.bonusAlphabetEnabled
                        ? 'bg-[#0B7A53] text-[#FAF6EE]'
                        : 'bg-[#FAF6EE] text-[#57524A]'
                    }`}
                  >
                    {roomState.settings.bonusAlphabetEnabled ? t.enabled : t.disabled}
                  </button>
                </div>

                {roomState.settings.bonusAlphabetEnabled && (
                  <div>
                    <label
                      htmlFor="bomb-alphabet-custom"
                      className="block font-bomb-mono text-[10px] font-bold uppercase text-[#57524A] mb-1"
                    >
                      {t.bonusAlphabetCustomLabel}
                    </label>
                    <input
                      id="bomb-alphabet-custom"
                      type="text"
                      disabled={!isHost}
                      value={roomState.settings.bonusAlphabetLetters}
                      onChange={(e) =>
                        handleUpdateSettings({
                          bonusAlphabetLetters: e.target.value.toUpperCase(),
                        })
                      }
                      className="w-full px-3 py-2 rounded-[5px] bg-[#FAF6EE] border-2 border-[#141312] font-bomb-mono text-xs font-bold tracking-[0.22em] uppercase text-[#141312]"
                    />
                  </div>
                )}
              </div>
            </div>
          </section>
        </main>
      )}

      {/* ==================== 3. ACTIVE BROADCAST ARENA (SOLARI STAGE) ==================== */}
      {roomState && isInArena && (
        <main className="flex-1 w-full max-w-4xl mx-auto px-2.5 sm:px-6 py-1.5 flex flex-col justify-start gap-2.5">
          {/* Top Compact Studio Telemetry Bar */}
          <div className="flex items-center justify-between px-3 py-1.5 rounded-[7px] bg-[#141312] text-[#FAF6EE] font-bomb-mono text-xs font-bold">
            <div className="flex items-center gap-2.5">
              <span className="px-2 py-0.5 rounded-[3px] bg-[#E59A00] text-[#141312] font-bold uppercase">
                {roomState.settings.language.toUpperCase()}
              </span>
              <span>
                {t.roundLabel.toUpperCase()} #{String(roomState.roundNumber).padStart(2, '0')}
              </span>
            </div>
            <div>
              {t.wordsPlayedLabel} :{' '}
              <span className="text-[#E59A00]">{roomState.totalWordsPlayed}</span>
            </div>
          </div>

          {/* Horizontal Contestant Desk Strip */}
          <div className="flex items-stretch gap-2 overflow-x-auto pb-1 no-scrollbar">
            {roomState.players.map((p, idx) => {
              const isHolder = roomState.activePlayerId === p.id && roomState.status === 'PLAYING';
              return (
                <div
                  key={p.id}
                  className={`shrink-0 min-w-[122px] sm:min-w-[140px] rounded-[7px] border-2 border-[#141312] overflow-hidden transition-[transform,box-shadow,background-color,opacity] ${
                    p.isEliminated
                      ? 'bg-[#E8E0D0]/65 opacity-55'
                      : isHolder
                      ? 'bg-[#FAF6EE] shadow-[3px_3px_0_#E5382B] -translate-y-[1px]'
                      : 'bg-[#FAF6EE]'
                  }`}
                >
                  {/* Desk Header Strip */}
                  <div
                    className={`px-2.5 py-1 flex items-center justify-between gap-1 border-b border-[#141312] ${
                      isHolder
                        ? 'bg-[#E5382B] text-[#FAF6EE]'
                        : p.isEliminated
                        ? 'bg-[#D8D0C0] text-[#57524A]'
                        : 'bg-[#E8E0D0] text-[#141312]'
                    }`}
                  >
                    <span className="font-bomb-mono text-[10px] font-bold">
                      #{idx + 1}
                    </span>
                    <span className="text-xs font-bold truncate flex-1">{p.name}</span>
                    {isHolder && <Fire weight="fill" className="w-3.5 h-3.5 shrink-0" />}
                    {p.isEliminated && <Skull weight="fill" className="w-3.5 h-3.5 shrink-0" />}
                  </div>

                  <div className="px-2.5 py-1.5 space-y-1">
                    {/* Life Stamps */}
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: p.maxLives }).map((_, i) => (
                        <Heart
                          key={i}
                          weight={i < p.lives ? 'fill' : 'regular'}
                          className={`w-3.5 h-3.5 ${
                            i < p.lives ? 'text-[#E5382B]' : 'text-[#141312]/25'
                          }`}
                        />
                      ))}
                    </div>

                    {/* Teleprinter Desk Line */}
                    <div className="h-4 flex items-center font-bomb-mono text-[10px] truncate">
                      {p.isEliminated ? (
                        <span className="text-[#E5382B] font-bold uppercase">
                          {t.eliminatedTag}
                        </span>
                      ) : isHolder && p.currentTyping ? (
                        <span className="text-[#141312] font-bold truncate">
                          <HighlightedWord
                            word={p.currentTyping}
                            prompt={roomState.currentPrompt}
                          />
                        </span>
                      ) : p.lastWordSubmitted ? (
                        <span
                          className={`truncate font-bold ${
                            p.lastWordStatus === 'valid'
                              ? 'text-[#0B7A53]'
                              : 'text-[#E5382B] line-through'
                          }`}
                        >
                          {p.lastWordSubmitted}
                        </span>
                      ) : (
                        <span className="text-[#57524A]">
                          {isHolder ? t.waitingInput : t.noWordYet}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Central Solari Mechanical Stage + Immediate Word Input */}
          <section className="bg-[#FAF6EE] border-2 border-[#141312] rounded-[10px] p-3.5 sm:p-5 shadow-[5px_5px_0_#141312]">
            {roomState.status === 'COUNTDOWN' ? (
              <div className="py-6 flex flex-col items-center justify-center text-center gap-3">
                <span className="px-2.5 py-0.5 rounded-[4px] bg-[#E59A00] border border-[#141312] font-bomb-mono text-xs font-bold uppercase tracking-widest text-[#141312]">
                  {t.countdownTitle}
                </span>
                <SolariFlapTile char={String(countdownSec)} size="xl" tone="vermilion" />
                <p className="font-bomb-mono text-xs font-bold uppercase tracking-wider text-[#57524A]">
                  {t.countdownSub}...
                </p>
              </div>
            ) : (
              <>
                {/* Stage Status Header & Digital Studio Clock */}
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-1 rounded-[4px] border-2 border-[#141312] font-bomb-mono text-xs font-bold uppercase tracking-wider ${
                        isMyTurn
                          ? 'bg-[#E5382B] text-[#FAF6EE]'
                          : 'bg-[#E8E0D0] text-[#141312]'
                      }`}
                    >
                      {isMyTurn
                        ? t.yourTurnBanner
                        : `${activePlayer?.name || ''} ${t.otherTurnBanner}`}
                    </span>
                  </div>

                  <div
                    className={`font-bomb-mono text-sm sm:text-base font-bold px-3 py-1 rounded-[5px] border-2 border-[#141312] ${
                      isCriticalTime
                        ? 'bg-[#E5382B] text-[#FAF6EE]'
                        : 'bg-[#141312] text-[#E59A00]'
                    }`}
                  >
                    {(remainingMs / 1000).toFixed(1)}s
                  </div>
                </div>

                {/* Graduated Fuse Rail (GPU-composited transform: scaleX) */}
                <div className="relative w-full h-3.5 rounded-[4px] bg-[#E8E0D0] border-2 border-[#141312] overflow-hidden mb-4">
                  <div
                    className={`h-full w-full origin-left transition-transform duration-75 ease-linear ${
                      isCriticalTime ? 'bg-[#E5382B]' : 'bg-[#E59A00]'
                    }`}
                    style={{ transform: `scaleX(${progressRatio})` }}
                  />
                  {/* Calibration ruler ticks */}
                  <div
                    className="pointer-events-none absolute inset-0 opacity-30"
                    style={{
                      backgroundImage:
                        'repeating-linear-gradient(to right, transparent 0, transparent 18px, #141312 18px, #141312 19px)',
                    }}
                  />
                </div>

                {/* Giant Solari Split-Flap Syllable Display */}
                <div
                  onClick={() => isMyTurn && inputRef.current?.focus()}
                  className="flex flex-col items-center justify-center py-1 cursor-pointer"
                >
                  <motion.div
                    animate={
                      reduceMotion
                        ? {}
                        : isCriticalTime
                        ? { x: [-2, 2, -2, 2, 0] }
                        : {}
                    }
                    transition={{ duration: 0.28, repeat: isCriticalTime ? Infinity : 0 }}
                  >
                    <SolariWordStrip
                      text={roomState.currentPrompt || '...'}
                      size="lg"
                      tone={isCriticalTime ? 'vermilion' : 'ink'}
                      label={`Syllabe imposée : ${roomState.currentPrompt}`}
                    />
                  </motion.div>

                  {/* Live Teleprinter Monitor when watching another player */}
                  {!isMyTurn && activePlayer && (
                    <div className="mt-3 min-h-[36px] px-4 py-1.5 rounded-[6px] bg-[#F4EFE6] border-2 border-[#141312] font-bomb-mono text-sm sm:text-base font-bold tracking-wider flex items-center justify-center">
                      {activePlayer.currentTyping ? (
                        <HighlightedWord
                          word={activePlayer.currentTyping}
                          prompt={roomState.currentPrompt}
                        />
                      ) : (
                        <span className="text-xs text-[#57524A]">
                          {activePlayer.name} {t.waitingInput}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Immediate Teleprinter Input Form (Directly under prompt for mobile keyboards) */}
                {isMyTurn ? (
                  <form onSubmit={handleSubmitWord} className="w-full mt-3.5 space-y-2">
                    <div className="flex items-stretch gap-2">
                      <div className="relative flex-1">
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
                          className="w-full h-full px-3.5 pr-28 py-3 rounded-[7px] bg-white border-2 border-[#141312] font-bomb-mono text-base sm:text-lg font-bold uppercase tracking-wider text-[#141312] placeholder:text-[#57524A]/50 placeholder:font-sans placeholder:text-sm outline-none"
                        />

                        {wordInput.trim().length > 0 && (
                          <span
                            className={`pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded-[4px] border border-[#141312] font-bomb-mono text-[10px] font-bold uppercase ${
                              wordContainsPrompt
                                ? 'bg-[#0B7A53] text-[#FAF6EE]'
                                : 'bg-[#E8E0D0] text-[#57524A]'
                            }`}
                          >
                            {wordContainsPrompt ? t.promptMatchedHint : t.promptMissingHint}
                          </span>
                        )}
                      </div>

                      <button
                        type="submit"
                        className="px-4 sm:px-6 py-3 rounded-[7px] bg-[#E5382B] hover:bg-[#cf2d20] text-[#FAF6EE] border-2 border-[#141312] shadow-[3px_3px_0_#141312] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0_#141312] font-bomb-display font-black text-lg sm:text-xl uppercase tracking-wider flex items-center gap-1.5 transition-[transform,box-shadow,background-color] cursor-pointer shrink-0"
                      >
                        <span>{t.validateBtn}</span>
                        <PaperPlaneRight weight="fill" className="w-4 h-4" />
                      </button>
                    </div>

                    <AnimatePresence mode="wait">
                      {inlineInputError && (
                        <motion.div
                          key={inlineInputError}
                          initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          role="alert"
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[5px] bg-[#E5382B] text-[#FAF6EE] border border-[#141312] text-xs font-bold"
                        >
                          <WarningOctagon weight="fill" className="w-3.5 h-3.5 shrink-0" />
                          <span>{inlineInputError}</span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </form>
                ) : (
                  myPlayer?.isEliminated && (
                    <div className="mt-3 px-3 py-2 rounded-[6px] bg-[#E8E0D0] border-2 border-[#141312] text-center font-bomb-mono text-xs font-bold text-[#141312]">
                      {t.eliminatedBanner}
                    </div>
                  )
                )}

                {/* Broadcast Dispatch Event Ticker */}
                {roomState.lastEvent && (
                  <div className="mt-3 pt-2.5 border-t border-[#141312]/15 flex items-center justify-center gap-1.5 text-xs font-bold text-[#141312] text-center">
                    {roomState.lastEvent.type === 'word_accepted' && (
                      <span className="inline-flex items-center gap-1.5 text-[#0B7A53]">
                        <CheckCircle weight="fill" className="w-4 h-4 shrink-0" />
                        <span>
                          <strong>{roomState.lastEvent.playerName}</strong> {t.events.word_accepted}{' '}
                          « <strong>{roomState.lastEvent.word}</strong> »
                        </span>
                      </span>
                    )}
                    {roomState.lastEvent.type === 'bonus_life_earned' && (
                      <span className="inline-flex items-center gap-1.5 text-[#1D4ED8]">
                        <Sparkle weight="fill" className="w-4 h-4 shrink-0" />
                        <span>
                          <strong>{roomState.lastEvent.playerName}</strong>{' '}
                          {t.events.bonus_life_earned}
                        </span>
                      </span>
                    )}
                    {roomState.lastEvent.type === 'timeout_life_lost' && (
                      <span className="inline-flex items-center gap-1.5 text-[#E5382B]">
                        <Fire weight="fill" className="w-4 h-4 shrink-0" />
                        <span>
                          {t.events.timeout_life_lost}{' '}
                          <strong>{roomState.lastEvent.playerName}</strong> (-1 vie)
                        </span>
                      </span>
                    )}
                    {roomState.lastEvent.type === 'player_eliminated' && (
                      <span className="inline-flex items-center gap-1.5 text-[#E5382B]">
                        <Skull weight="fill" className="w-4 h-4 shrink-0" />
                        <span>
                          <strong>{roomState.lastEvent.playerName}</strong>{' '}
                          {t.events.player_eliminated}
                        </span>
                      </span>
                    )}
                  </div>
                )}
              </>
            )}
          </section>

          {/* Bottom Panels: Alphabet Punch Card & Teleprinter Word Tape */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
            {roomState.settings.bonusAlphabetEnabled && myPlayer && (
              <section className="sm:col-span-7 bg-[#FAF6EE] border-2 border-[#141312] rounded-[8px] p-3 shadow-[3px_3px_0_#141312]">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bomb-mono text-[11px] font-bold uppercase tracking-wider text-[#141312] flex items-center gap-1.5">
                    <Sparkle weight="fill" className="w-3.5 h-3.5 text-[#0B7A53]" />
                    {t.bonusAlphabetHeader}
                  </span>
                  <span className="px-2 py-0.5 rounded-[3px] bg-[#141312] text-[#FAF6EE] font-bomb-mono text-[10px] font-bold">
                    {myPlayer.bonusLettersUsed.length}/{roomState.bonusAlphabetTarget.length}
                  </span>
                </div>

                <div className="flex flex-wrap gap-1">
                  {roomState.bonusAlphabetTarget.map((letter) => {
                    const collected = myPlayer.bonusLettersUsed.includes(letter);
                    return (
                      <span
                        key={letter}
                        className={`w-6 h-6 rounded-[3px] font-bomb-mono text-xs font-bold flex items-center justify-center border transition-[background-color,color] ${
                          collected
                            ? 'bg-[#0B7A53] border-[#141312] text-[#FAF6EE]'
                            : 'bg-[#F4EFE6] border-[#141312]/35 text-[#57524A]'
                        }`}
                      >
                        {letter}
                      </span>
                    );
                  })}
                </div>
              </section>
            )}

            <section
              className={`${
                roomState.settings.bonusAlphabetEnabled && myPlayer
                  ? 'sm:col-span-5'
                  : 'sm:col-span-12'
              } bg-[#FAF6EE] border-2 border-[#141312] rounded-[8px] p-3 shadow-[3px_3px_0_#141312]`}
            >
              <span className="block font-bomb-mono text-[11px] font-bold uppercase tracking-wider text-[#57524A] mb-2">
                {t.recentWordsHeader}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {roomState.recentValidWords.length === 0 ? (
                  <span className="text-xs text-[#57524A]">{t.noRecentWords}</span>
                ) : (
                  roomState.recentValidWords.slice(0, 6).map((item, i) => (
                    <span
                      key={`${item.word}-${i}`}
                      className="px-2 py-0.5 rounded-[4px] bg-[#F4EFE6] border border-[#141312] font-bomb-mono text-xs font-bold text-[#141312]"
                    >
                      <HighlightedWord word={item.word} prompt={item.prompt} />
                    </span>
                  ))
                )}
              </div>
            </section>
          </div>
        </main>
      )}

      {/* ==================== 4. GAME OVER : SPECIAL EDITION STANDINGS ==================== */}
      {roomState && roomState.status === 'GAME_OVER' && (
        <main className="flex-1 w-full max-w-2xl mx-auto px-3 sm:px-6 py-4 flex flex-col justify-center">
          <section className="bg-[#FAF6EE] border-2 border-[#141312] rounded-[10px] shadow-[6px_6px_0_#141312] overflow-hidden">
            {/* Front-Page Headline Banner */}
            <div className="bg-[#E5382B] text-[#FAF6EE] px-6 py-5 border-b-2 border-[#141312] text-center space-y-2">
              <div className="w-12 h-12 rounded-[8px] bg-[#FAF6EE] text-[#141312] border-2 border-[#141312] shadow-[3px_3px_0_#141312] flex items-center justify-center mx-auto">
                <Trophy weight="fill" className="w-7 h-7 text-[#E59A00]" />
              </div>
              <div className="font-bomb-mono text-[11px] font-bold uppercase tracking-widest">
                {t.gameOverTitle}
              </div>
              <h1 className="font-bomb-display font-black text-3xl sm:text-5xl uppercase tracking-wide leading-none">
                {roomState.winnerName
                  ? `${roomState.winnerName} ${t.winnerAnnouncement}`
                  : t.noWinner}
              </h1>
            </div>

            {/* Standings Ledger */}
            <div className="p-5 sm:p-6 space-y-4">
              <h2 className="font-bomb-mono text-xs font-bold uppercase tracking-widest text-[#57524A]">
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
                        className={`flex items-center justify-between px-3.5 py-2.5 rounded-[7px] border-2 border-[#141312] ${
                          isWinner ? 'bg-[#E59A00]/30' : 'bg-[#F4EFE6]'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className={`w-7 h-7 rounded-[4px] font-bomb-mono text-xs font-bold flex items-center justify-center border border-[#141312] shrink-0 ${
                              isWinner
                                ? 'bg-[#141312] text-[#E59A00]'
                                : 'bg-[#FAF6EE] text-[#141312]'
                            }`}
                          >
                            #{p.finalRank || idx + 1}
                          </span>
                          <div className="min-w-0">
                            <div className="font-bold text-sm truncate text-[#141312]">
                              {p.name}
                            </div>
                            {p.longestWord && (
                              <div className="font-bomb-mono text-[10px] text-[#57524A]">
                                {t.longestWordCol} :{' '}
                                <strong className="text-[#141312]">{p.longestWord}</strong>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 font-bomb-mono text-xs shrink-0">
                          <span className="px-2.5 py-1 rounded-[4px] bg-[#FAF6EE] border border-[#141312] font-bold text-[#141312]">
                            <strong>{p.wordsValidated}</strong> {t.wordsCountCol}
                          </span>
                          {p.bonusLivesEarned > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-[4px] bg-[#0B7A53] text-[#FAF6EE] border border-[#141312] font-bold">
                              <span>+{p.bonusLivesEarned}</span>
                              <Heart weight="fill" className="w-3 h-3" />
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* Action Controls */}
              <div className="pt-3 border-t-2 border-[#141312] grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {isHost ? (
                  <>
                    <button
                      type="button"
                      onClick={handleStartGame}
                      className="py-3 px-4 rounded-[7px] bg-[#E5382B] hover:bg-[#cf2d20] text-[#FAF6EE] border-2 border-[#141312] shadow-[3px_3px_0_#141312] font-bomb-display font-black text-lg uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <ArrowCounterClockwise weight="bold" className="w-4 h-4" />
                      <span>{t.playAgainBtn}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleReturnToLobby}
                      className="py-3 px-4 rounded-[7px] bg-[#F4EFE6] hover:bg-[#E8E0D0] border-2 border-[#141312] font-bomb-mono text-xs font-bold uppercase tracking-wider text-[#141312] cursor-pointer"
                    >
                      {t.backToLobbyBtn}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={handleLeaveRoom}
                    className="sm:col-span-2 py-3 px-4 rounded-[7px] bg-[#F4EFE6] border-2 border-[#141312] font-bomb-mono text-xs font-bold text-[#141312] cursor-pointer"
                  >
                    {t.waitingForHost} ({t.leaveRoom})
                  </button>
                )}
              </div>
            </div>
          </section>
        </main>
      )}

      {/* ==================== NATIVE <dialog closedby="any"> MODALS ==================== */}
      <BombLightDialog
        open={showRulesModal}
        onClose={() => setShowRulesModal(false)}
        ariaLabel={t.rulesTitle}
      >
        <div className="bg-[#FAF6EE] text-[#141312] border-2 border-[#141312] rounded-[10px] p-5 sm:p-6 shadow-[6px_6px_0_#141312] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b-2 border-[#141312]">
            <h3 className="font-bomb-display font-black text-2xl uppercase tracking-wide">
              {t.rulesTitle}
            </h3>
            <button
              type="button"
              onClick={() => setShowRulesModal(false)}
              aria-label={t.close}
              className="p-1.5 rounded-[5px] bg-[#E8E0D0] hover:bg-[#141312] hover:text-[#FAF6EE] border border-[#141312] cursor-pointer"
            >
              <X weight="bold" className="w-4 h-4" />
            </button>
          </div>

          <ol className="space-y-2.5 text-xs sm:text-sm text-[#141312] leading-relaxed">
            {t.rulesSteps.map((step, idx) => (
              <li key={idx} className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-[3px] bg-[#141312] text-[#FAF6EE] font-bomb-mono text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>

          <button
            type="button"
            onClick={() => setShowRulesModal(false)}
            className="w-full py-2.5 rounded-[6px] bg-[#E5382B] text-[#FAF6EE] border-2 border-[#141312] shadow-[3px_3px_0_#141312] font-bomb-mono text-xs font-bold uppercase tracking-wider cursor-pointer"
          >
            {t.close}
          </button>
        </div>
      </BombLightDialog>

      <BombLightDialog
        open={Boolean(showQrModal && roomState)}
        onClose={() => setShowQrModal(false)}
        ariaLabel={t.qrCode}
        maxWidthClass="max-w-xs"
      >
        {roomState && (
          <div className="bg-[#FAF6EE] text-[#141312] border-2 border-[#141312] rounded-[10px] p-5 text-center shadow-[6px_6px_0_#141312] space-y-3.5">
            <div className="font-bomb-mono text-[10px] font-bold uppercase tracking-widest text-[#E5382B]">
              {t.qrCode}
            </div>
            <div className="font-bomb-display font-black text-3xl uppercase tracking-wider">
              {roomState.roomCode}
            </div>

            <div className="bg-white p-3 rounded-[6px] border-2 border-[#141312] inline-block mx-auto">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="QR Code" className="w-44 h-44 mx-auto" />
              ) : (
                <div className="w-44 h-44 flex items-center justify-center font-bomb-mono text-xs text-[#57524A]">
                  ...
                </div>
              )}
            </div>

            <p className="text-xs font-medium text-[#57524A]">{t.scanToJoin}</p>

            <button
              type="button"
              onClick={() => setShowQrModal(false)}
              className="w-full py-2.5 rounded-[6px] bg-[#141312] text-[#FAF6EE] font-bomb-mono text-xs font-bold uppercase tracking-wider cursor-pointer"
            >
              {t.close}
            </button>
          </div>
        )}
      </BombLightDialog>
    </div>
  );
};

export default SekouBombApp;
