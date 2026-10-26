import React from 'react';
import { PlayerPublic } from '../../../shared/types.js';
import { Crown, Gavel, Zap } from 'lucide-react';
import { sounds } from '../utils/sound.js';

export const PLAYER_AVATAR_GRADIENTS = [
  'from-[#D92B2B] to-[#8A1111]',
  'from-[#246BFD] to-[#0D2D7A]',
  'from-[#16A35A] to-[#074F29]',
  'from-[#E5B84B] to-[#9E6B06]',
  'from-[#9C36B5] to-[#521661]',
  'from-[#0CA678] to-[#06523B]',
  'from-[#E8590C] to-[#8C3105]',
  'from-[#3B5BDB] to-[#1B2B6B]',
  'from-[#C2255C] to-[#6B1130]',
  'from-[#2B8A3E] to-[#13421D]',
  'from-[#D9480F] to-[#7A2506]',
  'from-[#1098AD] to-[#074A54]',
  'from-[#7048E8] to-[#361E7A]',
  'from-[#F08C00] to-[#8A4E00]',
  'from-[#5C7CFA] to-[#26388A]',
];

export function getPlayerColor(index: number): string {
  return PLAYER_AVATAR_GRADIENTS[index % PLAYER_AVATAR_GRADIENTS.length];
}

interface OpponentRingProps {
  opponents: PlayerPublic[];
  currentTurnPlayerId: string | null;
  isHost: boolean;
  onSelectPlayerForPenalty?: (player: PlayerPublic) => void;
  onCatchUno?: (targetPlayerId: string) => void;
}

export const OpponentRing: React.FC<OpponentRingProps> = ({
  opponents,
  currentTurnPlayerId,
  isHost,
  onSelectPlayerForPenalty,
  onCatchUno,
}) => {
  if (opponents.length === 0) return null;

  return (
    <div className="w-full flex items-center justify-center gap-2 sm:gap-2.5 overflow-x-auto no-scrollbar py-1.5 px-2">
      {opponents.map((player, idx) => {
        const isCurrentTurn = currentTurnPlayerId === player.id;
        const canCatch = player.cardCount === 1 && !player.hasCalledUno;
        const colorGrad = getPlayerColor(idx);
        const visibleMiniCards = Math.min(player.cardCount, 5);

        return (
          <div
            key={player.id}
            onClick={() => {
              if (isHost && onSelectPlayerForPenalty) {
                sounds.buttonClick();
                onSelectPlayerForPenalty(player);
              }
            }}
            className={`
              relative flex-shrink-0 flex items-center gap-2.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-2xl
              border transition-all duration-300 select-none
              ${isHost ? 'cursor-pointer hover:border-[#E5B84B]/60' : ''}
              ${
                isCurrentTurn
                  ? 'bg-[#12291E] border-[#E5B84B] ring-2 ring-[#E5B84B]/50 shadow-[0_8px_24px_-6px_rgba(229,184,75,0.4)] scale-[1.03] z-10'
                  : 'bg-[#091510]/85 border-white/10 opacity-80 hover:opacity-100'
              }
            `}
            title={isHost ? `Arbitrage : infliger une pénalité à ${player.name}` : undefined}
          >
            {/* Active turn spotlight dot */}
            {isCurrentTurn && (
              <span className="absolute -top-1 -left-1 w-3 h-3 rounded-full bg-[#E5B84B] shadow-[0_0_10px_#E5B84B] animate-ping pointer-events-none" />
            )}

            {/* Avatar with connection dot */}
            <div className="relative">
              <div
                className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br ${colorGrad} flex items-center justify-center font-['Bricolage_Grotesque',_sans-serif] font-extrabold text-xs sm:text-sm text-[#FAF3E6] shadow-md border border-white/20`}
              >
                {player.name.slice(0, 2).toUpperCase()}
              </div>
              <span
                className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#091510] ${
                  player.isConnected ? 'bg-[#16A35A]' : 'bg-zinc-500'
                }`}
                title={player.isConnected ? 'En ligne' : 'Hors ligne'}
              />
            </div>

            {/* Name & Card Stack Count */}
            <div className="flex flex-col text-left min-w-0">
              <div className="flex items-center gap-1">
                <span
                  className={`font-bold text-xs sm:text-sm max-w-[78px] sm:max-w-[105px] truncate ${
                    isCurrentTurn ? 'text-[#FFE27A]' : 'text-[#F5EFE4]'
                  }`}
                >
                  {player.name}
                </span>
                {player.isHost && (
                  <Crown className="w-3 h-3 text-[#E5B84B] shrink-0" />
                )}
              </div>

              <div className="flex items-center gap-1.5 mt-0.5">
                {/* Mini visual card fan */}
                <div className="flex items-center -space-x-1.5">
                  {Array.from({ length: visibleMiniCards }).map((_, cIdx) => (
                    <span
                      key={cIdx}
                      className="inline-block w-2.5 h-3.5 rounded-[2px] bg-gradient-to-b from-[#C92020] to-[#6E0D0D] border border-[#F5EFE4]/70 shadow-2xs"
                    />
                  ))}
                </div>

                <span
                  className={`font-['Bricolage_Grotesque',_sans-serif] font-extrabold text-xs ${
                    player.cardCount === 1 ? 'text-[#FF6B6B]' : 'text-[#B5C4B9]'
                  }`}
                >
                  {player.cardCount}
                </span>

                {player.hasCalledUno && (
                  <span className="bg-gradient-to-r from-[#E03131] to-[#E8590C] text-[#FAF3E6] font-['Bricolage_Grotesque',_sans-serif] font-extrabold text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-md shadow-xs animate-pulse">
                    SEKO!
                  </span>
                )}
              </div>
            </div>

            {/* Catch UNO button if opponent has 1 card and hasn't called UNO */}
            {canCatch && onCatchUno && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  sounds.catchUno();
                  onCatchUno(player.id);
                }}
                className="ml-1 px-2 py-1 rounded-xl bg-gradient-to-r from-[#E03131] to-[#F59F00] text-[#091510] font-['Bricolage_Grotesque',_sans-serif] font-extrabold text-[10px] uppercase tracking-wider shadow-[0_0_14px_rgba(224,49,49,0.65)] hover:brightness-110 active:scale-95 flex items-center gap-1 cursor-pointer animate-pulse-fast"
                title={`Attraper ${player.name} pour oubli de UNO (+2 cartes) !`}
              >
                <Zap className="w-3 h-3 fill-current" />
                <span>Contre!</span>
              </button>
            )}

            {/* Host Arbiter Penalty Button */}
            {isHost && onSelectPlayerForPenalty && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  sounds.buttonClick();
                  onSelectPlayerForPenalty(player);
                }}
                className="ml-0.5 p-1.5 rounded-xl bg-[#1A0F10] hover:bg-[#361518] text-[#FF8787] border border-[#E03131]/40 transition-colors cursor-pointer"
                title={`Infliger une pénalité à ${player.name}`}
              >
                <Gavel className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};
