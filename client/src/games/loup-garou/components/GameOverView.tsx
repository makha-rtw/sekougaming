import React from 'react';
import { Trophy, Skull, RotateCcw, Heart, Flame, Ghost, Feather, Moon, Users } from 'lucide-react';
import { GameState } from '../types/game';
import { ROLE_DEFINITIONS } from '../data/roles';
import { RoleIcon } from './RoleIcon';
import { formatDeathReason } from '../engine/gameEngine';

interface GameOverViewProps {
  state: GameState;
  onRestart: () => void;
}

export const GameOverView: React.FC<GameOverViewProps> = ({ state, onRestart }) => {
  const { winner, players, round, gameLog } = state;

  const getWinnerIcon = () => {
    switch (winner?.winner) {
      case 'loups_garous':
        return <Moon className="w-10 h-10 text-[#871c1c]" />;
      case 'villageois':
        return <Users className="w-10 h-10 text-[#1d592b]" />;
      case 'ange':
        return <Feather className="w-10 h-10 text-[#1f506b]" />;
      case 'loup_blanc':
        return <Ghost className="w-10 h-10 text-[#443325]" />;
      case 'amoureux':
        return <Heart className="w-10 h-10 text-[#8c2243] fill-[#8c2243]" />;
      case 'pyromane':
        return <Flame className="w-10 h-10 text-[#8c3d0d] fill-[#8c3d0d]" />;
      default:
        return <Trophy className="w-10 h-10 text-[#9b6b1e]" />;
    }
  };

  const getWinnerBannerColor = () => {
    switch (winner?.winner) {
      case 'loups_garous':
        return 'bg-[#faecea] border-[#dea299] text-[#871c1c]';
      case 'villageois':
        return 'bg-[#edf5ee] border-[#a7cca9] text-[#1d592b]';
      case 'ange':
        return 'bg-[#edf6fa] border-[#a3ccde] text-[#1f506b]';
      case 'loup_blanc':
        return 'bg-[#f2ece4] border-[#c7b7a4] text-[#443325]';
      case 'amoureux':
        return 'bg-[#faecf0] border-[#dfa2b5] text-[#8c2243]';
      case 'pyromane':
        return 'bg-[#fcf0e7] border-[#e3ad86] text-[#8c3d0d]';
      default:
        return 'bg-[#fcf9f2] border-[#d8c5aa] text-[#22160c]';
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-4 space-y-6 pb-28">
      {/* Victory Announcement Header */}
      <div className={`p-6 rounded-3xl border-2 ${getWinnerBannerColor()} text-center space-y-3 shadow-sm`}>
        <div className="w-20 h-20 mx-auto rounded-3xl bg-[#fdfbf7] border border-[#d8c5aa] flex items-center justify-center shadow-inner">
          {getWinnerIcon()}
        </div>

        <div className="space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-widest text-[#7a644f] font-display">
            Partie terminée · Jour {round}
          </span>
          <h1 className="font-display text-2xl font-extrabold text-[#22160c] tracking-wide">
            {winner?.title || 'Fin de la Partie'}
          </h1>
          <p className="text-xs font-bold text-[#824716]">
            {winner?.subtitle}
          </p>
        </div>

        <p className="text-xs text-[#4e3a27] leading-relaxed bg-[#fffdfa] p-3 rounded-2xl border border-[#d8c5aa] text-left shadow-2xs">
          {winner?.description}
        </p>
      </div>

      {/* Roster Revelation (Full list of roles revealed now!) */}
      <div className="bg-[#fcf9f2] border border-[#d8c5aa] rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between text-xs text-[#634e3b] border-b border-[#e5d6c2] pb-2 font-display">
          <span className="font-bold uppercase tracking-wider">
            Révélation complète des Rôles
          </span>
          <span>{players.filter(p => p.isAlive).length} survivant(s)</span>
        </div>

        <div className="divide-y divide-[#ebdcc8] space-y-1">
          {players.map(p => {
            const roleDef = ROLE_DEFINITIONS[p.currentRole];
            const isWinner = winner?.winningPlayerIds.includes(p.id);

            return (
              <div key={p.id} className="pt-2 pb-1.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                      p.isAlive
                        ? 'bg-[#efe4cf] border-[#d5c3a7] text-[#362618]'
                        : 'bg-[#faecea] border-[#dea299] text-[#871c1c]'
                    }`}
                  >
                    <RoleIcon roleId={p.currentRole} className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-[#22160c] truncate">
                        {p.name}
                      </span>
                      {isWinner && (
                        <span className="text-[10px] font-bold text-[#256c35] bg-[#edf5ee] border border-[#a7cca9] px-1.5 py-0.2 rounded">
                          Vainqueur
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-[#695440] truncate">
                      {roleDef.name} · Siège {p.seatNumber}
                      {!p.isAlive && p.deathReason && ` (Mort : ${formatDeathReason(p.deathReason)})`}
                    </div>
                  </div>
                </div>

                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                    p.isAlive
                      ? 'bg-[#edf5ee] border-[#a7cca9] text-[#1d592b]'
                      : 'bg-[#faecea] border-[#dea299] text-[#871c1c]'
                  }`}
                >
                  {p.isAlive ? 'Vivant' : 'Trépassé'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Floating CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#f5efe3] via-[#f5efe3]/95 to-transparent z-20">
        <div className="max-w-md mx-auto">
          <button
            type="button"
            onClick={onRestart}
            className="w-full h-12 rounded-xl bg-[#824716] hover:bg-[#6c390f] text-[#fffdf8] font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-[#824716]/25 border border-[#542a06] cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Recommencer une Nouvelle Partie</span>
          </button>
        </div>
      </div>
    </div>
  );
};
