import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Play,
  Users,
  ShieldAlert,
  ArrowLeft,
  ArrowRight,
  Volume2,
  VolumeX,
  Layers,
  Ban,
} from 'lucide-react';
import { CardView } from '../components/CardView.js';
import { sounds } from '../utils/sound.js';

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
  const [isMuted, setIsMuted] = useState(sounds.isSoundMuted());

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
      sounds.penalty();
      setLocalError('Votre pseudo doit comporter au moins 2 caractères.');
      return;
    }
    if (name.length > 20) {
      sounds.penalty();
      setLocalError('Votre pseudo ne peut pas dépasser 20 caractères.');
      return;
    }

    if (mode === 'create') {
      sounds.playCard();
      onCreateRoom(name);
    } else {
      const code = roomCode.trim().toUpperCase();
      if (!code || code.length !== 6) {
        sounds.penalty();
        setLocalError('Saisissez un code de table valide à 6 caractères.');
        return;
      }
      sounds.playCard();
      onJoinRoom(code, name);
    }
  };

  return (
    <div
      className="min-h-[100dvh] w-full flex flex-col justify-between px-4 py-4 pt-safe pb-safe select-none text-[#F5EFE4] font-['Plus_Jakarta_Sans',_sans-serif] relative overflow-x-hidden"
      style={{
        background:
          'radial-gradient(ellipse 90% 60% at 50% 15%, #113626 0%, #071911 55%, #030A07 100%)',
      }}
    >
      {/* Top Bar */}
      <div className="relative z-10 w-full max-w-4xl mx-auto flex items-center justify-between">
        {onBackToHub ? (
          <button
            type="button"
            onClick={() => {
              sounds.buttonClick();
              onBackToHub();
            }}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-[#091812]/90 border border-white/10 text-xs font-bold text-[#E5B84B] hover:bg-[#112A1F] transition-all cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Tous les jeux</span>
          </button>
        ) : (
          <div />
        )}

        <button
          type="button"
          onClick={() => setIsMuted(sounds.toggleMute())}
          className="p-2.5 rounded-full bg-[#091812]/90 border border-white/10 text-[#B5C4B9] hover:text-white transition-colors cursor-pointer"
          title={isMuted ? 'Activer le son' : 'Couper le son'}
        >
          {isMuted ? (
            <VolumeX className="w-4 h-4 text-[#FF6B6B]" />
          ) : (
            <Volume2 className="w-4 h-4 text-[#E5B84B]" />
          )}
        </button>
      </div>

      {/* Main Split Content */}
      <div className="relative z-10 w-full max-w-4xl mx-auto my-auto py-4 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Left Column: Hero Identity & Interactive Card Fan */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          className="lg:col-span-6 flex flex-col items-center lg:items-start text-center lg:text-left"
        >
          {/* Interactive Fanned Cards */}
          <div className="flex items-center justify-center lg:justify-start -space-x-3 sm:-space-x-4 mb-5 pt-2">
            {[
              { id: 'h1', color: 'red' as const, value: '7' as const, rot: '-14deg' },
              { id: 'h2', color: 'blue' as const, value: 'reverse' as const, rot: '-5deg' },
              { id: 'h3', color: 'yellow' as const, value: 'draw2' as const, rot: '5deg' },
              { id: 'h4', color: 'black' as const, value: 'wild4' as const, rot: '14deg' },
            ].map((c, idx) => (
              <div
                key={c.id}
                style={{ transform: `rotate(${c.rot})`, zIndex: idx }}
                className="transition-transform duration-200 hover:-translate-y-3 hover:z-30"
              >
                <CardView
                  card={{ id: c.id, color: c.color, value: c.value }}
                  size="sm"
                  onClick={() => sounds.playCard({ id: c.id, color: c.color, value: c.value })}
                />
              </div>
            ))}
          </div>

          <h1 className="font-['Bricolage_Grotesque',_sans-serif] text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[0.98] text-[#F5EFE4]">
            Sekouno
          </h1>
          <p className="mt-3 text-sm sm:text-base text-[#B5C4B9] max-w-[38ch] leading-relaxed">
            Prenez place autour du tapis vert. Multijoueur instantané de 2 à 15 joueurs, avec les vraies règles de surenchère.
          </p>

          {/* Compact House Rules Cards */}
          <div className="mt-5 w-full grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-left">
            <div className="p-3.5 rounded-2xl bg-[#07140E]/90 border border-white/10">
              <div className="flex items-center gap-2 text-xs font-['Bricolage_Grotesque',_sans-serif] font-extrabold text-[#FF8787] mb-1">
                <Ban className="w-3.5 h-3.5 shrink-0" />
                <span>Pas de sortie sur carte noire</span>
              </div>
              <p className="text-[11px] text-[#9FB0A5] leading-snug">
                Interdit de poser un Joker ou un +4 comme dernière carte.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#07140E]/90 border border-white/10">
              <div className="flex items-center gap-2 text-xs font-['Bricolage_Grotesque',_sans-serif] font-extrabold text-[#E5B84B] mb-1">
                <Layers className="w-3.5 h-3.5 shrink-0" />
                <span>Surenchère croissante</span>
              </div>
              <p className="text-[11px] text-[#9FB0A5] leading-snug">
                +2 ou +4 sur un +2. Aucun contre possible sur un +4.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Right Column: Table Creation / Join Card */}
        <motion.main
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.08 }}
          className="lg:col-span-6 bg-[#081610]/95 border-2 border-[#E5B84B]/30 rounded-[32px] p-5 sm:p-7 shadow-[0_24px_60px_rgba(0,0,0,0.75)] relative"
        >
          {/* QR Invitation Banner */}
          {isInviteMode && roomCode ? (
            <div className="mb-5 p-4 rounded-2xl bg-[#0E241A] border border-[#E5B84B]/50 text-center">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#E5B84B]">
                Invitation directe à la table
              </span>
              <div className="mt-1 font-['Bricolage_Grotesque',_sans-serif] text-3xl sm:text-4xl font-extrabold text-[#F5EFE4] tracking-widest">
                #{roomCode}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-1.5 p-1.5 bg-[#040C08] rounded-2xl mb-5 border border-white/10">
              <button
                type="button"
                onClick={() => {
                  sounds.buttonClick();
                  setMode('create');
                  setLocalError(null);
                }}
                className={`py-2.5 rounded-xl font-['Bricolage_Grotesque',_sans-serif] text-xs sm:text-sm font-extrabold transition-all cursor-pointer ${
                  mode === 'create'
                    ? 'bg-[#E5B84B] text-[#091510] shadow-md'
                    : 'text-[#9FB0A5] hover:text-[#F5EFE4]'
                }`}
              >
                Ouvrir une table
              </button>
              <button
                type="button"
                onClick={() => {
                  sounds.buttonClick();
                  setMode('join');
                  setLocalError(null);
                }}
                className={`py-2.5 rounded-xl font-['Bricolage_Grotesque',_sans-serif] text-xs sm:text-sm font-extrabold transition-all cursor-pointer ${
                  mode === 'join'
                    ? 'bg-[#E5B84B] text-[#091510] shadow-md'
                    : 'text-[#9FB0A5] hover:text-[#F5EFE4]'
                }`}
              >
                Rejoindre avec code
              </button>
            </div>
          )}

          {(error || localError) && (
            <div className="mb-4 p-3 bg-[#2D0A0A] border border-[#E03131] rounded-2xl text-xs text-[#FFD8D8] flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-[#FF6B6B] shrink-0" />
              <span>{error || localError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="sekouno-player-name"
                className="block text-xs font-bold text-[#C7D4CB]"
              >
                Votre pseudo autour de la table
              </label>
              <input
                id="sekouno-player-name"
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Ex : Sekou, Amina, Lucas..."
                maxLength={20}
                required
                autoFocus={!playerName}
                className="w-full px-4 py-3.5 bg-[#040C08] border border-white/15 focus:border-[#E5B84B] rounded-2xl text-[#F5EFE4] placeholder-[#5F7367] focus:outline-none text-sm font-semibold transition-colors"
              />
            </div>

            {mode === 'join' && !isInviteMode && (
              <div className="space-y-1.5">
                <label
                  htmlFor="sekouno-room-code"
                  className="block text-xs font-bold text-[#C7D4CB]"
                >
                  Code de la table (6 caractères)
                </label>
                <input
                  id="sekouno-room-code"
                  type="text"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  placeholder="Ex : 8XF2M9"
                  maxLength={6}
                  required
                  className="w-full px-4 py-3.5 bg-[#040C08] border border-white/15 focus:border-[#E5B84B] rounded-2xl text-[#E5B84B] font-['Bricolage_Grotesque',_sans-serif] font-extrabold text-base uppercase tracking-widest placeholder-[#5F7367] focus:outline-none transition-colors"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !isConnected}
              className="w-full py-4 px-6 rounded-full bg-[#E5B84B] hover:bg-[#F0C75E] text-[#091510] font-['Bricolage_Grotesque',_sans-serif] font-extrabold text-sm sm:text-base transition-all active:scale-[0.98] shadow-[0_12px_30px_-8px_rgba(229,184,75,0.55)] flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <span>Ouverture de la table...</span>
              ) : !isConnected ? (
                <span>Connexion au serveur...</span>
              ) : isInviteMode ? (
                <>
                  <Users className="w-4 h-4" />
                  <span>Prendre place à la table #{roomCode}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : mode === 'create' ? (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Créer une table privée</span>
                </>
              ) : (
                <>
                  <Users className="w-4 h-4" />
                  <span>Rejoindre la table</span>
                </>
              )}
            </button>

            {isInviteMode && (
              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => {
                    sounds.buttonClick();
                    setIsInviteMode(false);
                    setMode('create');
                    setRoomCode('');
                  }}
                  className="text-xs text-[#9FB0A5] hover:text-[#E5B84B] underline transition-colors cursor-pointer"
                >
                  Créer une autre table ou saisir un autre code
                </button>
              </div>
            )}
          </form>
        </motion.main>
      </div>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-4xl mx-auto flex items-center justify-between text-[11px] text-[#6D8275] pt-2">
        <span>Sekouno Club • 2 à 15 joueurs</span>
        <span>Synchronisation temps réel</span>
      </footer>
    </div>
  );
};
