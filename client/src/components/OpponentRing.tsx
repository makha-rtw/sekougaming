import React from 'react';
import { PlayerPublic } from '../../../shared/types.js';
import { Crown, AlertCircle } from 'lucide-react';

export const PLAYER_AVATAR_GRADIENTS = [
  'from-blue-600 to-indigo-700',
  'from-emerald-500 to-teal-700',
  'from-amber-500 to-orange-700',
  'from-rose-500 to-red-700',
  'from-purple-600 to-violet-800',
  'from-cyan-500 to-blue-700',
  'from-fuchsia-500 to-pink-700',
  'from-lime-500 to-green-700',
  'from-yellow-500 to-amber-700',
  'from-pink-500 to-rose-700',
  'from-indigo-500 to-purple-700',
  'from-teal-500 to-emerald-700',
  'from-orange-500 to-red-700',
  'from-violet-500 to-purple-700',
  'from-sky-500 to-indigo-700',
];

export function getPlayerColor(index: number): string {
  return PLAYER_AVATAR_GRADIENTS[index % PLAYER_AVATAR_GRADIENTS.length];
}

interface OpponentRingProps {
  opponents: PlayerPublic[];
  currentTurnPlayerId: string | null;
  isHost: boolean;
  onSelectPlayerForPenalty?: (player: PlayerPublic) => void;
}

export const OpponentRing: React.FC<OpponentRingProps> = ({
  opponents,
  currentTurnPlayerId,
  isHost,
  onSelectPlayerForPenalty,
}) => {
  return (
    <div className="w-full flex items-center justify-center gap-1.5 md:gap-2.5 overflow-x-auto no-scrollbar py-2 px-1">
      {opponents.map((player, idx) => {
        const isCurrentTurn = currentTurnPlayerId === player.id;
        const canCatch = player.cardCount === 1 && !player.hasCalledUno;
        const colorGrad = getPlayerColor(idx);

        return (
          <div
            key={player.id}
            onClick={() => isHost && onSelectPlayerForPenalty?.(player)}
            className={`
              relative flex-shrink-0 flex items-center gap-2 px-2.5 py-1.5 md:px-3 md:py-2 rounded-2xl
              border transition-all duration-300 select-none
              ${isHost ? 'cursor-pointer hover:border-amber-400 hover:scale-105' : ''}
              ${isCurrentTurn
                ? 'opacity-100 border-amber-400 ring-2 ring-amber-400/80 shadow-lg shadow-amber-500/25 bg-slate-900 scale-105 z-10'
                : 'opacity-55 hover:opacity-100 bg-slate-950/80 border-slate-800'}
            `}
            title={isHost ? `Cliquer pour infliger une pénalité à ${player.name}` : undefined}
          >
            {/* Status indicator dot */}
            <span
              className={`w-2 h-2 rounded-full ${player.isConnected ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' : 'bg-slate-600'}`}
              title={player.isConnected ? 'Connecté' : 'Déconnecté'}
            />

            {/* Avatar with distinctive color */}
            <div className={`w-7 h-7 md:w-8 md:h-8 rounded-full bg-gradient-to-tr ${colorGrad} flex items-center justify-center font-bold text-[11px] md:text-xs text-white shadow-md`}>
              {player.name.slice(0, 2).toUpperCase()}
            </div>

            {/* Player Info */}
            <div className="flex flex-col text-left">
              <div className="flex items-center space-x-1">
                <span className={`font-bold text-xs md:text-sm max-w-[85px] md:max-w-[110px] truncate ${isCurrentTurn ? 'text-amber-300 font-black' : 'text-slate-200'}`}>
                  {player.name}
                </span>
                {player.isHost && (
                  <Crown className="w-3 h-3 text-amber-400 flex-shrink-0" />
                )}
              </div>
              <div className="flex items-center space-x-1.5 text-[10px] md:text-[11px] text-slate-400">
                <span>🎴 {player.cardCount}</span>
                {player.hasCalledUno && (
                  <span className="bg-red-500 text-white font-black text-[9px] px-1 rounded animate-pulse">
                    UNO
                  </span>
                )}
                {canCatch && (
                  <span className="bg-amber-500 text-slate-950 font-black text-[9px] px-1 rounded animate-pulse" title="Oubli de UNO !">
                    !
                  </span>
                )}
              </div>
            </div>

            {/* Host Penalty Badge / Button */}
            {isHost && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectPlayerForPenalty?.(player);
                }}
                className="ml-1 px-1.5 py-0.5 bg-red-600 hover:bg-red-500 text-white font-black text-[10px] rounded-lg shadow border border-red-400 flex items-center gap-0.5"
                title="Donner une pénalité (+2)"
              >
                <AlertCircle className="w-3 h-3" />
                <span>+2</span>
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};
