import React, { useState, useEffect } from 'react';
import { MatchHistoryItem } from '../../../../../shared/chessTypes.js';
import { fetchMatchHistory } from '../services/api.js';
import { History, ArrowLeft, Loader2, Calendar, Swords } from 'lucide-react';

interface PolychessHistoryScreenProps {
  onBackToMenu: () => void;
}

export const PolychessHistoryScreen: React.FC<PolychessHistoryScreenProps> = ({ onBackToMenu }) => {
  const [history, setHistory] = useState<MatchHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    fetchMatchHistory()
      .then((data) => {
        if (isMounted) {
          setHistory(data);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-[100dvh] flex flex-col justify-between p-3 sm:p-4 max-w-xl mx-auto pt-safe pb-safe select-none">
      {/* Top Header */}
      <header className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={onBackToMenu}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-amber-400 hover:text-white transition-all cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Menu Polychess</span>
        </button>

        <div className="flex items-center gap-1.5 text-xs font-black uppercase text-blue-400">
          <History className="w-4 h-4 text-blue-400" />
          <span>Historique des parties</span>
        </div>
      </header>

      {/* Main Container */}
      <main className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-2xl backdrop-blur-md flex-1 flex flex-col overflow-hidden">
        <div className="text-center mb-3">
          <h2 className="text-xl font-black text-white">HISTORIQUE DES MATCHS</h2>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Vos parties en ligne classées enregistrées sur le serveur
          </p>
        </div>

        {/* History List */}
        <div className="flex-1 overflow-y-auto no-scrollbar space-y-2 pr-0.5">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-400 text-xs">
              <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
              <span>Chargement de l'historique...</span>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-12 text-xs text-slate-500">
              Aucune partie classée terminée pour le moment.
            </div>
          ) : (
            history.map((item) => {
              const isWin = item.result === 'win';
              const isLoss = item.result === 'loss';
              const isDraw = item.result === 'draw';

              return (
                <div
                  key={item.id}
                  className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-3 shadow-md"
                >
                  {/* Left: Result badge & Opponent */}
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Status Pill */}
                    <div
                      className={`w-14 text-center py-1 rounded-xl text-[10px] font-black uppercase tracking-wider shrink-0 ${
                        isWin
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : isLoss
                          ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                          : 'bg-slate-700/30 text-slate-300 border border-slate-600/40'
                      }`}
                    >
                      {isWin ? 'Victoire' : isLoss ? 'Défaite' : 'Nulle'}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-slate-400">vs</span>
                        <span className="font-bold text-xs sm:text-sm text-white truncate max-w-[120px] sm:max-w-[160px]">
                          {item.opponentUsername}
                        </span>
                        <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-slate-800 text-amber-300 border border-slate-700 shrink-0">
                          {item.opponentDepartment}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5">
                        <span>{formatDate(item.date)}</span>
                        <span>• Cadence : {item.timeControl}</span>
                        <span>• {item.myColor === 'w' ? 'Blancs' : 'Noirs'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Elo Change */}
                  <div className="text-right shrink-0">
                    <div
                      className={`font-mono font-black text-sm sm:text-base ${
                        item.eloChange > 0
                          ? 'text-emerald-400'
                          : item.eloChange < 0
                          ? 'text-red-400'
                          : 'text-slate-400'
                      }`}
                    >
                      {item.eloChange > 0 ? `+${item.eloChange}` : item.eloChange} Elo
                    </div>
                    <div className="text-[10px] font-mono text-slate-400">
                      {item.eloBefore} → <strong className="text-amber-400">{item.eloAfter}</strong>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>

      <footer className="text-center text-[10px] text-slate-500 py-1">
        POLYCHESS • Calcul officiel Elo (K=32)
      </footer>
    </div>
  );
};
