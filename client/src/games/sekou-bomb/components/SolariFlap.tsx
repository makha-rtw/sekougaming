import React, { useEffect, useRef } from 'react';
import { useReducedMotion } from 'motion/react';

export type SolariSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type SolariTone = 'ink' | 'vermilion' | 'cobalt' | 'amber';

interface SolariFlapTileProps {
  char: string;
  size?: SolariSize;
  tone?: SolariTone;
}

const SIZE_CLASSES: Record<SolariSize, string> = {
  xs: 'w-6 h-8 text-base rounded-[3px]',
  sm: 'w-8 h-10 sm:w-9 sm:h-12 text-xl sm:text-2xl rounded-[4px]',
  md: 'w-10 h-13 sm:w-12 sm:h-16 text-2xl sm:text-3xl rounded-[5px]',
  lg: 'w-14 h-18 sm:w-18 sm:h-24 text-4xl sm:text-6xl rounded-[6px]',
  xl: 'w-16 h-20 sm:w-22 sm:h-28 text-5xl sm:text-7xl rounded-[6px]',
};

const TONE_CLASSES: Record<SolariTone, { bg: string; text: string; border: string }> = {
  ink: {
    bg: 'bg-[#141312]',
    text: 'text-[#FAF6EE]',
    border: 'border-[#2E2C29]',
  },
  vermilion: {
    bg: 'bg-[#E5382B]',
    text: 'text-[#FAF6EE]',
    border: 'border-[#141312]',
  },
  cobalt: {
    bg: 'bg-[#1D4ED8]',
    text: 'text-[#FAF6EE]',
    border: 'border-[#141312]',
  },
  amber: {
    bg: 'bg-[#E59A00]',
    text: 'text-[#141312]',
    border: 'border-[#141312]',
  },
};

export const SolariFlapTile: React.FC<SolariFlapTileProps> = ({
  char,
  size = 'md',
  tone = 'ink',
}) => {
  const reduceMotion = useReducedMotion();
  const displayChar = (char || ' ').slice(0, 1).toUpperCase();
  const palette = TONE_CLASSES[tone];

  return (
    <div
      key={`${displayChar}-${tone}`}
      className={`relative inline-flex items-center justify-center select-none border-2 ${palette.bg} ${palette.text} ${palette.border} ${SIZE_CLASSES[size]} shadow-[0_3px_0_#141312] overflow-hidden ${
        reduceMotion ? '' : 'solari-flap-enter'
      }`}
      aria-hidden="true"
    >
      {/* Subtle top half sheen */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-white/[0.05]" />

      {/* Character glyph */}
      <span className="font-bomb-display font-black leading-none tracking-normal z-10">
        {displayChar}
      </span>

      {/* Mechanical horizontal split-flap axle seam */}
      <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 h-[2px] bg-[#090808]/85 z-20" />

      {/* Left & right hinge notches */}
      <div className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[6px] bg-[#FAF6EE]/35 z-20" />
      <div className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 w-[3px] h-[6px] bg-[#FAF6EE]/35 z-20" />
    </div>
  );
};

interface SolariWordStripProps {
  text: string;
  size?: SolariSize;
  tone?: SolariTone;
  minSlots?: number;
  label?: string;
}

export const SolariWordStrip: React.FC<SolariWordStripProps> = ({
  text,
  size = 'lg',
  tone = 'ink',
  minSlots,
  label,
}) => {
  const clean = text.toUpperCase();
  const totalSlots = minSlots ? Math.max(minSlots, clean.length) : clean.length;
  const padded = clean.padEnd(totalSlots, ' ');

  return (
    <div
      role="img"
      aria-label={label || clean}
      className="inline-flex items-center gap-1.5 sm:gap-2 p-2 sm:p-2.5 bg-[#E6DEC8] border-2 border-[#141312] rounded-[8px] shadow-[3px_3px_0_#141312]"
    >
      {Array.from(padded).map((ch, idx) => (
        <SolariFlapTile key={`${idx}-${ch}`} char={ch} size={size} tone={tone} />
      ))}
    </div>
  );
};

interface BombLightDialogProps {
  open: boolean;
  onClose: () => void;
  ariaLabel: string;
  children: React.ReactNode;
  maxWidthClass?: string;
}

/**
 * Native <dialog closedby="any"> modal with click-outside backdrop fallback
 * for browsers where closedby="any" is still rolling out (e.g. Safari).
 */
export const BombLightDialog: React.FC<BombLightDialogProps> = ({
  open,
  onClose,
  ariaLabel,
  children,
  maxWidthClass = 'max-w-md',
}) => {
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
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
  }, [open]);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === dialogRef.current) {
      onClose();
    }
  };

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      closedby="any"
      aria-label={ariaLabel}
      onClose={onClose}
      onClick={handleBackdropClick}
      className={`sekou-dialog ${maxWidthClass}`}
    >
      <div onClick={(e) => e.stopPropagation()}>{children}</div>
    </dialog>
  );
};
