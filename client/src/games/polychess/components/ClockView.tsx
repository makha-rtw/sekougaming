import React from 'react';
import { UserPublic } from '../../../../../shared/chessTypes.js';
import { Clock, Shield } from 'lucide-react';

interface ClockViewProps {
  player: UserPublic | null;
  timeMs: number | null;
  isActiveTurn: boolean;
  color: 'w' | 'b';
  isConnected?: boolean;
}

export const ClockView: React.FC<ClockViewProps> = ({
  player,
  timeMs,
  isActiveTurn,
  color,
  isConnected = true,
}) => {
  const isWhite = color === 'w';

  // Format time (mm:ss or ss.s when < 10s)
  const formatTime = (ms: number | null) => {
    if (ms === null) return '∞';
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    if (totalSeconds < 10) {
      const tenths = Math.floor((ms % 1000) / 100);
      return `${seconds}.${tenths}s`;
    }

    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const isLowTime = timeMs !== null && timeMs < 30000;

  return (
    <div
      className={`flex items-center justify-between px-3 py-2 rounded-xl border transition-all duration-200 ${
        isActiveTurn
          ? 'bg-slate-900/95 border-amber-400 shadow-lg shadow-amber-500/10 ring-1 ring-amber-400/50'
          : 'bg-slate-950/80 border-slate-800'
      }`}
    >
      {/* Player identity info */}
      <div className="flex items-center gap-2.5 min-w-0">
        <div
          className={`w-4 h-4 rounded-full border shadow-sm shrink-0 ${
            isWhite ? 'bg-white border-slate-400' : 'bg-slate-950 border-slate-700 ring-1 ring-white/20'
          }`}
        />
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-xs sm:text-sm text-white truncate max-w-[130px] sm:max-w-[180px]">
              {player ? player.username : 'En attente...'}
            </span>
            {player && (
              <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-slate-800 text-amber-300 border border-slate-700 shrink-0">
                {player.department}
              </span>
            )}
            {!isConnected && (
              <span className="text-[10px] text-red-400 animate-pulse font-bold">
                (Déconnecté)
              </span>
            )}
          </div>
          {player && (
            <div className="text-[11px] text-slate-400 font-medium">
              Elo : <strong className="text-amber-400">{player.elo}</strong>
            </div>
          )}
        </div>
      </div>

      {/* Clock display */}
      <div
        className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-mono font-black text-sm sm:text-base border ${
          isLowTime
            ? 'bg-red-950/90 text-red-300 border-red-500 animate-pulse'
            : isActiveTurn
            ? 'bg-slate-800 text-amber-300 border-slate-600'
            : 'bg-slate-900 text-slate-300 border-slate-800'
        }`}
      >
        <Clock className="w-3.5 h-3.5 opacity-70 shrink-0" />
        <span>{formatTime(timeMs)}</span>
      </div>
    </div>
  );
};
