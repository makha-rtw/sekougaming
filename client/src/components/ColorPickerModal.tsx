import React, { useEffect, useRef } from 'react';
import { PlayableColor } from '../../../shared/types.js';
import { sounds } from '../utils/sound.js';
import { X, Diamond, Circle, Triangle, Square } from '@phosphor-icons/react';

interface ColorPickerModalProps {
  isOpen: boolean;
  onSelectColor: (color: PlayableColor) => void;
  onCancel: () => void;
}

const SUIT_OPTIONS: {
  key: PlayableColor;
  name: string;
  bg: string;
  text: string;
  code: string;
  Icon: React.ComponentType<{ weight?: 'fill' | 'bold'; className?: string }>;
}[] = [
  {
    key: 'red',
    name: 'Rouge',
    bg: '#D92D20',
    text: 'text-[#FAF6EE]',
    code: '01',
    Icon: Diamond,
  },
  {
    key: 'blue',
    name: 'Bleu',
    bg: '#155EEF',
    text: 'text-[#FAF6EE]',
    code: '02',
    Icon: Circle,
  },
  {
    key: 'green',
    name: 'Vert',
    bg: '#099250',
    text: 'text-[#FAF6EE]',
    code: '03',
    Icon: Triangle,
  },
  {
    key: 'yellow',
    name: 'Jaune',
    bg: '#DC9B06',
    text: 'text-[#11131A]',
    code: '04',
    Icon: Square,
  },
];

export const ColorPickerModal: React.FC<ColorPickerModalProps> = ({
  isOpen,
  onSelectColor,
  onCancel,
}) => {
  const dialogRef = useRef<HTMLDialogElement | null>(null);

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

  if (!isOpen) return null;

  return (
    <dialog
      ref={dialogRef}
      closedby="any"
      aria-label="Choisir la couleur active"
      onClose={onCancel}
      onClick={(e) => {
        if (e.target === dialogRef.current) {
          sounds.buttonClick();
          onCancel();
        }
      }}
      className="sekou-dialog max-w-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative bg-[#141924] text-[#F6F0E2] border-2 border-[#D4A548] rounded-[12px] overflow-hidden shadow-[0_24px_60px_rgba(0,0,0,0.85)]"
      >
        {/* Top Ivory Architectural Header */}
        <div className="bg-[#F6F0E2] text-[#11131A] px-5 py-3 flex items-center justify-between border-b border-[#D4A548]">
          <div>
            <span className="font-sekouno-mono text-[10px] font-bold uppercase tracking-widest text-[#706858] block">
              Privilège Joker
            </span>
            <h3 className="font-sekouno-display font-black text-lg uppercase tracking-wide leading-tight">
              Imposez la couleur
            </h3>
          </div>

          <button
            type="button"
            onClick={() => {
              sounds.buttonClick();
              onCancel();
            }}
            aria-label="Annuler"
            className="p-1.5 rounded-[5px] bg-[#E5DEC9] hover:bg-[#11131A] hover:text-[#F6F0E2] transition-[background-color,color] cursor-pointer"
          >
            <X weight="bold" className="w-4 h-4" />
          </button>
        </div>

        {/* 4 Lacquer Suit Plaques */}
        <div className="p-5">
          <div className="grid grid-cols-2 gap-3 mb-4">
            {SUIT_OPTIONS.map((c) => {
              const IconComp = c.Icon;
              return (
                <button
                  key={c.key}
                  type="button"
                  onMouseEnter={() => sounds.cardHover()}
                  onClick={() => {
                    sounds.colorSelect(c.key);
                    onSelectColor(c.key);
                  }}
                  style={{ backgroundColor: c.bg }}
                  className={`group relative h-24 rounded-[8px] p-3 flex flex-col justify-between text-left border-2 border-[#F6F0E2]/30 hover:border-[#F6F0E2] transition-[transform,border-color] duration-150 hover:-translate-y-0.5 active:scale-95 ${c.text} cursor-pointer`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-sekouno-mono text-[10px] font-bold opacity-80">
                      {c.code}
                    </span>
                    <IconComp weight="fill" className="w-4 h-4" />
                  </div>
                  <span className="font-sekouno-display font-black text-lg uppercase tracking-wide">
                    {c.name}
                  </span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => {
              sounds.buttonClick();
              onCancel();
            }}
            className="w-full py-2.5 rounded-[6px] bg-[#1B2230] hover:bg-[#252E40] border border-[#F6F0E2]/15 text-xs font-semibold text-[#D9D0BE] transition-[background-color] cursor-pointer"
          >
            Conserver ma carte en main
          </button>
        </div>
      </div>
    </dialog>
  );
};
