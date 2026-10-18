import React, { useState, useEffect } from 'react';
import { Play, Users, ShieldAlert, Sparkles, Smartphone, Layers, ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';
import { CardView } from '../components/CardView.js';

interface HomeScreenProps {
  onCreateRoom: (name: string) => void;
  onJoinRoom: (code: string, name: string) => void;
  onBackToHub?: () => void;
  invitedRoomCode?: string | null;
  savedPlayerName?: string;
  isLoading: boolean;
  isConnected?: boolean;
  error?: string | null;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onCreateRoom,
  onJoinRoom,
  onBackToHub,
  invitedRoomCode,
  savedPlayerName = '',
  isLoading,
  isConnected = true,
  error,
}) => {
  const [mode, setMode] = useState<'create' | 'join'>(invitedRoomCode ? 'join' : 'create');
  const [playerName, setPlayerName] = useState(savedPlayerName);
  const [roomCode, setRoomCode] = useState(invitedRoomCode || '');
  const [isInviteMode, setIsInviteMode] = useState(Boolean(invitedRoomCode));
  const [localError, setLocalError] = useState<string | null>(null);

  // Synchronize when invitedRoomCode or savedPlayerName changes
  useEffect(() => {
    if (invitedRoomCode) {
      setMode('join');
      setRoomCode(invitedRoomCode.toUpperCase());
      setIsInviteMode(true);
    }
  }, [invitedRoomCode]);

  useEffect(() => {
    if (savedPlayerName && !playerName) {
      setPlayerName(savedPlayerName);
    }
  }, [savedPlayerName]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    const name = playerName.trim();
    if (!name || name.length < 2) {
      setLocalError('Le pseudonyme doit comporter au moins 2 caractères.');
      return;
    }
    if (name.length > 20) {
      setLocalError('Le pseudonyme ne peut pas dépasser 20 caractères.');
      return;
    }

    if (mode === 'create') {
      onCreateRoom(name);
    } else {
      const code = roomCode.trim().toUpperCase();
      if (!code || code.length !== 6) {
        setLocalError('Veuillez saisir un code de salle valide (6 caractères).');
        return;
      }
      onJoinRoom(code, name);
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col justify-between p-4 max-w-lg mx-auto pt-safe pb-safe select-none">
      {onBackToHub && (
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
      )}

      {/* Header with Visual Card Fan */}
      <header className="text-center pt-1 pb-2">
        {/* Decorative interactive mini card fan */}
        <div className="flex items-center justify-center -space-x-4 mb-2 pt-1">
          <div className="transform -rotate-12 transition-transform hover:-translate-y-2 hover:rotate-[-16deg]">
            <CardView card={{ id: 'demo1', color: 'red', value: '7' }} size="sm" />
          </div>
          <div className="transform -rotate-4 transition-transform hover:-translate-y-2 hover:rotate-[-6deg] z-10">
            <CardView card={{ id: 'demo2', color: 'blue', value: 'skip' }} size="sm" />
          </div>
          <div className="transform rotate-4 transition-transform hover:-translate-y-2 hover:rotate-[6deg] z-20">
            <CardView card={{ id: 'demo3', color: 'yellow', value: 'draw2' }} size="sm" />
          </div>
          <div className="transform rotate-12 transition-transform hover:-translate-y-2 hover:rotate-[16deg] z-30">
            <CardView card={{ id: 'demo4', color: 'green', value: 'reverse' }} size="sm" />
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-white drop-shadow">
          SEKOU-GAMING
        </h1>
        <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-950/70 border border-amber-500/40 text-[11px] font-black text-amber-300 uppercase tracking-widest mt-1">
          <Sparkles className="w-3 h-3 text-amber-400" />
          <span>SEKOUNO • VRAI UNO EN LIGNE</span>
        </div>
      </header>

      {/* Main Card Form */}
      <main className="bg-slate-900/95 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl backdrop-blur-md my-auto relative overflow-hidden">
        {/* Ambient Glow */}
        <div className="absolute top-0 right-0 w-36 h-36 bg-gradient-to-bl from-blue-600/15 via-amber-500/10 to-transparent rounded-full blur-2xl pointer-events-none" />

        {/* 1. INVITATION BANNER (Shown when scanned from QR Code or opened with ?room=) */}
        {isInviteMode && roomCode ? (
          <div className="mb-5 p-4 rounded-2xl bg-gradient-to-br from-blue-950/90 via-indigo-950/80 to-slate-900 border-2 border-blue-500/60 shadow-xl text-center relative">
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/40 text-[10px] font-black uppercase tracking-wider mb-2">
              <Sparkles className="w-3 h-3 text-amber-400 animate-pulse" />
              <span>Invitation reçue via QR Code</span>
            </div>
            <p className="text-xs text-slate-300 font-medium">
              Vous rejoignez la partie en direct :
            </p>
            <div className="mt-1 text-3xl sm:text-4xl font-mono font-black text-amber-400 tracking-widest drop-shadow-md">
              {roomCode}
            </div>
          </div>
        ) : (
          /* 2. MODE TOGGLE (When manually opening the page) */
          <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-950 rounded-2xl mb-5 border border-slate-800">
            <button
              type="button"
              onClick={() => { setMode('create'); setLocalError(null); }}
              className={`py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${mode === 'create' ? 'bg-gradient-to-r from-red-600 via-amber-500 to-amber-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Créer une salle
            </button>
            <button
              type="button"
              onClick={() => { setMode('join'); setLocalError(null); }}
              className={`py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${mode === 'join' ? 'bg-gradient-to-r from-blue-600 to-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Rejoindre une salle
            </button>
          </div>
        )}

        {/* Error notification */}
        {(error || localError) && (
          <div className="mb-4 p-3 bg-red-950/90 border border-red-500/60 rounded-xl text-xs text-red-200 flex items-center gap-2 shadow-lg animate-shake">
            <ShieldAlert className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span>{error || localError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1.5">
              Votre pseudonyme
            </label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Ex: Sekou, Amina, Lucas..."
              maxLength={20}
              required
              autoFocus={!playerName}
              className="w-full px-4 py-3 bg-slate-950 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400 text-sm font-medium shadow-inner"
            />
          </div>

          {/* Show room code field only when manually joining, or hidden if in invitation mode */}
          {mode === 'join' && !isInviteMode && (
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Code de la salle
              </label>
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="Ex: 8XF2M9"
                maxLength={6}
                required
                className="w-full px-4 py-3 bg-slate-950 border border-slate-700/80 rounded-xl text-white font-mono uppercase tracking-widest placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm shadow-inner"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !isConnected}
            className={`w-full py-3.5 px-6 rounded-2xl font-black text-sm sm:text-base text-white uppercase tracking-wider transition-all transform active:scale-95 shadow-xl flex items-center justify-center gap-2 disabled:opacity-50 ring-2 ring-white/10 cursor-pointer ${
              isInviteMode
                ? 'bg-gradient-to-r from-emerald-600 via-blue-600 to-indigo-600 hover:brightness-110 shadow-blue-500/25'
                : mode === 'create'
                ? 'bg-gradient-to-r from-red-600 via-amber-500 to-amber-600 hover:brightness-110 shadow-orange-500/25'
                : 'bg-gradient-to-r from-blue-600 to-emerald-600 hover:brightness-110 shadow-emerald-500/25'
            }`}
          >
            {isLoading ? (
              <>
                <span className="inline-block animate-spin mr-1">⏳</span>
                <span>Connexion au salon...</span>
              </>
            ) : !isConnected ? (
              <span>Connexion au serveur...</span>
            ) : isInviteMode ? (
              <>
                <Users className="w-4 h-4" />
                <span>Rejoindre le salon {roomCode}</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </>
            ) : mode === 'create' ? (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Créer le salon privé</span>
              </>
            ) : (
              <>
                <Users className="w-4 h-4" />
                <span>Rejoindre la partie</span>
              </>
            )}
          </button>

          {/* Option to switch back to normal mode if in invitation mode */}
          {isInviteMode && (
            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => {
                  setIsInviteMode(false);
                  setMode('create');
                  setRoomCode('');
                }}
                className="text-xs text-slate-400 hover:text-amber-400 underline transition-colors cursor-pointer"
              >
                Créer un autre salon ou entrer un code manuellement
              </button>
            </div>
          )}
        </form>
      </main>

      {/* Rules Notice */}
      <footer className="mt-4 mb-2 space-y-2 text-slate-400 text-xs">
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-3.5 space-y-1.5">
          <div className="flex items-center gap-1.5 text-amber-400 font-bold text-[11px]">
            <Sparkles className="w-3.5 h-3.5" />
            <span>RÈGLES MAÎTRESSES DU JEU</span>
          </div>
          <p className="text-[11px] leading-relaxed">
            <strong className="text-slate-200">Règle A :</strong> Impossible de finir sur une carte noire (Changement de couleur ou +4). Vous devez piocher !
          </p>
          <p className="text-[11px] leading-relaxed">
            <strong className="text-slate-200">Règle B :</strong> Empilement strictement croissant (+2 sur +2, +4 sur +2). Pas de +2 sur +4, et pas de +4 sur +4.
          </p>
          <div className="flex items-center justify-between pt-2 text-[10px] text-slate-400 border-t border-slate-800/80">
            <span className="flex items-center gap-1"><Users className="w-3 h-3 text-blue-400" /> 2 à 15 Joueurs</span>
            <span className="flex items-center gap-1"><Smartphone className="w-3 h-3 text-emerald-400" /> Mobile & PWA</span>
            <span className="flex items-center gap-1"><Layers className="w-3 h-3 text-amber-400" /> Multi-paquets</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
