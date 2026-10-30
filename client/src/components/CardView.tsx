import React from 'react';
import { Card, CardColor, CardValue } from '../../../shared/types.js';
import { Prohibit, ArrowsClockwise, Diamond, Circle, Triangle, Square, StarFour } from '@phosphor-icons/react';
import { sounds } from '../utils/sound.js';

interface CardViewProps {
  card?: Card;
  isPlayable?: boolean;
  isDimmed?: boolean;
  isSelected?: boolean;
  isNewlyDrawn?: boolean;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
  showBack?: boolean;
  className?: string;
}

const SUIT_THEME: Record<
  CardColor,
  {
    bg: string;
    accentBorder: string;
    glyphColor: string;
    cornerColor: string;
    cartoucheBg: string;
  }
> = {
  red: {
    bg: '#D92D20',
    accentBorder: 'rgba(255, 240, 235, 0.36)',
    glyphColor: '#B42318',
    cornerColor: '#FAF6EE',
    cartoucheBg: '#F6F0E2',
  },
  blue: {
    bg: '#155EEF',
    accentBorder: 'rgba(230, 240, 255, 0.38)',
    glyphColor: '#1547B8',
    cornerColor: '#FAF6EE',
    cartoucheBg: '#F6F0E2',
  },
  green: {
    bg: '#099250',
    accentBorder: 'rgba(225, 255, 238, 0.36)',
    glyphColor: '#067647',
    cornerColor: '#FAF6EE',
    cartoucheBg: '#F6F0E2',
  },
  yellow: {
    bg: '#DC9B06',
    accentBorder: 'rgba(255, 250, 225, 0.5)',
    glyphColor: '#9A6700',
    cornerColor: '#141312',
    cartoucheBg: '#FBF8F1',
  },
  black: {
    bg: '#141720',
    accentBorder: 'rgba(212, 165, 72, 0.55)',
    glyphColor: '#141720',
    cornerColor: '#F6F0E2',
    cartoucheBg: '#F6F0E2',
  },
};

export const SuitPip: React.FC<{ color: CardColor; className?: string }> = ({
  color,
  className = 'w-2 h-2',
}) => {
  switch (color) {
    case 'red':
      return <Diamond weight="fill" className={className} />;
    case 'blue':
      return <Circle weight="fill" className={className} />;
    case 'green':
      return <Triangle weight="fill" className={className} />;
    case 'yellow':
      return <Square weight="fill" className={className} />;
    default:
      return <StarFour weight="fill" className={`${className} text-[#D4A548]`} />;
  }
};

