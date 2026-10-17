import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Moon, Sun, Vote, Users } from 'lucide-react';
import { RoleIcon } from './RoleIcon';
import { getRoleCustomIcon } from '../assets/roleCustomIcons';
import { RoleId } from '../types/game';
import { ROLE_DEFINITIONS } from '../data/roles';

interface TurnTransitionProps {
  transitionKey: string;
  title: string;
  subTitle?: string;
  roleId?: RoleId;
  type?: 'night' | 'day' | 'vote' | 'role' | 'generic';
  onDismiss?: () => void;
}

export const TurnTransition: React.FC<TurnTransitionProps> = ({
  transitionKey,
  title,
  subTitle,
  roleId,
  type = 'role',
  onDismiss,
}) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setVisible(true);
    const timer = setTimeout(() => {
      setVisible(false);
      onDismiss?.();
    }, 1250);

    return () => clearTimeout(timer);
  }, [transitionKey]);

  const handleManualDismiss = () => {
    setVisible(false);
    onDismiss?.();
  };

  const roleDef = roleId ? ROLE_DEFINITIONS[roleId] : null;
  const roleColors = roleDef?.colorScheme;

  // Determine transition styling
  const getTheme = () => {
    if (roleColors) {
      return {
        cardBg: roleColors.bg,
        cardBorder: roleColors.border,
        badgeBg: roleColors.badgeBg,
        badgeBorder: roleColors.border,
        textColor: roleColors.text,
        tagText: roleDef?.name || 'Rôle Secret',
      };
    }

    switch (type) {
      case 'night':
        return {
          cardBg: 'bg-[#edd5d2]',
          cardBorder: 'border-[#c9756b]',
          badgeBg: 'bg-[#dfaba4]',
          badgeBorder: 'border-[#c9756b]',
          textColor: 'text-[#5a0c0c]',
          tagText: 'Nuit · Grimoire',
        };
      case 'day':
        return {
          cardBg: 'bg-[#faebd1]',
          cardBorder: 'border-[#c49f64]',
          badgeBg: 'bg-[#debe87]',
          badgeBorder: 'border-[#c49f64]',
          textColor: 'text-[#52330a]',
          tagText: 'Aube · Grimoire',
        };
      case 'vote':
        return {
          cardBg: 'bg-[#e4cbca]',
          cardBorder: 'border-[#a85957]',
          badgeBg: 'bg-[#cb9593]',
          badgeBorder: 'border-[#a85957]',
          textColor: 'text-[#4d0707]',
          tagText: 'Conseil · Grimoire',
        };
      default:
        return {
          cardBg: 'bg-[#fdfbf6]',
          cardBorder: 'border-[#bfa686]',
          badgeBg: 'bg-[#f4ebd9]',
          badgeBorder: 'border-[#bfa686]',
          textColor: 'text-[#22160c]',
          tagText: 'Grimoire · Sekou-Gaming',
        };
    }
  };

  const theme = getTheme();

  const getFallbackIcon = () => {
    if (roleId) {
      return <RoleIcon roleId={roleId} className={`w-10 h-10 ${theme.textColor}`} />;
    }
    switch (type) {
      case 'night':
        return <Moon className={`w-10 h-10 ${theme.textColor}`} />;
      case 'day':
        return <Sun className={`w-10 h-10 ${theme.textColor}`} />;
      case 'vote':
        return <Vote className={`w-10 h-10 ${theme.textColor}`} />;
      default:
        return <Users className={`w-10 h-10 ${theme.textColor}`} />;
    }
  };

  const customIcon = roleId ? getRoleCustomIcon(roleId) : null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key={transitionKey}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.28, ease: 'easeOut' }}
          onClick={handleManualDismiss}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#23170e]/80 backdrop-blur-sm cursor-pointer select-none"
          aria-live="polite"
        >
          {/* Ornate Medieval Parchment Banner Card with Role Colors */}
          <motion.div
            initial={{ scale: 0.92, y: 8, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.98, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className={`w-full max-w-xs md:max-w-sm rounded-3xl ${theme.cardBg} border-2 ${theme.cardBorder} shadow-2xl p-6 md:p-8 text-center space-y-4 relative overflow-hidden`}
          >
            {/* Subtle vintage corner ornaments */}
            <div className={`absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 ${theme.cardBorder} rounded-tl-sm pointer-events-none opacity-80`} />
            <div className={`absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 ${theme.cardBorder} rounded-tr-sm pointer-events-none opacity-80`} />
            <div className={`absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 ${theme.cardBorder} rounded-bl-sm pointer-events-none opacity-80`} />
            <div className={`absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 ${theme.cardBorder} rounded-br-sm pointer-events-none opacity-80`} />

            {/* Custom Role Artwork (without box background) or Illuminated Wax Seal Badge */}
            {customIcon ? (
              <div className="w-32 h-32 md:w-36 md:h-36 mx-auto flex items-center justify-center select-none py-1">
                <img
                  src={customIcon}
                  alt={roleDef?.name || title}
                  className="w-full h-full object-contain drop-shadow-md select-none"
                />
              </div>
            ) : (
              <div className={`w-18 h-18 mx-auto rounded-2xl ${theme.badgeBg} border-2 ${theme.badgeBorder} flex items-center justify-center shadow-md p-2 overflow-hidden`}>
                {getFallbackIcon()}
              </div>
            )}

            {/* Title & Subtitle */}
            <div className="space-y-2 pt-1">
              <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${theme.badgeBg} ${theme.textColor} border ${theme.badgeBorder} shadow-2xs font-display`}>
                {theme.tagText}
              </span>
              <h2 className={`font-display font-extrabold text-xl md:text-2xl ${theme.textColor} tracking-tight leading-snug`}>
                {title}
              </h2>
              {subTitle && (
                <p className={`font-serif italic text-xs md:text-sm ${theme.textColor} opacity-85 leading-relaxed max-w-[260px] mx-auto`}>
                  {subTitle}
                </p>
              )}
            </div>

            {/* Subtle skip prompt */}
            <div className={`pt-2 text-[10px] ${theme.textColor} opacity-65 uppercase tracking-wider font-semibold`}>
              Toucher l'écran pour passer
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
