import React, { useState } from 'react';
import { DepartmentCode, VALID_DEPARTMENT_CODES, DEPARTMENTS, UserPublic } from '../../../../../shared/chessTypes.js';
import { loginUser, registerUser, loginAsGuest } from '../services/api.js';
import { User, Lock, ArrowLeft, Crown, Sparkles, Building2, UserPlus } from 'lucide-react';

interface AuthScreenProps {
  onSuccess: (user: UserPublic) => void;
  onBackToHub: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onSuccess, onBackToHub }) => {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [department, setDepartment] = useState<DepartmentCode>('INF');

  const [isLoading, setIsLoading] = useState(false);
  const [isGuestLoading, setIsGuestLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (tab === 'login') {
        const res = await loginUser(username.trim(), password);
        if (res.success && res.user) {
          onSuccess(res.user);
        } else {
          setError(res.error || 'Identifiants incorrects.');
        }
      } else {
        if (password !== confirmPassword) {
          setError('Les deux mots de passe ne correspondent pas.');
          setIsLoading(false);
          return;
        }

        const res = await registerUser(username.trim(), password, confirmPassword, department);
        if (res.success && res.user) {
          onSuccess(res.user);
        } else {
          setError(res.error || "Erreur lors de l'inscription.");
        }
      }
    } catch {
      setError('Une erreur réseau est survenue.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestPlay = async () => {
    setError(null);
    setIsGuestLoading(true);
    try {
      const res = await loginAsGuest();
      if (res.success && res.user) {
        onSuccess(res.user);
      } else {
        setError(res.error || 'Impossible de lancer le mode invité.');
      }
    } catch {
      setError('Une erreur réseau est survenue.');
    } finally {
      setIsGuestLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col justify-between p-4 max-w-md mx-auto pt-safe pb-safe select-none">
      {/* Top Bar: Back to Hub */}
      <div className="w-full flex justify-start mb-2">
        <button
          type="button"
          onClick={onBackToHub}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-xs font-bold text-amber-400 hover:text-white hover:bg-slate-800 transition-all shadow-md active:scale-95 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Accueil SekouGaming</span>
        </button>
      </div>

      {/* Brand Header */}
      <header className="text-center my-auto py-3 flex flex-col items-center">
        <div className="relative mb-2.5 group">
          <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-600 opacity-60 blur-md" />
          <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-slate-900 border-2 border-amber-400/80 flex items-center justify-center shadow-xl">
            <Crown className="w-8 h-8 text-amber-400" />
          </div>
        </div>

        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white drop-shadow">
          POLY<span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500">CHESS</span>
        </h1>
        <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-950/70 border border-amber-500/40 text-[10px] font-black text-amber-300 uppercase tracking-widest mt-1">
          <Sparkles className="w-3 h-3 text-amber-400" />
          <span>Échecs en Ligne & Classement Elo</span>
        </div>
        <p className="text-xs text-slate-400 mt-1.5 max-w-xs leading-relaxed">
          Connectez-vous avec votre département ou jouez immédiatement en mode invité.
        </p>
      </header>

      {/* Main Auth Card */}
      <main className="bg-slate-900/95 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl backdrop-blur-md relative overflow-hidden my-auto">
        {/* Toggle Mode */}
        <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-950 rounded-2xl mb-4 border border-slate-800">
          <button
            type="button"
            onClick={() => {
              setTab('login');
              setError(null);
            }}
            className={`py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
              tab === 'login'
                ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Connexion
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('register');
              setError(null);
            }}
            className={`py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
              tab === 'register'
                ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Créer un compte
          </button>
        </div>

        {/* Error notification */}
        {error && (
          <div className="mb-4 p-3 bg-red-950/90 border border-red-500/60 rounded-xl text-xs text-red-200 flex items-center gap-2 shadow-lg animate-shake">
            <span className="shrink-0 font-bold">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Pseudo */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
              Pseudonyme
            </label>
            <div className="relative">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ex: Magnus_75"
                minLength={3}
                maxLength={20}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                required
                className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400 text-sm font-medium shadow-inner"
              />
              <User className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
            </div>
          </div>

          {/* Department dropdown (Required for registration) */}
          {tab === 'register' && (
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                Département
              </label>
              <div className="relative">
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value as DepartmentCode)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-400 text-sm font-medium shadow-inner cursor-pointer"
                >
                  {VALID_DEPARTMENT_CODES.map((code) => (
                    <option key={code} value={code} className="bg-slate-900 text-white">
                      {code} — {DEPARTMENTS[code]}
                    </option>
                  ))}
                </select>
                <Building2 className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
              </div>
            </div>
          )}

          {/* Password */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
              Mot de passe
            </label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                minLength={6}
                autoCapitalize="none"
                autoCorrect="off"
                required
                className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400 text-sm font-medium shadow-inner"
              />
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
            </div>
          </div>

          {/* Confirm Password */}
          {tab === 'register' && (
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                Confirmer le mot de passe
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  minLength={6}
                  autoCapitalize="none"
                  autoCorrect="off"
                  required
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400 text-sm font-medium shadow-inner"
                />
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
              </div>
            </div>
          )}

          {/* Submit CTA */}
          <button
            type="submit"
            disabled={isLoading || isGuestLoading}
            className="w-full mt-2 py-3 px-6 rounded-xl font-black text-sm uppercase tracking-wider text-white bg-gradient-to-r from-amber-600 via-orange-500 to-amber-700 hover:brightness-110 active:scale-95 shadow-xl shadow-orange-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 ring-2 ring-white/10"
          >
            {isLoading ? (
              <>
                <span className="inline-block animate-spin mr-1">⏳</span>
                <span>Traitement...</span>
              </>
            ) : tab === 'login' ? (
              <span>Se connecter</span>
            ) : (
              <span>Créer mon compte (1200 Elo)</span>
            )}
          </button>
        </form>

        {/* Guest Mode Separator & Button */}
        <div className="relative my-4 flex items-center justify-center">
          <div className="border-t border-slate-800 w-full" />
          <span className="bg-slate-900 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-500 shrink-0">
            Ou accès rapide
          </span>
          <div className="border-t border-slate-800 w-full" />
        </div>

        <button
          type="button"
          onClick={handleGuestPlay}
          disabled={isLoading || isGuestLoading}
          className="w-full py-2.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider text-amber-300 bg-slate-950/90 hover:bg-slate-800 border border-amber-500/40 hover:border-amber-400 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-md"
        >
          <UserPlus className="w-4 h-4 text-amber-400" />
          <span>{isGuestLoading ? 'Création du pseudo...' : 'Jouer en Mode Invité (Pseudo aléatoire)'}</span>
        </button>
      </main>

      {/* Footer Info */}
      <footer className="mt-3 text-center text-[11px] text-slate-500 font-medium">
        Tous les nouveaux joueurs commencent à 1200 Elo • Système officiel FIDE (K=32)
      </footer>
    </div>
  );
};
