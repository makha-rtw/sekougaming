import React, { useState } from 'react';
import { TimeControlKey, TIME_CONTROLS, UserPublic } from '../../../../../shared/chessTypes.js';
import {
  Crown,
  Users,
  Trophy,
  History,
  LogOut,
  ArrowLeft,
  Swords,
  Sparkles,
  Smartphone,
  Lock,
  ChevronRight,
  Clock,
  Play,
} from 'lucide-react';

interface PolychessMainScreenProps {
  user: UserPublic;
  onPlayLocal: () => void;
  onQuickMatch: (timeControl: TimeControlKey) => void;
  onCreatePrivate: (timeControl: TimeControlKey) => void;
  onJoinPrivate: (roomCode: string) => void;
  onOpenLeaderboard: () => void;
  onOpenHistory: () => void;
  onLogout: () => void;
  onBackToHub: () => void;
}

export const PolychessMainScreen: React.FC<PolychessMainScreenProps> = ({
  user,
  onPlayLocal,
  onQuickMatch,
  onCreatePrivate,
  onJoinPrivate,
  onOpenLeaderboard,
  onOpenHistory,
  onLogout,
  onBackToHub,
}) => {
  const [showOnlineModal, setShowOnlineModal] = useState(false);
  const [onlineTab, setOnlineTab] = useState<'quick' | 'create_private' | 'join_private'>('quick');
  const [selectedTimeControl, setSelectedTimeControl] = useState<TimeControlKey>('5m');
  const [joinCodeInput, setJoinCodeInput] = useState('');

  const winRate =
    user.rankedGames > 0 ? Math.round((user.wins / user.rankedGames) * 100) : 0;

  const handleStartOnline = () => {
    if (onlineTab === 'quick') {
      setShowOnlineModal(false);
      onQuickMatch(selectedTimeControl);
    } else if (onlineTab === 'create_private') {
      setShowOnlineModal(false);
      onCreatePrivate(selectedTimeControl);
    } else {
      if (joinCodeInput.trim().length === 6) {
        setShowOnlineModal(false);
        onJoinPrivate(joinCodeInput.trim().toUpperCase());
      }
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col justify-between p-4 max-w-xl mx-auto pt-safe pb-safe select-none">
      {/* Top Navigation */}
      <header className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={onBackToHub}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-xs font-bold text-amber-400 hover:text-white hover:bg-slate-800 transition-all shadow-md active:scale-95 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Accueil SekouGaming</span>
        </button>

        <button
          type="button"
          onClick={onLogout}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs font-semibold text-slate-400 hover:text-red-400 hover:bg-red-950/40 transition-all cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Déconnexion</span>
        </button>
      </header>

      {/* Profile Card & Elo Badge */}
      <section className="bg-gradient-to-b from-slate-900/95 via-slate-900/90 to-slate-950/95 border-2 border-slate-800 rounded-3xl p-5 shadow-2xl relative overflow-hidden mb-4">
        {/* Glow */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/15 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-600 to-yellow-500 flex items-center justify-center shadow-lg text-slate-950 font-black text-xl shrink-0">
              ♚
            </div>
            <div className="min-w-0">
              <h2 className="text-xl sm:text-2xl font-black text-white truncate">
                {user.username}
              </h2>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-300">
                <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px]">
                  {user.department}
                </span>
                <span>{user.departmentName}</span>
              </span>
            </div>
          </div>

          {/* Elo Badge */}
          <div className="text-right shrink-0">
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              POLYCHESS ELO
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-amber-300 drop-shadow">
              {user.elo}
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-2 pt-3 border-t border-slate-800/80 text-center">
          <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <div className="text-[10px] uppercase font-bold text-slate-400">Parties</div>
            <div className="text-base font-black text-white">{user.rankedGames}</div>
          </div>
          <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <div className="text-[10px] uppercase font-bold text-emerald-400">Victoires</div>
            <div className="text-base font-black text-emerald-300">{user.wins}</div>
          </div>
          <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <div className="text-[10px] uppercase font-bold text-slate-400">Nuls</div>
            <div className="text-base font-black text-slate-300">{user.draws}</div>
          </div>
          <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <div className="text-[10px] uppercase font-bold text-red-400">Défaites</div>
            <div className="text-base font-black text-red-300">{user.losses}</div>
          </div>
        </div>
      </section>

      {/* Main Game Mode Cards Grid */}
      <div className="space-y-3 mb-4">
        {/* 1. Jouer en Ligne (Ranked Elo) */}
        <div
          onClick={() => setShowOnlineModal(true)}
          className="group relative rounded-2xl bg-gradient-to-r from-amber-950/60 via-slate-900 to-slate-900 border-2 border-amber-600/40 hover:border-amber-400 transition-all p-4 flex items-center justify-between shadow-xl cursor-pointer active:scale-98 overflow-hidden"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-lg shrink-0">
              <Swords className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white group-hover:text-amber-300 transition-colors">
                  Jouer en Ligne
                </h3>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  Classé Elo
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Matchmaking rapide ou salon privé avec vos amis.
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-amber-400 group-hover:translate-x-1 transition-transform shrink-0" />
        </div>

        {/* 2. Mode Local (Pass & Play) */}
        <div
          onClick={onPlayLocal}
          className="group relative rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/60 border-2 border-slate-800 hover:border-indigo-400/80 transition-all p-4 flex items-center justify-between shadow-xl cursor-pointer active:scale-98 overflow-hidden"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-700 flex items-center justify-center text-white shadow-lg shrink-0">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white group-hover:text-indigo-300 transition-colors">
                  Mode Local
                </h3>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                  Sur cet appareil
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Jouez à 2 joueurs sur le même écran sans connexion Internet.
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-indigo-400 group-hover:translate-x-1 transition-transform shrink-0" />
        </div>

        {/* Secondary Hub Actions: Leaderboard & History */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onOpenLeaderboard}
            className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-amber-400/60 transition-all flex items-center gap-2.5 shadow-lg active:scale-95 cursor-pointer text-left"
          >
            <Trophy className="w-5 h-5 text-amber-400 shrink-0" />
            <div className="min-w-0">
              <div className="text-xs font-bold text-white">Classements</div>
              <div className="text-[10px] text-slate-400">Général & Dépts</div>
            </div>
          </button>

          <button
            type="button"
            onClick={onOpenHistory}
            className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-amber-400/60 transition-all flex items-center gap-2.5 shadow-lg active:scale-95 cursor-pointer text-left"
          >
            <History className="w-5 h-5 text-blue-400 shrink-0" />
            <div className="min-w-0">
              <div className="text-xs font-bold text-white">Historique</div>
              <div className="text-[10px] text-slate-400">Derniers matchs</div>
            </div>
          </button>
        </div>
      </div>

      {/* Footer Studio Credit */}
      <footer className="text-center py-2 text-[10px] text-slate-500 font-medium">
        POLYCHESS • Règles officielles FIDE intégrées • Sekou-Gaming © 2026
      </footer>

      {/* Online Play Mode Selection Modal */}
      {showOnlineModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-amber-500/80 rounded-3xl p-5 max-w-sm w-full shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-lg font-black text-white text-center mb-4 flex items-center justify-center gap-2">
              <Swords className="w-5 h-5 text-amber-400" />
              <span>Partie en Ligne Classée</span>
            </h3>

            {/* Mode Sub-tabs */}
            <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-xl mb-4 text-[11px] font-bold border border-slate-800">
              <button
                type="button"
                onClick={() => setOnlineTab('quick')}
                className={`py-1.5 rounded-lg transition-all ${
                  onlineTab === 'quick' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'
                }`}
              >
                Rapide
              </button>
              <button
                type="button"
                onClick={() => setOnlineTab('create_private')}
                className={`py-1.5 rounded-lg transition-all ${
                  onlineTab === 'create_private' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'
                }`}
              >
                Créer salon
              </button>
              <button
                type="button"
                onClick={() => setOnlineTab('join_private')}
                className={`py-1.5 rounded-lg transition-all ${
                  onlineTab === 'join_private' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'
                }`}
              >
                Rejoindre
              </button>
            </div>

            {/* Time Control Selector for Quick and Create Private */}
            {onlineTab !== 'join_private' ? (
              <div className="mb-4">
                <label className="block text-xs font-bold text-slate-300 mb-2">
                  Cadence de jeu
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['none', '3m', '5m', '10m'] as TimeControlKey[]).map((key) => {
                    const cfg = TIME_CONTROLS[key];
                    const isSelected = selectedTimeControl === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setSelectedTimeControl(key)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500/20 border-amber-400 text-amber-300 ring-1 ring-amber-400'
                            : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <div className="text-xs font-black">{cfg.label}</div>
                        <div className="text-[10px] text-slate-400">
                          {key === 'none' ? 'Sans pendule' : `${cfg.seconds! / 60} min par camp`}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Join Private Room Code Input */
              <div className="mb-4">
                <label className="block text-xs font-bold text-slate-300 mb-2">
                  Code de la partie privée (6 lettres)
                </label>
                <input
                  type="text"
                  value={joinCodeInput}
                  onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                  placeholder="Ex: CH8K2M"
                  maxLength={6}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-center font-mono font-black text-lg tracking-widest text-white uppercase placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center gap-2 mt-5">
              <button
                type="button"
                onClick={() => setShowOnlineModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleStartOnline}
                disabled={onlineTab === 'join_private' && joinCodeInput.trim().length !== 6}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-500 hover:brightness-110 active:scale-95 text-xs font-black uppercase text-white shadow-lg cursor-pointer disabled:opacity-50"
              >
                {onlineTab === 'quick'
                  ? 'Rechercher'
                  : onlineTab === 'create_private'
                  ? 'Générer code'
                  : 'Rejoindre'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
