import React from 'react';
import { Card, CardColor, CardValue } from '../../../shared/types.js';
import { Ban, RefreshCw } from 'lucide-react';

interface CardViewProps {
  card?: Card;
  isPlayable?: boolean;
  isDimmed?: boolean;
  isSelected?: boolean;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
  showBack?: boolean;
  className?: string;
}

export const CardView: React.FC<CardViewProps> = ({
  card,
  isPlayable = false,
  isDimmed = false,
  isSelected = false,
  onClick,
  size = 'md',
  showBack = false,
  className = '',
}) => {
  // Dimension classes tuned for mobile zero-scroll and desktop comfort
  const sizeClasses = {
    sm: 'w-11 h-16 text-xs rounded-lg',
    md: 'w-16 h-24 sm:w-20 sm:h-30 md:w-22 md:h-34 text-sm md:text-base rounded-xl',
    lg: 'w-24 h-36 md:w-28 md:h-42 text-lg rounded-2xl',
  }[size];

  // If showing card back (for draw pile or opponent cards)
  if (showBack || !card) {
    return (
      <div
        onClick={onClick}
        className={`${sizeClasses} relative flex-shrink-0 bg-slate-900 border-2 border-white/80 uno-card-shadow flex items-center justify-center cursor-pointer select-none overflow-hidden ${className}`}
      >
        <div className="absolute inset-1 bg-red-600 rounded-lg flex items-center justify-center overflow-hidden">
          <div className="w-12 h-7 sm:w-14 sm:h-9 bg-yellow-400 uno-oval flex items-center justify-center shadow-inner">
            <span className="font-black italic text-slate-900 text-xs sm:text-sm md:text-base tracking-tighter">
              SEKO
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Card color background
  const getBgColor = (color: CardColor) => {
    switch (color) {
      case 'red':
        return 'from-red-500 to-red-700 border-red-300';
      case 'blue':
        return 'from-blue-500 to-blue-700 border-blue-300';
      case 'green':
        return 'from-emerald-500 to-emerald-700 border-emerald-300';
      case 'yellow':
        return 'from-amber-400 to-amber-600 border-amber-200 text-slate-900';
      case 'black':
        return 'from-slate-800 to-slate-950 border-purple-400';
      default:
        return 'from-slate-700 to-slate-900 border-slate-500';
    }
  };

  // Render symbol/content in center and corners
  const renderCardContent = (val: CardValue, color: CardColor, isCorner = false) => {
    if (val === 'skip') {
      return <Ban className={isCorner ? 'w-3 h-3 md:w-4 md:h-4' : 'w-6 h-6 md:w-9 md:h-9'} />;
    }
    if (val === 'reverse') {
      return <RefreshCw className={isCorner ? 'w-3 h-3 md:w-4 md:h-4' : 'w-6 h-6 md:w-9 md:h-9'} />;
    }
    if (val === 'draw2') {
      return <span className={`font-black italic ${isCorner ? 'text-xs' : 'text-lg md:text-2xl'}`}>+2</span>;
    }
    if (val === 'wild') {
      if (isCorner) {
        return <span className="font-black italic text-xs">★</span>;
      }
      return (
        <div className="w-6 h-6 sm:w-8 sm:h-8 md:w-11 md:h-11 rounded-full overflow-hidden grid grid-cols-2 shadow-md border-2 border-white">
          <div className="bg-red-500" />
          <div className="bg-blue-500" />
          <div className="bg-amber-400" />
          <div className="bg-emerald-500" />
        </div>
      );
    }
    if (val === 'wild4') {
      if (isCorner) {
        return <span className="font-black italic text-xs">+4</span>;
      }
      return (
        <div className="flex flex-col items-center">
          <div className="w-6 h-6 sm:w-7 sm:h-7 md:w-9 md:h-9 rounded-full overflow-hidden grid grid-cols-2 shadow-md border-2 border-white mb-0.5">
            <div className="bg-red-500" />
            <div className="bg-blue-500" />
            <div className="bg-amber-400" />
            <div className="bg-emerald-500" />
          </div>
          {/* Black text so it is clearly readable on the white oval */}
          <span className="font-black italic text-slate-950 text-xs md:text-sm drop-shadow-sm">+4</span>
        </div>
      );
    }

    // Number with underline for 6 and 9
    const showUnderline = val === '6' || val === '9';
    return (
      <span className={`font-black italic tracking-tighter ${showUnderline ? 'underline decoration-2' : ''} ${isCorner ? 'text-xs sm:text-sm md:text-base' : 'text-2xl sm:text-3xl md:text-5xl'}`}>
        {val}
      </span>
    );
  };

  const isYellow = card.color === 'yellow';

  return (
    <button
      type="button"
      onClick={isPlayable || onClick ? onClick : undefined}
      disabled={(!isPlayable && !onClick) || isDimmed}
      className={`
        ${sizeClasses}
        relative flex-shrink-0 bg-gradient-to-br ${getBgColor(card.color)}
        border-2 uno-card-shadow flex items-center justify-center select-none overflow-hidden
        transition-all duration-200 transform
        ${isPlayable ? '-translate-y-2.5 sm:-translate-y-3.5 hover:-translate-y-6 hover:scale-105 cursor-pointer uno-card-shadow-active ring-2 ring-amber-400 brightness-105 z-10' : ''}
        ${isDimmed ? 'brightness-[0.62] contrast-[0.95] cursor-not-allowed scale-[0.98]' : ''}
        ${!isPlayable && !isDimmed ? 'cursor-default brightness-95' : ''}
        ${isSelected ? '-translate-y-6 ring-4 ring-amber-300 scale-105 z-20' : ''}
        ${className}
      `}
    >
      {/* Glossy overlay effect */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-transparent to-black/25 pointer-events-none" />

      {/* Top Left Corner */}
      <div className={`absolute top-1 left-1.5 flex flex-col items-center font-bold ${isYellow ? 'text-slate-900' : 'text-white'}`}>
        {renderCardContent(card.value, card.color, true)}
      </div>

      {/* Center White Oval */}
      <div className={`
        ${size === 'sm' ? 'w-8 h-12' : size === 'lg' ? 'w-20 h-28 md:w-24 md:h-32' : 'w-14 h-22 md:w-16 md:h-24'}
        bg-white/95 rounded-full uno-oval flex items-center justify-center shadow-md border border-black/10
        ${card.color === 'red' ? 'text-red-600' : card.color === 'blue' ? 'text-blue-600' : card.color === 'green' ? 'text-emerald-600' : card.color === 'yellow' ? 'text-amber-500' : 'text-slate-900'}
      `}>
        <div className="transform rotate-25">
          {renderCardContent(card.value, card.color, false)}
        </div>
      </div>

      {/* Bottom Right Corner (inverted) */}
      <div className={`absolute bottom-1 right-1.5 flex flex-col items-center font-bold transform rotate-180 ${isYellow ? 'text-slate-900' : 'text-white'}`}>
        {renderCardContent(card.value, card.color, true)}
      </div>
    </button>
  );
};
