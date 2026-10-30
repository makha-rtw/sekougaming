import React from 'react';
import { PenaltyStack, PlayerPublic } from '../../../shared/types.js';
import { Fire, Stack } from '@phosphor-icons/react';

interface PenaltyBannerProps {
  penaltyStack: PenaltyStack;
  players: PlayerPublic[];
  currentTurnPlayerId: string | null;
  myPlayerId: string;
  onDrawPenalty: () => void;
}

export const PenaltyBanner: React.FC<PenaltyBannerProps> = ({
  penaltyStack,
  players,
  currentTurnPlayerId,
  myPlayerId,
  onDrawPenalty,
}) => {
  const targetPlayer = players.find((p) => p.id === penaltyStack.targetPlayerId);
  const targetName = targetPlayer ? targetPlayer.name : 'Joueur';
  const isMyTurn = currentTurnPlayerId === myPlayerId;
  const isTargeted = penaltyStack.targetPlayerId === myPlayerId;

  return (
    <div className="w-full max-w-lg mx-auto px-3.5 py-2.5 rounded-[9px] bg-[#1B1114] border-2 border-[#D92D20] flame-banner flex items-center justify-between gap-3 shadow-xl">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-[6px] bg-[#D92D20] text-[#F6F0E2] flex items-center justify-center shrink-0">
          <Fire weight="fill" className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-sekouno-display font-black text-[#F6F0E2] text-xs sm:text-sm uppercase tracking-wider">
              Surenchère active
            </span>
            <span className="bg-[#D4A548] text-[#11131A] font-sekouno-mono font-bold px-2 py-0.5 rounded-[4px] text-xs">
              +{penaltyStack.totalCards} cartes
            </span>
          </div>
          <p className="text-[11px] sm:text-xs text-[#D9D0BE] truncate mt-0.5">
            {isTargeted ? (
              <span className="font-semibold text-[#D4A548]">
                {penaltyStack.cardType === 'draw2'
                  ? 'Posez un +2 ou un +4, sinon encaissez le cumul.'
                  : 'Aucun contre possible sur un +4 : encaissez le cumul.'}
              </span>
            ) : (
              <span>
                Cible actuelle : <strong className="text-[#F6F0E2]">{targetName}</strong>
              </span>
            )}
          </p>
        </div>
      </div>

      {isMyTurn && isTargeted && (
        <button
          type="button"
          onClick={onDrawPenalty}
          className="shrink-0 px-3 py-2 rounded-[6px] bg-[#D92D20] hover:bg-[#b82217] text-[#F6F0E2] font-sekouno-mono font-bold text-xs uppercase border border-[#F6F0E2]/30 active:scale-95 transition-[transform,background-color] flex items-center gap-1.5 cursor-pointer"
        >
          <Stack weight="bold" className="w-4 h-4" />
          <span>Encaisser +{penaltyStack.totalCards}</span>
        </button>
      )}
    </div>
  );
};
