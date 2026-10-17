import React from 'react';
import { PlayableColor } from '../../../shared/types.js';

interface ColorPickerModalProps {
  isOpen: boolean;
  onSelectColor: (color: PlayableColor) => void;
  onCancel: () => void;
}

export const ColorPickerModal: React.FC<ColorPickerModalProps> = ({
  isOpen,
  onSelectColor,
  onCancel,
}) => {
  if (!isOpen) return null;

  const colors: { key: PlayableColor; name: string; bg: string; border: string }[] = [
    { key: 'red', name: 'Rouge', bg: 'bg-red-500 hover:bg-red-600', border: 'border-red-400' },
    { key: 'blue', name: 'Bleu', bg: 'bg-blue-500 hover:bg-blue-600', border: 'border-blue-400' },
    { key: 'green', name: 'Vert', bg: 'bg-emerald-500 hover:bg-emerald-600', border: 'border-emerald-400' },
    { key: 'yellow', name: 'Jaune', bg: 'bg-amber-400 hover:bg-amber-500 text-slate-950', border: 'border-amber-300' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border-2 border-slate-700 rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl">
        <h3 className="text-xl font-black text-white uppercase tracking-wider mb-2">
          Choisissez la couleur
        </h3>
        <p className="text-xs text-slate-400 mb-6">
          Définissez la nouvelle couleur active pour le tour suivant :
        </p>

        <div className="grid grid-cols-2 gap-4 mb-6">
          {colors.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => onSelectColor(c.key)}
              className={`h-24 rounded-2xl flex flex-col items-center justify-center font-black text-lg transition-transform transform hover:scale-105 active:scale-95 shadow-lg border-2 ${c.bg} ${c.border}`}
            >
              <div className="w-6 h-6 rounded-full bg-white/30 mb-1" />
              <span>{c.name}</span>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-slate-400 hover:text-white underline"
        >
          Annuler le coup
        </button>
      </div>
    </div>
  );
};
