import React, { useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Heart, CrownSimple, Fire, Skull, X, Sparkle } from '@phosphor-icons/react';

/* =========================================================================
   POP BRUTALIST UI FOR SEKOU BOMB
   Style : Brutalisme pop, tactile, ultra-contrasté, avec de superbes couleurs
   vives (Lime acide, Jaune canari, Corail électrique, Cyan laser, Lilas)
   sur fond sombre élégant, avec bordures noires nettes et ombres dures (offset shadows).
   ========================================================================= */

export type PopColor = 'yellow' | 'lime' | 'coral' | 'cyan' | 'lavender' | 'pink' | 'white' | 'dark';

export const POP_COLOR_MAP: Record<PopColor, { bg: string; text: string; border: string }> = {
  yellow: { bg: 'bg-[#FFE600]', text: 'text-black', border: 'border-black' },
  lime: { bg: 'bg-[#CCFF00]', text: 'text-black', border: 'border-black' },
  coral: { bg: 'bg-[#FF5B36]', text: 'text-white', border: 'border-black' },
  cyan: { bg: 'bg-[#00F0FF]', text: 'text-black', border: 'border-black' },
  lavender: { bg: 'bg-[#B8A1FF]', text: 'text-black', border: 'border-black' },
  pink: { bg: 'bg-[#FF66C4]', text: 'text-black', border: 'border-black' },
  white: { bg: 'bg-white', text: 'text-black', border: 'border-black' },
  dark: { bg: 'bg-[#181B26]', text: 'text-white', border: 'border-black' },
};

interface BrutalistCardProps {
  children: React.ReactNode;
  color?: PopColor;
  className?: string;
  depth?: 'sm' | 'md' | 'lg';
}

export const BrutalistCard: React.FC<BrutalistCardProps> = ({
  children,
  color = 'white',
  className = '',
  depth = 'md',
}) => {
  const c = POP_COLOR_MAP[color];
  const shadowClass =
    depth === 'sm'
      ? 'shadow-[3px_3px_0_#000]'
      : depth === 'lg'
      ? 'shadow-[6px_6px_0_#000] sm:shadow-[8px_8px_0_#000]'
      : 'shadow-[4px_4px_0_#000] sm:shadow-[6px_6px_0_#000]';

  return (
    <div
      className={`rounded-2xl sm:rounded-3xl border-3 border-black ${c.bg} ${c.text} ${shadowClass} transition-transform ${className}`}
    >
      {children}
    </div>
  );
};

interface BrutalistButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
  color?: PopColor;
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const BrutalistButton: React.FC<BrutalistButtonProps> = ({
  children,
  onClick,
  type = 'button',
  color = 'coral',
  disabled = false,
  className = '',
  size = 'md',
}) => {
  const c = POP_COLOR_MAP[color];
  const sizeClasses = {
    sm: 'py-2 px-3.5 text-xs rounded-xl shadow-[3px_3px_0_#000]',
    md: 'py-3 px-5 text-sm sm:text-base rounded-2xl shadow-[4px_4px_0_#000]',
    lg: 'py-4 px-6 text-base sm:text-lg rounded-2xl shadow-[5px_5px_0_#000]',
  }[size];

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`font-black uppercase tracking-wider border-3 border-black ${c.bg} ${c.text} ${sizeClasses} active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0_#000] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed select-none flex items-center justify-center gap-2 ${className}`}
    >
      {children}
    </button>
  );
};

interface BrutalistBadgeProps {
  children: React.ReactNode;
  color?: PopColor;
  className?: string;
  icon?: React.ReactNode;
}

export const BrutalistBadge: React.FC<BrutalistBadgeProps> = ({
  children,
  color = 'yellow',
  className = '',
  icon,
}) => {
  const c = POP_COLOR_MAP[color];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl border-2 border-black ${c.bg} ${c.text} shadow-[2px_2px_0_#000] text-xs font-black uppercase tracking-wider select-none ${className}`}
    >
      {icon}
      <span>{children}</span>
    </span>
  );
};

interface BrutalistChallengeBoxProps {
  prompt: string;
  isCritical?: boolean;
  isMyTurn?: boolean;
  onClick?: () => void;
}

