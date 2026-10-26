import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card, ClientGameState, PlayableColor, PlayerPublic } from '../../../shared/types.js';
import { CardView } from '../components/CardView.js';
import { OpponentRing } from '../components/OpponentRing.js';
import { PenaltyBanner } from '../components/PenaltyBanner.js';
import { ColorPickerModal } from '../components/ColorPickerModal.js';
import { HostPenaltyModal } from '../components/HostPenaltyModal.js';
import {
  RotateCw,
  RotateCcw,
  SkipForward,
  ShieldAlert,
  LogOut,
  XCircle,
  ArrowDown,
  Volume2,
  VolumeX,
  Flame,
  ArrowUpDown,
} from 'lucide-react';
import { sounds } from '../utils/sound.js';

interface FlyingCardAnim {
  id: string;
  type: 'draw' | 'play';
  card?: Card;
}

interface TableCallout {
  id: string;
  title: string;
  subtitle?: string;
  accent: string;
}

interface DiscardHistoryItem {
  card: Card;
  angle: number;
  offsetX: number;
  offsetY: number;
}

interface GameScreenProps {
  clientState: ClientGameState;
  onPlayCard: (cardId: string, chosenColor?: PlayableColor) => void;
  onDrawCard: () => void;
  onPassTurn?: () => void;
  onCallUno?: () => void;
  onCatchUno: (targetPlayerId: string) => void;
  onHostGivePenalty?: (targetPlayerId: string, count: number) => void;
  onLeaveRoom: () => void;
  onCloseRoom?: () => void;
  error?: string | null;
}

const SUIT_AMBIENT_GLOW: Record<PlayableColor, { hex: string; rgba: string; label: string; badge: string }> = {
  red: {
    hex: '#E03131',
    rgba: 'rgba(224, 49, 49, 0.24)',
    label: 'Rouge',
    badge: 'bg-[#E03131] text-[#FAF3E6] border-[#FF8787]/60 shadow-[0_0_16px_rgba(224,49,49,0.55)]',
  },
  blue: {
    hex: '#246BFD',
    rgba: 'rgba(36, 107, 253, 0.24)',
    label: 'Bleu',
    badge: 'bg-[#246BFD] text-[#FAF3E6] border-[#74C0FC]/60 shadow-[0_0_16px_rgba(36,107,253,0.55)]',
  },
  green: {
    hex: '#16A35A',
    rgba: 'rgba(22, 163, 90, 0.24)',
    label: 'Vert',
    badge: 'bg-[#16A35A] text-[#FAF3E6] border-[#63E6BE]/60 shadow-[0_0_16px_rgba(22,163,90,0.55)]',
  },
  yellow: {
    hex: '#F5B727',
    rgba: 'rgba(245, 183, 39, 0.24)',
    label: 'Jaune',
    badge: 'bg-[#F5B727] text-[#141109] border-[#FFE066]/80 shadow-[0_0_16px_rgba(245,183,39,0.55)]',
  },
};

