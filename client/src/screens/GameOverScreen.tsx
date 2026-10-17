import React, { useEffect } from 'react';
import { GameStatePublic } from '../../../shared/types.js';
import confetti from 'canvas-confetti';
import { Trophy, RotateCcw, Home, Sparkles, LogOut } from 'lucide-react';

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
    // Launch celebratory confetti
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 },
      colors: ['#EF4444', '#2563EB', '#10B981', '#F59E0B'],
    });
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 max-w-md mx-auto text-center pt-safe pb-safe">
      <div className="bg-slate-900/95 border-2 border-amber-500/50 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md w-full">
        {/* Trophy Icon */}
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center text-slate-950 mx-auto mb-4 shadow-xl animate-bounce">
          <Trophy className="w-8 h-8 sm:w-10 sm:h-10" />
        </div>

        <span className="inline-flex items-center gap-1.5 text-xs uppercase font-extrabold tracking-widest text-amber-400 bg-amber-950/70 border border-amber-500/40 px-3 py-1 rounded-full mb-2">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Partie terminée</span>
        </span>

        <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-2">
          {isWinner ? 'VOUS AVEZ GAGNÉ !' : `${winner?.name || 'Un joueur'} a gagné !`}
        </h2>

        <p className="text-xs text-slate-400 mb-6 leading-relaxed">
          {isWinner
            ? 'Félicitations ! Vous avez posé toutes vos cartes sans enfreindre la règle de la carte noire.'
            : `${winner?.name} a posé sa dernière carte et remporte la victoire sur cette manche de Sekouno !`}
        </p>

        {/* Players Summary */}
        <div className="bg-slate-950/80 rounded-2xl p-3 sm:p-4 border border-slate-800 mb-6 text-left">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
            Classement final
          </span>
          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1 no-scrollbar">
            {publicState.players
              .slice()
              .sort((a, b) => a.cardCount - b.cardCount)
              .map((p, idx) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-lg bg-slate-900/60"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-amber-400">#{idx + 1}</span>
                    <span className="font-semibold text-white">
                      {p.name} {p.id === myPlayerId && <span className="text-slate-400 text-[11px] font-normal">(Vous)</span>}
                    </span>
                  </div>
                  <span className="text-slate-300 font-mono text-[11px]">
                    {p.cardCount === 0 ? '🏆 Vainqueur' : `${p.cardCount} cartes`}
                  </span>
                </div>
              ))}
          </div>
        </div>

        {/* Action Controls */}
        <div className="space-y-2.5">
          {isHost ? (
            <>
              <button
                type="button"
                onClick={onRestartGame}
                disabled={isLoading}
                className="w-full py-3.5 px-5 rounded-xl font-black text-sm uppercase tracking-wider text-white shadow-xl bg-gradient-to-r from-red-600 via-amber-500 to-blue-600 hover:brightness-110 flex items-center justify-center gap-2 transition-transform transform active:scale-95 disabled:opacity-50"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Rejouer une manche</span>
              </button>

              <button
                type="button"
                onClick={onReturnToLobby}
                disabled={isLoading}
                className="w-full py-3 px-5 rounded-xl font-bold text-xs uppercase tracking-wider text-amber-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-amber-500/30 flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                <Home className="w-4 h-4 text-amber-400" />
                <span>Retourner à la salle d'attente</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onReturnToLobby}
                disabled={isLoading}
                className="w-full py-3 px-5 rounded-xl font-bold text-xs uppercase tracking-wider text-amber-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-amber-500/30 flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                <Home className="w-4 h-4 text-amber-400" />
                <span>Retourner à la salle d'attente</span>
              </button>

              {onLeaveRoom && (
                <button
                  type="button"
                  onClick={onLeaveRoom}
                  className="w-full py-2.5 px-4 rounded-xl text-xs text-slate-400 hover:text-red-400 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Quitter le salon</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
