import React, { useState, useEffect, useRef } from 'react';
import { PlayerPublic } from '../../../shared/types.js';
import { Gavel, WarningCircle, X } from '@phosphor-icons/react';
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
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const isOpen = Boolean(targetPlayer);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        try {
          dialog.showModal();
        } catch {
          dialog.setAttribute('open', '');
        }
      }
    } else if (dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  const handleConfirm = () => {
    if (!targetPlayer) return;
    onApplyPenalty(targetPlayer.id, penaltyCount);
    onClose();
  };

  if (!targetPlayer) return null;

  return (
    <dialog
      ref={dialogRef}
      closedby="any"
      aria-label="Arbitrage de la table"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === dialogRef.current) {
          sounds.buttonClick();
          onClose();
        }
      }}
      className="sekou-dialog max-w-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative bg-[#141924] text-[#F6F0E2] border-2 border-[#D92D20] rounded-[12px] overflow-hidden shadow-[0_24px_60px_rgba(0,0,0,0.85)]"
      >
        <div className="bg-[#1D1316] px-5 py-3.5 flex items-center justify-between border-b border-[#D92D20]/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[6px] bg-[#D92D20] text-[#FAF6EE] flex items-center justify-center">
              <Gavel weight="bold" className="w-4 h-4" />
            </div>
            <div>
              <span className="font-sekouno-mono text-[10px] font-bold uppercase tracking-widest text-[#F98076] block">
                Arbitrage Hôte
              </span>
              <h3 className="font-sekouno-display font-black text-base uppercase tracking-wide">
                Sanction de table
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              sounds.buttonClick();
              onClose();
            }}
            aria-label="Fermer"
            className="p-1.5 rounded-[5px] bg-white/5 hover:bg-white/15 text-[#D9D0BE] cursor-pointer"
          >
            <X weight="bold" className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-xs text-[#D9D0BE]">
            Attribuer des cartes de pénalité à{' '}
            <strong className="text-[#D4A548]">{targetPlayer.name}</strong> :
          </p>

          <div className="p-3 bg-[#0D1017] border border-[#F6F0E2]/12 rounded-[8px] text-[11px] text-[#D9D0BE] flex items-start gap-2">
            <WarningCircle weight="bold" className="w-4 h-4 text-[#D4A548] shrink-0 mt-0.5" />
            <span>
              Réservé aux fautes de jeu convenues entre participants (oubli d’annonce ou règle maison).
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 4].map((count) => (
              <button
                key={count}
                type="button"
                onClick={() => {
                  sounds.buttonClick();
                  setPenaltyCount(count);
                }}
                className={`py-2.5 rounded-[6px] font-sekouno-mono font-bold text-xs border transition-[background-color,border-color,color] cursor-pointer ${
                  penaltyCount === count
                    ? 'bg-[#D92D20] text-[#FAF6EE] border-[#FAF6EE]'
                    : 'bg-[#1B2230] text-[#D9D0BE] border-[#F6F0E2]/15 hover:border-[#F6F0E2]/40'
                }`}
              >
                +{count} {count > 1 ? 'cartes' : 'carte'}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                sounds.buttonClick();
                onClose();
              }}
              className="flex-1 py-2.5 rounded-[6px] bg-[#1B2230] hover:bg-[#252E40] text-[#D9D0BE] text-xs font-bold border border-[#F6F0E2]/15 cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="flex-1 py-2.5 rounded-[6px] bg-[#D92D20] hover:bg-[#b82217] text-[#FAF6EE] font-sekouno-display font-black text-xs uppercase tracking-wider active:scale-95 transition-[transform,background-color] cursor-pointer"
            >
              Infliger +{penaltyCount}
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
};
