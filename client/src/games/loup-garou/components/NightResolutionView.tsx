import React from 'react';
import { Sun, Skull, ShieldCheck, Heart, ArrowRight } from 'lucide-react';
import { NightResolutionResult } from '../types/game';
import { ROLE_DEFINITIONS } from '../data/roles';
import { formatDeathReason } from '../engine/gameEngine';
import { soundFX } from '../utils/audio';

interface NightResolutionViewProps {
  round: number;
  resolution: NightResolutionResult;
  onProceedToDayWake: () => void;
}

export const NightResolutionView: React.FC<NightResolutionViewProps> = ({
  round,
  resolution,
  onProceedToDayWake,
}) => {
  const handleProceed = () => {
    soundFX.playMorningChime();
    onProceedToDayWake();
  };

  const hasDeaths = resolution.deaths.length > 0;

  return (
    <div className="w-full max-w-md mx-auto p-4 space-y-6 pb-28">
      {/* Title */}
      <div className="text-center space-y-1">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#824716] font-display">
          Modérateur · Synthèse Nocturne
        </span>
        <h1 className="font-display text-2xl font-bold tracking-tight text-[#22160c]">
          Bilan Secret de la Nuit {round}
        </h1>
        <p className="text-xs text-[#5c4936]">
          Vérifiez les conséquences calculées avant d'annoncer les nouvelles au village.
        </p>
      </div>

      {/* Casualties summary card */}
      <div className="bg-[#fcf9f2] border border-[#d8c5aa] rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between text-xs text-[#634e3b] border-b border-[#e5d6c2] pb-2 font-display">
          <span className="font-bold uppercase tracking-wider">
            {hasDeaths ? `Victimes de la nuit (${resolution.deaths.length})` : 'Bilan'}
          </span>
          <span className={hasDeaths ? 'text-[#871c1c] font-bold' : 'text-[#1d592b] font-bold'}>
            {hasDeaths ? 'Morts confirmées' : 'Nuit paisible'}
          </span>
        </div>

        {hasDeaths ? (
          <div className="space-y-3 pt-1">
            {resolution.deaths.map(dead => {
              const currentRoleDef = ROLE_DEFINITIONS[dead.currentRole];
              const wasRoleChanged = dead.currentRole !== dead.initialRole;
              const isLoverDeath = dead.deathReason === 'amoureux';

              return (
                <div
                  key={dead.playerId}
                  className="p-3 rounded-xl bg-[#faecea] border border-[#dea299] space-y-1.5 shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Skull className="w-4 h-4 text-[#871c1c] shrink-0" />
                      <span className="font-bold text-sm text-[#22160c]">{dead.playerName}</span>
                    </div>
                    <span className="text-xs font-bold text-[#871c1c]">
                      {currentRoleDef.name}
                    </span>
                  </div>

                  <div className="text-xs text-[#593d39] pl-6 space-y-0.5">
                    <div>
                      Cause : <span className="font-semibold text-[#301c19]">{formatDeathReason(dead.deathReason)}</span>
                    </div>

                    {isLoverDeath && dead.deathIndirectBy && (
                      <div className="flex items-center gap-1.5 text-[#8c2243] text-[11px] font-semibold">
                        <Heart className="w-3 h-3 fill-[#8c2243]" />
                        <span>Emporté(e) par la mort de {dead.deathIndirectBy}</span>
                      </div>
                    )}

                    {wasRoleChanged && (
                      <div className="text-[11px] text-[#785955]">
                        Rôle d'origine : {ROLE_DEFINITIONS[dead.initialRole].name}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-[#edf5ee] border border-[#a7cca9] text-center space-y-1 shadow-2xs">
            <ShieldCheck className="w-8 h-8 text-[#256c35] mx-auto" />
            <div className="text-sm font-bold text-[#1d592b]">
              Aucune victime cette nuit !
            </div>
            <p className="text-xs text-[#48634e]">
              Les attaques ont été bloquées par les protections ou les potions.
            </p>
          </div>
        )}
      </div>

      {/* Special Nocturnal Events (Montreur d'Ours, Corbeau, Nécromancien, Infect Père des Loups) */}
      {(resolution.bearGrowled ||
        resolution.corbeauTargetedPlayerName ||
        resolution.revivedPlayerName ||
        resolution.infectedPlayerName) && (
        <div className="space-y-3">
          {resolution.infectedPlayerName && (
            <div className="p-3.5 rounded-2xl bg-[#f5e1de] border border-[#dba7a0] space-y-1 shadow-2xs">
              <div className="text-xs font-bold text-[#611010] uppercase tracking-wider font-display">
                🩸 Infection secrète (Infect Père des Loups)
              </div>
              <p className="text-xs text-[#4a1818]">
                <strong>{resolution.infectedPlayerName}</strong> a été infecté(e) au lieu d'être dévoré(e) ! Ce joueur survit mais fait désormais secrètement partie du camp des <strong>Loups-Garous</strong> (ne pas l'annoncer publiquement au village).
              </p>
            </div>
          )}

          {resolution.revivedPlayerName && (
            <div className="p-3.5 rounded-2xl bg-[#efe6f7] border border-[#bfa5db] space-y-1 shadow-2xs">
              <div className="text-xs font-bold text-[#4a1d78] uppercase tracking-wider font-display">
                ✨ Résurrection du Nécromancien
              </div>
              <p className="text-xs text-[#3b185e]">
                L'âme de <strong>{resolution.revivedPlayerName}</strong> a été ramenée parmi les vivants cette nuit !
              </p>
            </div>
          )}

          {resolution.bearGrowled && (
            <div className="p-3.5 rounded-2xl bg-[#faefe3] border border-[#dbbe9d] space-y-1 shadow-2xs">
              <div className="text-xs font-bold text-[#784212] uppercase tracking-wider font-display">
                🐻 Grognement de l'Ours (Montreur d'Ours)
              </div>
              <p className="text-xs text-[#59310d]">
                <strong>GROARRR !</strong> L'ours du Montreur d'Ours grogne ce matin : au moins l'un de ses deux voisins directs en vie est un Loup-Garou !
              </p>
            </div>
          )}

          {resolution.corbeauTargetedPlayerName && (
            <div className="p-3.5 rounded-2xl bg-[#eaeaf2] border border-[#b5b5cf] space-y-1 shadow-2xs">
              <div className="text-xs font-bold text-[#25254d] uppercase tracking-wider font-display">
                🪶 Malédiction du Corbeau (+2 votes)
              </div>
              <p className="text-xs text-[#1d1d3b]">
                Le Corbeau a désigné <strong>{resolution.corbeauTargetedPlayerName}</strong> : ce joueur démarre le conseil du village avec <strong>2 voix contre lui d'office</strong>.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Moderator Action Log */}
      {resolution.logs.length > 0 && (
        <div className="p-4 rounded-2xl bg-[#f8f3e7] border border-[#d8c6aa] space-y-2 shadow-2xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#695440] font-display">
            Détail des calculs du grimoire :
          </div>
          <ul className="text-xs text-[#523e2c] space-y-1.5 list-disc pl-4">
            {resolution.logs.map((log, i) => (
              <li key={i}>{log}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Floating CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#f5efe3] via-[#f5efe3]/95 to-transparent z-20">
        <div className="max-w-md mx-auto">
          <button
            type="button"
            onClick={handleProceed}
            className="w-full h-12 rounded-xl bg-[#824716] hover:bg-[#6c390f] text-[#fffdf8] font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-[#824716]/25 border border-[#542a06] active:scale-[0.99] transition-all cursor-pointer"
          >
            <Sun className="w-4 h-4 text-[#ffd799]" />
            <span>Réveiller le Village & Annoncer</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
