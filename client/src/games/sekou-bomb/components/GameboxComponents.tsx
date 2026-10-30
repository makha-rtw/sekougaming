import React, { useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Heart, CrownSimple, Fire, Skull, X } from '@phosphor-icons/react';

interface GameboxCardProps {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
}

export const GameboxCard: React.FC<GameboxCardProps> = ({
  children,
  className = '',
  glow = false,
}) => {
  return (
    <div
      className={`relative rounded-3xl bg-[#171E30] border border-white/10 shadow-xl shadow-black/30 overflow-hidden ${
        glow ? 'ring-1 ring-[#FF5722]/40 shadow-[#FF5722]/10' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
};

interface GameboxBadgeProps {
  children: React.ReactNode;
  tone?: 'coral' | 'gold' | 'emerald' | 'cobalt' | 'crimson' | 'neutral';
  className?: string;
  icon?: React.ReactNode;
}

export const GameboxBadge: React.FC<GameboxBadgeProps> = ({
  children,
  tone = 'coral',
  className = '',
  icon,
}) => {
  const toneClasses = {
    coral: 'bg-[#FF5722]/15 text-[#FF7043] border-[#FF5722]/30',
    gold: 'bg-[#FFB300]/15 text-[#FFCA28] border-[#FFB300]/30',
    emerald: 'bg-[#10B981]/15 text-[#34D399] border-[#10B981]/30',
    cobalt: 'bg-[#3B82F6]/15 text-[#60A5FA] border-[#3B82F6]/30',
    crimson: 'bg-[#EF4444]/15 text-[#F87171] border-[#EF4444]/30',
    neutral: 'bg-white/5 text-slate-300 border-white/10',
  }[tone];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase border ${toneClasses} ${className}`}
    >
      {icon}
      <span>{children}</span>
    </span>
  );
};

interface GameboxChallengePromptProps {
  prompt: string;
  isCritical?: boolean;
  isMyTurn?: boolean;
  onClick?: () => void;
}

export const GameboxChallengePrompt: React.FC<GameboxChallengePromptProps> = ({
  prompt,
  isCritical = false,
  isMyTurn = false,
  onClick,
}) => {
  const reduceMotion = useReducedMotion();
  const letters = (prompt || '...').toUpperCase().split('');

  return (
    <div
      onClick={onClick}
      className={`relative flex flex-col items-center justify-center py-4 sm:py-6 px-4 rounded-2xl bg-[#111625] border transition-colors ${
        isCritical
          ? 'border-[#EF4444]/60 bg-[#16121D]'
          : isMyTurn
          ? 'border-[#FF5722]/40'
          : 'border-white/5'
      } ${onClick ? 'cursor-pointer' : ''}`}
    >
      {/* Ambient Radial Spotlight */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background: isCritical
            ? 'radial-gradient(circle at 50% 50%, rgba(239, 68, 68, 0.22) 0%, transparent 70%)'
            : 'radial-gradient(circle at 50% 50%, rgba(255, 87, 34, 0.18) 0%, transparent 70%)',
        }}
      />

      {/* Syllable Letters */}
      <motion.div
        animate={
          reduceMotion
            ? {}
            : isCritical
            ? { scale: [1, 1.05, 1] }
            : {}
        }
        transition={{ duration: 0.35, repeat: isCritical ? Infinity : 0 }}
        className="relative z-10 flex items-center justify-center gap-2 sm:gap-3"
      >
        {letters.map((char, index) => (
          <span
            key={`${index}-${char}`}
            className="flex items-center justify-center min-w-[3rem] sm:min-w-[4rem] h-16 sm:h-22 px-3 sm:px-4 rounded-2xl bg-[#1A2238] border border-white/10 text-white font-black text-4xl sm:text-6xl tracking-wider shadow-lg shadow-black/40 select-none"
          >
            {char}
          </span>
        ))}
      </motion.div>
    </div>
  );
};

interface GameboxFuseBarProps {
  progressRatio: number;
  remainingMs: number;
  isCritical?: boolean;
}

export const GameboxFuseBar: React.FC<GameboxFuseBarProps> = ({
  progressRatio,
  remainingMs,
  isCritical = false,
}) => {
  const clampedRatio = Math.max(0, Math.min(1, progressRatio));
  const secondsDisplay = (Math.max(0, remainingMs) / 1000).toFixed(1);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs font-bold text-slate-300">
        <span className="flex items-center gap-1.5 uppercase tracking-wider text-[11px] text-slate-400">
          <Fire weight="fill" className={`w-3.5 h-3.5 ${isCritical ? 'text-[#EF4444]' : 'text-[#FF5722]'}`} />
          Mèche de la bombe
        </span>
        <span
          className={`font-mono text-sm sm:text-base font-extrabold px-2.5 py-0.5 rounded-full ${
            isCritical ? 'bg-[#EF4444] text-white animate-pulse' : 'bg-white/10 text-white'
          }`}
        >
          {secondsDisplay}s
        </span>
      </div>

      <div className="relative w-full h-3 rounded-full bg-[#111625] overflow-hidden p-0.5 border border-white/5">
        <div
          className={`h-full rounded-full transition-transform duration-75 ease-linear ${
            isCritical
              ? 'bg-gradient-to-r from-[#FF5722] to-[#EF4444]'
              : 'bg-gradient-to-r from-[#FFB300] to-[#FF5722]'
          }`}
          style={{
            transform: `scaleX(${clampedRatio})`,
            transformOrigin: 'left center',
          }}
        />
      </div>
    </div>
  );
};

