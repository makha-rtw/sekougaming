import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { GameStatePublic } from '../../../shared/types.js';
import { Crown, Copy, Check, Share2, Play, LogOut, XCircle, Users } from 'lucide-react';
import { getPlayerColor } from '../components/OpponentRing.js';
import { sounds } from '../utils/sound.js';

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
  const connectedPlayers = publicState.players.filter((p) => p.isConnected);
  const canStart = isHost && connectedPlayers.length >= 2 && connectedPlayers.length <= 15;

  const joinUrl = `${window.location.origin}/?game=sekouno&room=${publicState.roomCode}`;

  // Play a subtle chime when a new player joins the lobby
  const prevPlayerCountRef = useRef(publicState.players.length);
  useEffect(() => {
    if (publicState.players.length > prevPlayerCountRef.current) {
      sounds.buttonClick();
    }
    prevPlayerCountRef.current = publicState.players.length;
  }, [publicState.players.length]);

  useEffect(() => {
    fetch(`/api/qrcode?text=${encodeURIComponent(joinUrl)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.dataUrl) setQrCodeUrl(data.dataUrl);
      })
      .catch((err) => console.error('Failed to load QR code', err));
  }, [joinUrl]);

  const handleCopyCode = () => {
    sounds.buttonClick();
    navigator.clipboard.writeText(publicState.roomCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    sounds.buttonClick();
    if (navigator.share) {
      navigator
        .share({
          title: 'Rejoins ma table Sekouno !',
          text: `Rejoins ma partie Sekouno avec le code ${publicState.roomCode} !`,
          url: joinUrl,
        })
        .catch(() => {});
    } else {
      navigator.clipboard.writeText(joinUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  return (
    <div
      className="min-h-[100dvh] w-full flex flex-col justify-between p-4 pt-safe pb-safe select-none text-[#F5EFE4] font-['Plus_Jakarta_Sans',_sans-serif]"
      style={{
        background:
          'radial-gradient(ellipse 85% 60% at 50% 25%, #103324 0%, #071810 60%, #030A07 100%)',
      }}
    >
      <div className="w-full max-w-4xl mx-auto flex-1 flex flex-col justify-between">
        {/* Top Bar */}
        <header className="flex items-center justify-between py-2">
          {isHost ? (
            <button
              type="button"
              onClick={onCloseRoom || onLeaveRoom}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#2D0D0F] hover:bg-[#421316] border border-[#E03131]/40 text-xs font-bold text-[#FF8787] transition-colors cursor-pointer"
            >
              <XCircle className="w-4 h-4" />
              <span>Fermer la table</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onLeaveRoom}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-[#B5C4B9] hover:text-[#FF8787] transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Quitter</span>
            </button>
          )}

          <span className="font-['Bricolage_Grotesque',_sans-serif] text-sm font-extrabold text-[#E5B84B] tracking-wide">
            Table d'attente
          </span>
          <div className="w-20" />
        </header>

        {/* Main 2-Column Club Ticket & Seats */}
        <main className="my-auto py-4 grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">
          {/* Left: Invitation Pass + QR Code */}
          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:col-span-5 bg-[#081610]/95 border-2 border-[#E5B84B]/35 rounded-[30px] p-5 flex flex-col items-center justify-between text-center shadow-2xl"
          >
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#9FB0A5]">
                Scannez pour rejoindre la table
              </span>

              <div className="mt-3 p-3 bg-[#FAF3E6] rounded-2xl shadow-lg inline-block">
                {qrCodeUrl ? (
                  <img
                    src={qrCodeUrl}
                    alt={`QR Code ${publicState.roomCode}`}
                    className="w-36 h-36 sm:w-40 sm:h-40 object-contain"
                  />
                ) : (
                  <div className="w-36 h-36 sm:w-40 sm:h-40 bg-[#E5DEC9] rounded-xl flex items-center justify-center text-xs text-[#594A38] animate-pulse">
                    Génération...
                  </div>
                )}
              </div>
            </div>

            <div className="w-full mt-4 pt-3 border-t border-white/10">
              <span className="text-[11px] font-semibold text-[#9FB0A5] block">
                Code d'accès direct
              </span>
              <div className="font-['Bricolage_Grotesque',_sans-serif] text-3xl sm:text-4xl font-extrabold text-[#E5B84B] tracking-widest my-1">
                {publicState.roomCode}
              </div>

              <div className="grid grid-cols-2 gap-2 mt-3">
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="py-2.5 px-3 bg-white/5 hover:bg-white/10 text-[#F5EFE4] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border border-white/10 transition-colors cursor-pointer"
                >
                  {copiedCode ? (
                    <Check className="w-4 h-4 text-[#16A35A]" />
                  ) : (
                    <Copy className="w-4 h-4 text-[#E5B84B]" />
                  )}
                  <span>{copiedCode ? 'Copié !' : 'Copier code'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="py-2.5 px-3 bg-white/5 hover:bg-white/10 text-[#F5EFE4] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border border-white/10 transition-colors cursor-pointer"
                >
                  {copiedLink ? (
                    <Check className="w-4 h-4 text-[#16A35A]" />
                  ) : (
                    <Share2 className="w-4 h-4 text-[#E5B84B]" />
                  )}
                  <span>{copiedLink ? 'Lien copié !' : 'Inviter'}</span>
                </button>
              </div>
            </div>
          </motion.section>

          {/* Right: Seated Players */}
          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 }}
            className="md:col-span-7 bg-[#081610]/90 border border-white/10 rounded-[30px] p-5 flex flex-col justify-between shadow-2xl"
          >
            <div>
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#E5B84B]" />
                  <h2 className="font-['Bricolage_Grotesque',_sans-serif] font-extrabold text-base sm:text-lg text-[#F5EFE4]">
                    Joueurs autour du tapis
                  </h2>
                </div>
                <span className="font-['Bricolage_Grotesque',_sans-serif] text-xs font-extrabold px-3 py-1 rounded-full bg-[#12291E] text-[#E5B84B] border border-[#E5B84B]/30">
                  {publicState.players.length} / 15
                </span>
              </div>

              {error && (
                <div className="mb-3 p-3 bg-[#2D0A0A] border border-[#E03131] rounded-xl text-xs text-[#FFD8D8]">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[34vh] overflow-y-auto pr-1 no-scrollbar">
                {publicState.players.map((p, idx) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-2.5 rounded-2xl bg-[#040C08]/80 border border-white/10"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="relative shrink-0">
                        <div
                          className={`w-9 h-9 rounded-xl bg-gradient-to-br ${getPlayerColor(
                            idx
                          )} flex items-center justify-center font-['Bricolage_Grotesque',_sans-serif] font-extrabold text-xs text-[#FAF3E6] shadow`}
                        >
                          {p.name.slice(0, 2).toUpperCase()}
                        </div>
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#040C08] ${
                            p.isConnected ? 'bg-[#16A35A]' : 'bg-zinc-500'
                          }`}
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-xs sm:text-sm text-[#F5EFE4] truncate">
                          {p.name}{' '}
                          {p.id === myPlayerId && (
                            <span className="text-[#9FB0A5] text-xs font-normal">(Vous)</span>
                          )}
                        </div>
                        <div className="text-[10px] text-[#8FA696]">
                          Siège #{idx + 1}
                        </div>
                      </div>
                    </div>

                    {p.isHost && (
                      <div className="inline-flex items-center gap-1 text-[10px] text-[#E5B84B] font-bold bg-[#E5B84B]/15 border border-[#E5B84B]/30 px-2 py-0.5 rounded-lg shrink-0">
                        <Crown className="w-3 h-3" />
                        <span>Hôte</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-white/10">
              {isHost ? (
                <button
                  type="button"
                  onClick={() => {
                    sounds.playCard();
                    onStartGame();
                  }}
                  disabled={!canStart || isLoading}
                  className={`w-full py-4 px-6 rounded-full font-['Bricolage_Grotesque',_sans-serif] font-extrabold text-sm sm:text-base flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                    canStart
                      ? 'bg-[#E5B84B] hover:bg-[#F0C75E] text-[#091510] shadow-[0_12px_30px_-8px_rgba(229,184,75,0.55)] cursor-pointer'
                      : 'bg-white/5 text-[#6D8275] border border-white/10 cursor-not-allowed'
                  }`}
                >
                  {isLoading ? (
                    <span>Distribution des cartes...</span>
                  ) : canStart ? (
                    <>
                      <Play className="w-4 h-4 fill-current" />
                      <span>Distribuer les cartes ({connectedPlayers.length} joueurs)</span>
                    </>
                  ) : (
                    <span>En attente d'un 2e joueur pour distribuer...</span>
                  )}
                </button>
              ) : (
                <div className="py-3 px-4 rounded-2xl bg-[#040C08]/70 border border-white/10 text-center text-xs text-[#E5B84B] font-semibold animate-pulse">
                  En attente de la distribution par l'hôte de la table...
                </div>
              )}
            </div>
          </motion.section>
        </main>

        <div />
      </div>
    </div>
  );
};
