import React from 'react';
import { Card, CardColor, CardValue } from '../../../shared/types.js';
import { Ban, RefreshCw } from 'lucide-react';
import { sounds } from '../utils/sound.js';

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

const SUIT_THEME: Record<
  CardColor,
  {
    surface: string;
    innerBorder: string;
    glyphColor: string;
    cornerColor: string;
    medallionBg: string;
  }
> = {
  red: {
    surface: 'linear-gradient(155deg, #E03131 0%, #B81D1D 55%, #8A1111 100%)',
    innerBorder: 'rgba(255, 220, 210, 0.32)',
    glyphColor: '#C92020',
    cornerColor: '#FFF8F0',
    medallionBg: '#FAF3E6',
  },
  blue: {
    surface: 'linear-gradient(155deg, #246BFD 0%, #1649B8 55%, #0D2D7A 100%)',
    innerBorder: 'rgba(210, 230, 255, 0.32)',
    glyphColor: '#1649B8',
    cornerColor: '#FFF8F0',
    medallionBg: '#FAF3E6',
  },
  green: {
    surface: 'linear-gradient(155deg, #16A35A 0%, #0E7A41 55%, #074F29 100%)',
    innerBorder: 'rgba(205, 255, 225, 0.32)',
    glyphColor: '#0D753E',
    cornerColor: '#FFF8F0',
    medallionBg: '#FAF3E6',
  },
  yellow: {
    surface: 'linear-gradient(155deg, #F5B727 0%, #D9920B 58%, #A86B03 100%)',
    innerBorder: 'rgba(255, 250, 220, 0.45)',
    glyphColor: '#B57204',
    cornerColor: '#17120A',
    medallionBg: '#FFFDF7',
  },
  black: {
    surface: 'linear-gradient(155deg, #23222B 0%, #131318 55%, #08080B 100%)',
    innerBorder: 'rgba(229, 184, 75, 0.45)',
    glyphColor: '#131318',
    cornerColor: '#F5EFE4',
    medallionBg: '#FAF3E6',
  },
};

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
  const sizeConfig = {
    sm: {
      box: 'w-12 h-[4.4rem] rounded-[11px] p-[3px]',
      innerRadius: 'rounded-[8px]',
      medallion: 'w-8 h-11',
      centerText: 'text-xl',
      cornerText: 'text-[10px]',
      cornerPosTop: 'top-1 left-1.5',
      cornerPosBot: 'bottom-1 right-1.5',
      iconCenter: 'w-5 h-5',
      iconCorner: 'w-2.5 h-2.5',
    },
    md: {
      box: 'w-[4.4rem] h-[6.5rem] sm:w-[5.1rem] sm:h-[7.5rem] md:w-[5.5rem] md:h-[8.1rem] rounded-[15px] p-[4px]',
      innerRadius: 'rounded-[11px]',
      medallion: 'w-12 h-[4.3rem] sm:w-14 sm:h-[5rem] md:w-[3.8rem] md:h-[5.4rem]',
      centerText: 'text-3xl sm:text-4xl md:text-[2.5rem]',
      cornerText: 'text-xs sm:text-sm',
      cornerPosTop: 'top-1.5 left-2',
      cornerPosBot: 'bottom-1.5 right-2',
      iconCenter: 'w-7 h-7 sm:w-8 sm:h-8',
      iconCorner: 'w-3 h-3 sm:w-3.5 sm:h-3.5',
    },
    lg: {
      box: 'w-24 h-36 md:w-28 md:h-42 rounded-[18px] p-[5px]',
      innerRadius: 'rounded-[13px]',
      medallion: 'w-16 h-24 md:w-20 md:h-28',
      centerText: 'text-4xl md:text-5xl',
      cornerText: 'text-sm md:text-base',
      cornerPosTop: 'top-2 left-2.5',
      cornerPosBot: 'bottom-2 right-2.5',
      iconCenter: 'w-9 h-9 md:w-11 md:h-11',
      iconCorner: 'w-4 h-4',
    },
  }[size];

  // Luxury Card Back (Draw pile & hidden hands)
  if (showBack || !card) {
    return (
      <div
        onClick={onClick}
        onMouseEnter={() => onClick && sounds.cardHover()}
        className={`${sizeConfig.box} relative flex-shrink-0 bg-[#F3ECE0] uno-card-shadow flex items-center justify-center select-none overflow-hidden ${onClick ? 'cursor-pointer' : ''} ${className}`}
      >
        <div
          className={`w-full h-full ${sizeConfig.innerRadius} relative flex items-center justify-center overflow-hidden border border-[#E5B84B]/40`}
          style={{
            background: 'radial-gradient(circle at 50% 50%, #241418 0%, #110B10 65%, #080608 100%)',
          }}
        >
          {/* Subtle geometric diamond lattice */}
          <div
            className="absolute inset-1 rounded-[7px] border border-[#E5B84B]/30 pointer-events-none"
            style={{
              backgroundImage:
                'radial-gradient(rgba(229, 184, 75, 0.16) 1px, transparent 1px)',
              backgroundSize: '8px 8px',
            }}
          />

          {/* Tilted Crimson & Gold Medallion */}
          <div className="w-[78%] h-[62%] rounded-full bg-gradient-to-br from-[#C92020] via-[#8F1111] to-[#4A0707] border-2 border-[#E5B84B] shadow-inner flex items-center justify-center -rotate-24">
            <span className="font-['Bricolage_Grotesque',_sans-serif] font-extrabold tracking-tight text-[#FAF3E6] text-[10px] sm:text-xs md:text-sm drop-shadow">
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
        <Ban
          className={isCorner ? sizeConfig.iconCorner : sizeConfig.iconCenter}
          strokeWidth={isCorner ? 2.6 : 2.8}
        />
      );
    }
    if (val === 'reverse') {
      return (
        <RefreshCw
          className={isCorner ? sizeConfig.iconCorner : sizeConfig.iconCenter}
          strokeWidth={isCorner ? 2.6 : 2.8}
        />
      );
    }
    if (val === 'draw2') {
      if (isCorner) {
        return <span className="font-['Bricolage_Grotesque',_sans-serif] font-extrabold tracking-tighter">+2</span>;
      }
      return (
        <div className="flex flex-col items-center leading-none">
          <div className="relative w-7 h-5 sm:w-8 sm:h-6 mb-0.5">
            <div
              className="absolute left-0.5 top-0.5 w-4 h-5 rounded-[3px] border border-white/80 shadow-sm -rotate-12"
              style={{ background: theme.surface }}
            />
            <div
              className="absolute right-0.5 top-0 w-4 h-5 rounded-[3px] border border-white/90 shadow-sm rotate-12"
              style={{ background: theme.surface }}
            />
          </div>
          <span className="font-['Bricolage_Grotesque',_sans-serif] font-extrabold text-base sm:text-lg tracking-tighter">
            +2
          </span>
        </div>
      );
    }
    if (val === 'wild') {
      if (isCorner) {
        return <span className="text-xs font-black text-[#E5B84B]">✦</span>;
      }
      return (
        <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-11 md:h-11 rounded-full p-[2px] bg-[#131318] shadow-md border-2 border-[#E5B84B] rotate-12">
          <div className="w-full h-full rounded-full overflow-hidden grid grid-cols-2 grid-rows-2">
            <div className="bg-[#E03131]" />
            <div className="bg-[#246BFD]" />
            <div className="bg-[#F5B727]" />
            <div className="bg-[#16A35A]" />
          </div>
        </div>
      );
    }
    if (val === 'wild4') {
      if (isCorner) {
        return <span className="font-['Bricolage_Grotesque',_sans-serif] font-extrabold tracking-tighter text-[#E5B84B]">+4</span>;
      }
      return (
        <div className="flex flex-col items-center leading-none">
          <div className="relative w-9 h-6 sm:w-10 sm:h-7 mb-0.5 flex items-center justify-center">
            <div className="w-3.5 h-5 rounded-[3px] bg-[#E03131] border border-white -rotate-18 -mr-1.5 shadow-xs" />
            <div className="w-3.5 h-5 rounded-[3px] bg-[#246BFD] border border-white -rotate-6 -mr-1.5 shadow-xs" />
            <div className="w-3.5 h-5 rounded-[3px] bg-[#F5B727] border border-white rotate-6 -mr-1.5 shadow-xs" />
            <div className="w-3.5 h-5 rounded-[3px] bg-[#16A35A] border border-white rotate-18 shadow-xs" />
          </div>
          <span className="font-['Bricolage_Grotesque',_sans-serif] font-extrabold text-sm sm:text-base text-[#131318] tracking-tighter">
            +4
          </span>
        </div>
      );
    }

    const showUnderline = val === '6' || val === '9';
    return (
      <span
        className={`font-['Bricolage_Grotesque',_sans-serif] font-extrabold leading-none tracking-tighter ${
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
        relative flex-shrink-0 bg-[#F5EFE4]
        uno-card-shadow flex items-center justify-center select-none overflow-hidden
        transition-all duration-200 ease-out transform
        ${
          isPlayable
            ? '-translate-y-3 sm:-translate-y-4 hover:-translate-y-7 hover:scale-[1.06] active:scale-[0.97] cursor-pointer uno-card-shadow-active ring-2 ring-[#E5B84B] z-10'
            : ''
        }
        ${isDimmed ? 'brightness-[0.58] saturate-[0.85] cursor-not-allowed scale-[0.97]' : ''}
        ${!isPlayable && !isDimmed ? 'cursor-default' : ''}
        ${isSelected ? '-translate-y-7 ring-3 ring-[#E5B84B] scale-[1.06] z-20' : ''}
        ${className}
      `}
    >
      {/* Inner Colored Lacquer Surface */}
      <div
        className={`w-full h-full ${sizeConfig.innerRadius} relative flex items-center justify-center overflow-hidden`}
        style={{
          background: theme.surface,
          boxShadow: `inset 0 0 0 1px ${theme.innerBorder}`,
        }}
      >
        {/* Top sheen highlight */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(135deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0) 42%, rgba(0,0,0,0.22) 100%)',
          }}
        />

        {/* Top-Left Corner Index */}
        <div
          className={`absolute ${sizeConfig.cornerPosTop} flex flex-col items-center leading-none`}
          style={{ color: theme.cornerColor }}
        >
          {renderGlyph(card.value, true)}
        </div>

        {/* Center Ivory Medallion */}
        <div
          className={`${sizeConfig.medallion} rounded-full uno-oval flex items-center justify-center shadow-[0_3px_10px_rgba(0,0,0,0.35),inset_0_1px_2px_rgba(255,255,255,0.9)] border border-black/10`}
          style={{
            backgroundColor: theme.medallionBg,
            color: theme.glyphColor,
          }}
        >
          <div className="transform rotate-25 flex items-center justify-center">
            {renderGlyph(card.value, false)}
          </div>
        </div>

        {/* Bottom-Right Corner Index (Inverted) */}
        <div
          className={`absolute ${sizeConfig.cornerPosBot} flex flex-col items-center leading-none rotate-180`}
          style={{ color: theme.cornerColor }}
        >
          {renderGlyph(card.value, true)}
        </div>

        {/* Playable subtle top brass indicator dot */}
        {isPlayable && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#FFE27A] shadow-[0_0_8px_#FFE27A]" />
        )}
      </div>
    </button>
  );
};
