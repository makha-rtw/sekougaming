import React, { useState, useEffect } from 'react';
import { Chess } from 'chess.js';
import { ChessBoard } from '../components/ChessBoard.js';
import { chessSounds } from '../utils/sound.js';
import { PieceColor } from '../../../../../shared/chessTypes.js';
import { ArrowLeft, RotateCw, RotateCcw, Volume2, VolumeX, Sparkles, Trophy } from 'lucide-react';

interface PolychessLocalScreenProps {
  onBackToMenu: () => void;
}

export const PolychessLocalScreen: React.FC<PolychessLocalScreenProps> = ({ onBackToMenu }) => {
  const [chess, setChess] = useState<Chess>(() => new Chess());
  const [orientation, setOrientation] = useState<PieceColor>('w');
  const [autoFlip, setAutoFlip] = useState<boolean>(false);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [isMuted, setIsMuted] = useState(chessSounds.isMuted());
  const [gameOverInfo, setGameOverInfo] = useState<{
    winner: 'w' | 'b' | 'draw';
    reason: string;
  } | null>(null);

  const turn = chess.turn();

  const handleMove = (moveAttempt: { from: string; to: string; promotion?: string }) => {
    try {
      const isCapture = chess.get(moveAttempt.to as any) !== null;
      const move = chess.move({
        from: moveAttempt.from,
        to: moveAttempt.to,
        promotion: moveAttempt.promotion || 'q',
      });

      if (!move) return;

      // Sound design
      if (chess.isCheckmate()) {
        chessSounds.playVictory();
      } else if (chess.inCheck()) {
        chessSounds.playCheck();
      } else if (isCapture || move.captured) {
        chessSounds.playCapture();
      } else {
        chessSounds.playMove();
      }

      setLastMove({ from: move.from, to: move.to });

      // Check game over
      if (chess.isCheckmate()) {
        setGameOverInfo({
          winner: turn === 'w' ? 'w' : 'b',
          reason: 'Échec et mat !',
        });
      } else if (chess.isStalemate()) {
        setGameOverInfo({ winner: 'draw', reason: 'Pat (Nulle) !' });
      } else if (chess.isThreefoldRepetition()) {
        setGameOverInfo({ winner: 'draw', reason: 'Répétition de position (Nulle) !' });
      } else if (chess.isInsufficientMaterial()) {
        setGameOverInfo({ winner: 'draw', reason: 'Matériel insuffisant (Nulle) !' });
      } else if (chess.isDraw()) {
        setGameOverInfo({ winner: 'draw', reason: 'Règle des 50 coups (Nulle) !' });
      }

      // Auto flip orientation if enabled
      if (autoFlip) {
        setOrientation(turn === 'w' ? 'b' : 'w');
      }

      // Force rerender by creating a new shallow instance
      setChess(new Chess(chess.fen()));
    } catch {}
  };

  const handleRestart = () => {
    const fresh = new Chess();
    setChess(fresh);
    setOrientation('w');
    setLastMove(null);
    setGameOverInfo(null);
  };

  const handleUndo = () => {
    const undone = chess.undo();
    if (undone) {
      setChess(new Chess(chess.fen()));
      setLastMove(null);
      setGameOverInfo(null);
      chessSounds.playMove();
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col justify-between p-3 sm:p-4 max-w-lg mx-auto pt-safe pb-safe select-none">
      {/* Top Controls */}
      <header className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={onBackToMenu}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-xs font-bold text-amber-400 hover:text-white transition-all cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Menu Polychess</span>
        </button>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              setIsMuted(chessSounds.toggleMute());
            }}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
            title={isMuted ? 'Activer le son' : 'Couper le son'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={() => setOrientation(orientation === 'w' ? 'b' : 'w')}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300 hover:text-amber-400 transition-all cursor-pointer"
            title="Retourner l'échiquier"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Tourner</span>
          </button>
        </div>
      </header>

      {/* Opponent Top Turn Indicator */}
      <div className="flex items-center justify-between px-3 py-1.5 mb-1 bg-slate-900/60 rounded-xl border border-slate-800 text-xs">
        <div className="flex items-center gap-2">
          <div
            className={`w-3.5 h-3.5 rounded-full border ${
              orientation === 'w' ? 'bg-slate-950 border-slate-600' : 'bg-white border-slate-400'
            }`}
          />
          <span className="font-bold text-slate-300">
            {orientation === 'w' ? 'Noirs' : 'Blancs'}
          </span>
        </div>
        {((orientation === 'w' && turn === 'b') || (orientation === 'b' && turn === 'w')) && (
          <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider animate-pulse">
            Au tour de jouer
          </span>
        )}
      </div>

      {/* Main Central Chessboard */}
      <div className="my-auto py-1">
        <ChessBoard
          chess={chess}
          orientation={orientation}
          isInteractive={!gameOverInfo}
          onMove={handleMove}
          lastMove={lastMove}
        />
      </div>

      {/* Player Bottom Turn Indicator */}
      <div className="flex items-center justify-between px-3 py-1.5 mt-1 bg-slate-900/60 rounded-xl border border-slate-800 text-xs">
        <div className="flex items-center gap-2">
          <div
            className={`w-3.5 h-3.5 rounded-full border ${
              orientation === 'w' ? 'bg-white border-slate-400' : 'bg-slate-950 border-slate-600'
            }`}
          />
          <span className="font-bold text-slate-300">
            {orientation === 'w' ? 'Blancs' : 'Noirs'}
          </span>
        </div>
        {((orientation === 'w' && turn === 'w') || (orientation === 'b' && turn === 'b')) && (
          <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider animate-pulse">
            Au tour de jouer
          </span>
        )}
      </div>

      {/* Bottom Actions Bar */}
      <footer className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={handleUndo}
          className="py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-300 flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Annuler le coup</span>
        </button>

        <button
          type="button"
          onClick={handleRestart}
          className="py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-amber-400 flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
        >
          <RotateCw className="w-3.5 h-3.5" />
          <span>Recommencer</span>
        </button>
      </footer>

      {/* Game Over Modal */}
      {gameOverInfo && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-amber-400 rounded-3xl p-6 max-w-xs w-full text-center shadow-2xl animate-in zoom-in-95 duration-150">
            <Trophy className="w-12 h-12 text-amber-400 mx-auto mb-2" />
            <h3 className="text-xl font-black text-white mb-1">Partie Terminée</h3>
            <p className="text-sm font-bold text-amber-300 mb-2">{gameOverInfo.reason}</p>
            <p className="text-xs text-slate-400 mb-5">
              {gameOverInfo.winner === 'draw'
                ? 'Match nul !'
                : gameOverInfo.winner === 'w'
                ? 'Victoire des Blancs !'
                : 'Victoire des Noirs !'}
            </p>

            <div className="space-y-2">
              <button
                type="button"
                onClick={handleRestart}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-500 font-black text-xs uppercase tracking-wider text-white shadow-lg cursor-pointer"
              >
                Nouvelle partie
              </button>
              <button
                type="button"
                onClick={onBackToMenu}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 cursor-pointer"
              >
                Quitter vers le menu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
