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
  GameboxCard,
  GameboxBadge,
  GameboxChallengePrompt,
  GameboxFuseBar,
  GameboxPlayerCard,
  GameboxDialog,
} from './components/GameboxComponents.js';

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
 * using vibrant party-game coral styling.
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
      <span className="bg-[#FF5722] text-white px-1.5 py-0.5 rounded-md font-black shadow-sm shadow-[#FF5722]/30">
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

  // Cycle the demonstration specimen on Home screen when idle
  useEffect(() => {
    if (roomState || reduceMotion) return;
    const id = window.setInterval(() => {
      setDemoIndex((prev) => (prev + 1) % DEMO_SPECIMENS[uiLang].length);
    }, 3200);
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
      {/* ==================== 1. TOP HEADER / APP BAR ==================== */}
      <header className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-2 shrink-0">
        <div className="flex items-center justify-between gap-3 bg-[#171E30] border border-white/10 rounded-2xl px-3 sm:px-5 py-2.5 shadow-lg shadow-black/20">
          {/* Back Pill */}
          <button
            type="button"
            onClick={roomState ? handleLeaveRoom : onBackToHub}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1F2942] hover:bg-white/10 text-xs font-bold text-slate-200 border border-white/10 transition-colors cursor-pointer active:scale-95"
          >
            <ArrowLeft weight="bold" className="w-3.5 h-3.5" />
            <span>{roomState ? t.leaveRoom : t.backToHub}</span>
          </button>

          {/* Logo & Category Badge */}
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF5722] animate-pulse shadow-sm shadow-[#FF5722]" />
            <span className="font-extrabold text-lg sm:text-xl tracking-tight text-white uppercase">
              Sekou <span className="text-[#FF5722]">Bomb</span>
            </span>
          </div>

          {/* Utilities (Lang, Rules, Mute) */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleUiLang}
              aria-label="Basculer la langue"
              className="px-2.5 py-1.5 rounded-full bg-[#1F2942] hover:bg-white/10 text-xs font-bold text-slate-200 border border-white/10 transition-colors cursor-pointer"
            >
              {uiLang.toUpperCase()}
            </button>

            <button
              type="button"
              onClick={() => setShowRulesModal(true)}
              aria-label={t.rulesBtn}
              title={t.rulesBtn}
              className="p-2 sm:px-3 sm:py-1.5 rounded-full bg-[#1F2942] hover:bg-white/10 text-xs font-bold text-slate-200 border border-white/10 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <BookOpenText weight="bold" className="w-4 h-4" />
              <span className="hidden sm:inline">{t.rulesBtn}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsMuted(bombSounds.toggleMute())}
              aria-label={isMuted ? 'Activer le son' : 'Couper le son'}
              className={`p-2 rounded-full border transition-colors cursor-pointer ${
                isMuted
                  ? 'bg-[#EF4444] text-white border-[#EF4444]'
                  : 'bg-[#1F2942] hover:bg-white/10 text-slate-200 border-white/10'
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

      {/* Error Banner */}
      {errorBanner && (
        <div className="w-full max-w-2xl mx-auto px-4 sm:px-6 mt-2">
          <div
            role="alert"
            className="px-4 py-3 rounded-2xl bg-[#EF4444] text-white text-xs font-bold flex items-center justify-between gap-3 shadow-lg shadow-[#EF4444]/20 border border-white/10"
          >
            <div className="flex items-center gap-2">
              <WarningOctagon weight="fill" className="w-5 h-5 shrink-0" />
              <span>{errorBanner}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorBanner(null)}
              aria-label={t.close}
              className="p-1 rounded-full hover:bg-black/20 cursor-pointer"
            >
              <X weight="bold" className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ==================== 2. HOME SCREEN : SOCIAL GAMEBOX STYLE ==================== */}
      {!roomState && (
        <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-8 flex items-center">
          <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Left Card: Game Presentation & Live Specimen */}
            <GameboxCard className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2 mb-4">
                  <GameboxBadge tone="coral" icon={<Lightning weight="fill" className="w-3.5 h-3.5" />}>
                    {t.studioKicker}
                  </GameboxBadge>
                  <GameboxBadge tone="neutral">
                    2..16 Joueurs
                  </GameboxBadge>
                </div>

                <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight uppercase leading-none">
                  Sekou <span className="text-[#FF5722]">Bomb</span>
                </h1>

                <p className="mt-3 text-slate-300 text-base sm:text-lg leading-relaxed max-w-xl">
                  {t.subtitle}
                </p>
              </div>

              {/* Live Challenge Specimen Box */}
              <div className="my-6 p-4 sm:p-5 rounded-2xl bg-[#111625] border border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    {uiLang === 'fr' ? 'Exemple de défi' : 'Challenge specimen'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setDemoIndex((i) => (i + 1) % demoList.length)}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1F2942] hover:bg-white/10 text-xs font-bold text-slate-200 border border-white/10 transition-colors cursor-pointer"
                  >
                    <ArrowsClockwise weight="bold" className="w-3.5 h-3.5" />
                    <span>{uiLang === 'fr' ? 'Changer' : 'Next'}</span>
                  </button>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-400">Syllabe :</span>
                    <span className="px-3.5 py-1.5 rounded-xl bg-[#FF5722] text-white font-black text-xl tracking-wider shadow-md shadow-[#FF5722]/30">
                      {currentDemo.prompt}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-sm sm:text-base font-bold text-white bg-[#1F2942] px-4 py-2 rounded-xl border border-white/10">
                    <CheckCircle weight="fill" className="w-4 h-4 text-[#10B981] shrink-0" />
                    <HighlightedWord word={currentDemo.sample} prompt={currentDemo.prompt} />
                  </div>
                </div>
              </div>

              {/* 3 Pillars / Feature Badges */}
              <div className="grid grid-cols-3 gap-3 pt-4 border-t border-white/10 text-center sm:text-left">
                <div>
                  <div className="text-xs font-bold text-[#FF5722] uppercase tracking-wider">01 • Syllabe</div>
                  <div className="text-xs font-semibold text-slate-300 mt-1">2 à 4 lettres imposées</div>
                </div>
                <div>
                  <div className="text-xs font-bold text-[#3B82F6] uppercase tracking-wider">02 • Relais</div>
                  <div className="text-xs font-semibold text-slate-300 mt-1">Passe la bombe vite</div>
                </div>
                <div>
                  <div className="text-xs font-bold text-[#10B981] uppercase tracking-wider">03 • Bonus</div>
                  <div className="text-xs font-semibold text-slate-300 mt-1">24 lettres = +1 vie</div>
                </div>
              </div>
            </GameboxCard>

            {/* Right Card: Player Setup & Mode Switcher */}
            <GameboxCard className="lg:col-span-5 p-6 sm:p-8 flex flex-col justify-between">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase mb-4 flex items-center gap-2">
                  <UsersThree weight="fill" className="w-6 h-6 text-[#FF5722]" />
                  <span>{t.contestantLabel}</span>
                </h2>

                {/* Nickname Input */}
                <div className="space-y-1.5 mb-5">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                    <label htmlFor="bomb-nickname-input">{t.yourNickname}</label>
                    <span className="text-slate-500">{playerName.trim().length}/20</span>
                  </div>
                  <input
                    id="bomb-nickname-input"
                    type="text"
                    maxLength={20}
                    autoComplete="nickname"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder={t.nicknamePlaceholder}
                    className="w-full h-13 px-4 rounded-2xl bg-[#111625] border border-white/10 focus:border-[#FF5722] text-white font-bold text-base outline-none transition-colors placeholder:text-slate-500"
                  />
                </div>

                {/* Mode Switcher Tabs */}
                <div className="p-1 rounded-2xl bg-[#111625] border border-white/10 grid grid-cols-2 gap-1 mb-5">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={entryMode === 'create'}
                    onClick={() => setEntryMode('create')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                      entryMode === 'create'
                        ? 'bg-[#FF5722] text-white shadow-md shadow-[#FF5722]/30'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {t.modeCreateTab}
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={entryMode === 'join'}
                    onClick={() => setEntryMode('join')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                      entryMode === 'join'
                        ? 'bg-[#3B82F6] text-white shadow-md shadow-[#3B82F6]/30'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {t.modeJoinTab}
                  </button>
                </div>

                {/* Mode Form */}
                {entryMode === 'create' ? (
                  <form onSubmit={handleCreateRoom} className="space-y-4">
                    <div>
                      <span className="block text-xs font-bold text-slate-300 mb-2">
                        {t.dictLanguageLabel}
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        {(['fr', 'en'] as const).map((lang) => {
                          const active = createDictLang === lang;
                          return (
                            <button
                              key={lang}
                              type="button"
                              onClick={() => setCreateDictLang(lang)}
                              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                                active
                                  ? 'bg-[#1F2942] border-[#FFB300] text-white shadow-md'
                                  : 'bg-[#111625] border-white/10 text-slate-400 hover:border-white/20'
                              }`}
                            >
                              <div className="text-[11px] font-bold uppercase text-slate-400">
                                {lang === 'fr' ? 'Édition' : 'Edition'}
                              </div>
                              <div className="text-sm font-extrabold text-white">
                                {lang === 'fr' ? t.langFr : t.langEn}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full h-14 rounded-2xl bg-[#FF5722] hover:bg-[#F4511E] text-white font-black text-lg uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-[#FF5722]/30 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
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
                        className="block text-xs font-bold text-slate-300 mb-2"
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
                        className="w-full h-14 px-4 rounded-2xl bg-[#111625] border border-white/10 focus:border-[#3B82F6] font-mono text-2xl font-black tracking-[0.25em] uppercase text-center text-[#60A5FA] placeholder:text-slate-600 outline-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full h-14 rounded-2xl bg-[#3B82F6] hover:bg-[#2563EB] text-white font-black text-lg uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-[#3B82F6]/30 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Lightning weight="fill" className="w-5 h-5" />
                      <span>{isLoading ? t.joining : t.joinRoomBtn}</span>
                    </button>
                  </form>
                )}
              </div>
            </GameboxCard>
          </div>
        </main>
      )}

      {/* ==================== 3. WAITING LOBBY : SOCIAL GAMEBOX STYLE ==================== */}
      {roomState && roomState.status === 'LOBBY' && (
        <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-4 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Room Code Card & Players List */}
          <div className="lg:col-span-5 space-y-5">
            {/* Room Code Card */}
            <GameboxCard className="p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <GameboxBadge tone="coral">{t.roomCodeLabel}</GameboxBadge>
                <GameboxBadge tone="neutral">{roomState.settings.language.toUpperCase()}</GameboxBadge>
              </div>

              <div className="py-3 px-4 rounded-2xl bg-[#111625] border border-white/5 text-center">
                <span className="font-mono text-4xl sm:text-5xl font-black text-white tracking-[0.25em]">
                  {roomState.roomCode}
                </span>
              </div>

              {/* Action Pills Grid */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="py-2.5 px-3 rounded-xl bg-[#1F2942] hover:bg-white/10 text-xs font-bold text-white border border-white/10 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copiedType === 'code' ? (
                    <Check weight="bold" className="w-4 h-4 text-[#10B981]" />
                  ) : (
                    <Copy weight="bold" className="w-4 h-4" />
                  )}
                  <span>{copiedType === 'code' ? t.copied : t.copyCode}</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="py-2.5 px-3 rounded-xl bg-[#1F2942] hover:bg-white/10 text-xs font-bold text-white border border-white/10 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copiedType === 'link' ? (
                    <Check weight="bold" className="w-4 h-4 text-[#10B981]" />
                  ) : (
                    <Copy weight="bold" className="w-4 h-4" />
                  )}
                  <span>{copiedType === 'link' ? t.copied : t.copyLink}</span>
                </button>

                <button
                  type="button"
                  onClick={handleShareLink}
                  className="py-2.5 px-3 rounded-xl bg-[#1F2942] hover:bg-white/10 text-xs font-bold text-white border border-white/10 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ShareNetwork weight="bold" className="w-4 h-4" />
                  <span>{t.shareLink}</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenQrModal}
                  className="py-2.5 px-3 rounded-xl bg-[#FFB300] hover:bg-[#FFA000] text-xs font-black text-slate-950 flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-[#FFB300]/20"
                >
                  <QrCode weight="bold" className="w-4 h-4" />
                  <span>{t.qrCode}</span>
                </button>
              </div>
            </GameboxCard>

            {/* Players List Card */}
            <GameboxCard className="p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <UsersThree weight="bold" className="w-5 h-5 text-white" />
                  <h2 className="text-xl font-black text-white uppercase tracking-tight">
                    {t.playersTitle}
                  </h2>
                </div>
                <GameboxBadge tone="gold">
                  {roomState.players.length}/{roomState.settings.maxPlayers}
                </GameboxBadge>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {roomState.players.map((p, idx) => (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-2xl border transition-colors ${
                      p.id === myPlayerId
                        ? 'bg-[#1F2942] border-[#3B82F6]/50'
                        : 'bg-[#111625] border-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-7 h-7 rounded-full bg-[#FF5722] text-white font-extrabold text-xs flex items-center justify-center shrink-0">
                        {p.name.slice(0, 1).toUpperCase()}
                      </span>
                      <span className="font-bold text-sm truncate text-white">{p.name}</span>
                      {p.isHost && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FFB300]/20 text-[#FFCA28] text-[10px] font-bold uppercase shrink-0">
                          <CrownSimple weight="fill" className="w-3 h-3" />
                          {t.hostBadge}
                        </span>
                      )}
                      {p.id === myPlayerId && (
                        <span className="text-[10px] font-bold uppercase text-[#60A5FA] shrink-0">
                          [{t.youBadge}]
                        </span>
                      )}
                    </div>

                    <span
                      className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full shrink-0 ${
                        p.isConnected
                          ? 'bg-[#10B981]/20 text-[#34D399]'
                          : 'bg-[#FFB300]/20 text-[#FFCA28]'
                      }`}
                    >
                      {p.isConnected ? t.online : t.offline}
                    </span>
                  </div>
                ))}
              </div>

              {/* Start Button */}
              <div className="pt-2">
                {isHost ? (
                  <button
                    type="button"
                    disabled={roomState.players.length < 2}
                    onClick={handleStartGame}
                    className="w-full h-14 rounded-2xl bg-[#FF5722] hover:bg-[#F4511E] text-white font-black text-xl uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-[#FF5722]/30 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-40 disabled:shadow-none"
                  >
                    <Fire weight="fill" className="w-5 h-5" />
                    <span>
                      {roomState.players.length < 2 ? t.needTwoPlayers : t.startGameBtn}
                    </span>
                  </button>
                ) : (
                  <div className="py-3.5 px-4 rounded-2xl bg-[#111625] border border-white/5 text-center text-xs font-bold text-slate-400">
                    {t.waitingForHost}
                  </div>
                )}
              </div>
            </GameboxCard>
          </div>

          {/* Right Column: Settings Card */}
          <GameboxCard className="lg:col-span-7 p-5 sm:p-7 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Sliders weight="bold" className="w-5 h-5 text-[#FF5722]" />
                <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight">
                  {t.settingsTitle}
                </h2>
              </div>
              {!isHost && (
                <GameboxBadge tone="neutral">{t.hostOnlyNote}</GameboxBadge>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
              {/* 1. Dictionary */}
              <div className="p-4 rounded-2xl bg-[#111625] border border-white/5 space-y-2">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  {t.dictLanguageLabel}
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {(['fr', 'en'] as const).map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      disabled={!isHost}
                      onClick={() => handleUpdateSettings({ language: lang })}
                      className={`py-2 px-3 rounded-xl font-bold border transition-colors cursor-pointer disabled:cursor-default flex items-center justify-between ${
                        roomState.settings.language === lang
                          ? 'bg-[#FF5722] text-white border-[#FF5722]'
                          : 'bg-[#171E30] text-slate-300 border-white/10 hover:border-white/20'
                      }`}
                    >
                      <span>{lang === 'fr' ? t.langFr : t.langEn}</span>
                      <span className="text-[10px] uppercase opacity-75">{lang}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Difficulty */}
              <div className="p-4 rounded-2xl bg-[#111625] border border-white/5 space-y-2">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
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
                      className={`py-2 px-1.5 rounded-xl font-bold border text-center transition-colors cursor-pointer disabled:cursor-default ${
                        roomState.settings.difficulty === d.id
                          ? 'bg-[#FF5722] text-white border-[#FF5722]'
                          : 'bg-[#171E30] text-slate-300 border-white/10 hover:border-white/20'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Starting Lives & Max Lives */}
              <div className="p-4 rounded-2xl bg-[#111625] border border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-300">{t.initialLivesLabel}</span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((val) => (
                      <button
                        key={val}
                        type="button"
                        disabled={!isHost}
                        onClick={() => handleUpdateSettings({ initialLives: val })}
                        className={`w-7 h-7 rounded-xl font-bold text-xs border transition-colors cursor-pointer disabled:cursor-default ${
                          roomState.settings.initialLives === val
                            ? 'bg-[#EF4444] text-white border-[#EF4444]'
                            : 'bg-[#171E30] text-slate-400 border-white/10'
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                  <span className="font-bold text-slate-300">{t.maxLivesLabel}</span>
                  <div className="flex items-center gap-1">
                    {[3, 4, 5, 6].map((val) => (
                      <button
                        key={val}
                        type="button"
                        disabled={!isHost}
                        onClick={() => handleUpdateSettings({ maxLives: val })}
                        className={`w-7 h-7 rounded-xl font-bold text-xs border transition-colors cursor-pointer disabled:cursor-default ${
                          roomState.settings.maxLives === val
                            ? 'bg-[#FFB300] text-slate-950 font-black border-[#FFB300]'
                            : 'bg-[#171E30] text-slate-400 border-white/10'
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 4. Fuse Duration */}
              <div className="p-4 rounded-2xl bg-[#111625] border border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-300">{t.minTurnSecLabel}</span>
                  <select
                    disabled={!isHost}
                    value={roomState.settings.minTurnDurationSec}
                    onChange={(e) =>
                      handleUpdateSettings({ minTurnDurationSec: Number(e.target.value) })
                    }
                    className="px-2.5 py-1 rounded-xl bg-[#171E30] border border-white/10 font-bold text-white outline-none"
                  >
                    {[3, 4, 5, 6, 8, 10].map((s) => (
                      <option key={s} value={s}>
                        {s}s
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                  <span className="font-bold text-slate-300">{t.maxBombSecLabel}</span>
                  <select
                    disabled={!isHost}
                    value={roomState.settings.maxBombDurationSec}
                    onChange={(e) =>
                      handleUpdateSettings({ maxBombDurationSec: Number(e.target.value) })
                    }
                    className="px-2.5 py-1 rounded-xl bg-[#171E30] border border-white/10 font-bold text-white outline-none"
                  >
                    {[10, 12, 15, 18, 20, 25].map((s) => (
                      <option key={s} value={s}>
                        {s}s
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 5. Policies */}
              <div className="p-4 rounded-2xl bg-[#111625] border border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-300">{t.wordRepetitionLabel}</span>
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
                    className="px-3 py-1 rounded-full bg-[#1F2942] border border-white/10 font-bold text-[#60A5FA] cursor-pointer disabled:cursor-default"
                  >
                    {roomState.settings.wordRepetitionPolicy === 'forbid'
                      ? t.repForbid
                      : t.repAllow}
                  </button>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                  <span className="font-bold text-slate-300">{t.invalidPolicyLabel}</span>
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
                    className={`px-3 py-1 rounded-full border font-bold cursor-pointer disabled:cursor-default ${
                      roomState.settings.invalidAttemptPolicy === 'lose_life'
                        ? 'bg-[#EF4444] text-white border-[#EF4444]'
                        : 'bg-[#1F2942] text-slate-300 border-white/10'
                    }`}
                  >
                    {roomState.settings.invalidAttemptPolicy === 'retry'
                      ? t.policyRetry
                      : t.policyLoseLife}
                  </button>
                </div>
              </div>

              {/* 6. Bonus Alphabet */}
              <div className="p-4 rounded-2xl bg-[#111625] border border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-300 flex items-center gap-1.5">
                    <Sparkle weight="fill" className="w-4 h-4 text-[#10B981]" />
                    {t.bonusAlphabetLabel}
                  </span>
                  <button
                    type="button"
                    disabled={!isHost}
                    onClick={() =>
                      handleUpdateSettings({
                        bonusAlphabetEnabled: !roomState.settings.bonusAlphabetEnabled,
                      })
                    }
                    className={`px-3 py-1 rounded-full font-bold border cursor-pointer disabled:cursor-default ${
                      roomState.settings.bonusAlphabetEnabled
                        ? 'bg-[#10B981] text-white border-[#10B981]'
                        : 'bg-[#171E30] text-slate-400 border-white/10'
                    }`}
                  >
                    {roomState.settings.bonusAlphabetEnabled ? t.enabled : t.disabled}
                  </button>
                </div>
              </div>
            </div>
          </GameboxCard>
        </main>
      )}

      {/* ==================== 4. IN-GAME ARENA : SOCIAL GAMEBOX STYLE ==================== */}
      {roomState && isInArena && (
        <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 py-2 flex flex-col justify-start gap-4">
          {/* Top Telemetry Header */}
          <div className="flex items-center justify-between px-4 py-2 rounded-2xl bg-[#171E30] border border-white/10 text-xs font-bold text-slate-300">
            <div className="flex items-center gap-2">
              <GameboxBadge tone="gold">{roomState.settings.language.toUpperCase()}</GameboxBadge>
              <span>
                {t.roundLabel} #{roomState.roundNumber}
              </span>
            </div>
            <div>
              {t.wordsPlayedLabel} : <span className="text-[#FFB300] font-extrabold">{roomState.totalWordsPlayed}</span>
            </div>
          </div>

          {/* Players Carousel Strip */}
          <div className="flex items-stretch gap-3 overflow-x-auto pb-1 no-scrollbar">
            {roomState.players.map((p, idx) => (
              <GameboxPlayerCard
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
                currentPrompt={roomState.currentPrompt}
                avatarColorIndex={idx}
              />
            ))}
          </div>

          {/* Central Challenge Card */}
          <GameboxCard className="p-5 sm:p-7 space-y-4">
            {roomState.status === 'COUNTDOWN' ? (
              <div className="py-8 flex flex-col items-center justify-center text-center gap-3">
                <GameboxBadge tone="gold">{t.countdownTitle}</GameboxBadge>
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-[#FF5722] text-white font-black text-6xl sm:text-7xl flex items-center justify-center shadow-xl shadow-[#FF5722]/30 animate-pulse">
                  {countdownSec}
                </div>
                <p className="text-sm font-bold text-slate-400">{t.countdownSub}...</p>
              </div>
            ) : (
              <>
                {/* Turn Header & Fuse Bar */}
                <div className="flex items-center justify-between">
                  <span
                    className={`px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                      isMyTurn
                        ? 'bg-[#FF5722] text-white shadow-md shadow-[#FF5722]/30 animate-bounce'
                        : 'bg-[#1F2942] text-slate-300'
                    }`}
                  >
                    {isMyTurn ? t.yourTurnBanner : `${activePlayer?.name || ''} ${t.otherTurnBanner}`}
                  </span>
                </div>

                {/* Fuse Progress Gauge */}
                <GameboxFuseBar
                  progressRatio={progressRatio}
                  remainingMs={remainingMs}
                  isCritical={isCriticalTime}
                />

                {/* Monumental Syllable Display */}
                <GameboxChallengePrompt
                  prompt={roomState.currentPrompt || '...'}
                  isCritical={isCriticalTime}
                  isMyTurn={isMyTurn}
                  onClick={() => isMyTurn && inputRef.current?.focus()}
                />

                {/* Watching Other Player Live Typing Monitor */}
                {!isMyTurn && activePlayer && (
                  <div className="min-h-[44px] px-4 py-2.5 rounded-2xl bg-[#111625] border border-white/5 flex items-center justify-center text-center">
                    {activePlayer.currentTyping ? (
                      <span className="text-base font-extrabold text-white">
                        <HighlightedWord word={activePlayer.currentTyping} prompt={roomState.currentPrompt} />
                      </span>
                    ) : (
                      <span className="text-xs text-slate-500 font-medium">
                        {activePlayer.name} {t.waitingInput}
                      </span>
                    )}
                  </div>
                )}

                {/* Word Submission Form (When my turn) */}
                {isMyTurn ? (
                  <form onSubmit={handleSubmitWord} className="space-y-3">
                    <div className="flex items-stretch gap-2.5">
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
                          className="w-full h-14 sm:h-16 px-4 pr-32 rounded-2xl bg-[#111625] border-2 border-[#FF5722] text-white font-extrabold text-lg sm:text-xl uppercase tracking-wider placeholder:text-slate-500 placeholder:text-sm placeholder:normal-case outline-none focus:ring-4 focus:ring-[#FF5722]/20"
                        />

                        {wordInput.trim().length > 0 && (
                          <span
                            className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                              wordContainsPrompt
                                ? 'bg-[#10B981] text-white'
                                : 'bg-[#1F2942] text-slate-400'
                            }`}
                          >
                            {wordContainsPrompt ? t.promptMatchedHint : t.promptMissingHint}
                          </span>
                        )}
                      </div>

                      <button
                        type="submit"
                        className="px-6 sm:px-8 h-14 sm:h-16 rounded-2xl bg-[#FF5722] hover:bg-[#F4511E] text-white font-black text-base sm:text-lg uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-[#FF5722]/30 active:scale-[0.98] transition-all cursor-pointer shrink-0"
                      >
                        <span>{t.validateBtn}</span>
                        <PaperPlaneRight weight="fill" className="w-5 h-5" />
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
                          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#EF4444] text-white text-xs font-bold shadow-md shadow-[#EF4444]/20"
                        >
                          <WarningOctagon weight="fill" className="w-4 h-4 shrink-0" />
                          <span>{inlineInputError}</span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </form>
                ) : (
                  myPlayer?.isEliminated && (
                    <div className="py-3 px-4 rounded-2xl bg-[#111625] border border-white/5 text-center text-xs font-bold text-slate-400">
                      {t.eliminatedBanner}
                    </div>
                  )
                )}

                {/* Event Dispatch Notice */}
                {roomState.lastEvent && (
                  <div className="pt-2 border-t border-white/5 text-center text-xs font-bold">
                    {roomState.lastEvent.type === 'word_accepted' && (
                      <span className="text-[#34D399] flex items-center justify-center gap-1.5">
                        <CheckCircle weight="fill" className="w-4 h-4 shrink-0" />
                        <span>
                          <strong>{roomState.lastEvent.playerName}</strong> {t.events.word_accepted}{' '}
                          « <strong>{roomState.lastEvent.word}</strong> »
                        </span>
                      </span>
                    )}
                    {roomState.lastEvent.type === 'bonus_life_earned' && (
                      <span className="text-[#60A5FA] flex items-center justify-center gap-1.5">
                        <Sparkle weight="fill" className="w-4 h-4 shrink-0" />
                        <span>
                          <strong>{roomState.lastEvent.playerName}</strong> {t.events.bonus_life_earned}
                        </span>
                      </span>
                    )}
                    {roomState.lastEvent.type === 'timeout_life_lost' && (
                      <span className="text-[#F87171] flex items-center justify-center gap-1.5">
                        <Fire weight="fill" className="w-4 h-4 shrink-0" />
                        <span>
                          {t.events.timeout_life_lost} <strong>{roomState.lastEvent.playerName}</strong> (-1 vie)
                        </span>
                      </span>
                    )}
                    {roomState.lastEvent.type === 'player_eliminated' && (
                      <span className="text-[#F87171] flex items-center justify-center gap-1.5">
                        <Skull weight="fill" className="w-4 h-4 shrink-0" />
                        <span>
                          <strong>{roomState.lastEvent.playerName}</strong> {t.events.player_eliminated}
                        </span>
                      </span>
                    )}
                  </div>
                )}
              </>
            )}
          </GameboxCard>

          {/* Bottom Panels: Bonus Alphabet & Recent Words */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
            {roomState.settings.bonusAlphabetEnabled && myPlayer && (
              <GameboxCard className="sm:col-span-7 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <Sparkle weight="fill" className="w-4 h-4 text-[#10B981]" />
                    {t.bonusAlphabetHeader}
                  </span>
                  <GameboxBadge tone="emerald">
                    {myPlayer.bonusLettersUsed.length}/{roomState.bonusAlphabetTarget.length}
                  </GameboxBadge>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {roomState.bonusAlphabetTarget.map((letter) => {
                    const collected = myPlayer.bonusLettersUsed.includes(letter);
                    return (
                      <span
                        key={letter}
                        className={`w-7 h-7 rounded-xl font-extrabold text-xs flex items-center justify-center border transition-all ${
                          collected
                            ? 'bg-[#10B981] text-white border-[#10B981] shadow-sm shadow-[#10B981]/30 scale-105'
                            : 'bg-[#111625] text-slate-500 border-white/5'
                        }`}
                      >
                        {letter}
                      </span>
                    );
                  })}
                </div>
              </GameboxCard>
            )}

            <GameboxCard
              className={`${
                roomState.settings.bonusAlphabetEnabled && myPlayer
                  ? 'sm:col-span-5'
                  : 'sm:col-span-12'
              } p-4 space-y-2`}
            >
              <span className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                {t.recentWordsHeader}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {roomState.recentValidWords.length === 0 ? (
                  <span className="text-xs text-slate-500 italic">{t.noRecentWords}</span>
                ) : (
                  roomState.recentValidWords.slice(0, 6).map((item, i) => (
                    <span
                      key={`${item.word}-${i}`}
                      className="px-2.5 py-1 rounded-xl bg-[#111625] border border-white/10 text-xs font-bold text-slate-200"
                    >
                      <HighlightedWord word={item.word} prompt={item.prompt} />
                    </span>
                  ))
                )}
              </div>
            </GameboxCard>
          </div>
        </main>
      )}

      {/* ==================== 5. GAME OVER : SOCIAL GAMEBOX STYLE ==================== */}
      {roomState && roomState.status === 'GAME_OVER' && (
        <main className="flex-1 w-full max-w-2xl mx-auto px-4 sm:px-6 py-6 flex flex-col justify-center">
          <GameboxCard className="p-6 sm:p-8 space-y-6">
            {/* Winner Spotlight */}
            <div className="text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-[#FFB300]/20 text-[#FFB300] border border-[#FFB300]/30 flex items-center justify-center mx-auto shadow-lg shadow-[#FFB300]/20">
                <Trophy weight="fill" className="w-9 h-9" />
              </div>
              <GameboxBadge tone="gold">{t.gameOverTitle}</GameboxBadge>
              <h1 className="text-3xl sm:text-5xl font-black text-white uppercase tracking-tight">
                {roomState.winnerName
                  ? `${roomState.winnerName} ${t.winnerAnnouncement}`
                  : t.noWinner}
              </h1>
            </div>

            {/* Standings Table */}
            <div className="space-y-2.5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
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
                        className={`flex items-center justify-between px-4 py-3 rounded-2xl border transition-colors ${
                          isWinner
                            ? 'bg-[#1F2942] border-[#FFB300]/50 shadow-md'
                            : 'bg-[#111625] border-white/5'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className={`w-8 h-8 rounded-full text-xs font-black flex items-center justify-center shrink-0 ${
                              isWinner
                                ? 'bg-[#FFB300] text-slate-950 shadow-md'
                                : 'bg-[#171E30] text-white border border-white/10'
                            }`}
                          >
                            #{p.finalRank || idx + 1}
                          </span>
                          <div className="min-w-0">
                            <div className="font-extrabold text-sm truncate text-white">
                              {p.name}
                            </div>
                            {p.longestWord && (
                              <div className="text-xs text-slate-400">
                                {t.longestWordCol} : <strong className="text-white">{p.longestWord}</strong>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-xs font-bold shrink-0">
                          <span className="px-2.5 py-1 rounded-full bg-[#171E30] border border-white/10 text-white">
                            {p.wordsValidated} {t.wordsCountCol}
                          </span>
                          {p.bonusLivesEarned > 0 && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#10B981]/20 text-[#34D399] border border-[#10B981]/30">
                              <span>+{p.bonusLivesEarned}</span>
                              <Heart weight="fill" className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {isHost ? (
                <>
                  <button
                    type="button"
                    onClick={handleStartGame}
                    className="h-14 rounded-2xl bg-[#FF5722] hover:bg-[#F4511E] text-white font-black text-lg uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-[#FF5722]/30 active:scale-[0.98] transition-all cursor-pointer"
                  >
                    <ArrowCounterClockwise weight="bold" className="w-5 h-5" />
                    <span>{t.playAgainBtn}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleReturnToLobby}
                    className="h-14 rounded-2xl bg-[#1F2942] hover:bg-white/10 text-white font-bold text-sm uppercase tracking-wider border border-white/10 flex items-center justify-center gap-2 active:scale-[0.98] transition-all cursor-pointer"
                  >
                    {t.backToLobbyBtn}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleLeaveRoom}
                  className="sm:col-span-2 h-14 rounded-2xl bg-[#1F2942] hover:bg-white/10 text-white font-bold text-sm uppercase tracking-wider border border-white/10 flex items-center justify-center gap-2 active:scale-[0.98] transition-all cursor-pointer"
                >
                  {t.waitingForHost} ({t.leaveRoom})
                </button>
              )}
            </div>
          </GameboxCard>
        </main>
      )}

      {/* ==================== 6. MODALS : SOCIAL GAMEBOX STYLE ==================== */}
      <GameboxDialog
        open={showRulesModal}
        onClose={() => setShowRulesModal(false)}
        ariaLabel={t.rulesTitle}
      >
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-white/10">
            <BookOpenText weight="fill" className="w-6 h-6 text-[#FF5722]" />
            <h3 className="text-xl font-black text-white uppercase tracking-tight">
              {t.rulesTitle}
            </h3>
          </div>

          <ol className="space-y-3 text-sm text-slate-300 leading-relaxed">
            {t.rulesSteps.map((step, idx) => (
              <li key={idx} className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-[#FF5722] text-white font-extrabold text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                  {idx + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>

          <button
            type="button"
            onClick={() => setShowRulesModal(false)}
            className="w-full h-12 rounded-2xl bg-[#FF5722] hover:bg-[#F4511E] text-white font-black text-sm uppercase tracking-wider transition-colors cursor-pointer"
          >
            {t.close}
          </button>
        </div>
      </GameboxDialog>

      <GameboxDialog
        open={Boolean(showQrModal && roomState)}
        onClose={() => setShowQrModal(false)}
        ariaLabel={t.qrCode}
        maxWidthClass="max-w-xs"
      >
        {roomState && (
          <div className="text-center space-y-4">
            <GameboxBadge tone="coral">{t.qrCode}</GameboxBadge>
            <div className="font-mono text-3xl font-black text-white tracking-widest">
              {roomState.roomCode}
            </div>

            <div className="bg-white p-4 rounded-2xl inline-block mx-auto shadow-lg">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="QR Code" className="w-44 h-44 mx-auto" />
              ) : (
                <div className="w-44 h-44 flex items-center justify-center font-mono text-xs text-slate-500">
                  Chargement...
                </div>
              )}
            </div>

            <p className="text-xs text-slate-400 font-medium">{t.scanToJoin}</p>

            <button
              type="button"
              onClick={() => setShowQrModal(false)}
              className="w-full h-12 rounded-2xl bg-[#1F2942] hover:bg-white/10 text-white font-bold text-sm uppercase tracking-wider border border-white/10 transition-colors cursor-pointer"
            >
              {t.close}
            </button>
          </div>
        )}
      </GameboxDialog>
    </div>
  );
};

export default SekouBombApp;
