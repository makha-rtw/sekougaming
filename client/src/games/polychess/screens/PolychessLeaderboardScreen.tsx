import React, { useState, useEffect } from 'react';
import { DepartmentCode, VALID_DEPARTMENT_CODES, DEPARTMENTS, UserPublic } from '../../../../../shared/chessTypes.js';
import { fetchLeaderboard } from '../services/api.js';
import { Trophy, ArrowLeft, Loader2, Sparkles, Medal } from 'lucide-react';

interface PolychessLeaderboardScreenProps {
  onBackToMenu: () => void;
  currentUserId?: string;
}

export const PolychessLeaderboardScreen: React.FC<PolychessLeaderboardScreenProps> = ({
  onBackToMenu,
  currentUserId,
}) => {
  const [selectedDept, setSelectedDept] = useState<DepartmentCode | 'ALL'>('ALL');
  const [users, setUsers] = useState<UserPublic[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    const deptParam = selectedDept === 'ALL' ? undefined : selectedDept;
    fetchLeaderboard(deptParam)
      .then((data) => {
        if (isMounted) {
          setUsers(data);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedDept]);

  return (
    <div className="min-h-[100dvh] flex flex-col justify-between p-3 sm:p-4 max-w-2xl mx-auto pt-safe pb-safe select-none">
      {/* Header */}
      <header className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={onBackToMenu}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-amber-400 hover:text-white transition-all cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Menu Polychess</span>
        </button>

        <div className="flex items-center gap-1.5 text-xs font-black uppercase text-amber-400">
          <Trophy className="w-4 h-4 text-amber-400" />
          <span>Classement Elo</span>
        </div>
      </header>

      {/* Main Container */}
      <main className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-2xl backdrop-blur-md flex-1 flex flex-col overflow-hidden">
        {/* Title */}
        <div className="text-center mb-3">
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center justify-center gap-2">
            <span>CLASSEMENT OFFICIEL</span>
          </h2>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Classé par score Elo décroissant • Mis à jour après chaque partie
          </p>
        </div>

        {/* Department Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-3 no-scrollbar shrink-0">
          <button
            type="button"
            onClick={() => setSelectedDept('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all shrink-0 cursor-pointer ${
              selectedDept === 'ALL'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Général (Tous)
          </button>
          {VALID_DEPARTMENT_CODES.map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => setSelectedDept(code)}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all shrink-0 cursor-pointer ${
                selectedDept === code
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {code}
            </button>
          ))}
        </div>

        {/* Leaderboard Table / List */}
        <div className="flex-1 overflow-y-auto no-scrollbar space-y-2 pr-0.5">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-400 text-xs">
              <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
              <span>Chargement du classement...</span>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12 text-xs text-slate-500">
              Aucun joueur classé dans cette catégorie pour le moment.
            </div>
          ) : (
            users.map((player, index) => {
              const rank = index + 1;
              const isCurrentUser = player.id === currentUserId;

              return (
                <div
                  key={player.id}
                  className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                    isCurrentUser
                      ? 'bg-amber-950/40 border-amber-500/80 ring-1 ring-amber-400/40 shadow-md'
                      : rank === 1
                      ? 'bg-amber-500/10 border-amber-400/50'
                      : rank === 2
                      ? 'bg-slate-800/60 border-slate-600/50'
                      : rank === 3
                      ? 'bg-amber-900/15 border-amber-700/40'
                      : 'bg-slate-950/70 border-slate-800/80'
                  }`}
                >
                  {/* Left: Rank & User identity */}
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Rank Badge */}
                    <div className="w-7 text-center shrink-0">
                      {rank === 1 ? (
                        <span className="text-lg">🥇</span>
                      ) : rank === 2 ? (
                        <span className="text-lg">🥈</span>
                      ) : rank === 3 ? (
                        <span className="text-lg">🥉</span>
                      ) : (
                        <span className="font-mono text-xs font-black text-slate-500">
                          #{rank}
                        </span>
                      )}
                    </div>

                    {/* Pseudo & Dept */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`font-black text-xs sm:text-sm truncate max-w-[120px] sm:max-w-[200px] ${
                            isCurrentUser ? 'text-amber-300' : 'text-white'
                          }`}
                        >
                          {player.username}
                        </span>
                        {isCurrentUser && (
                          <span className="text-[9px] font-black uppercase px-1 rounded bg-amber-400 text-slate-950">
                            Moi
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <span className="px-1 py-0.2 rounded bg-slate-800 border border-slate-700 text-amber-300 font-bold">
                          {player.department}
                        </span>
                        <span>• {player.rankedGames} parties ({player.wins}V - {player.draws}N - {player.losses}D)</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Elo Rating */}
                  <div className="text-right shrink-0">
                    <div className="font-mono font-black text-base sm:text-lg text-amber-400">
                      {player.elo}
                    </div>
                    <div className="text-[9px] text-slate-500 uppercase font-bold">
                      Elo
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>

      <footer className="text-center text-[10px] text-slate-500 py-1">
        Départements : INF (Informatique), TR (Télécom), Civil (Génie Civil), MECA (Mécanique), G (Gestion), GCBA (GCBA)
      </footer>
    </div>
  );
};
