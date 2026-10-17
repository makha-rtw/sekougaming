import React, { useState } from 'react';
import { Crosshair, Skull, AlertCircle } from 'lucide-react';
import { Player } from '../types/game';

interface ChasseurShotViewProps {
  hunterPlayer: Player;
  alivePlayers: Player[];
  onConfirmShot: (targetPlayerId: string) => void;
}

export const ChasseurShotView: React.FC<ChasseurShotViewProps> = ({
  hunterPlayer,
  alivePlayers,
  onConfirmShot,
}) => {
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const selectedTarget = alivePlayers.find(p => p.id === selectedTargetId);

  return (
    <div className="w-full max-w-md mx-auto p-4 space-y-6 pb-28">
      {/* Title */}
      <div className="text-center space-y-2">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-[#f7f5ea] border border-[#d3c690] flex items-center justify-center text-[#665415] shadow-xs">
          <Crosshair className="w-8 h-8" />
        </div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-[#22160c]">
          Ultime Tir du Chasseur !
        </h1>
        <p className="text-xs text-[#5c4936]">
          {hunterPlayer.name} a été condamné par le vote, mais dans son dernier souffle, il abat sa cible !
        </p>
      </div>

      {/* Script for Moderator (without "À dire à haute voix") */}
      <div className="p-4 rounded-2xl bg-[#fcf9f2] border border-[#d8c5aa] shadow-xs">
        <blockquote className="font-serif italic text-sm text-[#2f1f12] border-l-3 border-[#665415] pl-3 leading-relaxed">
          « {hunterPlayer.name} était le Chasseur ! Avant de s'effondrer, son fusil tonne et fauche un joueur... Qui abats-tu ? »
        </blockquote>
      </div>

      {/* Target Selector */}
      <div className="space-y-3">
        <div className="text-xs font-bold uppercase tracking-wider text-[#634e3b] px-1 font-display">
          Désignez la cible du tir ({alivePlayers.length} vivants)
        </div>

        <div className="grid grid-cols-2 gap-2">
          {alivePlayers.map(p => {
            const isSelected = selectedTargetId === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedTargetId(p.id)}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#6b5814] border-[#423608] text-[#fffef5] font-bold shadow-sm ring-1 ring-[#423608]'
                    : 'bg-[#fcf9f2] border-[#d8c5aa] text-[#362719] hover:bg-[#f6efe1]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-semibold truncate ${isSelected ? 'text-[#fffef5]' : 'text-[#22160c]'}`}>
                    {p.name}
                  </span>
                  <span className={`text-[10px] ${isSelected ? 'text-[#faeebe]' : 'text-[#78644e]'}`}>
                    Siège {p.seatNumber}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Confirm Modal */}
      {showConfirm && selectedTarget && (
        <div className="fixed inset-0 bg-[#20140a]/65 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#fcf9f2] border-2 border-[#bfa686] rounded-3xl p-6 text-center space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-[#faecea] border border-[#dea299] flex items-center justify-center text-[#871c1c]">
              <Skull className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h3 className="font-display text-xl font-bold text-[#22160c]">
                Confirmer le tir mortel ?
              </h3>
              <p className="text-xs text-[#5e4b37]">
                {selectedTarget.name} sera abattu(e) instantanément.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-3 rounded-xl bg-[#eee3cf] hover:bg-[#e4d5bf] text-[#2c1d10] text-xs font-bold border border-[#cdbc9f] transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowConfirm(false);
                  onConfirmShot(selectedTarget.id);
                }}
                className="flex-1 py-3 rounded-xl bg-[#8a1e1e] hover:bg-[#721717] text-[#fffdf8] text-xs font-bold shadow-md shadow-[#8a1e1e]/25 border border-[#5c1212] transition-colors cursor-pointer"
              >
                Tirer & Abattre
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#f5efe3] via-[#f5efe3]/95 to-transparent z-20">
        <div className="max-w-md mx-auto">
          <button
            type="button"
            onClick={() => setShowConfirm(true)}
            disabled={!selectedTargetId}
            className="w-full h-12 rounded-xl bg-[#665415] hover:bg-[#52430f] disabled:opacity-40 disabled:hover:bg-[#665415] text-[#fffdf8] font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-[#665415]/25 border border-[#43370b] active:scale-[0.99] transition-all cursor-pointer disabled:cursor-not-allowed"
          >
            <Crosshair className="w-4 h-4" />
            <span>Valider le Tir du Chasseur</span>
          </button>
        </div>
      </div>
    </div>
  );
};