export const CardView: React.FC<CardViewProps> = ({
  card,
  isPlayable = false,
  isDimmed = false,
  isSelected = false,
  isNewlyDrawn = false,
  onClick,
  size = 'md',
  showBack = false,
  className = '',
}) => {
  const sizeConfig = {
    sm: {
      box: 'w-12 h-[4.4rem] rounded-[8px] p-[2.5px] border-b-[2px]',
      innerRadius: 'rounded-[6px]',
      cartouche: 'w-8 h-10 rounded-[6px]',
      centerText: 'text-xl',
      cornerText: 'text-[10px]',
      cornerPosTop: 'top-1 left-1',
      cornerPosBot: 'bottom-1 right-1',
      iconCenter: 'w-5 h-5',
      iconCorner: 'w-2.5 h-2.5',
      pipSize: 'w-1.5 h-1.5',
    },
    md: {
      box: 'w-[4.5rem] h-[6.6rem] sm:w-[5.2rem] sm:h-[7.6rem] md:w-[5.6rem] md:h-[8.2rem] rounded-[11px] p-[3.5px] border-b-[3px]',
      innerRadius: 'rounded-[8px]',
      cartouche: 'w-12 h-16 sm:w-14 sm:h-[4.6rem] md:w-[3.7rem] md:h-[5rem] rounded-[8px]',
      centerText: 'text-3xl sm:text-4xl md:text-[2.45rem]',
      cornerText: 'text-xs sm:text-[13px]',
      cornerPosTop: 'top-1.5 left-1.5',
      cornerPosBot: 'bottom-1.5 right-1.5',
      iconCenter: 'w-7 h-7 sm:w-8 sm:h-8',
      iconCorner: 'w-3 h-3 sm:w-3.5 sm:h-3.5',
      pipSize: 'w-2 h-2',
    },
    lg: {
      box: 'w-24 h-36 md:w-28 md:h-42 rounded-[14px] p-[4.5px] border-b-[4px]',
      innerRadius: 'rounded-[10px]',
      cartouche: 'w-16 h-22 md:w-20 md:h-26 rounded-[10px]',
      centerText: 'text-4xl md:text-5xl',
      cornerText: 'text-sm md:text-base',
      cornerPosTop: 'top-2 left-2',
      cornerPosBot: 'bottom-2 right-2',
      iconCenter: 'w-9 h-9 md:w-11 md:h-11',
      iconCorner: 'w-4 h-4',
      pipSize: 'w-2.5 h-2.5',
    },
  }[size];

  // Architectural Salon Card Back (Draw pile & hidden hands)
  if (showBack || !card) {
    return (
      <div
        onClick={onClick}
        onMouseEnter={() => onClick && sounds.cardHover()}
        className={`${sizeConfig.box} relative flex-shrink-0 bg-[#F6F0E2] border border-[#D5CCB8] border-b-[#B8AE99] uno-card-shadow flex items-center justify-center select-none overflow-hidden ${
          onClick ? 'cursor-pointer' : ''
        } ${className}`}
      >
        <div
          className={`w-full h-full ${sizeConfig.innerRadius} relative flex flex-col items-center justify-center overflow-hidden bg-[#121620] border border-[#D4A548]/50`}
        >
          {/* Architectural crosshatch inlay */}
          <div
            className="absolute inset-1 rounded-[5px] border border-[#D4A548]/30 pointer-events-none"
            style={{
              backgroundImage:
                'radial-gradient(rgba(212, 165, 72, 0.2) 1px, transparent 1px)',
              backgroundSize: '7px 7px',
            }}
          />

          {/* 4-Suit Architectural Crest */}
          <div className="relative z-10 flex flex-col items-center gap-1 px-1.5 py-2 rounded-[6px] bg-[#0D1017] border border-[#D4A548]/70 shadow-sm">
            <div className="grid grid-cols-2 gap-0.5">
              <span className="w-2 h-2 rounded-[1px] bg-[#D92D20]" />
              <span className="w-2 h-2 rounded-[1px] bg-[#155EEF]" />
              <span className="w-2 h-2 rounded-[1px] bg-[#DC9B06]" />
              <span className="w-2 h-2 rounded-[1px] bg-[#099250]" />
            </div>
            <span className="font-sekouno-display font-black tracking-wider text-[#F6F0E2] text-[9px] sm:text-[10px] leading-none">
              SEKO
            </span>
          </div>
        </div>
      </div>
    );
  }

  const theme = SUIT_THEME[card.color] || SUIT_THEME.black;

  const renderGlyph = (val: CardValue, isCorner = false) => {
    if (val === 'skip') {
      return (
        <Prohibit
          weight="bold"
          className={isCorner ? sizeConfig.iconCorner : sizeConfig.iconCenter}
        />
      );
    }
    if (val === 'reverse') {
      return (
        <ArrowsClockwise
          weight="bold"
          className={isCorner ? sizeConfig.iconCorner : sizeConfig.iconCenter}
        />
      );
    }
    if (val === 'draw2') {
      if (isCorner) {
        return <span className="font-sekouno-display font-black tracking-tighter">+2</span>;
      }
      return (
        <div className="flex flex-col items-center leading-none">
          <div className="relative w-7 h-5 sm:w-8 sm:h-6 mb-0.5">
            <div
              className="absolute left-0.5 top-0.5 w-3.5 h-4.5 rounded-[2px] border border-[#F6F0E2] -rotate-10"
              style={{ backgroundColor: theme.bg }}
            />
            <div
              className="absolute right-0.5 top-0 w-3.5 h-4.5 rounded-[2px] border border-[#F6F0E2] rotate-10"
              style={{ backgroundColor: theme.bg }}
            />
          </div>
          <span className="font-sekouno-display font-black text-base sm:text-lg tracking-tight">
            +2
          </span>
        </div>
      );
    }
    if (val === 'wild') {
      if (isCorner) {
        return <span className="font-sekouno-mono text-[10px] font-bold text-[#D4A548]">4C</span>;
      }
      return (
        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-[7px] p-[2px] bg-[#141720] border-2 border-[#D4A548] rotate-45 shadow-sm">
          <div className="w-full h-full rounded-[4px] overflow-hidden grid grid-cols-2 grid-rows-2">
            <div className="bg-[#D92D20]" />
            <div className="bg-[#155EEF]" />
            <div className="bg-[#DC9B06]" />
            <div className="bg-[#099250]" />
          </div>
        </div>
      );
    }
    if (val === 'wild4') {
      if (isCorner) {
        return <span className="font-sekouno-display font-black tracking-tighter text-[#D4A548]">+4</span>;
      }
      return (
        <div className="flex flex-col items-center leading-none">
          <div className="flex items-center justify-center -space-x-1 mb-1">
            <span className="w-3 h-4.5 rounded-[2px] bg-[#D92D20] border border-[#F6F0E2] -rotate-12" />
            <span className="w-3 h-4.5 rounded-[2px] bg-[#155EEF] border border-[#F6F0E2] -rotate-4" />
            <span className="w-3 h-4.5 rounded-[2px] bg-[#DC9B06] border border-[#F6F0E2] rotate-4" />
            <span className="w-3 h-4.5 rounded-[2px] bg-[#099250] border border-[#F6F0E2] rotate-12" />
          </div>
          <span className="font-sekouno-display font-black text-sm sm:text-base text-[#141720] tracking-tight">
            +4
          </span>
        </div>
      );
    }

    const showUnderline = val === '6' || val === '9';
    return (
      <span
        className={`font-sekouno-display font-black leading-none tracking-tight ${
          showUnderline ? 'underline decoration-2 underline-offset-2' : ''
        } ${isCorner ? sizeConfig.cornerText : sizeConfig.centerText}`}
      >
        {val}
      </span>
    );
  };

  return (
    <button
      type="button"
      onClick={isPlayable || onClick ? onClick : undefined}
      onMouseEnter={() => {
        if (isPlayable) sounds.cardHover();
      }}
      disabled={(!isPlayable && !onClick) || isDimmed}
      className={`
        ${sizeConfig.box}
        relative flex-shrink-0 bg-[#F6F0E2] border border-[#D8CEBA] border-b-[#B5AA94]
        uno-card-shadow flex items-center justify-center select-none overflow-visible
        transition-[transform,box-shadow,filter,opacity] duration-200 ease-out
        ${
          isPlayable
            ? '-translate-y-3 sm:-translate-y-4 hover:-translate-y-7 hover:scale-[1.05] active:scale-[0.97] cursor-pointer uno-card-shadow-active ring-2 ring-[#D4A548] z-10'
            : ''
        }
        ${isDimmed ? 'brightness-[0.55] saturate-[0.8] cursor-not-allowed scale-[0.97]' : ''}
        ${!isPlayable && !isDimmed ? 'cursor-default' : ''}
        ${isSelected ? '-translate-y-7 ring-2 ring-[#D4A548] scale-[1.05] z-20' : ''}
        ${className}
      `}
    >
      {/* Private Newly-Drawn Playable Card Marker (visible only to card owner) */}
      {isNewlyDrawn && (
        <span className="pointer-events-none absolute -top-2.5 left-1/2 -translate-x-1/2 z-30 px-1.5 py-0.5 rounded-[3px] bg-[#D4A548] text-[#11131A] border border-[#11131A] font-sekouno-mono text-[9px] font-bold uppercase tracking-wider whitespace-nowrap shadow">
          PIOCHÉE
        </span>
      )}

      {/* Inner Solid Lacquer Suit Field */}
      <div
        className={`w-full h-full ${sizeConfig.innerRadius} relative flex items-center justify-center overflow-hidden`}
        style={{
          backgroundColor: theme.bg,
          boxShadow: `inset 0 0 0 1px ${theme.accentBorder}`,
        }}
      >
        {/* Architectural inner frame */}
        <div
          className="pointer-events-none absolute inset-[3px] rounded-[5px] border"
          style={{ borderColor: theme.accentBorder }}
        />

        {/* Top-Left Corner Index + Geometric Suit Pip */}
        <div
          className={`absolute ${sizeConfig.cornerPosTop} flex flex-col items-center gap-0.5 leading-none z-10`}
          style={{ color: theme.cornerColor }}
        >
          {renderGlyph(card.value, true)}
          <SuitPip color={card.color} className={sizeConfig.pipSize} />
        </div>

        {/* Center Sculpted Ivory Architectural Cartouche */}
        <div
          className={`${sizeConfig.cartouche} relative flex items-center justify-center shadow-[0_3px_10px_rgba(0,0,0,0.32)] border border-[#11131A]/15`}
          style={{
            backgroundColor: theme.cartoucheBg,
            color: theme.glyphColor,
          }}
        >
          <div className="pointer-events-none absolute inset-[2px] rounded-[6px] border border-[#11131A]/10" />
          <div className="relative z-10 flex items-center justify-center">
            {renderGlyph(card.value, false)}
          </div>
        </div>

        {/* Bottom-Right Corner Index + Geometric Suit Pip (Inverted) */}
        <div
          className={`absolute ${sizeConfig.cornerPosBot} flex flex-col items-center gap-0.5 leading-none rotate-180 z-10`}
          style={{ color: theme.cornerColor }}
        >
          {renderGlyph(card.value, true)}
          <SuitPip color={card.color} className={sizeConfig.pipSize} />
        </div>
      </div>
    </button>
  );
};
