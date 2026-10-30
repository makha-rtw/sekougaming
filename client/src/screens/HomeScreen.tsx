import React, { useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  ArrowLeft,
  ArrowRight,
  SpeakerHigh,
  SpeakerSlash,
  Prohibit,
  Stack,
  EyeSlash,
  Ticket,
  UsersThree,
  WarningCircle,
  Cards,
} from '@phosphor-icons/react';
import { Card } from '../../../shared/types.js';
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

const SHOWCASE_CARDS: { card: Card; rot: number; note: string }[] = [
  {
    card: { id: 'sc_1', color: 'red', value: '7' },
    rot: -13,
    note: 'Couleur Rouge Cinabre ou chiffre identique.',
  },
  {
    card: { id: 'sc_2', color: 'blue', value: 'reverse' },
    rot: -6,
    note: 'Inversion : bascule instantanément le sens autour du salon.',
  },
  {
    card: { id: 'sc_3', color: 'yellow', value: 'draw2' },
    rot: 0,
    note: '+2 : cumulable avec un autre +2 ou un +4.',
  },
  {
    card: { id: 'sc_4', color: 'green', value: 'skip' },
    rot: 6,
    note: 'Passe-tour : neutralise le siège suivant.',
  },
  {
    card: { id: 'sc_5', color: 'black', value: 'wild4' },
    rot: 13,
    note: '+4 Obsidienne : impose la couleur, interdit en dernière carte.',
  },
];

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
  const reduceMotion = useReducedMotion();
  const [mode, setMode] = useState<'create' | 'join'>(invitedRoomCode ? 'join' : 'create');
  const [playerName, setPlayerName] = useState(savedPlayerName);
  const [roomCode, setRoomCode] = useState(invitedRoomCode || '');
  const [isInviteMode, setIsInviteMode] = useState(Boolean(invitedRoomCode));
  const [localError, setLocalError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(sounds.isSoundMuted());
  const [selectedCardIdx, setSelectedCardIdx] = useState<number>(2);

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
      setLocalError('Votre pseudonyme doit comporter au moins 2 caractères.');
      return;
    }
    if (name.length > 20) {
      sounds.penalty();
      setLocalError('Votre pseudonyme ne peut pas dépasser 20 caractères.');
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
    <div className="sekouno-salon-world min-h-[100dvh] w-full flex flex-col justify-between px-3 sm:px-6 py-3 pt-safe pb-safe select-none relative overflow-x-hidden">
      {/* Top Architectural Salon Header */}
      <header className="relative z-10 w-full max-w-6xl mx-auto">
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-[#F6F0E2]/15">
          {onBackToHub ? (
            <button
              type="button"
              onClick={() => {
                sounds.buttonClick();
                onBackToHub();
              }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-[6px] bg-[#141924] hover:bg-[#1B2230] border border-[#F6F0E2]/20 font-sekouno-mono text-xs font-bold uppercase tracking-wider text-[#D4A548] transition-[background-color,border-color] cursor-pointer"
            >
              <ArrowLeft weight="bold" className="w-3.5 h-3.5" />
              <span>Portail</span>
            </button>
          ) : (
            <div />
          )}

          {/* 4-Suit Signature Bar */}
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1" aria-hidden="true">
              <span className="w-2.5 h-2.5 rounded-[2px] bg-[#D92D20]" />
              <span className="w-2.5 h-2.5 rounded-[2px] bg-[#155EEF]" />
              <span className="w-2.5 h-2.5 rounded-[2px] bg-[#099250]" />
              <span className="w-2.5 h-2.5 rounded-[2px] bg-[#DC9B06]" />
            </div>
            <span className="font-sekouno-mono text-[11px] font-bold uppercase tracking-widest text-[#D9D0BE] hidden sm:inline">
              CASA SEKOUNO • SALON OFFICIEL
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsMuted(sounds.toggleMute())}
            aria-label={isMuted ? 'Activer le son' : 'Couper le son'}
            title={isMuted ? 'Activer le son' : 'Couper le son'}
            className="p-2 rounded-[6px] bg-[#141924] hover:bg-[#1B2230] border border-[#F6F0E2]/20 text-[#D9D0BE] transition-[background-color] cursor-pointer"
          >
            {isMuted ? (
              <SpeakerSlash weight="bold" className="w-4 h-4 text-[#D92D20]" />
            ) : (
              <SpeakerHigh weight="bold" className="w-4 h-4 text-[#D4A548]" />
            )}
          </button>
        </div>
      </header>

      {/* Main Architectural Split: Left Card Gallery + Right Perforated Club Ticket */}
      <div className="relative z-10 w-full max-w-6xl mx-auto my-auto py-4 sm:py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-center">
        {/* Left Column: Architectural Masthead, Interactive Suit Fan & Official Ledger */}
        <motion.section
          initial={reduceMotion ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="lg:col-span-6 flex flex-col items-start text-left"
        >
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-[4px] bg-[#141924] border border-[#D4A548]/45 font-sekouno-mono text-[10px] font-bold uppercase tracking-widest text-[#D4A548] mb-3">
            <span>TABLE 01</span>
            <span className="text-[#F6F0E2]/30">•</span>
            <span>02 À 15 JOUEURS EN DIRECT</span>
          </div>

          <h1 className="font-sekouno-display font-black uppercase tracking-tight leading-[0.92] text-[clamp(2.8rem,7vw,4.6rem)] text-[#F6F0E2]">
            SEKOUNO
          </h1>

          {/* 4-Color Architectural Divider Strip */}
          <div className="w-full max-w-md grid grid-cols-4 h-1.5 rounded-[2px] overflow-hidden my-3.5">
            <div className="bg-[#D92D20]" />
            <div className="bg-[#155EEF]" />
            <div className="bg-[#099250]" />
            <div className="bg-[#DC9B06]" />
          </div>

          <p className="text-sm sm:text-base text-[#D9D0BE] max-w-[44ch] leading-relaxed">
            Prenez place autour du salon graphique à quatre couleurs. Surenchère croissante, arbitrage de table et confidentialité intégrale de la pioche.
          </p>

          {/* Interactive 5-Card Specimen Fan */}
          <div className="mt-5 w-full p-4 rounded-[10px] bg-[#141924]/90 border border-[#F6F0E2]/12">
            <div className="flex items-center justify-center sm:justify-start -space-x-2.5 sm:-space-x-3 pt-2 pb-3">
              {SHOWCASE_CARDS.map((item, idx) => {
                const active = selectedCardIdx === idx;
                return (
                  <div
                    key={item.card.id}
                    style={{
                      transform: `rotate(${active ? 0 : item.rot}deg) translateY(${active ? -8 : 0}px)`,
                      zIndex: active ? 25 : idx,
                    }}
                    className="transition-transform duration-200"
                  >
                    <CardView
                      card={item.card}
                      size="sm"
                      onClick={() => {
                        setSelectedCardIdx(idx);
                        sounds.playCard(item.card);
                      }}
                    />
                  </div>
                );
              })}
            </div>

            <div className="pt-2.5 border-t border-[#F6F0E2]/10 flex items-center justify-between gap-2 font-sekouno-mono text-[11px] text-[#D9D0BE]">
              <span>{SHOWCASE_CARDS[selectedCardIdx].note}</span>
              <span className="text-[#D4A548] shrink-0 uppercase">Cliquer une carte</span>
            </div>
          </div>

          {/* Architectural Ledger of Official House Rules (No SaaS Rounded Cards) */}
          <dl className="mt-5 w-full divide-y divide-[#F6F0E2]/12 border-y border-[#F6F0E2]/12">
            <div className="py-2.5 flex items-start gap-3">
              <dt className="font-sekouno-mono text-[11px] font-bold text-[#D92D20] uppercase shrink-0 w-20 flex items-center gap-1 pt-0.5">
                <Prohibit weight="bold" className="w-3.5 h-3.5" />
                <span>Règle A</span>
              </dt>
              <dd className="text-xs text-[#D9D0BE] leading-snug">
                <strong className="text-[#F6F0E2]">Sortie sur couleur pure :</strong> interdit de remporter la manche en posant un Joker ou un +4 comme dernière carte.
              </dd>
            </div>

            <div className="py-2.5 flex items-start gap-3">
              <dt className="font-sekouno-mono text-[11px] font-bold text-[#D4A548] uppercase shrink-0 w-20 flex items-center gap-1 pt-0.5">
                <Stack weight="bold" className="w-3.5 h-3.5" />
                <span>Règle B</span>
              </dt>
              <dd className="text-xs text-[#D9D0BE] leading-snug">
                <strong className="text-[#F6F0E2]">Surenchère croissante :</strong> +2 ou +4 autorisé sur un +2. Aucun contre possible face à un +4.
              </dd>
            </div>

            <div className="py-2.5 flex items-start gap-3">
              <dt className="font-sekouno-mono text-[11px] font-bold text-[#099250] uppercase shrink-0 w-20 flex items-center gap-1 pt-0.5">
                <EyeSlash weight="bold" className="w-3.5 h-3.5" />
                <span>Règle C</span>
              </dt>
              <dd className="text-xs text-[#D9D0BE] leading-snug">
                <strong className="text-[#F6F0E2]">Pioche secrète :</strong> une carte piochée jouable peut être posée ou gardée en main sans jamais être révélée aux adversaires.
              </dd>
            </div>
          </dl>
        </motion.section>

        {/* Right Column: Physical Perforated Ivory & Obsidian Club Pass */}
        <motion.main
          initial={reduceMotion ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.05 }}
          className="lg:col-span-6 rounded-[12px] border-2 border-[#D4A548]/75 bg-[#141924] shadow-[0_24px_60px_rgba(0,0,0,0.75)] overflow-hidden"
        >
          {/* Upper Raw-Ivory Ticket Stub */}
          <div className="bg-[#F6F0E2] text-[#11131A] p-5 sm:px-6 sm:py-5">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <Ticket weight="fill" className="w-4 h-4 text-[#D92D20]" />
                <span className="font-sekouno-mono text-[11px] font-bold uppercase tracking-widest">
                  Billet d’admission table
                </span>
              </div>
              <span className="font-sekouno-mono text-[11px] font-bold text-[#6E6656]">
                {isConnected ? 'EN LIGNE' : 'CONNEXION...'}
              </span>
            </div>

            {isInviteMode && roomCode ? (
              <div className="p-3.5 rounded-[8px] bg-[#11131A] text-[#F6F0E2] flex items-center justify-between">
                <div>
                  <span className="font-sekouno-mono text-[10px] font-bold uppercase tracking-widest text-[#D4A548] block">
                    Invitation directe reçue
                  </span>
                  <span className="text-xs text-[#D9D0BE]">Siège réservé à la table</span>
                </div>
                <span className="font-sekouno-mono text-2xl font-bold tracking-[0.2em] text-[#D4A548]">
                  #{roomCode}
                </span>
              </div>
            ) : (
              <div
                role="tablist"
                className="grid grid-cols-2 gap-1.5 p-1 rounded-[8px] bg-[#E3DAC8] border border-[#11131A]/15"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'create'}
                  onClick={() => {
                    sounds.buttonClick();
                    setMode('create');
                    setLocalError(null);
                  }}
                  className={`py-2.5 px-3 rounded-[6px] font-sekouno-display font-black text-xs uppercase tracking-wider transition-[background-color,color] cursor-pointer ${
                    mode === 'create'
                      ? 'bg-[#11131A] text-[#F6F0E2]'
                      : 'text-[#11131A]/70 hover:text-[#11131A]'
                  }`}
                >
                  Ouvrir une table
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'join'}
                  onClick={() => {
                    sounds.buttonClick();
                    setMode('join');
                    setLocalError(null);
                  }}
                  className={`py-2.5 px-3 rounded-[6px] font-sekouno-display font-black text-xs uppercase tracking-wider transition-[background-color,color] cursor-pointer ${
                    mode === 'join'
                      ? 'bg-[#155EEF] text-[#FAF6EE]'
                      : 'text-[#11131A]/70 hover:text-[#11131A]'
                  }`}
                >
                  Entrer un code
                </button>
              </div>
            )}
          </div>

          {/* Perforated Ticket Seam */}
          <div className="relative flex items-center bg-[#141924] -my-2.5 z-10 pointer-events-none">
            <div className="w-5 h-5 rounded-full bg-[#0D1017] border-2 border-[#D4A548]/75 -ml-3 shrink-0" />
            <div className="flex-1 border-t-2 border-dashed border-[#D4A548]/45 mx-2" />
            <div className="w-5 h-5 rounded-full bg-[#0D1017] border-2 border-[#D4A548]/75 -mr-3 shrink-0" />
          </div>

          {/* Lower Obsidian Entry Form */}
          <div className="p-5 sm:p-6 pt-5">
            {(error || localError) && (
              <div
                role="alert"
                className="mb-4 p-3 bg-[#241216] border border-[#D92D20] rounded-[8px] text-xs text-[#FAD1CE] flex items-center gap-2"
              >
                <WarningCircle weight="fill" className="w-4 h-4 text-[#D92D20] shrink-0" />
                <span>{error || localError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="sekouno-player-name"
                    className="font-sekouno-mono text-xs font-bold uppercase tracking-wider text-[#D9D0BE]"
                  >
                    Pseudonyme autour du tapis
                  </label>
                  <span className="font-sekouno-mono text-[11px] text-[#D9D0BE]/60">
                    {playerName.trim().length}/20
                  </span>
                </div>
                <input
                  id="sekouno-player-name"
                  type="text"
                  autoComplete="nickname"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Ex : Sekou, Amina, Lucas..."
                  maxLength={20}
                  required
                  autoFocus={!playerName}
                  className="w-full px-3.5 py-3 bg-[#0D1017] border border-[#F6F0E2]/20 focus:border-[#D4A548] rounded-[8px] text-[#F6F0E2] placeholder:text-[#D9D0BE]/40 outline-none text-sm font-semibold transition-[border-color]"
                />
              </div>

              {mode === 'join' && !isInviteMode && (
                <div className="space-y-1.5">
                  <label
                    htmlFor="sekouno-room-code"
                    className="block font-sekouno-mono text-xs font-bold uppercase tracking-wider text-[#D9D0BE]"
                  >
                    Code de la table (6 caractères)
                  </label>
                  <input
                    id="sekouno-room-code"
                    type="text"
                    autoCapitalize="characters"
                    autoComplete="off"
                    spellCheck={false}
                    value={roomCode}
                    onChange={(e) =>
                      setRoomCode(e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase())
                    }
                    placeholder="EX : 8XF2M9"
                    maxLength={6}
                    required
                    className="w-full px-4 py-3 bg-[#0D1017] border border-[#F6F0E2]/20 focus:border-[#D4A548] rounded-[8px] text-[#D4A548] font-sekouno-mono font-bold text-xl uppercase tracking-[0.28em] text-center placeholder:text-[#D9D0BE]/35 placeholder:text-sm placeholder:tracking-wider outline-none transition-[border-color]"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || !isConnected}
                className="w-full py-3.5 px-5 rounded-[8px] bg-[#D4A548] hover:bg-[#e0b458] text-[#11131A] font-sekouno-display font-black text-sm sm:text-base uppercase tracking-wider transition-[transform,background-color] active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <span>Préparation de la table...</span>
                ) : !isConnected ? (
                  <span>Connexion au salon...</span>
                ) : isInviteMode ? (
                  <>
                    <UsersThree weight="bold" className="w-4 h-4" />
                    <span>Prendre place à la table #{roomCode}</span>
                    <ArrowRight weight="bold" className="w-4 h-4" />
                  </>
                ) : mode === 'create' ? (
                  <>
                    <Cards weight="bold" className="w-5 h-5" />
                    <span>Ouvrir une table privée</span>
                  </>
                ) : (
                  <>
                    <UsersThree weight="bold" className="w-5 h-5" />
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
                    className="font-sekouno-mono text-xs text-[#D9D0BE] hover:text-[#D4A548] underline transition-[color] cursor-pointer"
                  >
                    Ouvrir une nouvelle table ou saisir un autre code
                  </button>
                </div>
              )}
            </form>
          </div>
        </motion.main>
      </div>

      {/* Architectural Footer */}
      <footer className="relative z-10 w-full max-w-6xl mx-auto pt-2 border-t border-[#F6F0E2]/10 flex items-center justify-between font-sekouno-mono text-[11px] text-[#D9D0BE]/65">
        <span>CASA SEKOUNO • 02..15 SIÈGES</span>
        <span>SYNCHRONISATION TEMPS RÉEL</span>
      </footer>
    </div>
  );
};
