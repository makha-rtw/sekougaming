import React from 'react';
import { X, Shield, Sparkles, Flame, Heart, Skull, Moon, Compass } from 'lucide-react';
import { GameState } from '../types/game';
import { ROLE_DEFINITIONS } from '../data/roles';
import { RoleIcon } from './RoleIcon';
import { formatDeathReason } from '../engine/gameEngine';

interface ModeratorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  state: GameState;
}

export const ModeratorDrawer: React.FC<ModeratorDrawerProps> = ({
  isOpen,
  onClose,
  state,
}) => {
  if (!isOpen) return null;

  const { players, round, sorciereState, grandMechantLoupState, renardState, gameLog } = state;

  return (
    <div className="fixed inset-0 z-50 bg-[#20140a]/65 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-sm h-full bg-[#fcf9f2] border-l-2 border-[#bfa686] p-4 flex flex-col justify-between overflow-y-auto shadow-2xl">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-[#e2d3bd]">
            <div>
              <h2 className="font-display font-bold text-base text-[#22160c]">
                Grimoire du Modérateur
              </h2>
              <span className="text-[11px] text-[#634e3b]">
                Informations confidentielles · Manche {round}
              </span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-[#634e3b] hover:text-[#22160c] rounded-lg hover:bg-[#ede2cd] transition-colors cursor-pointer"
              aria-label="Fermer le panneau"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Powers Status */}
          <div className="space-y-2">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#695440] font-display">
              État des Pouvoirs Critiques
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-[#f4edf8] border border-[#c9aadb] space-y-1 shadow-2xs">
                <div className="flex items-center gap-1.5 font-bold text-[#58266e]">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Sorcière</span>
                </div>
                <div className="text-[10px] text-[#6b427f] space-y-0.5">
                  <div>Vie : {sorciereState.hasLifePotion ? 'Disponible' : 'Utilisée'}</div>
                  <div>Mort : {sorciereState.hasDeathPotion ? 'Disponible' : 'Utilisée'}</div>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-[#faecea] border border-[#dea299] space-y-1 shadow-2xs">
                <div className="flex items-center gap-1.5 font-bold text-[#871c1c]">
                  <Moon className="w-3.5 h-3.5" />
                  <span>Grand M. Loup</span>
                </div>
                <div className="text-[10px] text-[#6b4742]">
                  {grandMechantLoupState.isPowerLost ? (
                    <span className="text-[#871c1c] font-bold">Pouvoir perdu</span>
                  ) : (
                    <span className="text-[#1d592b] font-bold">Actif (aucun loup mort)</span>
                  )}
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-[#fbf1e7] border border-[#e0b48c] space-y-1 col-span-2 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-[#874211]">
                    <Compass className="w-3.5 h-3.5" />
                    <span>Flair du Renard</span>
                  </div>
                  <span className="text-[10px]">
                    {renardState.hasPower ? (
                      <span className="text-[#1d592b] font-bold">Actif</span>
                    ) : (
                      <span className="text-[#871c1c] font-bold">Perdu (Simple Villageois)</span>
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Secret Players List */}
          <div className="space-y-2">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#695440] font-display">
              Participants & Identités Secrètes ({players.length})
            </h3>

            <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
              {players.map(p => {
                const role = ROLE_DEFINITIONS[p.currentRole];
                return (
                  <div
                    key={p.id}
                    className={`p-2 rounded-xl border flex items-center justify-between text-xs shadow-2xs ${
                      p.isAlive
                        ? 'bg-[#fffdfa] border-[#d8c5aa]'
                        : 'bg-[#faecea] border-[#dea299] opacity-75'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${
                          p.isAlive ? `${role.colorScheme.badgeBg} ${role.colorScheme.border} ${role.colorScheme.text}` : 'bg-[#f4d5d0] border-[#dea299] text-[#871c1c]'
                        }`}
                      >
                        <RoleIcon roleId={p.currentRole} className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-[#22160c] truncate">
                          {p.name}
                        </div>
                        <div className={`text-[10px] font-semibold ${role.colorScheme.text}`}>
                          {role.name} · Siège {p.seatNumber}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                          p.isAlive
                            ? 'bg-[#edf5ee] border-[#a7cca9] text-[#1d592b]'
                            : 'bg-[#faecea] border-[#dea299] text-[#871c1c]'
                        }`}
                      >
                        {p.isAlive ? 'Vivant' : 'Trépassé'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Historical Game Log */}
          {gameLog.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#695440] font-display">
                Chronique des Événements
              </h3>
              <div className="p-2.5 rounded-xl bg-[#f8f3e7] border border-[#d8c6aa] text-xs text-[#523e2c] space-y-1.5 max-h-40 overflow-y-auto">
                {gameLog.map((log, idx) => (
                  <div key={idx} className="leading-tight text-[11px]">
                    <span className="text-[#8c673d] font-bold">M{log.round} [{log.phase}]</span> : {log.text}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full mt-4 h-11 rounded-xl bg-[#eee3cf] hover:bg-[#e4d5bf] text-[#2c1d10] font-bold text-xs border border-[#cdbc9f] transition-colors cursor-pointer"
        >
          Refermer le Grimoire
        </button>
      </div>
    </div>
  );
};
