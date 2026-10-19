import React, { useState, useEffect } from 'react';
import { Sun, Skull, Heart, Vote, CheckCircle2, Trophy, Volume2, VolumeX } from 'lucide-react';
import { NightResolutionResult, WinResult } from '../types/game';
import { ROLE_DEFINITIONS } from '../data/roles';
import { formatDeathReason } from '../engine/gameEngine';
import { narration } from '../utils/narrationAudio';

interface VillageWakeUpViewProps {
  round: number;
  resolution: NightResolutionResult | null;
  winner?: WinResult | null;
  onProceedToVote: () => void;
}

export const VillageWakeUpView: React.FC<VillageWakeUpViewProps> = ({
  round,
  resolution,
  winner,
  onProceedToVote,
}) => {
  const deaths = resolution?.deaths || [];
  const hasDeaths = deaths.length > 0;
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);
  const [hasPlayedOnce, setHasPlayedOnce] = useState(false);

  useEffect(() => {
    return narration.subscribe((playing) => {
      setIsPlayingVoice(playing);
      if (playing) {
        setHasPlayedOnce(true);
      }
    });
  }, []);

  // Automatically start the wake-up sequence on display
  useEffect(() => {
    narration.playVillageWakeUpSequence(deaths.length);
    setHasPlayedOnce(true);

    return () => {
      narration.stop();
    };
  }, [round, deaths.length]);

  const handleTogglePlay = () => {
    if (isPlayingVoice) {
      narration.stop();
    } else {
      narration.playVillageWakeUpSequence(deaths.length);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-4 space-y-6 pb-28">
      {/* Title & Atmosphere */}
      <div className="text-center space-y-2">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-[#fcf7ec] border border-[#d8c39b] flex items-center justify-center text-[#9b6b1e] shadow-xs">
          <Sun className="w-8 h-8" />
        </div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-[#22160c]">
          Le Village se Réveille
        </h1>
        <p className="text-xs text-[#5c4936]">
          Jour {round} · Annonce officielle des événements nocturnes
        </p>
      </div>

      {/* Script for Moderator */}
      <div className="p-4 rounded-2xl bg-[#fcf9f2] border border-[#d8c5aa] shadow-xs">
        <blockquote className="font-serif italic text-sm text-[#2f1f12] border-l-3 border-[#9b6b1e] pl-3 leading-relaxed">
          « Le soleil se lève sur notre village... Ouvrez tous les yeux. La nuit passée a laissé des traces. »
        </blockquote>
      </div>

      {/* Voice Narration Player Bar */}
      <div className="p-3.5 rounded-2xl bg-[#fcf9f2] border border-[#d8c5aa] shadow-xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#f8f3e7] border border-[#d8c39b] flex items-center justify-center text-[#9b6b1e]">
            <Volume2 className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-[#22160c]">Annonce Vocale du Réveil</div>
            <div className="text-[10px] text-[#6b5643]">
              {isPlayingVoice ? 'Lecture de la proclamation en cours...' : 'Réveil & Bilan macabre complet'}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleTogglePlay}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
            isPlayingVoice
              ? 'bg-[#824716] text-[#fffdf8] shadow-sm active:scale-95'
              : 'bg-[#eee4cf] hover:bg-[#e4d7bf] text-[#4d3826] border border-[#d2c0a4]'
          }`}
        >
          {isPlayingVoice ? (
            <>
              <VolumeX className="w-3.5 h-3.5 text-[#ffd799] animate-pulse" />
              <span>Arrêter</span>
            </>
          ) : (
            <>
              <Volume2 className="w-3.5 h-3.5 text-[#824716]" />
              <span>{hasPlayedOnce ? 'Réécouter' : 'Écouter'}</span>
            </>
          )}
        </button>
      </div>

      {/* Casualties Public Card */}
      <div className="bg-[#fcf9f2] border border-[#d8c5aa] rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between text-xs text-[#634e3b] border-b border-[#e5d6c2] pb-2 font-bold uppercase tracking-wider font-display">
          <span>Découverte macabre</span>
          <span className={hasDeaths ? 'text-[#871c1c]' : 'text-[#1d592b]'}>
            {hasDeaths ? `${deaths.length} habitant(s) trépassé(s)` : 'Aucune victime'}
          </span>
        </div>

        {hasDeaths ? (
          <div className="space-y-3">
            {deaths.map(dead => {
              const roleDef = ROLE_DEFINITIONS[dead.currentRole];
              const wasRoleChanged = dead.currentRole !== dead.initialRole;

              return (
                <div
                  key={dead.playerId}
                  className="p-3.5 rounded-xl bg-[#faecea] border border-[#dea299] space-y-2 shadow-2xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <Skull className="w-4 h-4 text-[#871c1c] shrink-0" />
                        <span className="font-display font-bold text-base text-[#22160c]">
                          {dead.playerName}
                        </span>
                      </div>
                      <div className="text-xs text-[#871c1c] font-bold mt-0.5">
                        {roleDef.name}
                      </div>
                    </div>

                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-[#f4d5d0] text-[#871c1c] border border-[#dea299]">
                      Mort
                    </span>
                  </div>

                  <div className="text-xs text-[#593d39] pl-6 space-y-1 border-t border-[#dea299]/60 pt-2">
                    <p className="text-[#3b231f] font-medium">
                      {formatDeathReason(dead.deathReason)}
                    </p>

                    {dead.deathReason === 'amoureux' && dead.deathIndirectBy && (
                      <p className="text-[#8c2243] text-[11px] font-bold flex items-center gap-1">
                        <Heart className="w-3 h-3 fill-[#8c2243]" />
                        <span>Emporté(e) par la mort de son amoureux(se) {dead.deathIndirectBy}</span>
                      </p>
                    )}

                    {wasRoleChanged && (
                      <p className="text-[11px] text-[#785955]">
                        (Anciennement {ROLE_DEFINITIONS[dead.initialRole].name} avant l'intervention du Voleur)
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-[#edf5ee] border border-[#a7cca9] text-center space-y-1">
            <CheckCircle2 className="w-7 h-7 text-[#256c35] mx-auto" />
            <div className="text-sm font-bold text-[#1d592b]">
              La nuit a été clémente !
            </div>
            <p className="text-xs text-[#48634e]">
              Aucun mort n'est à déplorer au réveil du village.
            </p>
          </div>
        )}
      </div>

      {/* Morning Public Announcements (Bear Growl, Corbeau +2 votes, Necromancer Revival) */}
      {(resolution?.bearGrowled ||
        resolution?.corbeauTargetedPlayerName ||
        resolution?.revivedPlayerName) && (
        <div className="space-y-3">
          {resolution?.revivedPlayerName && (
            <div className="p-4 rounded-2xl bg-[#efe6f7] border border-[#bfa5db] space-y-1 shadow-xs">
              <div className="text-xs font-bold text-[#4a1d78] uppercase tracking-wider font-display">
                ✨ Miracle Nocturne · Nécromancien
              </div>
              <p className="text-xs text-[#3b185e] leading-relaxed">
                Le Nécromancien a rappelé l'âme de <strong>{resolution.revivedPlayerName}</strong> d'entre les morts ! Ce joueur reprend place parmi les vivants.
              </p>
            </div>
          )}

          {resolution?.bearGrowled && (
            <div className="p-4 rounded-2xl bg-[#faefe3] border border-[#dbbe9d] space-y-1 shadow-xs">
              <div className="text-xs font-bold text-[#784212] uppercase tracking-wider font-display">
                🐻 Le Montreur d'Ours · Grognement !
              </div>
              <p className="text-xs text-[#59310d] leading-relaxed">
                <strong>GROARRR !</strong> L'ours du Montreur d'Ours grogne férocement ce matin : un Loup-Garou se cache immédiatement à sa gauche ou à sa droite !
              </p>
            </div>
          )}

          {resolution?.corbeauTargetedPlayerName && (
            <div className="p-4 rounded-2xl bg-[#eaeaf2] border border-[#b5b5cf] space-y-1 shadow-xs">
              <div className="text-xs font-bold text-[#25254d] uppercase tracking-wider font-display">
                🪶 La Plume du Corbeau (+2 votes)
              </div>
              <p className="text-xs text-[#1d1d3b] leading-relaxed">
                Une affiche anonyme a été clouée sur la porte de <strong>{resolution.corbeauTargetedPlayerName}</strong> : il ou elle reçoit <strong>2 votes supplémentaires d'office</strong> lors du scrutin d'aujourd'hui !
              </p>
            </div>
          )}
        </div>
      )}

      {/* Victory check announcement if won overnight */}
      {winner && (
        <div className="p-5 rounded-2xl bg-[#edf5ee] border border-[#a7cca9] shadow-sm space-y-2 text-center animate-in fade-in duration-300">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-[#d2e6d3] border border-[#a7cca9] flex items-center justify-center text-[#1d592b]">
            <Trophy className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#1d592b] font-display">
              Condition de victoire atteinte !
            </span>
            <h2 className="font-display text-xl font-extrabold text-[#22160c]">
              {winner.title}
            </h2>
            <p className="text-xs font-semibold text-[#256c35]">
              {winner.subtitle}
            </p>
          </div>
        </div>
      )}

      {/* Sticky Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#f5efe3] via-[#f5efe3]/95 to-transparent z-20">
        <div className="max-w-md mx-auto">
          <button
            type="button"
            onClick={onProceedToVote}
            className={`w-full h-12 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md active:scale-[0.99] transition-all cursor-pointer ${
              winner
                ? 'bg-[#1d592b] hover:bg-[#15421f] shadow-[#1d592b]/25 border border-[#12391b]'
                : 'bg-[#824716] hover:bg-[#6c390f] shadow-[#824716]/25 border border-[#542a06]'
            }`}
          >
            {winner ? (
              <>
                <Trophy className="w-4 h-4 text-[#ffd799]" />
                <span>Consulter le Dénouement de la Partie</span>
              </>
            ) : (
              <>
                <Vote className="w-4 h-4 text-[#ffd799]" />
                <span>Ouvrir les Débats & le Vote du Village</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
