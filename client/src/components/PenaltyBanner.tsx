import React from 'react';
import { PenaltyStack, PlayerPublic } from '../../../shared/types.js';
import { Flame } from 'lucide-react';

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
  const targetPlayer = players.find(p => p.id === penaltyStack.targetPlayerId);
  const targetName = targetPlayer ? targetPlayer.name : 'Joueur';
  const isMyTurn = currentTurnPlayerId === myPlayerId;
  const isTargeted = penaltyStack.targetPlayerId === myPlayerId;

  return (
    <div className="w-full max-w-xl mx-auto my-2 p-3 bg-gradient-to-r from-red-950 via-slate-900 to-red-950 border-2 border-red-500 rounded-2xl flame-banner flex items-center justify-between shadow-2xl">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center text-white animate-bounce flex-shrink-0">
          <Flame className="w-6 h-6" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-black text-red-400 text-sm md:text-base uppercase tracking-wider">
              Pénalité cumulée :
            </span>
            <span className="bg-red-600 text-white font-black px-2 py-0.5 rounded-full text-sm md:text-base shadow">
              +{penaltyStack.totalCards}
            </span>
          </div>
          <p className="text-xs text-slate-300">
            {isTargeted ? (
              <span className="font-bold text-yellow-300">
                C'est à votre tour d'encaisser ou d'empiler !
              </span>
            ) : (
              <span>
                Cible : <strong className="text-white">{targetName}</strong>
              </span>
            )}
          </p>
        </div>
      </div>

      {isMyTurn && isTargeted && (
        <button
          type="button"
          onClick={onDrawPenalty}
          className="ml-2 px-3 py-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-black text-xs md:text-sm rounded-xl shadow-lg border border-red-400 transition-transform transform active:scale-95"
        >
          Piocher +{penaltyStack.totalCards}
        </button>
      )}
    </div>
  );
};
