import React from 'react';
import { Volume2, VolumeX, BookOpen, Users, RotateCcw, ArrowLeft } from 'lucide-react';
import { GamePhase } from '../types/game';

interface HeaderProps {
  phase: GamePhase;
  round: number;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onOpenRules: () => void;
  onOpenModeratorPanel: () => void;
  onResetGame: () => void;
  onBackToHub?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  phase,
  round,
  soundEnabled,
  onToggleSound,
  onOpenRules,
  onOpenModeratorPanel,
  onResetGame,
  onBackToHub,
}) => {
  const getPhaseTitle = (): string => {
    switch (phase) {
      case 'lobby_config':
        return 'Configuration du Salon';
      case 'pass_and_play':
        return 'Distribution Secrète';
      case 'roster_ready':
        return 'Table Prête';
      case 'night':
        return `Nuit ${round}`;
      case 'night_resolution':
        return `Bilan Nuit ${round}`;
      case 'day_wake':
        return `Aube Jour ${round}`;
      case 'day_vote':
        return `Conseil Jour ${round}`;
      case 'day_resolution':
        return `Verdict Jour ${round}`;
      case 'chasseur_revenge':
        return 'Tir du Chasseur';
      case 'game_over':
        return 'Fin de Partie';
      default:
        return 'Loup-Garou';
    }
  };

  return (
    <header className="sticky top-0 z-30 w-full bg-[#f6efe1]/92 backdrop-blur-md border-b border-[#d8c5aa] shadow-xs px-4 py-3">
      <div className="max-w-md mx-auto flex items-center justify-between gap-3">
        {/* Brand Wordmark & Phase badge */}
        <div className="flex items-center gap-2 min-w-0">
          {onBackToHub && (
            <button
              type="button"
              onClick={onBackToHub}
              className="flex items-center gap-1 px-2 py-1 text-xs font-bold text-[#7c4714] hover:bg-[#ede1cc] rounded-lg border border-[#d8c5aa] transition-colors cursor-pointer mr-0.5 shrink-0"
              title="Retourner à l'accueil SekouGaming"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Hub</span>
            </button>
          )}
          <span className="font-display font-black text-base tracking-wider text-[#7c4714] uppercase shrink-0">
            Sekou<span className="text-[#20150b]">Gaming</span>
          </span>
          <span className="text-[#a4917a] text-xs">/</span>
          <span className="text-xs font-semibold text-[#54412f] truncate max-w-[130px]">
            {getPhaseTitle()}
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onToggleSound}
            className="p-2 text-[#6c5640] hover:text-[#20150b] hover:bg-[#ede1cc] rounded-lg transition-colors cursor-pointer"
            title={soundEnabled ? 'Couper le son' : 'Activer le son'}
            aria-label="Contrôle audio"
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-[#2e6d36]" />
            ) : (
              <VolumeX className="w-4 h-4 text-[#8a755f]" />
            )}
          </button>

          <button
            type="button"
            onClick={onOpenRules}
            className="p-2 text-[#6c5640] hover:text-[#20150b] hover:bg-[#ede1cc] rounded-lg transition-colors cursor-pointer"
            title="Consulter le grimoire des règles"
            aria-label="Règles du jeu"
          >
            <BookOpen className="w-4 h-4" />
          </button>

          {phase !== 'lobby_config' && phase !== 'pass_and_play' && (
            <button
              type="button"
              onClick={onOpenModeratorPanel}
              className="p-2 text-[#822222] hover:text-[#5e1414] hover:bg-[#f6dfdc] rounded-lg transition-colors cursor-pointer"
              title="Ouvrir le panneau secret du modérateur"
              aria-label="Panneau modérateur"
            >
              <Users className="w-4 h-4" />
            </button>
          )}

          {phase !== 'lobby_config' && (
            <button
              type="button"
              onClick={onResetGame}
              className="p-2 text-[#872e2e] hover:text-[#5a1b1b] hover:bg-[#f7dedb] rounded-lg transition-colors cursor-pointer"
              title="Réinitialiser la partie"
              aria-label="Réinitialiser la partie"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
