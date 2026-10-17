import React from 'react';
import { Moon, ShieldCheck, User } from 'lucide-react';
import { Player } from '../types/game';
import { soundFX } from '../utils/audio';

interface RosterReadyViewProps {
  players: Player[];
  onStartNight: () => void;
}

export const RosterReadyView: React.FC<RosterReadyViewProps> = ({ players, onStartNight }) => {
  const handleLaunch = () => {
    soundFX.playNightGong();
    onStartNight();
  };

  return (
    <div className="w-full max-w-md mx-auto p-4 space-y-6 pb-28">
      {/* Title */}
      <div className="text-center space-y-2">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-[#edf5ee] border border-[#a7cca9] flex items-center justify-center text-[#1d592b] shadow-xs">
          <ShieldCheck className="w-7 h-7" />
        </div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-[#22160c]">
          Distribution Terminée !
        </h1>
        <p className="text-xs text-[#5c4936]">
          Tous les participants ont reçu secrètement leur carte du grimoire.
        </p>
      </div>

      {/* Public Roster - ABSOLUTELY NO ROLES DISPLAYED */}
      <div className="bg-[#fcf9f2] border border-[#d8c5aa] rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between text-xs text-[#634e3b] pb-2 border-b border-[#e2d3bd]">
          <span className="font-bold uppercase tracking-wider font-display">
            Participants ({players.length})
          </span>
          <span>Disposition autour de la table</span>
        </div>

        <div className="divide-y divide-[#ebdcc8] max-h-72 overflow-y-auto pr-1">
          {players.map((p, idx) => (
            <div key={p.id} className="py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-[#efe4cf] border border-[#d5c3a7] flex items-center justify-center text-xs font-bold text-[#3c2918]">
                  {idx + 1}
                </div>
                <span className="text-sm font-semibold text-[#25180d]">
                  {p.name}
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs text-[#7d6954]">
                <User className="w-3.5 h-3.5" />
                <span>Rôle secret assigné</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Guide for the Moderator */}
      <div className="p-4 rounded-2xl bg-[#fcf8ec] border border-[#d8c39b] text-xs text-[#5a3e1c] space-y-1.5 leading-relaxed shadow-2xs">
        <div className="font-bold text-[#452c10]">Instructions pour le Modérateur :</div>
        <p>
          1. Invitez tous les participants à s'asseoir en cercle fermé autour de la table.
        </p>
        <p>
          2. Déclarez solennellement : « La nuit tombe sur le village, tous les villageois ferment les yeux et s'endorment. »
        </p>
        <p>
          3. Cliquez ci-dessous pour débuter les réveils nocturnes guidés pas à pas.
        </p>
      </div>

      {/* Sticky Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#f5efe3] via-[#f5efe3]/95 to-transparent z-20">
        <div className="max-w-md mx-auto">
          <button
            type="button"
            onClick={handleLaunch}
            className="w-full h-12 rounded-xl bg-[#824716] hover:bg-[#6c390f] text-[#fffdf8] font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-[#824716]/25 border border-[#542a06] active:scale-[0.99] transition-all cursor-pointer"
          >
            <Moon className="w-4 h-4" />
            <span>La Nuit Tombe · Lancer la Nuit 1</span>
          </button>
        </div>
      </div>
    </div>
  );
};