interface GameboxPlayerCardProps {
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
  currentPrompt?: string;
  avatarColorIndex?: number;
}

const AVATAR_COLORS = [
  'bg-[#FF5722]',
  'bg-[#3B82F6]',
  'bg-[#10B981]',
  'bg-[#FFB300]',
  'bg-[#8B5CF6]',
  'bg-[#EC4899]',
  'bg-[#06B6D4]',
  'bg-[#F97316]',
];

export const GameboxPlayerCard: React.FC<GameboxPlayerCardProps> = ({
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
  avatarColorIndex = 0,
}) => {
  const avatarBg = AVATAR_COLORS[avatarColorIndex % AVATAR_COLORS.length];
  const initial = name.trim().slice(0, 1).toUpperCase() || '?';

  return (
    <div
      className={`relative shrink-0 min-w-[136px] sm:min-w-[156px] rounded-2xl p-3 border transition-all ${
        isEliminated
          ? 'bg-[#111625]/60 border-white/5 opacity-45'
          : isHolder
          ? 'bg-[#1F2942] border-[#FF5722] shadow-lg shadow-[#FF5722]/20 -translate-y-1'
          : 'bg-[#171E30] border-white/10 hover:border-white/20'
      }`}
    >
      {/* Top Row: Avatar & Status */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={`w-8 h-8 rounded-full ${avatarBg} text-white font-extrabold text-sm flex items-center justify-center shrink-0 shadow-md`}
          >
            {initial}
          </div>
          <div className="min-w-0">
            <div className="text-xs sm:text-sm font-bold text-white truncate flex items-center gap-1">
              <span>{name}</span>
              {isHost && (
                <CrownSimple weight="fill" className="w-3.5 h-3.5 text-[#FFB300] shrink-0" />
              )}
            </div>
            {isMe && (
              <span className="text-[10px] font-bold text-[#60A5FA] uppercase tracking-wider block">
                Toi
              </span>
            )}
          </div>
        </div>

        {isHolder && (
          <span className="w-6 h-6 rounded-full bg-[#FF5722] text-white flex items-center justify-center shrink-0 shadow-sm shadow-[#FF5722]/50 animate-bounce">
            <Fire weight="fill" className="w-3.5 h-3.5" />
          </span>
        )}
        {isEliminated && (
          <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center shrink-0">
            <Skull weight="fill" className="w-3.5 h-3.5" />
          </span>
        )}
      </div>

      {/* Hearts Bar */}
      <div className="flex items-center gap-1 py-1">
        {Array.from({ length: maxLives }).map((_, i) => (
          <Heart
            key={i}
            weight={i < lives ? 'fill' : 'regular'}
            className={`w-3.5 h-3.5 ${
              i < lives ? 'text-[#EF4444]' : 'text-slate-600'
            }`}
          />
        ))}
      </div>

      {/* Real-time typing or last word display */}
      <div className="mt-1 h-5 flex items-center text-[11px] font-medium text-slate-300 truncate">
        {isEliminated ? (
          <span className="text-slate-500 font-bold uppercase text-[10px]">Éliminé</span>
        ) : isHolder && currentTyping ? (
          <span className="text-white font-bold truncate">
            {currentTyping}
          </span>
        ) : lastWord ? (
          <span
            className={`truncate font-semibold ${
              lastWordStatus === 'valid' ? 'text-[#10B981]' : 'text-[#EF4444] line-through'
            }`}
          >
            {lastWord}
          </span>
        ) : (
          <span className="text-slate-500 italic text-[10px]">
            {isHolder ? 'En train d’écrire...' : 'En attente'}
          </span>
        )}
      </div>
    </div>
  );
};

interface GameboxDialogProps {
  open: boolean;
  onClose: () => void;
  ariaLabel: string;
  children: React.ReactNode;
  maxWidthClass?: string;
}

export const GameboxDialog: React.FC<GameboxDialogProps> = ({
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
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-label={ariaLabel}
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
      <div className="relative rounded-3xl bg-[#171E30] border border-white/10 p-6 shadow-2xl shadow-black/80 text-white select-none">
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white flex items-center justify-center border border-white/10 transition-colors cursor-pointer"
        >
          <X weight="bold" className="w-4 h-4" />
        </button>
        {children}
      </div>
    </dialog>
  );
};
