import React, { useEffect } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { GameStatePublic } from '../../../shared/types.js';
import confetti from 'canvas-confetti';
import {
  Trophy,
  ArrowCounterClockwise,
  House,
  SignOut,
  CrownSimple,
} from '@phosphor-icons/react';
import { sounds } from '../utils/sound.js';

interface GameOverScreenProps {
  publicState: GameStatePublic;
  myPlayerId: string;
  onRestartGame: () => void;
  onReturnToLobby: () => void;
  onLeaveRoom?: () => void;
  isLoading: boolean;
}

export const GameOverScreen: React.FC<GameOverScreenProps> = ({
  publicState,
  myPlayerId,
  onRestartGame,
  onReturnToLobby,
  onLeaveRoom,
  isLoading,
}) => {
  const reduceMotion = useReducedMotion();
  const winner = publicState.winner;
  const isWinner = winner?.id === myPlayerId;
  const isHost = publicState.hostId === myPlayerId;

  useEffect(() => {
    sounds.victory();
    if (!reduceMotion) {
      confetti({
        particleCount: 100,
        spread: 75,
        origin: { y: 0.58 },
        colors: ['#D4A548', '#D92D20', '#155EEF', '#099250'],
      });
    }
  }, [reduceMotion]);

  return (
    <div className="sekouno-salon-world min-h-[100dvh] w-full flex flex-col items-center justify-center p-4 pt-safe pb-safe select-none">
      <motion.div
        initial={reduceMotion ? false : { scale: 0.94, opacity: 0, y: 14 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="bg-[#141924] border-2 border-[#D4A548] rounded-[12px] overflow-hidden shadow-[0_24px_60px_rgba(0,0,0,0.85)] w-full max-w-md text-center"
      >
        {/* Top Raw-Ivory Winner Crest */}
        <div className="bg-[#F6F0E2] text-[#11131A] px-6 py-5 border-b border-[#D4A548]">
          <div className="w-14 h-14 rounded-[10px] bg-[#11131A] text-[#D4A548] flex items-center justify-center mx-auto mb-3 border border-[#D4A548]">
            <Trophy weight="fill" className="w-8 h-8" />
          </div>

          <span className="inline-flex items-center gap-1.5 font-sekouno-mono text-[10px] font-bold uppercase tracking-widest text-[#6E6656] mb-1">
            <CrownSimple weight="fill" className="w-3.5 h-3.5 text-[#D92D20]" />
            <span>Acte de victoire • Table #{publicState.roomCode}</span>
          </span>

          <h2 className="font-sekouno-display font-black text-2xl sm:text-3xl uppercase tracking-tight leading-tight text-[#11131A]">
            {isWinner ? 'Victoire magistrale' : `${winner?.name || 'Un joueur'} remporte la table`}
          </h2>
        </div>

        <div className="p-6">
          <p className="text-xs text-[#D9D0BE] mb-5 leading-relaxed">
            {isWinner
              ? 'Vous avez vidé votre main dans le strict respect des règles du salon.'
              : `${winner?.name || 'Le vainqueur'} a posé sa dernière carte de couleur sur le tapis.`}
          </p>

          {/* Final Remaining Cards Ledger */}
          <div className="bg-[#0D1017] rounded-[8px] p-4 border border-[#F6F0E2]/12 mb-5 text-left">
            <span className="font-sekouno-mono text-[10px] font-bold uppercase tracking-widest text-[#D9D0BE]/70 block mb-2.5">
              Décompte final des mains
            </span>
            <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1 no-scrollbar">
              {publicState.players
                .slice()
                .sort((a, b) => a.cardCount - b.cardCount)
                .map((p, idx) => (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between text-xs py-2 px-3 rounded-[6px] border ${
                      idx === 0
                        ? 'bg-[#1B2230] border-[#D4A548]/60 text-[#D4A548]'
                        : 'bg-[#141924] border-[#F6F0E2]/8 text-[#F6F0E2]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="font-sekouno-mono font-bold text-[#D4A548]">
                        #{idx + 1}
                      </span>
                      <span className="font-bold truncate">
                        {p.name}{' '}
                        {p.id === myPlayerId && (
                          <span className="font-sekouno-mono text-[10px] text-[#D9D0BE]">
                            [VOUS]
                          </span>
                        )}
                      </span>
                    </div>
                    <span className="font-sekouno-mono font-bold text-xs shrink-0">
                      {p.cardCount === 0
                        ? 'VAINQUEUR'
                        : `${p.cardCount} carte${p.cardCount > 1 ? 's' : ''}`}
                    </span>
                  </div>
                ))}
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2">
            {isHost ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    sounds.playCard();
                    onRestartGame();
                  }}
                  disabled={isLoading}
                  className="w-full py-3.5 px-5 rounded-[8px] font-sekouno-display font-black text-xs sm:text-sm uppercase tracking-wider bg-[#D4A548] hover:bg-[#e0b458] text-[#11131A] flex items-center justify-center gap-2 transition-[transform,background-color] active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                >
                  <ArrowCounterClockwise weight="bold" className="w-4 h-4" />
                  <span>Relancer une manche</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    sounds.buttonClick();
                    onReturnToLobby();
                  }}
                  disabled={isLoading}
                  className="w-full py-3 px-5 rounded-[8px] font-sekouno-mono font-bold text-xs uppercase text-[#F6F0E2] bg-[#0D1017] hover:bg-[#1B2230] border border-[#F6F0E2]/15 flex items-center justify-center gap-2 transition-[background-color] disabled:opacity-50 cursor-pointer"
                >
                  <House weight="bold" className="w-4 h-4 text-[#D4A548]" />
                  <span>Retour au foyer</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    sounds.buttonClick();
                    onReturnToLobby();
                  }}
                  disabled={isLoading}
                  className="w-full py-3.5 px-5 rounded-[8px] font-sekouno-display font-black text-xs sm:text-sm uppercase tracking-wider text-[#11131A] bg-[#D4A548] hover:bg-[#e0b458] flex items-center justify-center gap-2 transition-[background-color] cursor-pointer"
                >
                  <House weight="bold" className="w-4 h-4" />
                  <span>Retour au foyer</span>
                </button>

                {onLeaveRoom && (
                  <button
                    type="button"
                    onClick={onLeaveRoom}
                    className="w-full py-2.5 px-4 rounded-[8px] font-sekouno-mono text-xs font-bold uppercase text-[#D9D0BE] hover:text-[#F98076] flex items-center justify-center gap-1.5 transition-[color] cursor-pointer"
                  >
                    <SignOut weight="bold" className="w-3.5 h-3.5" />
                    <span>Quitter la table</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
