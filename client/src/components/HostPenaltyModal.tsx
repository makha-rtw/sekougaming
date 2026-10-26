import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PlayerPublic } from '../../../shared/types.js';
import { Gavel, AlertTriangle, X } from 'lucide-react';
import { sounds } from '../utils/sound.js';

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

  const handleConfirm = () => {
    if (!targetPlayer) return;
    onApplyPenalty(targetPlayer.id, penaltyCount);
    onClose();
  };

  return (
    <AnimatePresence>
      {targetPlayer && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 14 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 24 }}
            className="relative bg-[#0B1712] border-2 border-[#E03131]/60 rounded-[28px] p-6 max-w-sm w-full text-center shadow-[0_24px_60px_rgba(0,0,0,0.85)]"
          >
            <button
              type="button"
              onClick={() => {
                sounds.buttonClick();
                onClose();
              }}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 text-[#9FB0A5] hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-[#E03131]/15 text-[#FF6B6B] border border-[#E03131]/40 flex items-center justify-center mx-auto mb-3">
              <Gavel className="w-6 h-6" />
            </div>

            <h3 className="font-['Bricolage_Grotesque',_sans-serif] text-xl font-extrabold text-[#F5EFE4] mb-1">
              Sanction de la Table
            </h3>
            <p className="text-xs text-[#B5C4B9] mb-4">
              Infliger des cartes de pénalité à{' '}
              <strong className="text-[#FFE27A]">{targetPlayer.name}</strong> :
            </p>

            <div className="mb-4 p-3 bg-[#060E0B] border border-white/10 rounded-2xl text-[11px] text-[#9FB0A5] text-left flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-[#E5B84B] shrink-0 mt-0.5" />
              <span>
                Idéal pour sanctionner un oubli d'annonce, un bluff raté ou une règle maison convenue entre amis.
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2.5 mb-5">
              {[1, 2, 4].map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => {
                    sounds.buttonClick();
                    setPenaltyCount(count);
                  }}
                  className={`py-3 rounded-xl font-['Bricolage_Grotesque',_sans-serif] font-extrabold text-sm transition-all border cursor-pointer ${
                    penaltyCount === count
                      ? 'bg-[#E03131] text-[#FAF3E6] border-[#FF8787] ring-2 ring-[#E03131]/50 shadow-lg'
                      : 'bg-[#11221A] text-[#B5C4B9] border-white/10 hover:bg-[#172E23]'
                  }`}
                >
                  +{count} {count > 1 ? 'cartes' : 'carte'}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  sounds.buttonClick();
                  onClose();
                }}
                className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-[#B5C4B9] text-xs font-bold border border-white/10 transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="flex-1 py-3 rounded-xl bg-[#E03131] hover:bg-[#C92020] text-[#FAF3E6] font-['Bricolage_Grotesque',_sans-serif] font-extrabold text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-all cursor-pointer"
              >
                Infliger +{penaltyCount}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
