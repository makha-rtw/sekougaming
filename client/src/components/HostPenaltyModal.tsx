import React, { useState } from 'react';
import { PlayerPublic } from '../../../shared/types.js';
import { ShieldAlert, AlertTriangle } from 'lucide-react';

interface HostPenaltyModalProps {
  targetPlayer: PlayerPublic | null;
  onApplyPenalty: (targetPlayerId: string, count: number) => void;
  onClose: () => void;
}

export const HostPenaltyModal: React.FC<HostPenaltyModalProps> = ({
  targetPlayer,
  onApplyPenalty,
  onClose,
}) => {
  const [penaltyCount, setPenaltyCount] = useState<number>(2);

  if (!targetPlayer) return null;

  const handleConfirm = () => {
    onApplyPenalty(targetPlayer.id, penaltyCount);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border-2 border-red-500/70 rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl">
        <div className="w-12 h-12 rounded-full bg-red-600/20 text-red-500 border border-red-500/40 flex items-center justify-center mx-auto mb-3">
          <ShieldAlert className="w-6 h-6" />
        </div>

        <h3 className="text-lg font-black text-white uppercase tracking-wider mb-1">
          Pénalité Hôte
        </h3>
        <p className="text-xs text-slate-300 mb-4">
          Infliger une pénalité de cartes à <strong className="text-amber-400">{targetPlayer.name}</strong> :
        </p>

        {/* Reason note */}
        <div className="mb-4 p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-[11px] text-slate-400 text-left flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <span>Utilisez cette option en cas d'oubli de « UNO » ou de règle convenue entre les joueurs.</span>
        </div>

        {/* Penalty count selector */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          {[2, 4, 1].map((count) => (
            <button
              key={count}
              type="button"
              onClick={() => setPenaltyCount(count)}
              className={`py-2.5 rounded-xl font-black text-sm transition-all border ${penaltyCount === count ? 'bg-red-600 text-white border-red-400 ring-2 ring-red-400/50 shadow-lg' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'}`}
            >
              +{count} {count > 1 ? 'cartes' : 'carte'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white text-xs font-black shadow-lg transition-transform transform active:scale-95"
          >
            Appliquer +{penaltyCount}
          </button>
        </div>
      </div>
    </div>
  );
};