export const BrutalistChallengeBox: React.FC<BrutalistChallengeBoxProps> = ({
  prompt,
  isCritical = false,
  isMyTurn = false,
  onClick,
}) => {
  const reduceMotion = useReducedMotion();
  const letters = (prompt || '...').toUpperCase().split('');
  const boxColor = isCritical ? 'bg-[#FF5B36]' : isMyTurn ? 'bg-[#FFE600]' : 'bg-[#CCFF00]';

  return (
    <div
      onClick={onClick}
      className={`relative rounded-3xl border-3 border-black ${boxColor} p-5 sm:p-7 shadow-[6px_6px_0_#000] text-center select-none ${
        onClick ? 'cursor-pointer' : ''
      }`}
    >
      <div className="flex items-center justify-center gap-2 mb-2">
        <span className="inline-block px-3 py-0.5 rounded-lg bg-black text-white font-mono text-[11px] font-black uppercase tracking-widest">
          Syllabe Imposée
        </span>
      </div>

      {/* Syllable Letters as bold pop stickers */}
      <motion.div
        animate={
          reduceMotion
            ? {}
            : isCritical
            ? { scale: [1, 1.06, 0.96, 1.04, 1] }
            : {}
        }
        transition={{ duration: 0.35, repeat: isCritical ? Infinity : 0 }}
        className="flex items-center justify-center gap-2 sm:gap-3 my-2"
      >
        {letters.map((char, i) => (
          <span
            key={`${i}-${char}`}
            className="w-16 h-20 sm:w-20 sm:h-24 rounded-2xl bg-white text-black border-3 border-black font-black text-5xl sm:text-6xl flex items-center justify-center shadow-[4px_4px_0_#000]"
          >
            {char}
          </span>
        ))}
      </motion.div>
    </div>
  );
};

interface BrutalistFuseBarProps {
  progressRatio: number;
  remainingMs: number;
  isCritical?: boolean;
}

export const BrutalistFuseBar: React.FC<BrutalistFuseBarProps> = ({
  progressRatio,
  remainingMs,
  isCritical = false,
}) => {
  const clamped = Math.max(0, Math.min(1, progressRatio));
  const sec = (Math.max(0, remainingMs) / 1000).toFixed(1);

  return (
    <div className="space-y-1.5 select-none">
      <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-black">
        <span className="flex items-center gap-1.5">
          <Fire weight="fill" className={`w-4 h-4 ${isCritical ? 'text-[#FF5B36] animate-bounce' : 'text-black'}`} />
          Mèche de la bombe
        </span>
        <span
          className={`font-mono text-sm font-black px-2.5 py-0.5 rounded-lg border-2 border-black ${
            isCritical
              ? 'bg-[#FF5B36] text-white shadow-[2px_2px_0_#000] animate-pulse'
              : 'bg-white text-black shadow-[2px_2px_0_#000]'
          }`}
        >
          {sec}s
        </span>
      </div>

      {/* Progress track */}
      <div className="relative w-full h-5 rounded-xl bg-white border-3 border-black shadow-[3px_3px_0_#000] overflow-hidden p-0.5">
        <div
          className={`h-full rounded-lg transition-transform duration-75 ease-linear border-r-2 border-black ${
            isCritical ? 'bg-[#FF5B36]' : 'bg-[#FFE600]'
          }`}
          style={{
            transform: `scaleX(${clamped})`,
            transformOrigin: 'left center',
          }}
        />
      </div>
    </div>
  );
};

interface BrutalistPlayerTagProps {
  id: string;
  name: string;
  lives: number;
  maxLives: number;
  isHolder: boolean;
  isEliminated: boolean;
  isHost?: boolean;
  isMe?: boolean;
  currentTyping?: string;
  lastWord?: string;
  lastWordStatus?: 'valid' | 'invalid' | null;
  avatarIndex?: number;
}

const BRUTALIST_COLORS: PopColor[] = ['lime', 'yellow', 'cyan', 'lavender', 'pink', 'coral'];

