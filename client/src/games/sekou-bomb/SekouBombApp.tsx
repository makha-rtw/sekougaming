import React, { useState, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import {
  ArrowLeft,
  Bomb,
  Flame,
  Heart,
  Crown,
  Copy,
  Check,
  Share2,
  QrCode,
  Volume2,
  VolumeX,
  HelpCircle,
  Settings,
  Users,
  Send,
  Trophy,
  RotateCcw,
  Sparkles,
  Skull,
  Globe,
  X,
  AlertTriangle,
} from 'lucide-react';
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
 * Highlights the required prompt letters inside a word or live typing string.
 */
const HighlightedWord: React.FC<{ word: string; prompt: string }> = ({ word, prompt }) => {
  if (!word) return null;
  const upperWord = word.toUpperCase();
  const upperPrompt = prompt.toUpperCase();
  const idx = upperWord.indexOf(upperPrompt);

  if (idx === -1 || !upperPrompt) {
    return <span>{upperWord}</span>;
  }

  const before = upperWord.slice(0, idx);
  const match = upperWord.slice(idx, idx + upperPrompt.length);
  const after = upperWord.slice(idx + upperPrompt.length);

  return (
    <span>
      {before}
      <span className="text-[#FF9F1C] underline decoration-[#FF9F1C]/80 decoration-2 underline-offset-2 font-black">
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

  const [createDictLang, setCreateDictLang] = useState<BombLanguage>('fr');
  const [joinCodeInput, setJoinCodeInput] = useState<string>(initialRoomCode || '');

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

      // Trigger sound effects on new server event
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

  // Auto-focus word input whenever it becomes my turn
  const isMyTurn = Boolean(
    roomState &&
      roomState.status === 'PLAYING' &&
      myPlayerId &&
      roomState.activePlayerId === myPlayerId
  );

  useEffect(() => {
    if (isMyTurn) {
      setWordInput('');
      setInlineInputError(null);
      setTimeout(() => {
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
        // Select text or clear quickly so mobile player can retype immediately
        setWordInput('');
        inputRef.current?.focus();
      }
    });
  };

  // Invite URL helpers
  const getInviteUrl = () => {
    if (typeof window === 'undefined' || !roomState) return '';
    return `${window.location.origin}${window.location.pathname}?bombRoom=${roomState.roomCode}`;
  };

  const handleCopyCode = () => {
    if (!roomState) return;
    navigator.clipboard.writeText(roomState.roomCode);
    setCopiedType('code');
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleCopyLink = () => {
    const url = getInviteUrl();
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopiedType('link');
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleShareLink = async () => {
    const url = getInviteUrl();
    if (!url || !roomState) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Sekou Bomb — SekouGaming',
          text:
            uiLang === 'fr'
              ? `Rejoins ma partie Sekou Bomb (Code : ${roomState.roomCode}) !`
              : `Join my Sekou Bomb room (Code: ${roomState.roomCode})!`,
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

  return (
    <div
      className="min-h-[100dvh] w-full bg-[#110D10] text-[#FAF6F0] font-['Plus_Jakarta_Sans',_sans-serif] flex flex-col justify-between overflow-x-hidden select-none"
      style={{
        paddingTop: 'max(env(safe-area-inset-top, 0px), 0.65rem)',
        paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 0.65rem)',
        backgroundImage:
          'radial-gradient(48rem 32rem at 50% -10%, rgba(255,159,28,0.14), transparent 65%), radial-gradient(40rem 30rem at 90% 105%, rgba(255,51,75,0.12), transparent 65%)',
      }}
    >
      {/* Top Navigation Bar */}
      <header className="w-full max-w-4xl mx-auto px-3 sm:px-6 py-2 flex items-center justify-between gap-2 shrink-0">
        <button
          type="button"
          onClick={roomState ? handleLeaveRoom : onBackToHub}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1C1418] hover:bg-[#271C22] border border-[#38262E] text-xs font-bold text-[#FF9F1C] transition-all cursor-pointer active:scale-95"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{roomState ? t.leaveRoom : t.backToHub}</span>
        </button>

        <div className="flex items-center gap-1.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#FF9F1C] to-[#FF334B] flex items-center justify-center text-[#110D10] shadow-md">
            <Bomb className="w-4 h-4 stroke-[2.5]" />
          </div>
          <span className="font-['Bricolage_Grotesque',_sans-serif] font-extrabold text-base sm:text-lg tracking-tight">
            SEKOU <span className="text-[#FF9F1C]">BOMB</span>
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* UI Language Switcher (FR / EN) */}
          <button
            type="button"
            onClick={toggleUiLang}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-[#1C1418] hover:bg-[#271C22] border border-[#38262E] text-[11px] font-black text-[#FAF6F0] cursor-pointer"
            title="Interface Language (FR / EN)"
          >
            <Globe className="w-3.5 h-3.5 text-[#FF9F1C]" />
            <span>{uiLang.toUpperCase()}</span>
          </button>

          {/* Rules Modal Button */}
          <button
            type="button"
            onClick={() => setShowRulesModal(true)}
            className="p-2 rounded-full bg-[#1C1418] hover:bg-[#271C22] border border-[#38262E] text-[#FAF6F0]/80 hover:text-[#FF9F1C] cursor-pointer"
            title={t.rulesBtn}
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* Sound Mute Toggle */}
          <button
            type="button"
            onClick={() => setIsMuted(bombSounds.toggleMute())}
            className="p-2 rounded-full bg-[#1C1418] hover:bg-[#271C22] border border-[#38262E] text-[#FAF6F0]/80 hover:text-[#FF9F1C] cursor-pointer"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-[#FF334B]" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Error Banner */}
      {errorBanner && (
        <div className="w-full max-w-lg mx-auto px-3 mb-2">
          <div className="p-3 rounded-2xl bg-[#FF334B]/15 border border-[#FF334B]/60 text-xs font-bold text-[#FFD5DA] flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#FF334B] shrink-0" />
              <span>{errorBanner}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorBanner(null)}
              className="p-1 hover:bg-white/10 rounded-lg"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ==================== 1. HOME SCREEN (NO ROOM) ==================== */}
      {!roomState && (
        <main className="flex-1 w-full max-w-xl mx-auto px-4 py-3 flex flex-col justify-center gap-4">
          <div className="text-center space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FF9F1C]/15 border border-[#FF9F1C]/35 text-[#FF9F1C] text-xs font-extrabold uppercase tracking-wider">
              <Flame className="w-3.5 h-3.5" />
              <span>FR & EN • 2–16 Joueurs</span>
            </div>
            <h1 className="font-['Bricolage_Grotesque',_sans-serif] text-3xl sm:text-5xl font-extrabold tracking-tight">
              SEKOU <span className="text-[#FF9F1C]">BOMB</span>
            </h1>
            <p className="text-xs sm:text-sm text-[#FAF6F0]/70 max-w-md mx-auto">{t.subtitle}</p>
          </div>

          {/* Shared Nickname Card */}
          <div className="bg-[#1C1418] border border-[#38262E] rounded-3xl p-4 sm:p-5 shadow-xl">
            <label className="block text-xs font-black uppercase tracking-wider text-[#FF9F1C] mb-2">
              {t.yourNickname}
            </label>
            <input
              type="text"
              maxLength={20}
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder={t.nicknamePlaceholder}
              className="w-full px-4 py-3 rounded-2xl bg-[#110D10] border border-[#38262E] focus:border-[#FF9F1C] text-base font-bold text-[#FAF6F0] outline-none transition-colors"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Create Room Card */}
            <form
              onSubmit={handleCreateRoom}
              className="bg-[#1C1418] border border-[#38262E] rounded-3xl p-4 sm:p-5 flex flex-col justify-between gap-4 shadow-xl"
            >
              <div>
                <h2 className="font-['Bricolage_Grotesque',_sans-serif] text-lg font-extrabold text-white mb-1">
                  {t.createRoomTitle}
                </h2>
                <p className="text-xs text-[#FAF6F0]/60 mb-3">{t.dictLanguageLabel}</p>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCreateDictLang('fr')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                      createDictLang === 'fr'
                        ? 'bg-[#FF9F1C]/20 border-[#FF9F1C] text-[#FF9F1C]'
                        : 'bg-[#110D10] border-[#38262E] text-[#FAF6F0]/70'
                    }`}
                  >
                    🇫🇷 Français
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreateDictLang('en')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                      createDictLang === 'en'
                        ? 'bg-[#FF9F1C]/20 border-[#FF9F1C] text-[#FF9F1C]'
                        : 'bg-[#110D10] border-[#38262E] text-[#FAF6F0]/70'
                    }`}
                  >
                    🇬🇧 English
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#FF9F1C] to-[#FF5E36] hover:brightness-110 text-[#110D10] font-black text-sm uppercase tracking-wider shadow-lg shadow-[#FF9F1C]/20 transition-all cursor-pointer active:scale-98 disabled:opacity-50"
              >
                {isLoading ? t.creating : t.createRoomBtn}
              </button>
            </form>

            {/* Join Room Card */}
            <form
              onSubmit={handleJoinRoom}
              className="bg-[#1C1418] border border-[#38262E] rounded-3xl p-4 sm:p-5 flex flex-col justify-between gap-4 shadow-xl"
            >
              <div>
                <h2 className="font-['Bricolage_Grotesque',_sans-serif] text-lg font-extrabold text-white mb-1">
                  {t.joinRoomTitle}
                </h2>
                <p className="text-xs text-[#FAF6F0]/60 mb-3">{t.roomCodeLabel}</p>

                <input
                  type="text"
                  maxLength={6}
                  value={joinCodeInput}
                  onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                  placeholder={t.roomCodePlaceholder}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#110D10] border border-[#38262E] focus:border-[#FF9F1C] font-mono text-lg font-black tracking-widest uppercase text-center text-[#FF9F1C] outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 px-4 rounded-2xl bg-[#2A1D24] hover:bg-[#38262E] border border-[#FF9F1C]/50 text-[#FF9F1C] font-black text-sm uppercase tracking-wider transition-all cursor-pointer active:scale-98 disabled:opacity-50"
              >
                {isLoading ? t.joining : t.joinRoomBtn}
              </button>
            </form>
          </div>
        </main>
      )}

      {/* ==================== 2. WAITING LOBBY SCREEN ==================== */}
      {roomState && roomState.status === 'LOBBY' && (
        <main className="flex-1 w-full max-w-4xl mx-auto px-3 sm:px-6 py-2 grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* Left Column: Room Code, Share & Players List */}
          <div className="lg:col-span-5 space-y-3.5">
            {/* Room Code & Share Panel */}
            <div className="bg-[#1C1418] border-2 border-[#FF9F1C]/50 rounded-3xl p-4 shadow-xl text-center">
              <span className="text-[11px] font-black uppercase tracking-widest text-[#FF9F1C]">
                {t.roomCodeLabel}
              </span>
              <div className="my-1 font-mono text-3xl sm:text-4xl font-black tracking-[0.22em] text-white">
                {roomState.roomCode}
              </div>

              <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="py-2 px-2.5 rounded-xl bg-[#110D10] hover:bg-[#271C22] border border-[#38262E] text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {copiedType === 'code' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-[#FF9F1C]" />
                  )}
                  <span>{copiedType === 'code' ? t.copied : t.copyCode}</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="py-2 px-2.5 rounded-xl bg-[#110D10] hover:bg-[#271C22] border border-[#38262E] text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {copiedType === 'link' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-[#FF9F1C]" />
                  )}
                  <span>{copiedType === 'link' ? t.copied : t.copyLink}</span>
                </button>

                <button
                  type="button"
                  onClick={handleShareLink}
                  className="py-2 px-2.5 rounded-xl bg-[#110D10] hover:bg-[#271C22] border border-[#38262E] text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5 text-[#FF9F1C]" />
                  <span>{t.shareLink}</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenQrModal}
                  className="py-2 px-2.5 rounded-xl bg-[#110D10] hover:bg-[#271C22] border border-[#38262E] text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <QrCode className="w-3.5 h-3.5 text-[#FF9F1C]" />
                  <span>{t.qrCode}</span>
                </button>
              </div>
            </div>

            {/* Players List */}
            <div className="bg-[#1C1418] border border-[#38262E] rounded-3xl p-4 shadow-xl">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#FF9F1C]" />
                  <h2 className="font-['Bricolage_Grotesque',_sans-serif] text-sm font-extrabold uppercase tracking-wider">
                    {t.playersTitle}
                  </h2>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-[#110D10] border border-[#38262E] text-xs font-black text-[#FF9F1C]">
                  {roomState.players.length} / {roomState.settings.maxPlayers}
                </span>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {roomState.players.map((p, idx) => (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-2xl border ${
                      p.id === myPlayerId
                        ? 'bg-[#FF9F1C]/10 border-[#FF9F1C]/50'
                        : 'bg-[#110D10] border-[#38262E]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-5 h-5 rounded-full bg-[#271C22] text-[10px] font-black flex items-center justify-center text-[#FF9F1C] shrink-0">
                        {idx + 1}
                      </span>
                      <span className="font-bold text-sm truncate">{p.name}</span>
                      {p.isHost && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FF9F1C]/20 text-[#FF9F1C] text-[10px] font-black">
                          <Crown className="w-3 h-3" />
                          {t.hostBadge}
                        </span>
                      )}
                      {p.id === myPlayerId && (
                        <span className="text-[10px] font-bold text-[#FAF6F0]/60">
                          ({t.youBadge})
                        </span>
                      )}
                    </div>

                    <span
                      className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                        p.isConnected
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : 'bg-amber-500/15 text-amber-400'
                      }`}
                    >
                      {p.isConnected ? t.online : t.offline}
                    </span>
                  </div>
                ))}
              </div>

              {/* Start Game Button */}
              <div className="mt-4">
                {isHost ? (
                  <button
                    type="button"
                    disabled={roomState.players.length < 2}
                    onClick={handleStartGame}
                    className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#FF9F1C] to-[#FF334B] hover:brightness-110 text-[#110D10] font-black text-sm uppercase tracking-wider shadow-lg shadow-[#FF9F1C]/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-40"
                  >
                    <Flame className="w-4 h-4 fill-current" />
                    <span>
                      {roomState.players.length < 2 ? t.needTwoPlayers : t.startGameBtn}
                    </span>
                  </button>
                ) : (
                  <div className="py-3 px-4 rounded-2xl bg-[#110D10] border border-[#38262E] text-center text-xs font-bold text-[#FAF6F0]/70">
                    {t.waitingForHost}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Complete Configurable Settings Panel */}
          <div className="lg:col-span-7 bg-[#1C1418] border border-[#38262E] rounded-3xl p-4 sm:p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#38262E] pb-2.5">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-[#FF9F1C]" />
                <h2 className="font-['Bricolage_Grotesque',_sans-serif] text-base font-extrabold uppercase tracking-wider">
                  {t.settingsTitle}
                </h2>
              </div>
              {!isHost && (
                <span className="text-[11px] text-[#FAF6F0]/50 font-semibold">
                  {t.hostBadge} uniquement
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
              {/* 1. Dictionary Language */}
              <div className="p-3 rounded-2xl bg-[#110D10] border border-[#38262E]">
                <label className="block font-black text-[#FF9F1C] mb-2">
                  {t.dictLanguageLabel}
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(['fr', 'en'] as const).map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      disabled={!isHost}
                      onClick={() => handleUpdateSettings({ language: lang })}
                      className={`py-2 px-2.5 rounded-xl font-bold border transition-all cursor-pointer disabled:cursor-default ${
                        roomState.settings.language === lang
                          ? 'bg-[#FF9F1C] text-[#110D10] border-[#FF9F1C]'
                          : 'bg-[#1C1418] text-[#FAF6F0]/70 border-[#38262E]'
                      }`}
                    >
                      {lang === 'fr' ? `🇫🇷 ${t.langFr}` : `🇬🇧 ${t.langEn}`}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Prompt Difficulty */}
              <div className="p-3 rounded-2xl bg-[#110D10] border border-[#38262E]">
                <label className="block font-black text-[#FF9F1C] mb-2">
                  {t.difficultyLabel}
                </label>
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
                      className={`py-2 px-2 rounded-xl font-bold border transition-all cursor-pointer disabled:cursor-default ${
                        roomState.settings.difficulty === d.id
                          ? 'bg-[#FF9F1C] text-[#110D10] border-[#FF9F1C]'
                          : 'bg-[#1C1418] text-[#FAF6F0]/70 border-[#38262E]'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Initial Lives & Max Lives */}
              <div className="p-3 rounded-2xl bg-[#110D10] border border-[#38262E] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#FAF6F0]/90">{t.initialLivesLabel}</span>
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5].map((val) => (
                      <button
                        key={val}
                        type="button"
                        disabled={!isHost}
                        onClick={() => handleUpdateSettings({ initialLives: val })}
                        className={`w-7 h-7 rounded-lg font-black border cursor-pointer disabled:cursor-default ${
                          roomState.settings.initialLives === val
                            ? 'bg-[#FF334B] text-white border-[#FF334B]'
                            : 'bg-[#1C1418] text-[#FAF6F0]/70 border-[#38262E]'
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#FAF6F0]/90">{t.maxLivesLabel}</span>
                  <div className="flex items-center gap-1.5">
                    {[3, 4, 5, 6].map((val) => (
                      <button
                        key={val}
                        type="button"
                        disabled={!isHost}
                        onClick={() => handleUpdateSettings({ maxLives: val })}
                        className={`w-7 h-7 rounded-lg font-black border cursor-pointer disabled:cursor-default ${
                          roomState.settings.maxLives === val
                            ? 'bg-[#FF9F1C] text-[#110D10] border-[#FF9F1C]'
                            : 'bg-[#1C1418] text-[#FAF6F0]/70 border-[#38262E]'
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 4. Turn Durations (Min & Max Bomb Fuse) */}
              <div className="p-3 rounded-2xl bg-[#110D10] border border-[#38262E] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#FAF6F0]/90">{t.minTurnSecLabel}</span>
                  <select
                    disabled={!isHost}
                    value={roomState.settings.minTurnDurationSec}
                    onChange={(e) =>
                      handleUpdateSettings({ minTurnDurationSec: Number(e.target.value) })
                    }
                    className="px-2.5 py-1 rounded-lg bg-[#1C1418] border border-[#38262E] font-bold text-[#FF9F1C]"
                  >
                    {[3, 4, 5, 6, 8, 10].map((s) => (
                      <option key={s} value={s}>
                        {s}s
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#FAF6F0]/90">{t.maxBombSecLabel}</span>
                  <select
                    disabled={!isHost}
                    value={roomState.settings.maxBombDurationSec}
                    onChange={(e) =>
                      handleUpdateSettings({ maxBombDurationSec: Number(e.target.value) })
                    }
                    className="px-2.5 py-1 rounded-lg bg-[#1C1418] border border-[#38262E] font-bold text-[#FF9F1C]"
                  >
                    {[10, 12, 15, 18, 20, 25].map((s) => (
                      <option key={s} value={s}>
                        {s}s
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 5. Word Repetition & Invalid Word Policy */}
              <div className="p-3 rounded-2xl bg-[#110D10] border border-[#38262E] space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-[#FAF6F0]/90">{t.wordRepetitionLabel}</span>
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
                    className="px-2.5 py-1 rounded-lg bg-[#1C1418] border border-[#38262E] font-bold text-[#FF9F1C] cursor-pointer disabled:cursor-default"
                  >
                    {roomState.settings.wordRepetitionPolicy === 'forbid'
                      ? t.repForbid
                      : t.repAllow}
                  </button>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-[#FAF6F0]/90">{t.invalidPolicyLabel}</span>
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
                    className="px-2.5 py-1 rounded-lg bg-[#1C1418] border border-[#38262E] font-bold text-[#FF9F1C] cursor-pointer disabled:cursor-default"
                  >
                    {roomState.settings.invalidAttemptPolicy === 'retry'
                      ? t.policyRetry
                      : t.policyLoseLife}
                  </button>
                </div>
              </div>

              {/* 6. Prompt Max Failures & Room Capacity */}
              <div className="p-3 rounded-2xl bg-[#110D10] border border-[#38262E] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#FAF6F0]/90">{t.maxPromptFailuresLabel}</span>
                  <select
                    disabled={!isHost}
                    value={roomState.settings.maxPromptFailures}
                    onChange={(e) =>
                      handleUpdateSettings({ maxPromptFailures: Number(e.target.value) })
                    }
                    className="px-2.5 py-1 rounded-lg bg-[#1C1418] border border-[#38262E] font-bold text-[#FF9F1C]"
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#FAF6F0]/90">{t.maxPlayersLabel}</span>
                  <select
                    disabled={!isHost}
                    value={roomState.settings.maxPlayers}
                    onChange={(e) =>
                      handleUpdateSettings({ maxPlayers: Number(e.target.value) })
                    }
                    className="px-2.5 py-1 rounded-lg bg-[#1C1418] border border-[#38262E] font-bold text-[#FF9F1C]"
                  >
                    {[4, 6, 8, 10, 12, 16].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 7. Bonus Alphabet Configuration (Full Width) */}
              <div className="sm:col-span-2 p-3 rounded-2xl bg-[#110D10] border border-[#38262E] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-black text-[#FF9F1C]">{t.bonusAlphabetLabel}</span>
                  <button
                    type="button"
                    disabled={!isHost}
                    onClick={() =>
                      handleUpdateSettings({
                        bonusAlphabetEnabled: !roomState.settings.bonusAlphabetEnabled,
                      })
                    }
                    className={`px-3 py-1 rounded-lg font-black border cursor-pointer disabled:cursor-default ${
                      roomState.settings.bonusAlphabetEnabled
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                        : 'bg-[#1C1418] text-[#FAF6F0]/50 border-[#38262E]'
                    }`}
                  >
                    {roomState.settings.bonusAlphabetEnabled ? t.enabled : t.disabled}
                  </button>
                </div>

                {roomState.settings.bonusAlphabetEnabled && (
                  <div>
                    <label className="block text-[10px] text-[#FAF6F0]/60 mb-1">
                      {t.bonusAlphabetCustomLabel}
                    </label>
                    <input
                      type="text"
                      disabled={!isHost}
                      value={roomState.settings.bonusAlphabetLetters}
                      onChange={(e) =>
                        handleUpdateSettings({
                          bonusAlphabetLetters: e.target.value.toUpperCase(),
                        })
                      }
                      className="w-full px-3 py-1.5 rounded-xl bg-[#1C1418] border border-[#38262E] font-mono text-xs tracking-widest uppercase text-[#FAF6F0]"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      )}

      {/* ==================== 3. ACTIVE GAME ARENA (COUNTDOWN & PLAYING) ==================== */}
      {roomState && (roomState.status === 'COUNTDOWN' || roomState.status === 'PLAYING') && (
        <main className="flex-1 w-full max-w-3xl mx-auto px-2.5 sm:px-5 py-1 flex flex-col justify-start gap-2.5">
          {/* Top Compact Info Strip: Round, Language, Words Count */}
          <div className="flex items-center justify-between px-3 py-1.5 rounded-2xl bg-[#1C1418] border border-[#38262E] text-[11px] font-bold">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-[#FF9F1C]/20 text-[#FF9F1C] font-black">
                {roomState.settings.language === 'fr' ? '🇫🇷 FR' : '🇬🇧 EN'}
              </span>
              <span className="text-[#FAF6F0]/75">
                {t.roundLabel} <strong className="text-white">#{roomState.roundNumber}</strong>
              </span>
            </div>
            <div className="text-[#FAF6F0]/75">
              {t.wordsPlayedLabel} :{' '}
              <strong className="text-[#FF9F1C]">{roomState.totalWordsPlayed}</strong>
            </div>
          </div>

          {/* Players Horizontal Ring / Strip (Mobile-Friendly, Always Visible) */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {roomState.players.map((p) => {
              const isHolder = roomState.activePlayerId === p.id && roomState.status === 'PLAYING';
              return (
                <div
                  key={p.id}
                  className={`shrink-0 min-w-[112px] sm:min-w-[128px] px-2.5 py-2 rounded-2xl border transition-all ${
                    p.isEliminated
                      ? 'bg-[#161013]/60 border-[#2C1D24] opacity-55'
                      : isHolder
                      ? 'bg-gradient-to-b from-[#FF9F1C]/25 to-[#FF334B]/20 border-[#FF9F1C] ring-2 ring-[#FF9F1C]/50 shadow-lg'
                      : 'bg-[#1C1418] border-[#38262E]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-xs font-extrabold truncate">{p.name}</span>
                    {isHolder && <span className="text-xs animate-bounce">💣</span>}
                    {p.isEliminated && <Skull className="w-3.5 h-3.5 text-[#FF334B] shrink-0" />}
                  </div>

                  {/* Hearts / Lives */}
                  <div className="flex items-center gap-0.5 mb-1">
                    {Array.from({ length: p.maxLives }).map((_, i) => (
                      <Heart
                        key={i}
                        className={`w-3 h-3 ${
                          i < p.lives
                            ? 'text-[#FF334B] fill-[#FF334B]'
                            : 'text-[#38262E] fill-transparent'
                        }`}
                      />
                    ))}
                  </div>

                  {/* Live Typing or Last Word Status */}
                  <div className="h-4 flex items-center text-[10px] font-mono truncate">
                    {p.isEliminated ? (
                      <span className="text-[#FF334B] font-bold">{t.eliminatedTag}</span>
                    ) : isHolder && p.currentTyping ? (
                      <span className="text-white font-black truncate">
                        <HighlightedWord
                          word={p.currentTyping}
                          prompt={roomState.currentPrompt}
                        />
                      </span>
                    ) : p.lastWordSubmitted ? (
                      <span
                        className={`truncate font-bold ${
                          p.lastWordStatus === 'valid'
                            ? 'text-emerald-400'
                            : 'text-[#FF334B] line-through'
                        }`}
                      >
                        {p.lastWordSubmitted}
                      </span>
                    ) : (
                      <span className="text-[#FAF6F0]/40">
                        {isHolder ? t.waitingInput : '—'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Central Bomb & Prompt Stage (Positioned Upper-Center so Mobile Keyboard Never Hides It) */}
          <div className="relative bg-[#1C1418] border-2 border-[#38262E] rounded-3xl p-3.5 sm:p-5 shadow-2xl flex flex-col items-center justify-center overflow-hidden">
            {roomState.status === 'COUNTDOWN' ? (
              <div className="py-6 text-center space-y-2">
                <p className="text-xs font-black uppercase tracking-widest text-[#FF9F1C]">
                  {t.countdownTitle}
                </p>
                <div className="font-['Bricolage_Grotesque',_sans-serif] text-6xl sm:text-7xl font-black text-white animate-pulse">
                  {countdownSec}
                </div>
                <p className="text-xs text-[#FAF6F0]/60">{t.countdownSub}</p>
              </div>
            ) : (
              <>
                {/* Turn Status Banner */}
                <div className="w-full flex items-center justify-between gap-2 mb-2">
                  <span
                    className={`text-xs sm:text-sm font-black uppercase tracking-wider ${
                      isMyTurn ? 'text-[#FF9F1C]' : 'text-[#FAF6F0]/80'
                    }`}
                  >
                    {isMyTurn
                      ? t.yourTurnBanner
                      : `${activePlayer?.name || ''} ${t.otherTurnBanner}`}
                  </span>

                  <span
                    className={`font-mono text-xs sm:text-sm font-black px-2.5 py-0.5 rounded-full border ${
                      isCriticalTime
                        ? 'bg-[#FF334B]/25 border-[#FF334B] text-[#FF334B] animate-pulse'
                        : 'bg-[#110D10] border-[#38262E] text-[#FF9F1C]'
                    }`}
                  >
                    {(remainingMs / 1000).toFixed(1)}s
                  </span>
                </div>

                {/* Fuse Countdown Bar */}
                <div className="w-full h-2.5 rounded-full bg-[#110D10] overflow-hidden border border-[#38262E] mb-3">
                  <div
                    className={`h-full transition-all duration-75 ${
                      isCriticalTime
                        ? 'bg-gradient-to-r from-[#FF334B] to-[#FF9F1C]'
                        : 'bg-gradient-to-r from-[#FF9F1C] to-amber-300'
                    }`}
                    style={{ width: `${Math.round(progressRatio * 100)}%` }}
                  />
                </div>

                {/* Ticking Bomb Visual + Huge Readable Letter Combination */}
                <div
                  onClick={() => isMyTurn && inputRef.current?.focus()}
                  className="relative flex flex-col items-center justify-center py-1 cursor-pointer"
                >
                  <motion.div
                    animate={
                      reduceMotion
                        ? {}
                        : isCriticalTime
                        ? { scale: [1, 1.07, 0.97, 1.05, 1], rotate: [-2, 2, -2, 2, 0] }
                        : { scale: [1, 1.03, 1] }
                    }
                    transition={{
                      duration: isCriticalTime ? 0.35 : 0.9,
                      repeat: Infinity,
                    }}
                    className={`relative w-32 h-32 sm:w-40 sm:h-40 rounded-full flex flex-col items-center justify-center border-4 shadow-2xl ${
                      isCriticalTime
                        ? 'bg-radial from-[#3B1219] via-[#1E0D12] to-[#0E090C] border-[#FF334B] shadow-[#FF334B]/35'
                        : 'bg-radial from-[#2C1E16] via-[#171114] to-[#0D0A0C] border-[#FF9F1C] shadow-[#FF9F1C]/25'
                    }`}
                  >
                    {/* Fuse Spark Top Badge */}
                    <div className="absolute -top-3.5 px-2.5 py-0.5 rounded-full bg-[#110D10] border border-[#FF9F1C] flex items-center gap-1 shadow">
                      <Flame className="w-3.5 h-3.5 text-[#FF9F1C] fill-[#FF9F1C] animate-bounce" />
                      <span className="text-[9px] font-black uppercase tracking-widest text-[#FF9F1C]">
                        BOMB
                      </span>
                    </div>

                    {/* THE LETTER COMBINATION (Huge & High-Contrast for Mobile) */}
                    <span className="font-['Bricolage_Grotesque',_monospace] text-4xl sm:text-5xl font-black tracking-[0.12em] text-white drop-shadow-[0_2px_12px_rgba(255,159,28,0.45)]">
                      {roomState.currentPrompt}
                    </span>
                  </motion.div>

                  {/* Live Typing Preview when another player holds the bomb */}
                  {!isMyTurn && activePlayer && (
                    <div className="mt-2.5 min-h-[28px] px-4 py-1 rounded-xl bg-[#110D10] border border-[#38262E] font-mono text-sm sm:text-base font-black tracking-wider text-center">
                      {activePlayer.currentTyping ? (
                        <HighlightedWord
                          word={activePlayer.currentTyping}
                          prompt={roomState.currentPrompt}
                        />
                      ) : (
                        <span className="text-xs text-[#FAF6F0]/45 italic">
                          {activePlayer.name} {t.waitingInput}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Word Input Form (Right below the bomb so mobile virtual keyboard never hides it) */}
                {isMyTurn ? (
                  <form onSubmit={handleSubmitWord} className="w-full mt-3 space-y-1.5">
                    <div className="flex items-center gap-2">
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
                          className="w-full px-4 py-3 rounded-2xl bg-[#110D10] border-2 border-[#FF9F1C] text-base sm:text-lg font-black uppercase tracking-wider text-white placeholder:text-[#FAF6F0]/35 placeholder:font-semibold outline-none shadow-inner"
                        />
                      </div>

                      <button
                        type="submit"
                        className="px-5 py-3.5 rounded-2xl bg-gradient-to-r from-[#FF9F1C] to-[#FF334B] text-[#110D10] font-black text-sm uppercase tracking-wider flex items-center gap-1.5 shadow-lg cursor-pointer active:scale-95 shrink-0"
                      >
                        <span>{t.validateBtn}</span>
                        <Send className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Live Prompt Match Feedback / Rejection Message */}
                    <AnimatePresence mode="wait">
                      {inlineInputError && (
                        <motion.div
                          key={inlineInputError}
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="text-xs font-extrabold text-[#FF334B] text-center"
                        >
                          ⚠️ {inlineInputError}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </form>
                ) : (
                  myPlayer?.isEliminated && (
                    <div className="mt-2 px-3 py-1.5 rounded-xl bg-[#FF334B]/15 border border-[#FF334B]/40 text-xs font-bold text-[#FFD5DA]">
                      {t.eliminatedBanner}
                    </div>
                  )
                )}

                {/* Last Event Ticker */}
                {roomState.lastEvent && (
                  <div className="mt-2 text-[11px] font-bold text-[#FAF6F0]/75 text-center">
                    {roomState.lastEvent.type === 'word_accepted' && (
                      <span className="text-emerald-400">
                        ✓ <strong>{roomState.lastEvent.playerName}</strong> {t.events.word_accepted}{' '}
                        « <strong>{roomState.lastEvent.word}</strong> »
                      </span>
                    )}
                    {roomState.lastEvent.type === 'bonus_life_earned' && (
                      <span className="text-amber-300">
                        ★ <strong>{roomState.lastEvent.playerName}</strong>{' '}
                        {t.events.bonus_life_earned}
                      </span>
                    )}
                    {roomState.lastEvent.type === 'timeout_life_lost' && (
                      <span className="text-[#FF334B]">
                        💥 {t.events.timeout_life_lost}{' '}
                        <strong>{roomState.lastEvent.playerName}</strong> (-1 ❤️)
                      </span>
                    )}
                    {roomState.lastEvent.type === 'player_eliminated' && (
                      <span className="text-[#FF334B]">
                        💀 <strong>{roomState.lastEvent.playerName}</strong>{' '}
                        {t.events.player_eliminated}
                      </span>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Bottom Panels: Bonus Alphabet + Recent Valid Words */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
            {/* Bonus Alphabet Tracker */}
            {roomState.settings.bonusAlphabetEnabled && myPlayer && (
              <div className="sm:col-span-7 bg-[#1C1418] border border-[#38262E] rounded-2xl p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-black uppercase tracking-wider text-[#FF9F1C] flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    {t.bonusAlphabetHeader}
                  </span>
                  <span className="text-[11px] font-mono font-bold text-[#FAF6F0]/70">
                    {myPlayer.bonusLettersUsed.length} / {roomState.bonusAlphabetTarget.length}
                  </span>
                </div>

                <div className="flex flex-wrap gap-1">
                  {roomState.bonusAlphabetTarget.map((letter) => {
                    const collected = myPlayer.bonusLettersUsed.includes(letter);
                    return (
                      <span
                        key={letter}
                        className={`w-6 h-6 rounded-md text-[11px] font-black flex items-center justify-center border transition-all ${
                          collected
                            ? 'bg-emerald-500/25 border-emerald-400 text-emerald-300 shadow-sm'
                            : 'bg-[#110D10] border-[#38262E] text-[#FAF6F0]/40'
                        }`}
                      >
                        {letter}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Recent Validated Words */}
            <div
              className={`${
                roomState.settings.bonusAlphabetEnabled && myPlayer
                  ? 'sm:col-span-5'
                  : 'sm:col-span-12'
              } bg-[#1C1418] border border-[#38262E] rounded-2xl p-3`}
            >
              <span className="block text-[11px] font-black uppercase tracking-wider text-[#FAF6F0]/70 mb-1.5">
                {t.recentWordsHeader}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {roomState.recentValidWords.length === 0 ? (
                  <span className="text-xs text-[#FAF6F0]/35 italic">—</span>
                ) : (
                  roomState.recentValidWords.slice(0, 6).map((item, i) => (
                    <span
                      key={`${item.word}-${i}`}
                      className="px-2 py-0.5 rounded-lg bg-[#110D10] border border-[#38262E] text-[11px] font-mono font-bold"
                    >
                      <HighlightedWord word={item.word} prompt={item.prompt} />
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>
        </main>
      )}

      {/* ==================== 4. GAME OVER SCREEN ==================== */}
      {roomState && roomState.status === 'GAME_OVER' && (
        <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-4 flex flex-col justify-center gap-4">
          <div className="bg-[#1C1418] border-2 border-[#FF9F1C] rounded-3xl p-6 text-center shadow-2xl space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-[#FF9F1C]/20 border border-[#FF9F1C] flex items-center justify-center mx-auto text-[#FF9F1C]">
              <Trophy className="w-9 h-9" />
            </div>

            <h1 className="font-['Bricolage_Grotesque',_sans-serif] text-2xl sm:text-3xl font-extrabold text-white">
              {roomState.winnerName
                ? `🏆 ${roomState.winnerName} ${t.winnerAnnouncement}`
                : t.noWinner}
            </h1>

            {/* Standings Table */}
            <div className="mt-4 text-left space-y-2">
              <h2 className="text-xs font-black uppercase tracking-wider text-[#FF9F1C]">
                {t.finalRanking}
              </h2>

              <div className="space-y-1.5">
                {[...roomState.players]
                  .sort((a, b) => (a.finalRank || 99) - (b.finalRank || 99))
                  .map((p, idx) => (
                    <div
                      key={p.id}
                      className={`flex items-center justify-between px-3.5 py-2.5 rounded-2xl border ${
                        p.id === roomState.winnerId
                          ? 'bg-[#FF9F1C]/15 border-[#FF9F1C]'
                          : 'bg-[#110D10] border-[#38262E]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-6 h-6 rounded-full bg-[#271C22] text-xs font-black flex items-center justify-center text-[#FF9F1C]">
                          #{p.finalRank || idx + 1}
                        </span>
                        <div className="min-w-0">
                          <div className="font-extrabold text-sm truncate">{p.name}</div>
                          {p.longestWord && (
                            <div className="text-[10px] text-[#FAF6F0]/60 font-mono">
                              {t.longestWordCol}: <strong className="text-white">{p.longestWord}</strong>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 text-xs shrink-0">
                        <span className="px-2.5 py-1 rounded-lg bg-[#1C1418] border border-[#38262E] font-bold">
                          <strong className="text-[#FF9F1C]">{p.wordsValidated}</strong> {t.wordsCountCol}
                        </span>
                        {p.bonusLivesEarned > 0 && (
                          <span className="px-2 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 font-bold">
                            +{p.bonusLivesEarned} ❤️
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Replay / Return to Lobby Buttons */}
            <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {isHost ? (
                <>
                  <button
                    type="button"
                    onClick={handleStartGame}
                    className="py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#FF9F1C] to-[#FF334B] text-[#110D10] font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>{t.playAgainBtn}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleReturnToLobby}
                    className="py-3.5 px-4 rounded-2xl bg-[#110D10] hover:bg-[#271C22] border border-[#38262E] text-xs font-bold text-[#FAF6F0] cursor-pointer"
                  >
                    {t.backToLobbyBtn}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleLeaveRoom}
                  className="sm:col-span-2 py-3 px-4 rounded-2xl bg-[#110D10] border border-[#38262E] text-xs font-bold text-[#FAF6F0]/80 cursor-pointer"
                >
                  {t.waitingForHost} ({t.leaveRoom})
                </button>
              )}
            </div>
          </div>
        </main>
      )}

      {/* Rules Modal */}
      {showRulesModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1C1418] border-2 border-[#FF9F1C] rounded-3xl p-5 sm:p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-['Bricolage_Grotesque',_sans-serif] text-lg font-extrabold text-[#FF9F1C]">
                {t.rulesTitle}
              </h3>
              <button
                type="button"
                onClick={() => setShowRulesModal(false)}
                className="p-1.5 rounded-full bg-[#110D10] text-[#FAF6F0]/70 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <ul className="space-y-2.5 text-xs sm:text-sm text-[#FAF6F0]/90 leading-relaxed">
              {t.rulesSteps.map((step, idx) => (
                <li key={idx} className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#FF9F1C]/20 text-[#FF9F1C] text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={() => setShowRulesModal(false)}
              className="w-full py-3 rounded-2xl bg-[#FF9F1C] text-[#110D10] font-black text-xs uppercase tracking-wider cursor-pointer"
            >
              {t.close}
            </button>
          </div>
        </div>
      )}

      {/* QR Code Invitation Modal */}
      {showQrModal && roomState && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1C1418] border-2 border-[#FF9F1C] rounded-3xl p-6 max-w-xs w-full text-center shadow-2xl space-y-4">
            <h3 className="font-['Bricolage_Grotesque',_sans-serif] text-lg font-extrabold text-white">
              Salon {roomState.roomCode}
            </h3>
            <p className="text-xs text-[#FAF6F0]/70">{t.scanToJoin}</p>
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt={`QR Code ${roomState.roomCode}`}
                className="w-48 h-48 mx-auto rounded-2xl border-4 border-white shadow-lg"
              />
            ) : (
              <div className="w-48 h-48 mx-auto rounded-2xl bg-[#110D10] flex items-center justify-center text-xs text-[#FAF6F0]/50">
                ...
              </div>
            )}
            <button
              type="button"
              onClick={() => setShowQrModal(false)}
              className="w-full py-2.5 rounded-2xl bg-[#FF9F1C] text-[#110D10] font-black text-xs uppercase cursor-pointer"
            >
              {t.close}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SekouBombApp;
