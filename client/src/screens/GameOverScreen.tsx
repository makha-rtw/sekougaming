import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { GameStatePublic } from '../../../shared/types.js';
import confetti from 'canvas-confetti';
import { Trophy, RotateCcw, Home, LogOut, Crown } from 'lucide-react';
import { sounds } from '../utils/sound.js';

interface GameOverScreenProps {
  publicState: GameStatePublic;
  myPlayerId: string;
  onRestartGame: () => void;
  onReturnToLobby: () => void;
  onLeaveRoom?: () => void;
  isLoading: boolean;
}

export const GameOverScreen: React.FC<GameOverScreenProps> = ({
  publicState,
  myPlayerId,
  onRestartGame,
  onReturnToLobby,
  onLeaveRoom,
  isLoading,
}) => {
  const winner = publicState.winner;
  const isWinner = winner?.id === myPlayerId;
  const isHost = publicState.hostId === myPlayerId;

  useEffect(() => {
    sounds.victory();
    confetti({
      particleCount: 110,
      spread: 80,
      origin: { y: 0.58 },
      colors: ['#E5B84B', '#E03131', '#246BFD', '#16A35A'],
    });
  }, []);

  return (
    <div
      className="min-h-[100dvh] w-full flex flex-col items-center justify-center p-4 pt-safe pb-safe select-none text-[#F5EFE4] font-['Plus_Jakarta_Sans',_sans-serif]"
      style={{
        background:
          'radial-gradient(ellipse 85% 60% at 50% 30%, #123827 0%, #071810 60%, #030A07 100%)',
      }}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 18 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 24 }}
        className="bg-[#081610]/95 border-2 border-[#E5B84B]/50 rounded-[32px] p-6 sm:p-8 shadow-[0_24px_60px_rgba(0,0,0,0.8)] w-full max-w-md text-center"
      >
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#E5B84B] text-[#091510] flex items-center justify-center mx-auto mb-4 shadow-[0_12px_30px_rgba(229,184,75,0.45)]">
          <Trophy className="w-9 h-9 sm:w-10 sm:h-10" />
        </div>

        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#E5B84B] bg-[#E5B84B]/15 border border-[#E5B84B]/30 px-3 py-1 rounded-full mb-2">
          <Crown className="w-3.5 h-3.5" />
          <span>Manche remportée</span>
        </span>

        <h2 className="font-['Bricolage_Grotesque',_sans-serif] text-2xl sm:text-3xl font-extrabold text-[#F5EFE4] tracking-tight mb-2">
          {isWinner ? 'Victoire royale !' : `${winner?.name || 'Un joueur'} remporte la table`}
        </h2>

        <p className="text-xs text-[#9FB0A5] mb-6 leading-relaxed">
          {isWinner
            ? 'Vous avez vidé votre main avec brio sans finir sur une carte noire.'
            : `${winner?.name} a posé sa toute dernière carte sur le tapis.`}
        </p>

        {/* Final Standings */}
        <div className="bg-[#040C08]/85 rounded-2xl p-4 border border-white/10 mb-6 text-left">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#9FB0A5] block mb-2.5">
            Cartes restantes en main
          </span>
          <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1 no-scrollbar">
            {publicState.players
              .slice()
              .sort((a, b) => a.cardCount - b.cardCount)
              .map((p, idx) => (
                <div
                  key={p.id}
                  className={`flex items-center justify-between text-xs py-2 px-3 rounded-xl border ${
                    idx === 0
                      ? 'bg-[#12291E] border-[#E5B84B]/40 text-[#FFE27A]'
                      : 'bg-white/5 border-transparent text-[#F5EFE4]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="font-['Bricolage_Grotesque',_sans-serif] font-extrabold text-[#E5B84B]">
                      #{idx + 1}
                    </span>
                    <span className="font-bold truncate">
                      {p.name}{' '}
                      {p.id === myPlayerId && (
                        <span className="text-[#9FB0A5] text-[11px] font-normal">(Vous)</span>
                      )}
                    </span>
                  </div>
                  <span className="font-['Bricolage_Grotesque',_sans-serif] font-extrabold text-xs shrink-0">
                    {p.cardCount === 0 ? 'Vainqueur' : `${p.cardCount} carte${p.cardCount > 1 ? 's' : ''}`}
                  </span>
                </div>
              ))}
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2.5">
          {isHost ? (
            <>
              <button
                type="button"
                onClick={() => {
                  sounds.playCard();
                  onRestartGame();
                }}
                disabled={isLoading}
                className="w-full py-3.5 px-5 rounded-full font-['Bricolage_Grotesque',_sans-serif] font-extrabold text-sm bg-[#E5B84B] hover:bg-[#F0C75E] text-[#091510] shadow-[0_12px_30px_-8px_rgba(229,184,75,0.55)] flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Relancer une manche immédiatement</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  sounds.buttonClick();
                  onReturnToLobby();
                }}
                disabled={isLoading}
                className="w-full py-3 px-5 rounded-full font-bold text-xs text-[#F5EFE4] bg-white/5 hover:bg-white/10 border border-white/15 flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Home className="w-4 h-4 text-[#E5B84B]" />
                <span>Retourner à la table d'attente</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  sounds.buttonClick();
                  onReturnToLobby();
                }}
                disabled={isLoading}
                className="w-full py-3.5 px-5 rounded-full font-['Bricolage_Grotesque',_sans-serif] font-extrabold text-sm text-[#091510] bg-[#E5B84B] hover:bg-[#F0C75E] flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Home className="w-4 h-4" />
                <span>Retourner à la table d'attente</span>
              </button>

              {onLeaveRoom && (
                <button
                  type="button"
                  onClick={onLeaveRoom}
                  className="w-full py-2.5 px-4 rounded-full text-xs font-semibold text-[#9FB0A5] hover:text-[#FF8787] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Quitter la table</span>
                </button>
              )}
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};
