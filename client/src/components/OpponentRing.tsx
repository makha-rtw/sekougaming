import React from 'react';
import { PlayerPublic } from '../../../shared/types.js';
import { CrownSimple, Gavel, Lightning } from '@phosphor-icons/react';
import { sounds } from '../utils/sound.js';

export const PLAYER_AVATAR_GRADIENTS = [
  'bg-[#D92D20] text-[#F6F0E2]',
  'bg-[#155EEF] text-[#F6F0E2]',
  'bg-[#099250] text-[#F6F0E2]',
  'bg-[#DC9B06] text-[#11131A]',
  'bg-[#7A2E8E] text-[#F6F0E2]',
  'bg-[#0E706E] text-[#F6F0E2]',
  'bg-[#C4451C] text-[#F6F0E2]',
  'bg-[#2D46B9] text-[#F6F0E2]',
  'bg-[#A6264C] text-[#F6F0E2]',
  'bg-[#237A3B] text-[#F6F0E2]',
  'bg-[#B84A14] text-[#F6F0E2]',
  'bg-[#127285] text-[#F6F0E2]',
  'bg-[#5636B8] text-[#F6F0E2]',
  'bg-[#C77700] text-[#11131A]',
  'bg-[#3E54AC] text-[#F6F0E2]',
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
    <div className="w-full flex items-center justify-start sm:justify-center gap-2 overflow-x-auto no-scrollbar py-1.5 px-1">
      {opponents.map((player, idx) => {
        const isCurrentTurn = currentTurnPlayerId === player.id;
        const canCatch = player.cardCount === 1 && !player.hasCalledUno;
        const badgeTone = getPlayerColor(idx);
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
              relative flex-shrink-0 flex items-center gap-2.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-[9px]
              border transition-[transform,border-color,background-color,opacity] duration-200 select-none
              ${isHost ? 'cursor-pointer hover:border-[#D4A548]/70' : ''}
              ${
                isCurrentTurn
                  ? 'bg-[#1B2230] border-2 border-[#D4A548] shadow-[0_6px_18px_rgba(0,0,0,0.5)] -translate-y-[1px] z-10'
                  : 'bg-[#141924] border-[#F6F0E2]/12 opacity-85 hover:opacity-100'
              }
            `}
            title={isHost ? `Arbitrage : infliger une pénalité à ${player.name}` : undefined}
          >
            {/* Active turn brass corner indicator */}
            {isCurrentTurn && (
              <span className="pointer-events-none absolute -top-1 -left-1 w-2.5 h-2.5 rounded-full bg-[#D4A548]" />
            )}

            {/* Architectural Seat Monogram */}
            <div className="relative shrink-0">
              <div
                className={`w-8 h-8 rounded-[6px] ${badgeTone} flex items-center justify-center font-sekouno-display font-black text-xs border border-[#F6F0E2]/25`}
              >
                {player.name.slice(0, 2).toUpperCase()}
              </div>
              <span
                className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#141924] ${
                  player.isConnected ? 'bg-[#099250]' : 'bg-zinc-500'
                }`}
                title={player.isConnected ? 'En ligne' : 'Hors ligne'}
              />
            </div>

            {/* Name & Card Count Stack */}
            <div className="flex flex-col text-left min-w-0">
              <div className="flex items-center gap-1">
                <span
                  className={`font-semibold text-xs max-w-[78px] sm:max-w-[104px] truncate ${
                    isCurrentTurn ? 'text-[#D4A548]' : 'text-[#F6F0E2]'
                  }`}
                >
                  {player.name}
                </span>
                {player.isHost && (
                  <CrownSimple weight="fill" className="w-3 h-3 text-[#D4A548] shrink-0" />
                )}
              </div>

              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="flex items-center -space-x-1">
                  {Array.from({ length: visibleMiniCards }).map((_, cIdx) => (
                    <span
                      key={cIdx}
                      className="inline-block w-2 h-3 rounded-[1.5px] bg-[#121620] border border-[#F6F0E2]/75"
                    />
                  ))}
                </div>

                <span
                  className={`font-sekouno-mono text-xs font-bold ${
                    player.cardCount === 1 ? 'text-[#D92D20]' : 'text-[#D9D0BE]'
                  }`}
                >
                  {player.cardCount}
                </span>

                {player.hasCalledUno && (
                  <span className="bg-[#D92D20] text-[#F6F0E2] font-sekouno-mono font-bold text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-[3px]">
                    SEKO
                  </span>
                )}
              </div>
            </div>

            {/* Catch UNO button if opponent has 1 card and failed to call SEKO */}
            {canCatch && onCatchUno && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  sounds.catchUno();
                  onCatchUno(player.id);
                }}
                className="ml-1 px-2 py-1 rounded-[5px] bg-[#D92D20] hover:bg-[#b82217] text-[#F6F0E2] border border-[#F6F0E2]/40 font-sekouno-mono font-bold text-[10px] uppercase tracking-wider active:scale-95 flex items-center gap-1 cursor-pointer animate-pulse-fast"
                title={`Prendre ${player.name} en défaut d'annonce (+2 cartes)`}
              >
                <Lightning weight="fill" className="w-3 h-3" />
                <span>Contre</span>
              </button>
            )}

            {/* Host Arbiter Button */}
            {isHost && onSelectPlayerForPenalty && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  sounds.buttonClick();
                  onSelectPlayerForPenalty(player);
                }}
                className="ml-0.5 p-1.5 rounded-[5px] bg-[#1D1519] hover:bg-[#331B20] text-[#F98076] border border-[#D92D20]/40 transition-[background-color] cursor-pointer"
                title={`Infliger une pénalité à ${player.name}`}
              >
                <Gavel weight="bold" className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};
