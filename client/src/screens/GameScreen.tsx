import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { Card, ClientGameState, PlayableColor, PlayerPublic } from '../../../shared/types.js';
import { CardView, SuitPip } from '../components/CardView.js';
import { OpponentRing } from '../components/OpponentRing.js';
import { PenaltyBanner } from '../components/PenaltyBanner.js';
import { ColorPickerModal } from '../components/ColorPickerModal.js';
import { HostPenaltyModal } from '../components/HostPenaltyModal.js';
import {
  ArrowsClockwise,
  ArrowsCounterClockwise,
  FastForward,
  WarningCircle,
  SignOut,
  XCircle,
  ArrowDown,
  SpeakerHigh,
  SpeakerSlash,
  Fire,
  ArrowsDownUp,
} from '@phosphor-icons/react';
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

const SUIT_STATUS: Record<
  PlayableColor,
  { hex: string; borderHex: string; label: string; plaqueClass: string }
> = {
  red: {
    hex: '#D92D20',
    borderHex: 'rgba(217, 45, 32, 0.55)',
    label: 'Rouge',
    plaqueClass: 'bg-[#D92D20] text-[#FAF6EE] border-[#FAF6EE]/40',
  },
  blue: {
    hex: '#155EEF',
    borderHex: 'rgba(21, 94, 239, 0.55)',
    label: 'Bleu',
    plaqueClass: 'bg-[#155EEF] text-[#FAF6EE] border-[#FAF6EE]/40',
  },
  green: {
    hex: '#099250',
    borderHex: 'rgba(9, 146, 80, 0.55)',
    label: 'Vert',
    plaqueClass: 'bg-[#099250] text-[#FAF6EE] border-[#FAF6EE]/40',
  },
  yellow: {
    hex: '#DC9B06',
    borderHex: 'rgba(220, 155, 6, 0.65)',
    label: 'Jaune',
    plaqueClass: 'bg-[#DC9B06] text-[#11131A] border-[#11131A]/40',
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
  const reduceMotion = useReducedMotion();
  const { public: pub, myHand, myPlayerId, isMyTurn } = clientState;

  const [pendingCard, setPendingCard] = useState<Card | null>(null);
  const [selectedPenaltyTarget, setSelectedPenaltyTarget] = useState<PlayerPublic | null>(null);
  const [isMuted, setIsMuted] = useState(sounds.isSoundMuted());
  const [sortMode, setSortMode] = useState<'none' | 'color' | 'value'>('none');

  const [flyingCards, setFlyingCards] = useState<FlyingCardAnim[]>([]);
  const [discardHistory, setDiscardHistory] = useState<DiscardHistoryItem[]>(() =>
    pub.topDiscard ? [{ card: pub.topDiscard, angle: -2, offsetX: 0, offsetY: 0 }] : []
  );
  const [callout, setCallout] = useState<TableCallout | null>(null);

  const opponents = pub.players.filter((p) => p.id !== myPlayerId);
  const mePublic = pub.players.find((p) => p.id === myPlayerId);
  const currentTurnPlayer = pub.players.find((p) => p.id === pub.currentTurnPlayerId);
  const isHost = pub.hostId === myPlayerId;

  const triggerCallout = (title: string, subtitle?: string, accent = '#D4A548') => {
    const id = `c_${Date.now()}_${Math.random()}`;
    setCallout({ id, title, subtitle, accent });
    window.setTimeout(() => {
      setCallout((prev) => (prev?.id === id ? null : prev));
    }, 1450);
  };

  const prevTopDiscardIdRef = useRef<string | null>(pub.topDiscard?.id || null);
  const playedLocallyCardIdRef = useRef<string | null>(null);

  useEffect(() => {
    const top = pub.topDiscard;
    if (!top) return;

    if (top.id !== prevTopDiscardIdRef.current) {
      prevTopDiscardIdRef.current = top.id;

      const angle = ((top.id.charCodeAt(0) + top.id.charCodeAt(top.id.length - 1)) % 18) - 9;
      const offsetX = ((top.id.charCodeAt(1) || 3) % 7) - 3;
      const offsetY = ((top.id.charCodeAt(2) || 5) % 5) - 2;

      setDiscardHistory((prev) => {
        const filtered = prev.filter((item) => item.card.id !== top.id);
        return [...filtered.slice(-4), { card: top, angle, offsetX, offsetY }];
      });

      if (playedLocallyCardIdRef.current !== top.id) {
        sounds.playCard(top);
      }
      playedLocallyCardIdRef.current = null;

      if (top.value === 'skip') {
        triggerCallout('PASSE-TOUR', pub.lastActionMessage || undefined, '#D92D20');
      } else if (top.value === 'reverse') {
        triggerCallout(
          'SENS INVERSÉ',
          pub.direction === 1 ? 'Sens horaire' : 'Sens anti-horaire',
          '#155EEF'
        );
      } else if (top.value === 'draw2') {
        triggerCallout(
          '+2 CARTES',
          pub.penaltyStack ? `Cumul : +${pub.penaltyStack.totalCards}` : undefined,
          '#DC9B06'
        );
      } else if (top.value === 'wild4') {
        triggerCallout(
          '+4 JOKER',
          pub.penaltyStack ? `Cumul : +${pub.penaltyStack.totalCards}` : undefined,
          '#D92D20'
        );
      } else if (top.value === 'wild') {
        const suitName = pub.currentColor ? SUIT_STATUS[pub.currentColor].label : '';
        triggerCallout(
          'COULEUR IMPOSÉE',
          suitName ? `Nouvelle couleur : ${suitName}` : undefined,
          '#D4A548'
        );
      }
    }
  }, [pub.topDiscard, pub.currentColor, pub.direction, pub.penaltyStack, pub.lastActionMessage]);

  const prevUnoTimestampRef = useRef<number>(pub.unoNotice?.timestamp || 0);
  useEffect(() => {
    if (pub.unoNotice && pub.unoNotice.timestamp !== prevUnoTimestampRef.current) {
      prevUnoTimestampRef.current = pub.unoNotice.timestamp;
      sounds.uno();
      triggerCallout('SEKO !', `${pub.unoNotice.playerName} n'a plus qu'une carte.`, '#D4A548');
    }
  }, [pub.unoNotice]);

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
        window.setTimeout(() => {
          sounds.drawCard(i);
          if (!reduceMotion) {
            const animId = `draw_${Date.now()}_${i}`;
            setFlyingCards((prev) => [...prev, { id: animId, type: 'draw' }]);
            window.setTimeout(() => {
              setFlyingCards((prev) => prev.filter((f) => f.id !== animId));
            }, 430);
          }
        }, i * 145);
      }
    }

    prevHandLengthRef.current = currentLen;
  }, [myHand.length, reduceMotion]);

  const prevIsMyTurn = useRef(isMyTurn);
  useEffect(() => {
    if (isMyTurn && !prevIsMyTurn.current) {
      sounds.myTurn();
    }
    prevIsMyTurn.current = isMyTurn;
  }, [isMyTurn]);

  const isCardPlayable = (card: Card): boolean => {
    if (!isMyTurn) return false;

    if (myHand.length === 1 && card.color === 'black') {
      return false;
    }

    if (pub.penaltyStack) {
      if (pub.penaltyStack.cardType === 'draw2') {
        return card.value === 'draw2' || card.value === 'wild4';
      }
      if (pub.penaltyStack.cardType === 'wild4') {
        return false;
      }
    }

    if (card.color === 'black') return true;
    if (pub.currentColor && card.color === pub.currentColor) return true;
    if (pub.topDiscard && card.value === pub.topDiscard.value) return true;

    return false;
  };

  const playableCardsCount = myHand.filter(isCardPlayable).length;
  const hasNoPlayableCards = isMyTurn && playableCardsCount === 0;

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

  useEffect(() => {
    if (isMyTurn && pub.penaltyStack && pub.penaltyStack.targetPlayerId === myPlayerId) {
      const canCounter = myHand.some(isCardPlayable);
      if (!canCounter) {
        const timer = window.setTimeout(() => {
          onDrawCard();
        }, 900);
        return () => window.clearTimeout(timer);
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
    sounds.playCard(card);

    if (!reduceMotion) {
      const animId = `play_${Date.now()}`;
      setFlyingCards((prev) => [...prev, { id: animId, type: 'play', card }]);
      window.setTimeout(() => {
        setFlyingCards((prev) => prev.filter((f) => f.id !== animId));
      }, 360);
    }

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
    setIsMuted(sounds.toggleMute());
  };

  const cycleSortMode = () => {
    sounds.buttonClick();
    setSortMode((prev) => (prev === 'none' ? 'color' : prev === 'color' ? 'value' : 'none'));
  };

  const activeSuit = pub.currentColor ? SUIT_STATUS[pub.currentColor] : null;
  const showUnoButton =
    Boolean(onCallUno) &&
    (clientState.canCallUno || (myHand.length <= 2 && myHand.length >= 1 && !mePublic?.hasCalledUno));

  return (
    <div className="sekouno-salon-world h-[100dvh] max-h-[100dvh] overflow-hidden flex flex-col justify-between pt-safe pl-safe pr-safe select-none relative">
      {/* 1. TOP ARCHITECTURAL SALON RAIL + OPPONENTS */}
      <header className="relative z-20 flex-shrink-0 px-2.5 pt-1.5 pb-1">
        <div className="flex items-center justify-between py-1.5 px-3 mb-1.5 rounded-[9px] bg-[#141924] border border-[#F6F0E2]/15">
          <div className="flex items-center gap-2.5">
            <span className="font-sekouno-mono font-bold text-xs tracking-wider text-[#11131A] bg-[#D4A548] px-2 py-0.5 rounded-[4px]">
              #{pub.roomCode}
            </span>
            <span className="font-sekouno-display font-black text-xs uppercase tracking-wider text-[#F6F0E2] hidden sm:inline">
              CASA SEKOUNO
            </span>
          </div>

          {pub.lastActionMessage && (
            <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-[5px] bg-[#0D1017] border border-[#F6F0E2]/12 text-xs text-[#D9D0BE] max-w-md truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D4A548] shrink-0" />
              <span className="truncate">{pub.lastActionMessage}</span>
            </div>
          )}

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={toggleSound}
              aria-label={isMuted ? 'Activer le son' : 'Couper le son'}
              title={isMuted ? 'Activer le son' : 'Couper le son'}
              className="p-1.5 rounded-[5px] bg-[#0D1017] hover:bg-[#1B2230] border border-[#F6F0E2]/15 text-[#D9D0BE] transition-[background-color] cursor-pointer"
            >
              {isMuted ? (
                <SpeakerSlash weight="bold" className="w-4 h-4 text-[#D92D20]" />
              ) : (
                <SpeakerHigh weight="bold" className="w-4 h-4 text-[#D4A548]" />
              )}
            </button>

            {isHost ? (
              <button
                type="button"
                onClick={onCloseRoom || onLeaveRoom}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[5px] bg-[#241216] hover:bg-[#381A20] border border-[#D92D20]/60 font-sekouno-mono text-[11px] font-bold uppercase text-[#F98076] transition-[background-color] cursor-pointer"
                title="Fermer la table pour tous les joueurs"
              >
                <XCircle weight="bold" className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Fermer</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onLeaveRoom}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[5px] bg-[#0D1017] hover:bg-[#1B2230] border border-[#F6F0E2]/15 font-sekouno-mono text-[11px] font-bold uppercase text-[#D9D0BE] transition-[background-color] cursor-pointer"
                title="Quitter la table"
              >
                <SignOut weight="bold" className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Quitter</span>
              </button>
            )}
          </div>
        </div>

        <OpponentRing
          opponents={opponents}
          currentTurnPlayerId={pub.currentTurnPlayerId}
          isHost={isHost}
          onSelectPlayerForPenalty={(player) => setSelectedPenaltyTarget(player)}
          onCatchUno={onCatchUno}
        />
      </header>

      {/* 2. CENTER ARCHITECTURAL GAMING TABLE */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-3 min-h-0">
        <AnimatePresence>
          {error && (
            <motion.div
              initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              role="alert"
              className="absolute top-1 z-40 max-w-sm w-full px-3.5 py-2 bg-[#241216] border-2 border-[#D92D20] rounded-[8px] text-xs text-[#FAD1CE] flex items-center gap-2 shadow-xl"
            >
              <WarningCircle weight="fill" className="w-4 h-4 text-[#D92D20] shrink-0" />
              <span className="leading-snug">{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

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

        {pub.lastActionMessage && !pub.penaltyStack && (
          <div className="md:hidden mb-2 px-3 py-1 rounded-[5px] bg-[#141924] border border-[#F6F0E2]/15 text-[11px] text-[#D9D0BE] max-w-xs truncate">
            {pub.lastActionMessage}
          </div>
        )}

        {/* Center Architectural Table Mat */}
        <div
          className="relative px-6 py-5 sm:px-12 sm:py-8 rounded-[18px] bg-[#141924] flex items-center justify-center gap-5 sm:gap-11 shadow-[0_24px_60px_rgba(0,0,0,0.75)] transition-[border-color] duration-300"
          style={{
            border: `2px solid ${activeSuit ? activeSuit.borderHex : 'rgba(212, 165, 72, 0.45)'}`,
          }}
        >
          {/* Inner architectural brass frame with corner ticks */}
          <div className="pointer-events-none absolute inset-2 rounded-[12px] border border-[#D4A548]/20" />

          {/* DRAW PILE (Pioche) */}
          <div className="flex flex-col items-center relative z-10" id="draw-pile-anchor">
            <div className="relative">
              <div className="pointer-events-none absolute top-1.5 left-1.5 w-full h-full rounded-[11px] bg-[#C8BFA9] border border-black/35" />
              <div className="pointer-events-none absolute top-0.5 left-0.5 w-full h-full rounded-[11px] bg-[#E2D9C6] border border-black/25" />

              <CardView
                showBack
                size="md"
                onClick={isMyTurn && !clientState.canPassTurn ? handleManualDraw : undefined}
                className={`
                  relative
                  ${
                    isMyTurn && !clientState.canPassTurn
                      ? 'cursor-pointer hover:-translate-y-1.5 active:scale-95'
                      : 'brightness-90'
                  }
                  ${
                    hasNoPlayableCards
                      ? 'ring-2 ring-[#D4A548]'
                      : ''
                  }
                `}
              />

              <span className="absolute -bottom-2 -right-2 bg-[#0D1017] text-[#D4A548] border border-[#D4A548]/60 font-sekouno-mono text-[11px] font-bold px-2 py-0.5 rounded-[4px]">
                {pub.drawPileCount}
              </span>
            </div>

            {isMyTurn && !clientState.canPassTurn ? (
              <button
                type="button"
                onClick={handleManualDraw}
                className={`mt-3 px-3 py-1 rounded-[5px] font-sekouno-mono text-xs font-bold uppercase flex items-center gap-1 transition-[transform,background-color] active:scale-95 cursor-pointer ${
                  hasNoPlayableCards
                    ? 'bg-[#D4A548] text-[#11131A] animate-pulse-fast'
                    : 'bg-[#1B2230] hover:bg-[#252E40] text-[#F6F0E2] border border-[#F6F0E2]/20'
                }`}
              >
                <ArrowDown weight="bold" className="w-3.5 h-3.5" />
                <span>{hasNoPlayableCards ? 'Piocher' : 'Pioche'}</span>
              </button>
            ) : (
              <span className="mt-3 font-sekouno-mono text-[10px] uppercase tracking-wider text-[#D9D0BE]/65">
                Pioche
              </span>
            )}
          </div>

          {/* DIRECTION COMPASS */}
          <div className="flex flex-col items-center justify-center gap-1.5 relative z-10">
            <div
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-[8px] bg-[#0D1017] border border-[#D4A548]/40 flex items-center justify-center"
              title={pub.direction === 1 ? 'Sens horaire' : 'Sens anti-horaire'}
            >
              {pub.direction === 1 ? (
                <ArrowsClockwise weight="bold" className="w-5 h-5 sm:w-6 sm:h-6 text-[#D4A548] animate-spin-slow" />
              ) : (
                <ArrowsCounterClockwise weight="bold" className="w-5 h-5 sm:w-6 sm:h-6 text-[#155EEF] animate-spin-slow" />
              )}
            </div>
            <span className="font-sekouno-mono text-[10px] font-bold uppercase tracking-wider text-[#D9D0BE]/80">
              {pub.direction === 1 ? 'Horaire' : 'Anti-hor.'}
            </span>
          </div>

          {/* DISCARD PILE (Défausse) */}
          <div className="flex flex-col items-center relative z-10" id="discard-pile-anchor">
            <div className="relative w-[4.5rem] h-[6.6rem] sm:w-[5.2rem] sm:h-[7.6rem] md:w-[5.6rem] md:h-[8.2rem] flex items-center justify-center">
              {discardHistory.length > 0 ? (
                discardHistory.map((item, idx) => {
                  const isTop = idx === discardHistory.length - 1;
                  return (
                    <motion.div
                      key={`${item.card.id}_${idx}`}
                      initial={
                        isTop && !reduceMotion
                          ? { scale: 1.25, y: -22, rotate: item.angle - 6, opacity: 0.85 }
                          : false
                      }
                      animate={{
                        scale: isTop ? 1 : 0.96,
                        x: isTop ? 0 : item.offsetX,
                        y: isTop ? 0 : item.offsetY,
                        rotate: item.angle,
                        opacity: isTop ? 1 : 0.72,
                      }}
                      transition={{ type: 'spring', stiffness: 360, damping: 24 }}
                      className="absolute inset-0 flex items-center justify-center pointer-events-none"
                      style={{ zIndex: idx }}
                    >
                      <CardView card={item.card} size="md" />
                    </motion.div>
                  );
                })
              ) : (
                <div className="w-full h-full rounded-[11px] border-2 border-dashed border-[#F6F0E2]/20 flex items-center justify-center font-sekouno-mono text-xs text-[#D9D0BE]/50">
                  Vide
                </div>
              )}
            </div>

            {activeSuit && pub.currentColor ? (
              <div
                className={`mt-3 px-2.5 py-0.5 rounded-[4px] border font-sekouno-mono text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${activeSuit.plaqueClass}`}
              >
                <SuitPip color={pub.currentColor} className="w-2.5 h-2.5" />
                <span>{activeSuit.label}</span>
              </div>
            ) : (
              <span className="mt-3 font-sekouno-mono text-[10px] uppercase tracking-wider text-[#D9D0BE]/65">
                Défausse
              </span>
            )}
          </div>

          {/* KINETIC TABLE CALLOUT */}
          <AnimatePresence>
            {callout && (
              <motion.div
                key={callout.id}
                initial={reduceMotion ? { opacity: 1 } : { scale: 0.85, opacity: 0, y: 8 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="pointer-events-none absolute inset-x-4 top-1/2 -translate-y-1/2 z-30 flex flex-col items-center justify-center text-center"
              >
                <div
                  className="px-5 py-2.5 rounded-[8px] bg-[#0D1017]/95 border-2 shadow-2xl"
                  style={{ borderColor: callout.accent }}
                >
                  <div
                    className="font-sekouno-display font-black text-base sm:text-xl uppercase tracking-wider"
                    style={{ color: callout.accent }}
                  >
                    {callout.title}
                  </div>
                  {callout.subtitle && (
                    <div className="text-[11px] sm:text-xs font-medium text-[#F6F0E2] mt-0.5">
                      {callout.subtitle}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* 3. ARCHITECTURAL PLAYER HAND DOCK */}
      <footer className="relative z-20 flex-shrink-0 bg-[#141924] border-t-2 border-[#D4A548]/45 pt-2.5 pb-2 px-2.5 shadow-[0_-16px_40px_rgba(0,0,0,0.7)]">
        {/* Turn Bar + Action Controls */}
        <div className="flex items-center justify-between gap-2 mb-2.5 px-1">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                isMyTurn ? 'bg-[#D4A548]' : 'bg-[#F6F0E2]/25'
              }`}
            />
            <div className="flex items-center gap-1.5 truncate">
              <span
                className={`font-sekouno-display text-xs sm:text-sm font-black uppercase tracking-wider px-2.5 py-1 rounded-[5px] truncate ${
                  isMyTurn
                    ? 'bg-[#D4A548] text-[#11131A]'
                    : 'bg-[#0D1017] text-[#D9D0BE] border border-[#F6F0E2]/12'
                }`}
              >
                {isMyTurn ? 'À votre tour' : `Tour de ${currentTurnPlayer?.name || '...'}`}
              </span>

              {mePublic?.hasCalledUno && (
                <span className="px-2 py-0.5 rounded-[4px] bg-[#D92D20] text-[#FAF6EE] font-sekouno-mono font-bold text-[10px] uppercase tracking-wider">
                  SEKO annoncé
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {myHand.length > 2 && (
              <button
                type="button"
                onClick={cycleSortMode}
                className="px-2.5 py-1.5 rounded-[5px] bg-[#0D1017] hover:bg-[#1B2230] border border-[#F6F0E2]/15 font-sekouno-mono text-[11px] font-bold uppercase text-[#D9D0BE] flex items-center gap-1 transition-[background-color] cursor-pointer"
                title="Trier vos cartes par couleur ou par valeur"
              >
                <ArrowsDownUp weight="bold" className="w-3.5 h-3.5 text-[#D4A548]" />
                <span className="hidden xs:inline">
                  {sortMode === 'none' ? 'Trier' : sortMode === 'color' ? 'Couleur' : 'Valeur'}
                </span>
              </button>
            )}

            {showUnoButton && (
              <button
                type="button"
                onClick={handleManualUno}
                className="px-3 py-1.5 rounded-[6px] bg-[#D92D20] hover:bg-[#b82217] text-[#FAF6EE] border border-[#FAF6EE]/30 font-sekouno-display font-black text-xs uppercase tracking-wider active:scale-95 flex items-center gap-1.5 animate-pulse-fast cursor-pointer"
              >
                <Fire weight="fill" className="w-4 h-4" />
                <span>Crier SEKO</span>
              </button>
            )}

            {clientState.canPassTurn && onPassTurn && (
              <button
                type="button"
                onClick={() => {
                  sounds.buttonClick();
                  onPassTurn();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] font-sekouno-display font-black text-xs uppercase tracking-wider bg-[#D4A548] hover:bg-[#e0b458] text-[#11131A] active:scale-95 transition-[transform,background-color] cursor-pointer"
              >
                <FastForward weight="bold" className="w-4 h-4" />
                <span>Passer</span>
              </button>
            )}
          </div>
        </div>

        {/* Fanned Player Hand */}
        <div className="w-full overflow-x-auto no-scrollbar pt-4 pb-1 px-2">
          <div
            className="flex items-center justify-start sm:justify-center min-w-max pl-2 pr-6 mx-auto"
            id="player-hand-container"
          >
            {displayedHand.map((card, idx) => {
              const playable = isCardPlayable(card);
              const dimmed = !isMyTurn || !playable;
              const isNewlyDrawn = Boolean(
                clientState.canPassTurn && pub.drawnCardPlayableId === card.id
              );
              const mid = (displayedHand.length - 1) / 2;
              const tilt = displayedHand.length <= 12 ? (idx - mid) * 1.3 : 0;

              return (
                <div
                  key={card.id}
                  style={{
                    zIndex: idx,
                    transform: `rotate(${tilt}deg)`,
                  }}
                  className={`
                    relative transition-transform duration-200
                    ${idx === 0 ? '' : '-ml-2.5 sm:-ml-3.5 md:-ml-4'}
                    hover:z-40 hover:!rotate-0
                  `}
                >
                  <CardView
                    card={card}
                    size="md"
                    isPlayable={isMyTurn && playable}
                    isDimmed={dimmed}
                    isNewlyDrawn={isNewlyDrawn}
                    onClick={() => handleCardClick(card)}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Telemetry Line */}
        <div className="flex items-center justify-between font-sekouno-mono text-[11px] text-[#D9D0BE]/70 px-1.5 pt-1 border-t border-[#F6F0E2]/10">
          <span>
            MAIN :{' '}
            <strong className="text-[#F6F0E2]">
              {myHand.length} CARTE{myHand.length > 1 ? 'S' : ''}
            </strong>
          </span>
          <span>
            {isMyTurn ? (
              clientState.canPassTurn ? (
                <strong className="text-[#D4A548]">
                  Carte piochée jouable : posez ou passez
                </strong>
              ) : hasNoPlayableCards ? (
                <strong className="text-[#D4A548]">
                  Aucune carte jouable : piochez au centre
                </strong>
              ) : (
                <span className="text-[#D9D0BE]">
                  <strong className="text-[#D4A548]">{playableCardsCount}</strong> COUP
                  {playableCardsCount > 1 ? 'S' : ''} POSSIBLE
                  {playableCardsCount > 1 ? 'S' : ''}
                </span>
              )
            ) : (
              <span>Salon en cours...</span>
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
      {isHost && onHostGivePenalty && (
        <HostPenaltyModal
          targetPlayer={selectedPenaltyTarget}
          onApplyPenalty={(targetId, count) => onHostGivePenalty(targetId, count)}
          onClose={() => setSelectedPenaltyTarget(null)}
        />
      )}
    </div>
  );
};
