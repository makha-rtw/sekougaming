import React from 'react';
import { PenaltyStack, PlayerPublic } from '../../../shared/types.js';
import { Flame, Layers } from 'lucide-react';

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
    <div className="w-full max-w-lg mx-auto px-3.5 py-2.5 rounded-2xl bg-gradient-to-r from-[#2D0A0A] via-[#1C0808] to-[#2D0A0A] border-2 border-[#E03131] flame-banner flex items-center justify-between gap-3 shadow-2xl">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-xl bg-[#E03131] text-[#FAF3E6] flex items-center justify-center shrink-0 shadow-md">
          <Flame className="w-5 h-5 fill-current animate-pulse" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-['Bricolage_Grotesque',_sans-serif] font-extrabold text-[#FF8787] text-xs sm:text-sm uppercase tracking-wider">
              Surenchère en cours
            </span>
            <span className="bg-[#E5B84B] text-[#091510] font-['Bricolage_Grotesque',_sans-serif] font-extrabold px-2 py-0.5 rounded-lg text-xs sm:text-sm shadow">
              +{penaltyStack.totalCards} cartes
            </span>
          </div>
          <p className="text-[11px] sm:text-xs text-[#E6D7D7] truncate mt-0.5">
            {isTargeted ? (
              <span className="font-semibold text-[#FFE27A]">
                Surenchérissez ({penaltyStack.cardType === 'draw2' ? '+2 ou +4' : 'aucun contre'}) ou encaissez la pile !
              </span>
            ) : (
              <span>
                Sous pression : <strong className="text-white">{targetName}</strong>
              </span>
            )}
          </p>
        </div>
      </div>

      {isMyTurn && isTargeted && (
        <button
          type="button"
          onClick={onDrawPenalty}
          className="shrink-0 px-3.5 py-2 rounded-xl bg-[#E03131] hover:bg-[#C92020] text-[#FAF3E6] font-['Bricolage_Grotesque',_sans-serif] font-extrabold text-xs sm:text-sm border border-white/20 shadow-lg active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <Layers className="w-4 h-4" />
          <span>Encaisser +{penaltyStack.totalCards}</span>
        </button>
      )}
    </div>
  );
};
