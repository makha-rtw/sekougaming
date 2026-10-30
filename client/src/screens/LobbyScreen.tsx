import React, { useState, useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { GameStatePublic } from '../../../shared/types.js';
import {
  CrownSimple,
  Copy,
  Check,
  ShareNetwork,
  Cards,
  SignOut,
  XCircle,
  UsersThree,
} from '@phosphor-icons/react';
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
  const reduceMotion = useReducedMotion();
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);

  const isHost = publicState.hostId === myPlayerId;
  const connectedPlayers = publicState.players.filter((p) => p.isConnected);
  const canStart = isHost && connectedPlayers.length >= 2 && connectedPlayers.length <= 15;

  const joinUrl = `${window.location.origin}/?game=sekouno&room=${publicState.roomCode}`;

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
      .catch(() => {});
  }, [joinUrl]);

  const handleCopyCode = () => {
    sounds.buttonClick();
    navigator.clipboard.writeText(publicState.roomCode);
    setCopiedCode(true);
    window.setTimeout(() => setCopiedCode(false), 2000);
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
      window.setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  return (
    <div className="sekouno-salon-world min-h-[100dvh] w-full flex flex-col justify-between px-3 sm:px-6 py-3 pt-safe pb-safe select-none">
      <div className="w-full max-w-5xl mx-auto flex-1 flex flex-col justify-between">
        {/* Top Salon Rail */}
        <header className="flex items-center justify-between py-2 border-b border-[#F6F0E2]/15">
          {isHost ? (
            <button
              type="button"
              onClick={onCloseRoom || onLeaveRoom}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-[#241216] hover:bg-[#381A20] border border-[#D92D20]/60 font-sekouno-mono text-xs font-bold uppercase text-[#F98076] transition-[background-color] cursor-pointer"
            >
              <XCircle weight="bold" className="w-4 h-4" />
              <span>Fermer la table</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onLeaveRoom}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-[#141924] hover:bg-[#1B2230] border border-[#F6F0E2]/20 font-sekouno-mono text-xs font-bold uppercase text-[#D9D0BE] transition-[background-color] cursor-pointer"
            >
              <SignOut weight="bold" className="w-4 h-4" />
              <span>Quitter</span>
            </button>
          )}

          <div className="flex items-center gap-2">
            <span className="font-sekouno-mono text-xs font-bold uppercase tracking-widest text-[#D4A548]">
              Foyer de Table • #{publicState.roomCode}
            </span>
          </div>

          <div className="w-20 hidden sm:block" />
        </header>

        {/* Main 2-Column Perforated Invitation Ticket & Seating Ledger */}
        <main className="my-auto py-4 grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">
          {/* Left: Detachable Ivory & Obsidian Invitation Pass */}
          <motion.section
            initial={reduceMotion ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:col-span-5 rounded-[12px] border-2 border-[#D4A548]/75 bg-[#141924] flex flex-col justify-between overflow-hidden shadow-2xl"
          >
            {/* Top Ivory QR Stub */}
            <div className="bg-[#F6F0E2] text-[#11131A] p-5 text-center">
              <span className="font-sekouno-mono text-[10px] font-bold uppercase tracking-widest text-[#6E6656] block">
                Billet d’invitation directe
              </span>

              <div className="mt-3 p-2.5 bg-white rounded-[8px] border border-[#11131A]/20 inline-block">
                {qrCodeUrl ? (
                  <img
                    src={qrCodeUrl}
                    alt={`QR Code ${publicState.roomCode}`}
                    className="w-36 h-36 sm:w-40 sm:h-40 object-contain"
                  />
                ) : (
                  <div className="w-36 h-36 sm:w-40 sm:h-40 bg-[#E6DEC8] rounded-[6px] flex items-center justify-center font-sekouno-mono text-xs text-[#6E6656]">
                    ...
                  </div>
                )}
              </div>
            </div>

            {/* Perforated Seam */}
            <div className="relative flex items-center bg-[#141924] -my-2.5 z-10 pointer-events-none">
              <div className="w-5 h-5 rounded-full bg-[#0D1017] border-2 border-[#D4A548]/75 -ml-3 shrink-0" />
              <div className="flex-1 border-t-2 border-dashed border-[#D4A548]/45 mx-2" />
              <div className="w-5 h-5 rounded-full bg-[#0D1017] border-2 border-[#D4A548]/75 -mr-3 shrink-0" />
            </div>

            {/* Bottom Obsidian Room Code Readout */}
            <div className="p-5 text-center">
              <span className="font-sekouno-mono text-[10px] font-bold uppercase tracking-widest text-[#D9D0BE]/70 block">
                Code de la table
              </span>
              <div className="font-sekouno-mono text-3xl sm:text-4xl font-bold text-[#D4A548] tracking-[0.22em] my-1.5">
                {publicState.roomCode}
              </div>

              <div className="grid grid-cols-2 gap-2 mt-3">
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="py-2.5 px-3 bg-[#1B2230] hover:bg-[#242D3F] text-[#F6F0E2] rounded-[6px] font-sekouno-mono text-xs font-bold flex items-center justify-center gap-1.5 border border-[#F6F0E2]/15 transition-[background-color] cursor-pointer"
                >
                  {copiedCode ? (
                    <Check weight="bold" className="w-4 h-4 text-[#099250]" />
                  ) : (
                    <Copy weight="bold" className="w-4 h-4 text-[#D4A548]" />
                  )}
                  <span>{copiedCode ? 'Copié' : 'Copier code'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="py-2.5 px-3 bg-[#1B2230] hover:bg-[#242D3F] text-[#F6F0E2] rounded-[6px] font-sekouno-mono text-xs font-bold flex items-center justify-center gap-1.5 border border-[#F6F0E2]/15 transition-[background-color] cursor-pointer"
                >
                  {copiedLink ? (
                    <Check weight="bold" className="w-4 h-4 text-[#099250]" />
                  ) : (
                    <ShareNetwork weight="bold" className="w-4 h-4 text-[#D4A548]" />
                  )}
                  <span>{copiedLink ? 'Lien copié' : 'Inviter'}</span>
                </button>
              </div>
            </div>
          </motion.section>

          {/* Right: Architectural Seating Ledger */}
          <motion.section
            initial={reduceMotion ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="md:col-span-7 bg-[#141924] border border-[#F6F0E2]/15 rounded-[12px] p-5 flex flex-col justify-between shadow-2xl"
          >
            <div>
              <div className="flex items-center justify-between pb-3 mb-3.5 border-b border-[#F6F0E2]/15">
                <div className="flex items-center gap-2">
                  <UsersThree weight="bold" className="w-5 h-5 text-[#D4A548]" />
                  <h2 className="font-sekouno-display font-black text-lg uppercase tracking-wide text-[#F6F0E2]">
                    Sièges occupés
                  </h2>
                </div>
                <span className="font-sekouno-mono text-xs font-bold px-2.5 py-1 rounded-[5px] bg-[#0D1017] text-[#D4A548] border border-[#D4A548]/40">
                  {String(publicState.players.length).padStart(2, '0')} / 15
                </span>
              </div>

              {error && (
                <div
                  role="alert"
                  className="mb-3 p-3 bg-[#241216] border border-[#D92D20] rounded-[8px] text-xs text-[#FAD1CE]"
                >
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[36vh] overflow-y-auto pr-1 no-scrollbar">
                {publicState.players.map((p, idx) => (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between p-2.5 rounded-[8px] border ${
                      p.id === myPlayerId
                        ? 'bg-[#1B2230] border-[#D4A548]/60'
                        : 'bg-[#0D1017] border-[#F6F0E2]/10'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="relative shrink-0">
                        <div
                          className={`w-9 h-9 rounded-[6px] ${getPlayerColor(
                            idx
                          )} flex items-center justify-center font-sekouno-display font-black text-xs border border-[#F6F0E2]/25`}
                        >
                          {p.name.slice(0, 2).toUpperCase()}
                        </div>
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#0D1017] ${
                            p.isConnected ? 'bg-[#099250]' : 'bg-zinc-500'
                          }`}
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-xs sm:text-sm text-[#F6F0E2] truncate">
                          {p.name}{' '}
                          {p.id === myPlayerId && (
                            <span className="font-sekouno-mono text-[10px] text-[#D4A548]">
                              [VOUS]
                            </span>
                          )}
                        </div>
                        <div className="font-sekouno-mono text-[10px] text-[#D9D0BE]/65">
                          SIÈGE #{String(idx + 1).padStart(2, '0')}
                        </div>
                      </div>
                    </div>

                    {p.isHost && (
                      <div className="inline-flex items-center gap-1 font-sekouno-mono text-[10px] text-[#11131A] font-bold bg-[#D4A548] px-2 py-0.5 rounded-[4px] shrink-0 uppercase">
                        <CrownSimple weight="fill" className="w-3 h-3" />
                        <span>Hôte</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 pt-3.5 border-t border-[#F6F0E2]/15">
              {isHost ? (
                <button
                  type="button"
                  onClick={() => {
                    sounds.playCard();
                    onStartGame();
                  }}
                  disabled={!canStart || isLoading}
                  className={`w-full py-3.5 px-6 rounded-[8px] font-sekouno-display font-black text-sm sm:text-base uppercase tracking-wider flex items-center justify-center gap-2 transition-[transform,background-color] active:scale-[0.99] ${
                    canStart
                      ? 'bg-[#D4A548] hover:bg-[#e0b458] text-[#11131A] cursor-pointer'
                      : 'bg-[#0D1017] text-[#D9D0BE]/45 border border-[#F6F0E2]/10 cursor-not-allowed'
                  }`}
                >
                  {isLoading ? (
                    <span>Distribution en cours...</span>
                  ) : canStart ? (
                    <>
                      <Cards weight="bold" className="w-5 h-5" />
                      <span>Distribuer ({connectedPlayers.length} joueurs)</span>
                    </>
                  ) : (
                    <span>En attente d’un 2e joueur connecté...</span>
                  )}
                </button>
              ) : (
                <div className="py-3 px-4 rounded-[8px] bg-[#0D1017] border border-[#D4A548]/30 text-center font-sekouno-mono text-xs text-[#D4A548]">
                  En attente de la distribution par l’hôte de la table...
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
