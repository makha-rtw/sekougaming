import React from 'react';
import { RotateCcw, AlertTriangle, X } from 'lucide-react';

interface ResetConfirmModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ResetConfirmModal: React.FC<ResetConfirmModalProps> = ({
  isOpen,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[#20140a]/65 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-[#fcf9f2] border-2 border-[#bfa686] rounded-3xl p-6 text-center space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-[#faecea] border border-[#dea299] flex items-center justify-center text-[#871c1c]">
          <RotateCcw className="w-7 h-7" />
        </div>

        <div className="space-y-2">
          <h3 className="font-display text-xl font-bold text-[#22160c]">
            Réinitialiser la partie ?
          </h3>
          <p className="text-xs text-[#594635] leading-relaxed">
            Êtes-vous certain de vouloir abandonner la partie en cours ? Toutes les attributions de rôles,
            éliminations et actions seront effacées et vous reviendrez au salon de départ.
          </p>
        </div>

        <div className="flex items-center gap-2.5 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl bg-[#eee3cf] hover:bg-[#e4d6bf] text-[#3d2b1b] text-xs font-semibold border border-[#cdbc9f] transition-colors cursor-pointer"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 py-3 rounded-xl bg-[#8a1e1e] hover:bg-[#721717] text-[#fffdf8] text-xs font-semibold shadow-md shadow-[#8a1e1e]/25 transition-colors cursor-pointer flex items-center justify-center gap-1.5 border border-[#641212]"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Réinitialiser</span>
          </button>
        </div>
      </div>
    </div>
  );
};
