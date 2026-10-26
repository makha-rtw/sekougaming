import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PlayableColor } from '../../../shared/types.js';
import { sounds } from '../utils/sound.js';
import { Sparkles, X } from 'lucide-react';

interface ColorPickerModalProps {
  isOpen: boolean;
  onSelectColor: (color: PlayableColor) => void;
  onCancel: () => void;
}

const SUIT_OPTIONS: {
  key: PlayableColor;
  name: string;
  gradient: string;
  border: string;
  ring: string;
  text: string;
}[] = [
  {
    key: 'red',
    name: 'Rouge',
    gradient: 'linear-gradient(145deg, #E03131 0%, #9E1616 100%)',
    border: 'border-[#FF8787]/50',
    ring: 'hover:ring-[#E03131]',
    text: 'text-[#FAF3E6]',
  },
  {
    key: 'blue',
    name: 'Bleu',
    gradient: 'linear-gradient(145deg, #246BFD 0%, #0F388A 100%)',
    border: 'border-[#74C0FC]/50',
    ring: 'hover:ring-[#246BFD]',
    text: 'text-[#FAF3E6]',
  },
  {
    key: 'green',
    name: 'Vert',
    gradient: 'linear-gradient(145deg, #16A35A 0%, #0A5932 100%)',
    border: 'border-[#63E6BE]/50',
    ring: 'hover:ring-[#16A35A]',
    text: 'text-[#FAF3E6]',
  },
  {
    key: 'yellow',
    name: 'Jaune',
    gradient: 'linear-gradient(145deg, #F5B727 0%, #B57808 100%)',
    border: 'border-[#FFE066]/70',
    ring: 'hover:ring-[#F5B727]',
    text: 'text-[#141109]',
  },
];

export const ColorPickerModal: React.FC<ColorPickerModalProps> = ({
  isOpen,
  onSelectColor,
  onCancel,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 10 }}
            transition={{ type: 'spring', stiffness: 320, damping: 24 }}
            className="relative bg-[#0B1712] border-2 border-[#E5B84B]/50 rounded-[28px] p-6 max-w-sm w-full text-center shadow-[0_24px_60px_rgba(0,0,0,0.85)]"
          >
            <button
              type="button"
              onClick={() => {
                sounds.buttonClick();
                onCancel();
              }}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 text-[#9FB0A5] hover:text-white transition-colors cursor-pointer"
              title="Annuler"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E5B84B]/15 border border-[#E5B84B]/35 text-[#E5B84B] text-[11px] font-bold uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Carte Joker</span>
            </div>

            <h3 className="font-['Bricolage_Grotesque',_sans-serif] text-2xl font-extrabold text-[#F5EFE4] tracking-tight mb-1">
              Imposez votre couleur
            </h3>
            <p className="text-xs text-[#9FB0A5] mb-5">
              Choisissez la couleur qui s'appliquera dès le prochain tour :
            </p>

            <div className="grid grid-cols-2 gap-3.5 mb-5">
              {SUIT_OPTIONS.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onMouseEnter={() => sounds.cardHover()}
                  onClick={() => {
                    sounds.colorSelect(c.key);
                    onSelectColor(c.key);
                  }}
                  style={{ background: c.gradient }}
                  className={`group relative h-24 rounded-2xl flex flex-col items-center justify-center font-['Bricolage_Grotesque',_sans-serif] font-extrabold text-lg transition-all duration-200 hover:-translate-y-1 hover:scale-[1.03] active:scale-95 shadow-xl border ${c.border} hover:ring-2 ${c.ring} ${c.text} cursor-pointer overflow-hidden`}
                >
                  <div className="w-7 h-7 rounded-full bg-white/25 border border-white/40 mb-1.5 group-hover:scale-110 transition-transform" />
                  <span>{c.name}</span>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                sounds.buttonClick();
                onCancel();
              }}
              className="text-xs font-semibold text-[#9FB0A5] hover:text-[#F5EFE4] transition-colors cursor-pointer"
            >
              Garder ma carte en main
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
