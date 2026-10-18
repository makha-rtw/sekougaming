import React, { useState, useEffect } from 'react';
import { GameStatePublic } from '../../../shared/types.js';
import { Crown, Copy, Check, Share2, Play, LogOut, XCircle } from 'lucide-react';
import { getPlayerColor } from '../components/OpponentRing.js';

interface LobbyScreenProps {
  publicState: GameStatePublic;
  myPlayerId: string;
  onStartGame: () => void;
  onLeaveRoom: () => void;
  onCloseRoom?: () => void;
  isLoading: boolean;
  error?: string | null;
}

export const LobbyScreen: React.FC<LobbyScreenProps> = ({
  publicState,
  myPlayerId,
  onStartGame,
  onLeaveRoom,
  onCloseRoom,
  isLoading,
  error,
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);

  const isHost = publicState.hostId === myPlayerId;
  const connectedPlayers = publicState.players.filter(p => p.isConnected);
  const canStart = isHost && connectedPlayers.length >= 2 && connectedPlayers.length <= 15;

  const joinUrl = `${window.location.origin}/?game=sekouno&room=${publicState.roomCode}`;

  useEffect(() => {
    // Fetch QR Code data URL from server endpoint
    fetch(`/api/qrcode?text=${encodeURIComponent(joinUrl)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.dataUrl) setQrCodeUrl(data.dataUrl);
      })
      .catch((err) => console.error('Failed to load QR code', err));
  }, [joinUrl]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(publicState.roomCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Rejoins ma partie de Sekouno !',
        text: `Rejoins ma partie Sekouno avec le code ${publicState.roomCode} !`,
        url: joinUrl,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(joinUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between p-3 md:p-4 max-w-lg mx-auto pt-safe pb-safe">
      {/* Lobby Header */}
      <header className="pt-2 pb-2 text-center">
        <div className="flex items-center justify-between mb-3">
          {isHost ? (
            <button
              type="button"
              onClick={onCloseRoom || onLeaveRoom}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-950/70 border border-red-500/40 text-xs font-bold text-red-300 hover:bg-red-900/80 transition-colors shadow"
            >
              <XCircle className="w-4 h-4 text-red-400" />
              <span>Fermer le salon</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onLeaveRoom}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-300 hover:text-red-300 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Quitter le salon</span>
            </button>
          )}

          <span className="text-xs uppercase tracking-widest text-amber-400 font-extrabold">
            Salon d'attente
          </span>
          <div className="w-16" />
        </div>

        {/* QR Code directly visible above the Room Code */}
        <div className="bg-slate-900/90 border border-slate-700 rounded-3xl p-4 shadow-2xl flex flex-col items-center">
          <p className="text-[11px] uppercase tracking-wider text-slate-400 mb-2">
            Scannez ou partagez pour rejoindre
          </p>

          {/* QR Code image displayed immediately */}
          <div className="p-2.5 bg-white rounded-2xl shadow-lg mb-3">
            {qrCodeUrl ? (
              <img
                src={qrCodeUrl}
                alt={`QR Code ${publicState.roomCode}`}
                className="w-36 h-36 md:w-44 md:h-44 object-contain"
              />
            ) : (
              <div className="w-36 h-36 md:w-44 md:h-44 bg-slate-200 rounded-xl flex items-center justify-center text-xs text-slate-500 animate-pulse">
                Chargement...
              </div>
            )}
          </div>

          {/* Room Code Display */}
          <p className="text-xs uppercase tracking-wider text-slate-400 mb-1">
            Code de la salle
          </p>
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="font-mono text-3xl md:text-4xl font-black text-amber-400 tracking-widest">
              {publicState.roomCode}
            </span>
          </div>

          {/* Copy and Share buttons */}
          <div className="grid grid-cols-2 gap-2 w-full max-w-xs">
            <button
              type="button"
              onClick={handleCopyCode}
              className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors border border-slate-700 shadow"
            >
              {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copiedCode ? 'Copié !' : 'Copier code'}</span>
            </button>
            <button
              type="button"
              onClick={handleCopyLink}
              className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors border border-slate-700 shadow"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
              <span>{copiedLink ? 'Copié !' : 'Partager lien'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Players List with individual colors */}
      <main className="my-3 flex-1">
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-4 shadow-lg">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
            <span className="font-bold text-xs md:text-sm text-slate-200">
              Joueurs présents
            </span>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-800 text-amber-400">
              {publicState.players.length} / 15
            </span>
          </div>

          {error && (
            <div className="mb-3 p-2.5 bg-red-950/80 border border-red-500/50 rounded-xl text-xs text-red-200">
              {error}
            </div>
          )}

          <div className="space-y-2 max-h-[30vh] overflow-y-auto pr-1 no-scrollbar">
            {publicState.players.map((p, idx) => (
              <div
                key={p.id}
                className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-950/60 border border-slate-800"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={`w-2 h-2 rounded-full ${p.isConnected ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' : 'bg-slate-600'}`}
                  />
                  <div className={`w-8 h-8 rounded-full bg-gradient-to-tr ${getPlayerColor(idx)} flex items-center justify-center font-bold text-xs text-white shadow`}>
                    {p.name.slice(0, 2).toUpperCase()}
                  </div>
                  <span className="font-bold text-xs md:text-sm text-white">
                    {p.name} {p.id === myPlayerId && <span className="text-slate-400 text-xs font-normal">(Vous)</span>}
                  </span>
                </div>
                {p.isHost && (
                  <div className="flex items-center gap-1 text-[11px] text-amber-400 font-bold bg-amber-950/50 border border-amber-500/30 px-2 py-0.5 rounded-lg">
                    <Crown className="w-3.5 h-3.5" />
                    <span>Hôte</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {!canStart && isHost && (
            <p className="text-xs text-center text-slate-400 mt-3 italic">
              Il faut au moins 2 joueurs connectés pour pouvoir lancer la partie.
            </p>
          )}

          {!isHost && (
            <p className="text-xs text-center text-amber-300 mt-3 animate-pulse">
              En attente du lancement par l'hôte...
            </p>
          )}
        </div>
      </main>

      {/* Footer Controls */}
      <footer className="pb-3">
        {isHost && (
          <button
            type="button"
            onClick={onStartGame}
            disabled={!canStart || isLoading}
            className={`
              w-full py-3.5 px-6 rounded-2xl font-black text-sm md:text-base uppercase tracking-wider text-white shadow-xl flex items-center justify-center gap-2 transition-all transform active:scale-95
              ${canStart ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:brightness-110 cursor-pointer ring-2 ring-emerald-400/50' : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-60'}
            `}
          >
            {isLoading ? (
              <span>Lancement...</span>
            ) : (
              <>
                <Play className="w-5 h-5 fill-current" />
                <span>Démarrer la partie ({connectedPlayers.length}/15)</span>
              </>
            )}
          </button>
        )}
      </footer>
    </div>
  );
};