export const GameScreen: React.FC<GameScreenProps> = ({
  clientState,
  onPlayCard,
  onDrawCard,
  onPassTurn,
  onCallUno,
  onCatchUno,
  onHostGivePenalty,
  onLeaveRoom,
  onCloseRoom,
  error,
}) => {
  const { public: pub, myHand, myPlayerId, isMyTurn } = clientState;

  const [pendingCard, setPendingCard] = useState<Card | null>(null);
  const [selectedPenaltyTarget, setSelectedPenaltyTarget] = useState<PlayerPublic | null>(null);
  const [isMuted, setIsMuted] = useState(sounds.isSoundMuted());
  const [sortMode, setSortMode] = useState<'none' | 'color' | 'value'>('none');

  // Flying cards animation queue
  const [flyingCards, setFlyingCards] = useState<FlyingCardAnim[]>([]);

  // Visual stack of recent discard cards so the pile looks physical
  const [discardHistory, setDiscardHistory] = useState<DiscardHistoryItem[]>(() =>
    pub.topDiscard ? [{ card: pub.topDiscard, angle: -2, offsetX: 0, offsetY: 0 }] : []
  );

  // Kinetic table callout for special actions (+2, +4, Skip, Reverse, UNO)
  const [callout, setCallout] = useState<TableCallout | null>(null);

  const opponents = pub.players.filter((p) => p.id !== myPlayerId);
  const mePublic = pub.players.find((p) => p.id === myPlayerId);
  const currentTurnPlayer = pub.players.find((p) => p.id === pub.currentTurnPlayerId);
  const isHost = pub.hostId === myPlayerId;

  const triggerCallout = (title: string, subtitle?: string, accent = '#E5B84B') => {
    const id = `c_${Date.now()}_${Math.random()}`;
    setCallout({ id, title, subtitle, accent });
    setTimeout(() => {
      setCallout((prev) => (prev?.id === id ? null : prev));
    }, 1450);
  };

  // Track discard pile changes (including opponent plays!)
  const prevTopDiscardIdRef = useRef<string | null>(pub.topDiscard?.id || null);
  const playedLocallyCardIdRef = useRef<string | null>(null);

  useEffect(() => {
    const top = pub.topDiscard;
    if (!top) return;

    if (top.id !== prevTopDiscardIdRef.current) {
      prevTopDiscardIdRef.current = top.id;

      // Add to physical discard stack (keep up to 5 cards)
      const angle = ((top.id.charCodeAt(0) + top.id.charCodeAt(top.id.length - 1)) % 22) - 11;
      const offsetX = ((top.id.charCodeAt(1) || 3) % 9) - 4;
      const offsetY = ((top.id.charCodeAt(2) || 5) % 7) - 3;

      setDiscardHistory((prev) => {
        const filtered = prev.filter((item) => item.card.id !== top.id);
        return [...filtered.slice(-4), { card: top, angle, offsetX, offsetY }];
      });

      // If played by an opponent, play the card sound too
      if (playedLocallyCardIdRef.current !== top.id) {
        sounds.playCard(top);
      }
      playedLocallyCardIdRef.current = null;

      // Trigger table callout for special cards
      if (top.value === 'skip') {
        triggerCallout('PASSE TON TOUR !', pub.lastActionMessage || undefined, '#FF6B6B');
      } else if (top.value === 'reverse') {
        triggerCallout('SENS INVERSÉ !', pub.direction === 1 ? 'Sens horaire' : 'Sens anti-horaire', '#74C0FC');
      } else if (top.value === 'draw2') {
        triggerCallout('+2 CARTES !', pub.penaltyStack ? `Cumul : +${pub.penaltyStack.totalCards}` : undefined, '#F5B727');
      } else if (top.value === 'wild4') {
        triggerCallout('+4 JOKER !', pub.penaltyStack ? `Cumul : +${pub.penaltyStack.totalCards}` : undefined, '#E03131');
      } else if (top.value === 'wild') {
        const suitName = pub.currentColor ? SUIT_AMBIENT_GLOW[pub.currentColor].label : '';
        triggerCallout('CHANGEMENT DE COULEUR', suitName ? `Nouvelle couleur : ${suitName}` : undefined, '#E5B84B');
      }
    }
  }, [pub.topDiscard, pub.currentColor, pub.direction, pub.penaltyStack, pub.lastActionMessage]);

  // Track UNO notices from any player
  const prevUnoTimestampRef = useRef<number>(pub.unoNotice?.timestamp || 0);
  useEffect(() => {
    if (pub.unoNotice && pub.unoNotice.timestamp !== prevUnoTimestampRef.current) {
      prevUnoTimestampRef.current = pub.unoNotice.timestamp;
      sounds.uno();
      triggerCallout('SEKOUNO !', `${pub.unoNotice.playerName} n'a plus qu'une carte !`, '#E5B84B');
    }
  }, [pub.unoNotice]);

  // Track hand changes to animate drawn cards and play piocher_carte sound for EACH card
  const prevHandLengthRef = useRef(myHand.length);
  const initialMountRef = useRef(true);

  useEffect(() => {
    if (initialMountRef.current) {
      initialMountRef.current = false;
      prevHandLengthRef.current = myHand.length;
      return;
    }

    const currentLen = myHand.length;
    const prevLen = prevHandLengthRef.current;

    if (currentLen > prevLen) {
      const drawnCount = currentLen - prevLen;
      if (drawnCount >= 2) {
        sounds.penalty();
      }
      for (let i = 0; i < drawnCount; i++) {
        setTimeout(() => {
          sounds.drawCard(i);
          const animId = `draw_${Date.now()}_${i}`;
          setFlyingCards((prev) => [...prev, { id: animId, type: 'draw' }]);
          setTimeout(() => {
            setFlyingCards((prev) => prev.filter((f) => f.id !== animId));
          }, 430);
        }, i * 145);
      }
    }

    prevHandLengthRef.current = currentLen;
  }, [myHand.length]);

  // Sound chime when it becomes the player's turn
  const prevIsMyTurn = useRef(isMyTurn);
  useEffect(() => {
    if (isMyTurn && !prevIsMyTurn.current) {
      sounds.myTurn();
    }
    prevIsMyTurn.current = isMyTurn;
  }, [isMyTurn]);

  // Check if a card is legally playable on the client side
  const isCardPlayable = (card: Card): boolean => {
    if (!isMyTurn) return false;

    // Rule A: Cannot win with black card
    if (myHand.length === 1 && card.color === 'black') {
      return false;
    }

    // Rule B: Penalty stack in progress
    if (pub.penaltyStack) {
      if (pub.penaltyStack.cardType === 'draw2') {
        return card.value === 'draw2' || card.value === 'wild4';
      }
      if (pub.penaltyStack.cardType === 'wild4') {
        return false;
      }
    }

    // Normal play
    if (card.color === 'black') return true;
    if (pub.currentColor && card.color === pub.currentColor) return true;
    if (pub.topDiscard && card.value === pub.topDiscard.value) return true;

    return false;
  };

  const playableCardsCount = myHand.filter(isCardPlayable).length;
  const hasNoPlayableCards = isMyTurn && playableCardsCount === 0;

  // Sorted hand for player comfort
  const displayedHand = useMemo(() => {
    if (sortMode === 'none') return myHand;
    const colorOrder: Record<string, number> = { red: 1, blue: 2, green: 3, yellow: 4, black: 5 };
    return [...myHand].sort((a, b) => {
      if (sortMode === 'color') {
        const cDiff = (colorOrder[a.color] || 9) - (colorOrder[b.color] || 9);
        if (cDiff !== 0) return cDiff;
        return a.value.localeCompare(b.value);
      }
      const vDiff = a.value.localeCompare(b.value);
      if (vDiff !== 0) return vDiff;
      return (colorOrder[a.color] || 9) - (colorOrder[b.color] || 9);
    });
  }, [myHand, sortMode]);

  // Auto-resolve penalty if targeted and player has no counter card
  useEffect(() => {
    if (isMyTurn && pub.penaltyStack && pub.penaltyStack.targetPlayerId === myPlayerId) {
      const canCounter = myHand.some(isCardPlayable);
      if (!canCounter) {
        const timer = setTimeout(() => {
          onDrawCard();
        }, 900);
        return () => clearTimeout(timer);
      }
    }
  }, [isMyTurn, pub.penaltyStack, myPlayerId, myHand]);

  const handleCardClick = (card: Card) => {
    if (!isMyTurn || !isCardPlayable(card)) return;

    if (card.color === 'black') {
      sounds.buttonClick();
      setPendingCard(card);
    } else {
      triggerPlayCard(card);
    }
  };

  const triggerPlayCard = (card: Card, chosenColor?: PlayableColor) => {
    playedLocallyCardIdRef.current = card.id;
    const animId = `play_${Date.now()}`;
    setFlyingCards((prev) => [...prev, { id: animId, type: 'play', card }]);
    sounds.playCard(card);

    setTimeout(() => {
      setFlyingCards((prev) => prev.filter((f) => f.id !== animId));
    }, 360);

    onPlayCard(card.id, chosenColor);
  };

  const handleColorSelected = (color: PlayableColor) => {
    if (pendingCard) {
      triggerPlayCard(pendingCard, color);
      setPendingCard(null);
    }
  };

  const handleManualDraw = () => {
    if (!isMyTurn) return;
    onDrawCard();
  };

  const handleManualUno = () => {
    if (!onCallUno) return;
    sounds.uno();
    onCallUno();
  };

  const toggleSound = () => {
    const muted = sounds.toggleMute();
    setIsMuted(muted);
  };

  const cycleSortMode = () => {
    sounds.buttonClick();
    setSortMode((prev) => (prev === 'none' ? 'color' : prev === 'color' ? 'value' : 'none'));
  };

  const activeSuit = pub.currentColor ? SUIT_AMBIENT_GLOW[pub.currentColor] : null;
  const showUnoButton =
    Boolean(onCallUno) &&
    (clientState.canCallUno || (myHand.length <= 2 && myHand.length >= 1 && !mePublic?.hasCalledUno));

  return (
    <div
      className="h-[100dvh] max-h-[100dvh] overflow-hidden flex flex-col justify-between pt-safe pl-safe pr-safe select-none relative text-[#F5EFE4] font-['Plus_Jakarta_Sans',_sans-serif]"
      style={{
        background:
          'radial-gradient(ellipse 85% 65% at 50% 45%, #0D291D 0%, #071710 58%, #030A07 100%)',
      }}
    >
      {/* Dynamic Ambient Suit Spotlight on the Felt Table */}
      <div
        aria-hidden
        className="fixed inset-0 pointer-events-none transition-all duration-700 z-0"
        style={{
          background: activeSuit
            ? `radial-gradient(38rem 26rem at 50% 46%, ${activeSuit.rgba}, transparent 70%)`
            : 'radial-gradient(34rem 24rem at 50% 46%, rgba(229,184,75,0.12), transparent 70%)',
        }}
      />

      {/* 1. TOP HUD BAR + OPPONENTS */}
      <header className="relative z-20 flex-shrink-0 px-2.5 pt-1.5 pb-1">
        <div className="flex items-center justify-between py-1.5 px-3 mb-1.5 rounded-2xl bg-[#06110C]/85 border border-white/10 backdrop-blur-md shadow-lg">
          <div className="flex items-center gap-2.5">
            <span className="font-['Bricolage_Grotesque',_sans-serif] font-extrabold text-xs sm:text-sm tracking-wider text-[#E5B84B] bg-[#12261C] px-2.5 py-1 rounded-xl border border-[#E5B84B]/30">
              #{pub.roomCode}
            </span>
            <span className="font-['Bricolage_Grotesque',_sans-serif] font-extrabold text-sm tracking-tight text-[#F5EFE4] hidden sm:inline">
              Sekouno Club
            </span>
          </div>

          {/* Last action ticker in center of top bar on desktop */}
          {pub.lastActionMessage && (
            <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-[#C7D4CB] max-w-md truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E5B84B] shrink-0" />
              <span className="truncate">{pub.lastActionMessage}</span>
            </div>
          )}

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={toggleSound}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[#B5C4B9] hover:text-white transition-colors cursor-pointer"
              title={isMuted ? 'Activer les effets sonores' : 'Couper le son'}
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4 text-[#FF6B6B]" />
              ) : (
                <Volume2 className="w-4 h-4 text-[#E5B84B]" />
              )}
            </button>

            {isHost ? (
              <button
                type="button"
                onClick={onCloseRoom || onLeaveRoom}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#2D0D0F] hover:bg-[#421316] border border-[#E03131]/40 text-[11px] font-bold text-[#FF8787] transition-colors cursor-pointer"
                title="Fermer la table pour tous les joueurs"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Fermer</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onLeaveRoom}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-semibold text-[#B5C4B9] hover:text-[#FF8787] transition-colors cursor-pointer"
                title="Quitter la table"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Quitter</span>
              </button>
            )}
          </div>
        </div>

        {/* Opponents Ring */}
        <OpponentRing
          opponents={opponents}
          currentTurnPlayerId={pub.currentTurnPlayerId}
          isHost={isHost}
          onSelectPlayerForPenalty={(player) => setSelectedPenaltyTarget(player)}
          onCatchUno={onCatchUno}
        />
      </header>

      {/* 2. CENTER BAIZE TABLE: Draw Pile, Direction Orbit & Physical Discard Stack */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-3 min-h-0">
        {/* Error toast */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="absolute top-1 z-40 max-w-sm w-full px-3.5 py-2 bg-[#2D0A0A]/95 border border-[#E03131] rounded-2xl text-xs text-[#FFD8D8] flex items-center gap-2 shadow-2xl"
            >
              <ShieldAlert className="w-4 h-4 text-[#FF6B6B] shrink-0" />
              <span className="leading-snug">{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Active Penalty Stack Banner */}
        {pub.penaltyStack && (
          <div className="w-full px-1 z-30 mb-2">
            <PenaltyBanner
              penaltyStack={pub.penaltyStack}
              players={pub.players}
              currentTurnPlayerId={pub.currentTurnPlayerId}
              myPlayerId={myPlayerId}
              onDrawPenalty={handleManualDraw}
            />
          </div>
        )}

        {/* Mobile action ticker */}
        {pub.lastActionMessage && !pub.penaltyStack && (
          <div className="md:hidden mb-2 px-3 py-1 rounded-full bg-[#06110C]/85 border border-white/10 text-[11px] text-[#C7D4CB] max-w-xs truncate shadow">
            {pub.lastActionMessage}
          </div>
        )}

        {/* Center Club Table Mat with Walnut & Brass Rim */}
        <div
          className="relative px-6 py-5 sm:px-12 sm:py-8 rounded-[44px] flex items-center justify-center gap-6 sm:gap-12 shadow-[0_24px_60px_rgba(0,0,0,0.75),inset_0_2px_20px_rgba(0,0,0,0.6)]"
          style={{
            background:
              'radial-gradient(circle at 50% 50%, #103324 0%, #092117 70%, #061710 100%)',
            border: '3px solid rgba(229, 184, 75, 0.32)',
            boxShadow: activeSuit
              ? `0 24px 60px rgba(0,0,0,0.75), 0 0 42px ${activeSuit.rgba}, inset 0 0 28px rgba(0,0,0,0.55)`
              : undefined,
          }}
        >
          {/* Inner brass hairline ring */}
          <div className="absolute inset-2.5 rounded-[34px] border border-[#E5B84B]/15 pointer-events-none" />

          {/* DRAW PILE (Pioche) with 3D deck thickness */}
          <div className="flex flex-col items-center relative z-10" id="draw-pile-anchor">
            <div className="relative">
              {/* Deck thickness layers underneath */}
              <div className="absolute top-1.5 left-1.5 w-full h-full rounded-[15px] bg-[#CFC5B4] border border-black/30 pointer-events-none" />
              <div className="absolute top-0.5 left-0.5 w-full h-full rounded-[15px] bg-[#E3DAC9] border border-black/20 pointer-events-none" />

              <CardView
                showBack
                size="md"
                onClick={isMyTurn && !clientState.canPassTurn ? handleManualDraw : undefined}
                className={`
                  relative transition-transform duration-200
                  ${
                    isMyTurn && !clientState.canPassTurn
                      ? 'cursor-pointer hover:-translate-y-1.5 hover:scale-[1.04] active:scale-95'
                      : 'brightness-90'
                  }
                  ${
                    hasNoPlayableCards
                      ? 'ring-3 ring-[#E5B84B] shadow-[0_0_28px_rgba(229,184,75,0.65)] scale-[1.04]'
                      : ''
                  }
                `}
              />

              {/* Remaining cards counter pill */}
              <span className="absolute -bottom-2 -right-2 bg-[#091510] text-[#E5B84B] border border-[#E5B84B]/50 font-['Bricolage_Grotesque',_sans-serif] text-[11px] font-extrabold px-2 py-0.5 rounded-full shadow-lg">
                {pub.drawPileCount}
              </span>
            </div>

            {/* Draw action prompt */}
            {isMyTurn && !clientState.canPassTurn ? (
              <button
                type="button"
                onClick={handleManualDraw}
                className={`mt-3 px-3.5 py-1 rounded-full font-['Bricolage_Grotesque',_sans-serif] text-xs font-extrabold flex items-center gap-1 transition-all active:scale-95 cursor-pointer shadow-md ${
                  hasNoPlayableCards
                    ? 'bg-[#E5B84B] text-[#091510] ring-2 ring-[#FFE27A] animate-pulse-fast'
                    : 'bg-white/10 hover:bg-white/15 text-[#F5EFE4] border border-white/15'
                }`}
              >
                <ArrowDown className="w-3.5 h-3.5" />
                <span>{hasNoPlayableCards ? 'Piocher !' : 'Piocher'}</span>
              </button>
            ) : (
              <span className="mt-3 text-[11px] font-semibold text-[#8FA696]">Pioche</span>
            )}
          </div>

          {/* DIRECTION ORBIT & SUIT MEDALLION */}
          <div className="flex flex-col items-center justify-center gap-2 relative z-10">
            <div
              className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#06120C]/90 border border-[#E5B84B]/35 flex items-center justify-center shadow-inner"
              title={pub.direction === 1 ? 'Sens horaire' : 'Sens anti-horaire'}
            >
              {pub.direction === 1 ? (
                <RotateCw className="w-5 h-5 sm:w-6 sm:h-6 text-[#E5B84B] animate-spin-slow" />
              ) : (
                <RotateCcw className="w-5 h-5 sm:w-6 sm:h-6 text-[#74C0FC] animate-spin-slow" />
              )}
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#9FB0A5]">
              {pub.direction === 1 ? 'Horaire' : 'Anti-hor.'}
            </span>
          </div>

          {/* DISCARD PILE (Défausse) with layered history */}
          <div className="flex flex-col items-center relative z-10" id="discard-pile-anchor">
            <div className="relative w-[4.4rem] h-[6.5rem] sm:w-[5.1rem] sm:h-[7.5rem] md:w-[5.5rem] md:h-[8.1rem] flex items-center justify-center">
              {discardHistory.length > 0 ? (
                discardHistory.map((item, idx) => {
                  const isTop = idx === discardHistory.length - 1;
                  return (
                    <motion.div
                      key={`${item.card.id}_${idx}`}
                      initial={isTop ? { scale: 1.32, y: -28, rotate: item.angle - 8, opacity: 0.85 } : false}
                      animate={{
                        scale: isTop ? 1 : 0.96,
                        x: isTop ? 0 : item.offsetX,
                        y: isTop ? 0 : item.offsetY,
                        rotate: item.angle,
                        opacity: isTop ? 1 : 0.72,
                      }}
                      transition={{ type: 'spring', stiffness: 360, damping: 22 }}
                      className="absolute inset-0 flex items-center justify-center pointer-events-none"
                      style={{ zIndex: idx }}
                    >
                      <CardView card={item.card} size="md" />
                    </motion.div>
                  );
                })
              ) : (
                <div className="w-full h-full rounded-[15px] border-2 border-dashed border-white/20 flex items-center justify-center text-xs text-[#8FA696]">
                  Vide
                </div>
              )}
            </div>

            {/* Active Suit Pill */}
            {activeSuit ? (
              <div
                className={`mt-3 px-3 py-0.5 rounded-full border text-[11px] font-['Bricolage_Grotesque',_sans-serif] font-extrabold tracking-wide flex items-center gap-1.5 transition-all ${activeSuit.badge}`}
              >
                <span className="w-2 h-2 rounded-full bg-current opacity-80" />
                <span>{activeSuit.label}</span>
              </div>
            ) : (
              <span className="mt-3 text-[11px] font-semibold text-[#8FA696]">Défausse</span>
            )}
          </div>

          {/* KINETIC ACTION CALLOUT OVERLAY */}
          <AnimatePresence>
            {callout && (
              <motion.div
                key={callout.id}
                initial={{ scale: 0.7, opacity: 0, y: 12 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.85, opacity: 0, y: -10 }}
                transition={{ type: 'spring', stiffness: 380, damping: 22 }}
                className="pointer-events-none absolute inset-x-4 top-1/2 -translate-y-1/2 z-30 flex flex-col items-center justify-center text-center"
              >
                <div
                  className="px-5 py-2.5 rounded-2xl bg-[#06110C]/95 border-2 shadow-[0_16px_40px_rgba(0,0,0,0.85)] backdrop-blur-md"
                  style={{ borderColor: callout.accent }}
                >
                  <div
                    className="font-['Bricolage_Grotesque',_sans-serif] font-extrabold text-lg sm:text-2xl tracking-tight"
                    style={{ color: callout.accent }}
                  >
                    {callout.title}
                  </div>
                  {callout.subtitle && (
                    <div className="text-[11px] sm:text-xs font-semibold text-[#F5EFE4] mt-0.5">
                      {callout.subtitle}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* 3. PLAYER HAND DOCK & TURN CONTROLS */}
      <footer className="relative z-20 flex-shrink-0 bg-gradient-to-t from-[#040C08] via-[#07140E]/95 to-[#091A12]/90 border-t border-[#E5B84B]/25 rounded-t-[28px] pt-2.5 pb-2 px-2.5 shadow-[0_-16px_40px_rgba(0,0,0,0.7)]">
        {/* Turn Bar + Action Buttons (UNO Call, Pass Turn, Sort Hand) */}
        <div className="flex items-center justify-between gap-2 mb-3 px-1.5">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                isMyTurn ? 'bg-[#E5B84B] shadow-[0_0_10px_#E5B84B] animate-ping' : 'bg-[#52665A]'
              }`}
            />
            <div className="flex items-center gap-1.5 truncate">
              <span
                className={`font-['Bricolage_Grotesque',_sans-serif] text-xs sm:text-sm font-extrabold px-3 py-1 rounded-xl transition-all truncate ${
                  isMyTurn
                    ? 'bg-[#E5B84B] text-[#091510] shadow-[0_4px_18px_rgba(229,184,75,0.45)]'
                    : 'bg-white/5 text-[#C7D4CB] border border-white/10'
                }`}
              >
                {isMyTurn ? 'À vous de jouer !' : `Tour de ${currentTurnPlayer?.name || '...'}`}
              </span>

              {mePublic?.hasCalledUno && (
                <span className="px-2 py-0.5 rounded-lg bg-[#E03131] text-[#FAF3E6] font-['Bricolage_Grotesque',_sans-serif] font-extrabold text-[10px] uppercase tracking-wider">
                  SEKO annoncé
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Sort Hand Button */}
            {myHand.length > 2 && (
              <button
                type="button"
                onClick={cycleSortMode}
                className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-semibold text-[#C7D4CB] flex items-center gap-1 transition-colors cursor-pointer"
                title="Trier vos cartes par couleur ou par valeur"
              >
                <ArrowUpDown className="w-3.5 h-3.5 text-[#E5B84B]" />
                <span className="hidden xs:inline">
                  {sortMode === 'none' ? 'Trier' : sortMode === 'color' ? 'Couleur' : 'Valeur'}
                </span>
              </button>
            )}

            {/* Blazing UNO / SEKO Call Button */}
            {showUnoButton && (
              <button
                type="button"
                onClick={handleManualUno}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#E03131] via-[#E8590C] to-[#F59F00] text-[#FAF3E6] font-['Bricolage_Grotesque',_sans-serif] font-extrabold text-xs sm:text-sm uppercase tracking-wider shadow-[0_0_20px_rgba(224,49,49,0.7)] hover:brightness-110 active:scale-95 flex items-center gap-1.5 animate-pulse-fast cursor-pointer"
              >
                <Flame className="w-4 h-4 fill-current" />
                <span>Crier SEKO !</span>
              </button>
            )}

            {/* Pass Turn Button after drawing a playable card */}
            {clientState.canPassTurn && onPassTurn && (
              <button
                type="button"
                onClick={() => {
                  sounds.buttonClick();
                  onPassTurn();
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-['Bricolage_Grotesque',_sans-serif] font-extrabold text-xs sm:text-sm bg-[#E5B84B] hover:bg-[#F0C75E] text-[#091510] shadow-lg active:scale-95 transition-all cursor-pointer"
              >
                <SkipForward className="w-4 h-4" />
                <span>Passer</span>
              </button>
            )}
          </div>
        </div>

        {/* Fanned / Overlapping Player Hand */}
        <div className="w-full overflow-x-auto no-scrollbar pt-4 pb-1 px-2">
          <div
            className="flex items-center justify-start sm:justify-center min-w-max pl-2 pr-6 mx-auto"
            id="player-hand-container"
          >
            {displayedHand.map((card, idx) => {
              const playable = isCardPlayable(card);
              const dimmed = !isMyTurn || !playable;
              const mid = (displayedHand.length - 1) / 2;
              const tilt = displayedHand.length <= 12 ? (idx - mid) * 1.4 : 0;

              return (
                <div
                  key={card.id}
                  style={{
                    zIndex: idx,
                    transform: `rotate(${tilt}deg)`,
                  }}
                  className={`
                    relative transition-all duration-200
                    ${idx === 0 ? '' : '-ml-2.5 sm:-ml-3.5 md:-ml-4'}
                    hover:z-40 hover:!rotate-0
                  `}
                >
                  <CardView
                    card={card}
                    size="md"
                    isPlayable={isMyTurn && playable}
                    isDimmed={dimmed}
                    onClick={() => handleCardClick(card)}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Status Bar */}
        <div className="flex items-center justify-between text-[11px] text-[#8FA696] px-2 pt-1 border-t border-white/5">
          <span>
            Main : <strong className="text-[#F5EFE4]">{myHand.length} carte{myHand.length > 1 ? 's' : ''}</strong>
          </span>
          <span>
            {isMyTurn ? (
              hasNoPlayableCards ? (
                <strong className="text-[#E5B84B]">Aucune carte jouable — Piochez au centre</strong>
              ) : (
                <span className="text-[#C7D4CB]">
                  <strong className="text-[#E5B84B]">{playableCardsCount}</strong> coup{playableCardsCount > 1 ? 's' : ''} possible{playableCardsCount > 1 ? 's' : ''}
                </span>
              )
            ) : (
              <span>Observez la table...</span>
            )}
          </span>
        </div>
      </footer>

      {/* 4. FLYING CARDS LAYER */}
      {flyingCards.map((anim) => {
        if (anim.type === 'draw') {
          return (
            <div
              key={anim.id}
              className="fixed z-50 pointer-events-none top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flying-draw-card"
              style={
                {
                  '--target-x': '90px',
                  '--target-y': '250px',
                } as React.CSSProperties
              }
            >
              <CardView showBack size="sm" />
            </div>
          );
        }

        if (anim.type === 'play' && anim.card) {
          return (
            <div
              key={anim.id}
              className="fixed z-50 pointer-events-none bottom-24 left-1/2 -translate-x-1/2 flying-play-card"
              style={
                {
                  '--fly-x': '0px',
                  '--fly-y': '-195px',
                } as React.CSSProperties
              }
            >
              <CardView card={anim.card} size="sm" isPlayable />
            </div>
          );
        }

        return null;
      })}

      {/* Wild Suit Picker Modal */}
      <ColorPickerModal
        isOpen={pendingCard !== null}
        onSelectColor={handleColorSelected}
        onCancel={() => setPendingCard(null)}
      />

      {/* Host Arbiter Penalty Modal */}
      <HostPenaltyModal
        targetPlayer={selectedPenaltyTarget}
        onApplyPenalty={(targetId, count) => onHostGivePenalty?.(targetId, count)}
        onClose={() => setSelectedPenaltyTarget(null)}
      />
    </div>
  );
};
