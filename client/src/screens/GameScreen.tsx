import React, { useState, useEffect, useRef } from 'react';
import { Card, ClientGameState, PlayableColor, PlayerPublic } from '../../../shared/types.js';
import { CardView } from '../components/CardView.js';
import { OpponentRing } from '../components/OpponentRing.js';
import { PenaltyBanner } from '../components/PenaltyBanner.js';
import { ColorPickerModal } from '../components/ColorPickerModal.js';
import { HostPenaltyModal } from '../components/HostPenaltyModal.js';
import { RotateCw, RotateCcw, SkipForward, ShieldAlert, LogOut, XCircle, ArrowDown, Volume2, VolumeX } from 'lucide-react';
import { sounds } from '../utils/sound.js';

interface FlyingCardAnim {
  id: string;
  type: 'draw' | 'play';
  card?: Card;
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

  // Flying cards animation queue
  const [flyingCards, setFlyingCards] = useState<FlyingCardAnim[]>([]);

  const opponents = pub.players.filter(p => p.id !== myPlayerId);
  const currentTurnPlayer = pub.players.find(p => p.id === pub.currentTurnPlayerId);
  const isHost = pub.hostId === myPlayerId;

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
      // Animate each drawn card sequentially with sound
      for (let i = 0; i < drawnCount; i++) {
        setTimeout(() => {
          sounds.drawCard();
          const animId = `draw_${Date.now()}_${i}`;
          setFlyingCards(prev => [...prev, { id: animId, type: 'draw' }]);
          setTimeout(() => {
            setFlyingCards(prev => prev.filter(f => f.id !== animId));
          }, 450);
        }, i * 160);
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
      setPendingCard(card);
    } else {
      triggerPlayCard(card);
    }
  };

  const triggerPlayCard = (card: Card, chosenColor?: PlayableColor) => {
    // Trigger flying card animation from hand to discard pile
    const animId = `play_${Date.now()}`;
    setFlyingCards(prev => [...prev, { id: animId, type: 'play', card }]);
    sounds.playCard();

    setTimeout(() => {
      setFlyingCards(prev => prev.filter(f => f.id !== animId));
    }, 380);

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
    sounds.uno();
    onCallUno();
  };

  const toggleSound = () => {
    const muted = sounds.toggleMute();
    setIsMuted(muted);
  };

  const getColorName = (c: PlayableColor | null) => {
    switch (c) {
      case 'red': return 'Rouge';
      case 'blue': return 'Bleu';
      case 'green': return 'Vert';
      case 'yellow': return 'Jaune';
      default: return '';
    }
  };

  const getColorBg = (c: PlayableColor | null) => {
    switch (c) {
      case 'red': return 'bg-red-500 shadow-red-500/50';
      case 'blue': return 'bg-blue-500 shadow-blue-500/50';
      case 'green': return 'bg-emerald-500 shadow-emerald-500/50';
      case 'yellow': return 'bg-amber-400 shadow-amber-400/50 text-slate-900';
      default: return 'bg-slate-700';
    }
  };

  // Gentle overlap ensuring the center oval and number of every card is NEVER masked
  const getOverlapMarginClass = (index: number) => {
    if (index === 0) return '';
    return '-ml-2 sm:-ml-3 md:-ml-4';
  };

  return (
    <div className="h-[100dvh] max-h-[100dvh] overflow-hidden flex flex-col justify-between pt-safe pl-safe pr-safe select-none relative">
      {/* 1. TOP HEADER: Room status bar + Opponents */}
      <header className="flex-shrink-0 px-2 pt-2 pb-1">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between py-1 mb-1 border-b border-slate-800/80 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-mono font-black text-amber-400 bg-slate-900/90 px-2.5 py-0.5 rounded-lg border border-slate-700/80 shadow">
              {pub.roomCode}
            </span>
            <span className="text-slate-400 text-[11px] hidden sm:inline font-bold">
              SEKOUNO
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Sound toggle button */}
            <button
              type="button"
              onClick={toggleSound}
              className="p-1.5 rounded-lg bg-slate-900/80 border border-slate-700 text-slate-400 hover:text-white transition-colors"
              title={isMuted ? 'Activer le son' : 'Couper le son'}
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5 text-red-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
            </button>

            {isHost ? (
              <button
                type="button"
                onClick={onCloseRoom || onLeaveRoom}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-950/80 border border-red-500/40 text-[11px] font-bold text-red-300 hover:bg-red-900 transition-colors shadow"
                title="Fermer le salon pour tout le monde"
              >
                <XCircle className="w-3.5 h-3.5 text-red-400" />
                <span>Fermer salon</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onLeaveRoom}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900/80 border border-slate-700 text-[11px] text-slate-300 hover:text-red-300 transition-colors shadow"
                title="Quitter la partie"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Quitter</span>
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
        />
      </header>

      {/* 2. MIDDLE: Felt Gaming Table (Draw Pile, Discard Pile, Beacon) */}
      <main className="flex-1 flex flex-col items-center justify-center relative my-auto px-2 min-h-0">
        {/* Error notification banner */}
        {error && (
          <div className="absolute top-1 z-40 max-w-sm w-full px-3 py-1.5 bg-red-950/95 border border-red-500 rounded-xl text-xs text-red-200 flex items-center gap-2 shadow-2xl animate-shake">
            <ShieldAlert className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span className="text-[11px] leading-tight">{error}</span>
          </div>
        )}

        {/* Penalty Banner if active */}
        {pub.penaltyStack && (
          <div className="w-full px-2 z-20 mb-1">
            <PenaltyBanner
              penaltyStack={pub.penaltyStack}
              players={pub.players}
              currentTurnPlayerId={pub.currentTurnPlayerId}
              myPlayerId={myPlayerId}
              onDrawPenalty={handleManualDraw}
            />
          </div>
        )}

        {/* Action log message ticker */}
        {pub.lastActionMessage && (
          <div className="mb-1.5 px-3 py-0.5 bg-slate-900/90 border border-slate-700/70 rounded-full text-[10px] sm:text-xs text-slate-300 font-medium shadow-md max-w-sm text-center truncate">
            {pub.lastActionMessage}
          </div>
        )}

        {/* Central Gaming Table Felt Mat */}
        <div className="relative p-4 sm:p-6 rounded-3xl bg-slate-950/70 border-2 border-slate-800/80 shadow-2xl flex items-center justify-center gap-5 sm:gap-9 backdrop-blur-sm">
          {/* Subtle table felt glow */}
          <div className="absolute inset-0 rounded-3xl bg-radial from-slate-800/20 via-transparent to-transparent pointer-events-none" />

          {/* Draw Pile (Pioche) */}
          <div className="flex flex-col items-center relative z-10" id="draw-pile-anchor">
            <div className="relative">
              <CardView
                showBack
                size="md"
                onClick={isMyTurn && !clientState.canPassTurn ? handleManualDraw : undefined}
                className={`
                  transition-all duration-200
                  ${isMyTurn && !clientState.canPassTurn ? 'cursor-pointer hover:scale-105 active:scale-95' : 'brightness-90'}
                  ${hasNoPlayableCards ? 'ring-4 ring-amber-400 ring-offset-2 ring-offset-slate-950 animate-pulse-fast shadow-2xl shadow-amber-500/50 scale-105' : 'ring-2 ring-blue-500/50'}
                `}
              />
              <span className="absolute -bottom-2 -right-2 bg-slate-900 text-amber-400 border border-slate-700 text-[10px] font-black px-1.5 py-0.5 rounded-full shadow">
                {pub.drawPileCount}
              </span>
            </div>

            {/* Subrillance Pioche if no playable card */}
            {isMyTurn && !clientState.canPassTurn && (
              <button
                type="button"
                onClick={handleManualDraw}
                className={`
                  mt-2 px-3 py-1 rounded-xl text-xs font-black transition-all transform active:scale-95 shadow-md flex items-center gap-1
                  ${hasNoPlayableCards
                    ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 ring-2 ring-amber-300 animate-pulse-fast shadow-lg shadow-amber-500/30'
                    : 'bg-blue-950/70 border border-blue-500/40 text-blue-300 hover:bg-blue-900'}
                `}
              >
                <ArrowDown className="w-3.5 h-3.5 animate-bounce" />
                <span>{hasNoPlayableCards ? 'Piocher !' : 'Piocher'}</span>
              </button>
            )}
          </div>

          {/* Direction Indicator */}
          <div className="flex flex-col items-center justify-center text-slate-500 relative z-10">
            {pub.direction === 1 ? (
              <RotateCw className="w-6 h-6 sm:w-7 sm:h-7 text-amber-400 animate-spin-slow" />
            ) : (
              <RotateCcw className="w-6 h-6 sm:w-7 sm:h-7 text-blue-400 animate-spin-slow" />
            )}
            <span className="text-[9px] uppercase font-bold tracking-widest mt-1 text-slate-400">
              {pub.direction === 1 ? 'Horaire' : 'Anti-h.'}
            </span>
          </div>

          {/* Discard Pile (Défausse) */}
          <div className="flex flex-col items-center relative z-10" id="discard-pile-anchor">
            <div className="relative">
              {pub.topDiscard ? (
                <div className="transition-transform duration-300">
                  <CardView
                    card={pub.topDiscard}
                    size="md"
                    className="rotate-1 pointer-events-none"
                  />
                </div>
              ) : (
                <div className="w-16 h-24 sm:w-20 sm:h-30 md:w-22 md:h-34 rounded-xl border-2 border-dashed border-slate-700 flex items-center justify-center text-xs text-slate-500">
                  Vide
                </div>
              )}
            </div>

            {/* Active Color Pill */}
            <div className="mt-2 flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-900/95 border border-slate-700 shadow">
              <span className="text-[10px] text-slate-400 font-semibold">Couleur :</span>
              <div className={`w-3 h-3 rounded-full ${getColorBg(pub.currentColor)} shadow-sm`} />
              <span className="text-[10px] font-bold text-white">{getColorName(pub.currentColor)}</span>
            </div>
          </div>
        </div>
      </main>

      {/* 3. BOTTOM SECTION: Active Turn Banner, Hand & Controls */}
      <footer className="flex-shrink-0 bg-slate-950/95 border-t border-slate-800/90 rounded-t-2xl sm:rounded-t-3xl pt-2 pb-1.5 px-2 shadow-2xl relative">
        {/* Prominent Current Player Turn Banner visible to ALL players with increased separation */}
        <div className="flex items-center justify-between mb-3.5 sm:mb-4 px-2">
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${isMyTurn ? 'bg-amber-400 animate-ping' : 'bg-slate-500'}`} />
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] sm:text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
                Tour :
              </span>
              <span
                className={`text-xs sm:text-sm font-black uppercase tracking-wider px-2.5 py-0.5 rounded-lg ${
                  isMyTurn
                    ? 'bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 shadow-md shadow-amber-500/30 animate-pulse-fast'
                    : 'text-amber-300 bg-slate-900 border border-slate-800'
                }`}
              >
                {isMyTurn ? '⭐ C’EST VOTRE TOUR !' : currentTurnPlayer?.name || 'En attente...'}
              </span>
            </div>
          </div>

          {/* Bouton Passer le tour : Uniquement présent lorsqu'un joueur a pioché une carte jouable */}
          {clientState.canPassTurn && onPassTurn && (
            <button
              type="button"
              onClick={onPassTurn}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-black text-xs sm:text-sm uppercase tracking-wider bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 hover:brightness-110 ring-2 ring-amber-300 shadow-lg shadow-amber-500/30 animate-pulse-fast active:scale-95 transition-all cursor-pointer"
            >
              <SkipForward className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-950" />
              <span>Passer le tour</span>
            </button>
          )}
        </div>

        {/* Hand Cards: Inter-superposées (Overlapping fan) with center numbers ALWAYS visible - Increased top separation */}
        <div className="w-full overflow-x-auto no-scrollbar pt-2.5 sm:pt-3.5 pb-0.5 px-1">
          <div className="flex items-center justify-start min-w-max pl-1 pr-6" id="player-hand-container">
            {myHand.map((card, idx) => {
              const playable = isCardPlayable(card);
              // Decreases ONLY luminosity (brightness-[0.62]) if card cannot be played or it's not my turn
              const dimmed = !isMyTurn || !playable;

              return (
                <div
                  key={card.id}
                  style={{ zIndex: idx }}
                  className={`
                    relative transition-all duration-200 transform
                    ${getOverlapMarginClass(idx)}
                    hover:z-30 hover:-translate-y-5
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

        {/* Bottom Helper Info */}
        <div className="flex items-center justify-between text-[10px] text-slate-400 px-2 pt-0.5 border-t border-slate-900">
          <span>
            Votre main : <strong className="text-white">{myHand.length} cartes</strong>
          </span>
          <span>
            {isMyTurn ? (
              hasNoPlayableCards ? (
                <strong className="text-amber-400 font-bold">Aucune carte jouable — Piochez !</strong>
              ) : (
                <span className="text-slate-300 font-medium">{playableCardsCount} jouable{playableCardsCount > 1 ? 's' : ''}</span>
              )
            ) : (
              <span className="text-slate-500">En attente de votre tour...</span>
            )}
          </span>
        </div>
      </footer>

      {/* 4. VISIBLE FLYING CARDS ANIMATION LAYER */}
      {flyingCards.map(anim => {
        if (anim.type === 'draw') {
          return (
            <div
              key={anim.id}
              className="fixed z-50 pointer-events-none top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flying-draw-card"
              style={{
                '--target-x': '130px',
                '--target-y': '260px',
              } as React.CSSProperties}
            >
              <CardView showBack size="sm" />
            </div>
          );
        }

        if (anim.type === 'play' && anim.card) {
          return (
            <div
              key={anim.id}
              className="fixed z-50 pointer-events-none bottom-20 left-1/2 -translate-x-1/2 flying-play-card"
              style={{
                '--fly-x': '0px',
                '--fly-y': '-190px',
              } as React.CSSProperties}
            >
              <CardView card={anim.card} size="sm" isPlayable />
            </div>
          );
        }

        return null;
      })}

      {/* Color Picker Modal for Wild & +4 */}
      <ColorPickerModal
        isOpen={pendingCard !== null}
        onSelectColor={handleColorSelected}
        onCancel={() => setPendingCard(null)}
      />

      {/* Host Penalty Modal */}
      <HostPenaltyModal
        targetPlayer={selectedPenaltyTarget}
        onApplyPenalty={(targetId, count) => onHostGivePenalty?.(targetId, count)}
        onClose={() => setSelectedPenaltyTarget(null)}
      />
    </div>
  );
};