export const BrutalistPlayerTag: React.FC<BrutalistPlayerTagProps> = ({
  name,
  lives,
  maxLives,
  isHolder,
  isEliminated,
  isHost = false,
  isMe = false,
  currentTyping,
  lastWord,
  lastWordStatus,
  avatarIndex = 0,
}) => {
  const cardColor = BRUTALIST_COLORS[avatarIndex % BRUTALIST_COLORS.length];
  const initial = (name.trim().slice(0, 1) || '?').toUpperCase();

  return (
    <div
      className={`shrink-0 min-w-[8.5rem] sm:min-w-[9.5rem] rounded-2xl border-3 border-black p-3 transition-all select-none ${
        isEliminated
          ? 'bg-slate-200 text-slate-500 opacity-50 shadow-[2px_2px_0_#000]'
          : isHolder
          ? 'bg-[#FF5B36] text-white shadow-[5px_5px_0_#000] -translate-y-1'
          : 'bg-white text-black shadow-[3px_3px_0_#000]'
      }`}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between gap-1.5 mb-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className={`w-7 h-7 rounded-lg border-2 border-black flex items-center justify-center font-black text-xs shrink-0 ${
              POP_COLOR_MAP[cardColor].bg
            } ${POP_COLOR_MAP[cardColor].text}`}
          >
            {initial}
          </span>
          <span className="font-black text-xs truncate">{name}</span>
        </div>

        {isHost && (
          <span className="w-5 h-5 rounded-md bg-[#FFE600] text-black border border-black flex items-center justify-center shrink-0">
            <CrownSimple weight="fill" className="w-3 h-3" />
          </span>
        )}
        {isHolder && !isEliminated && (
          <span className="w-5 h-5 rounded-md bg-white text-black border border-black flex items-center justify-center shrink-0 animate-bounce">
            <Fire weight="fill" className="w-3 h-3 text-[#FF5B36]" />
          </span>
        )}
        {isEliminated && (
          <span className="w-5 h-5 rounded-md bg-black text-white border border-black flex items-center justify-center shrink-0">
            <Skull weight="fill" className="w-3 h-3" />
          </span>
        )}
      </div>

      {/* Hearts */}
      <div className="flex items-center gap-1 py-0.5">
        {Array.from({ length: maxLives }).map((_, i) => (
          <Heart
            key={i}
            weight={i < lives ? 'fill' : 'bold'}
            className={`w-3.5 h-3.5 ${
              i < lives
                ? isHolder
                  ? 'text-white'
                  : 'text-[#FF5B36]'
                : isHolder
                ? 'text-white/35'
                : 'text-black/25'
            }`}
          />
        ))}
      </div>

      {/* Live typing or word status */}
      <div className="mt-1 h-4 flex items-center text-[10px] font-bold truncate">
        {isEliminated ? (
          <span className="uppercase text-slate-500">Éliminé</span>
        ) : isHolder && currentTyping ? (
          <span className="truncate underline font-mono">{currentTyping}</span>
        ) : lastWord ? (
          <span
            className={`truncate ${
              lastWordStatus === 'valid'
                ? isHolder
                  ? 'text-[#CCFF00]'
                  : 'text-[#0B7A53]'
                : isHolder
                ? 'text-white line-through'
                : 'text-[#FF5B36] line-through'
            }`}
          >
            {lastWord}
          </span>
        ) : (
          <span className="opacity-60 italic text-[9px]">{isHolder ? 'Tape un mot...' : 'Attend'}</span>
        )}
      </div>
    </div>
  );
};

interface BrutalistDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidthClass?: string;
  color?: PopColor;
}

export const BrutalistDialog: React.FC<BrutalistDialogProps> = ({
  open,
  onClose,
  title,
  children,
  maxWidthClass = 'max-w-md',
  color = 'white',
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
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }
  }, [open]);

  const c = POP_COLOR_MAP[color];

  return (
    <dialog
      ref={dialogRef}
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === dialogRef.current) {
          onClose();
        }
      }}
      className={`sekou-dialog ${maxWidthClass}`}
    >
      <div
        className={`relative rounded-3xl border-3 border-black ${c.bg} ${c.text} p-6 shadow-[8px_8px_0_#000] select-none`}
      >
        <div className="flex items-center justify-between pb-3 mb-4 border-b-2 border-black">
          <h3 className="text-xl font-black uppercase tracking-tight">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="w-8 h-8 rounded-xl bg-black text-white hover:bg-[#FF5B36] flex items-center justify-center transition-colors cursor-pointer border border-black"
          >
            <X weight="bold" className="w-4 h-4" />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
};
