import React from 'react';
import { Skull, Heart, Crosshair, Moon, Trophy, ArrowRight, ShieldCheck, UserCheck } from 'lucide-react';
import { VoteResolutionInfo, WinResult } from '../types/game';
import { ROLE_DEFINITIONS } from '../data/roles';
import { RoleIcon } from './RoleIcon';

interface DayResolutionViewProps {
  round: number;
  resolution: VoteResolutionInfo | null;
  winner: WinResult | null;
  onProceedToNextNight: () => void;
  onProceedToGameOver: () => void;
}

export const DayResolutionView: React.FC<DayResolutionViewProps> = ({
  round,
  resolution,
  winner,
  onProceedToNextNight,
  onProceedToGameOver,
}) => {
  const eliminated = resolution?.eliminatedPlayer;
  const idiotGraced = resolution?.idiotGracedPlayer;
  const ancienPowerLoss = resolution?.ancienPowerLossTriggered;
  const cascadePartner = resolution?.cascadePartner;
  const hunterVictim = resolution?.chasseurShotVictim;
  const hunterLover = resolution?.chasseurShotLover;

  const hasAnyElimination = Boolean(eliminated || hunterVictim || idiotGraced);

  return (
    <div className="w-full max-w-md mx-auto p-4 space-y-6 pb-28">
      {/* Title */}
      <div className="text-center space-y-1">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#824716] font-display">
          Jour {round} · Verdict & Conséquences
        </span>
        <h1 className="font-display text-2xl font-bold tracking-tight text-[#22160c]">
          Résolution de l'Assemblée
        </h1>
        <p className="text-xs text-[#5c4936]">
          Les conséquences du vote populaire et des éventuels effets en cascade.
        </p>
      </div>

      {/* Outcome Cards */}
      <div className="space-y-3">
        {/* Case 1: Tie vote / No elimination */}
        {!hasAnyElimination && (
          <div className="p-5 rounded-2xl bg-[#fcf9f2] border border-[#d8c5aa] text-center space-y-2 shadow-xs">
            <ShieldCheck className="w-10 h-10 text-[#9b6b1e] mx-auto" />
            <h3 className="font-display text-base font-bold text-[#22160c]">
              Égalité des suffrages
            </h3>
            <p className="text-xs text-[#574431] leading-relaxed">
              Le village n'a pas réussi à désigner un coupable à la majorité. Aucun habitant
              n'est exécuté ce jour.
            </p>
          </div>
        )}

        {/* Case 1b: Idiot du Village pardoned */}
        {idiotGraced && (
          <div className="p-4 rounded-2xl bg-[#fbf5e3] border border-[#deca96] shadow-sm space-y-3 animate-in fade-in duration-300">
            <div className="flex items-center justify-between text-xs text-[#785610] border-b border-[#e8dab5] pb-2 font-display">
              <span className="font-bold uppercase tracking-wider flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5" /> Grâce de l'Idiot du Village !
              </span>
              <span className="text-[#785610]">Siège {idiotGraced.seatNumber}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#f5e7be] border border-[#deca96] flex items-center justify-center text-[#785610]">
                  <RoleIcon roleId="idiot_du_village" className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-display font-bold text-base text-[#22160c]">
                    {idiotGraced.name}
                  </div>
                  <div className="text-xs font-bold text-[#785610]">
                    Idiot du Village (Révélé)
                  </div>
                </div>
              </div>
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-[#edf5ee] text-[#1d592b] border border-[#a7cca9]">
                Gracié (Survit)
              </span>
            </div>

            <p className="text-xs text-[#5c420c] leading-relaxed">
              Le village réalise la bêtise de <strong>{idiotGraced.name}</strong> au dernier instant et l'épargne ! Il reste en vie mais <strong>perd définitivement son droit de vote</strong>.
            </p>
          </div>
        )}

        {/* Case 2: Direct vote elimination */}
        {eliminated && (
          <div className="p-4 rounded-2xl bg-[#fcf9f2] border border-[#dea299] shadow-sm space-y-3">
            <div className="flex items-center justify-between text-xs text-[#871c1c] border-b border-[#ebd3ce] pb-2 font-display">
              <span className="font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Skull className="w-3.5 h-3.5" /> Condamné par le vote
              </span>
              <span className="text-[#6c5541]">Siège {eliminated.seatNumber}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#faecea] border border-[#dea299] flex items-center justify-center text-[#871c1c]">
                  <RoleIcon roleId={eliminated.currentRole} className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-display font-bold text-base text-[#22160c]">
                    {eliminated.name}
                  </div>
                  <div className="text-xs font-bold text-[#871c1c]">
                    {ROLE_DEFINITIONS[eliminated.currentRole].name}
                  </div>
                </div>
              </div>
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-[#faecea] text-[#871c1c] border border-[#dea299]">
                Éliminé
              </span>
            </div>
          </div>
        )}

        {/* Ancien power loss warning */}
        {ancienPowerLoss && (
          <div className="p-4 rounded-2xl bg-[#faecea] border-2 border-[#b83b3b] shadow-sm space-y-1.5 animate-in fade-in duration-300">
            <div className="text-xs font-extrabold uppercase tracking-wider text-[#871c1c] font-display">
              ⚠️ Malédiction de l'Ancien !
            </div>
            <p className="text-xs text-[#591c1c] leading-relaxed">
              Le village a causé la mort de l'<strong>Ancien</strong> ! En punition, <strong>tous les Villageois perdent immédiatement leurs pouvoirs spéciaux</strong> pour le reste de la partie.
            </p>
          </div>
        )}

        {/* Case 3: Cascade lover death */}
        {cascadePartner && (
          <div className="p-4 rounded-2xl bg-[#faecf0] border border-[#dfa2b5] shadow-sm space-y-3 animate-in fade-in duration-300">
            <div className="flex items-center justify-between text-xs text-[#8c2243] border-b border-[#ebd3dc] pb-2 font-display">
              <span className="font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5 fill-[#8c2243]" /> Chagrin d'amour mortel
              </span>
              <span className="text-[#735860]">Siège {cascadePartner.seatNumber}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#f5d0dc] border border-[#dfa2b5] flex items-center justify-center text-[#8c2243]">
                  <RoleIcon roleId={cascadePartner.currentRole} className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-display font-bold text-base text-[#22160c]">
                    {cascadePartner.name}
                  </div>
                  <div className="text-xs font-bold text-[#8c2243]">
                    {ROLE_DEFINITIONS[cascadePartner.currentRole].name}
                  </div>
                </div>
              </div>
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-[#f5d0dc] text-[#8c2243] border border-[#dfa2b5]">
                Mort d'amour
              </span>
            </div>

            <p className="text-[11px] text-[#713a4c] italic pl-1">
              Ne pouvant survivre à la disparition de {eliminated?.name || 'son âme sœur'}, {cascadePartner.name} s'effondre sans vie.
            </p>
          </div>
        )}

        {/* Case 4: Hunter retaliation shot */}
        {hunterVictim && (
          <div className="p-4 rounded-2xl bg-[#f7f5ea] border border-[#d3c690] shadow-sm space-y-3 animate-in fade-in duration-300">
            <div className="flex items-center justify-between text-xs text-[#665415] border-b border-[#e3dcb8] pb-2 font-display">
              <span className="font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Crosshair className="w-3.5 h-3.5" /> Tir d'ultime recours du Chasseur
              </span>
              <span className="text-[#70643b]">Siège {hunterVictim.seatNumber}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#e8deb2] border border-[#d3c690] flex items-center justify-center text-[#665415]">
                  <RoleIcon roleId={hunterVictim.currentRole} className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-display font-bold text-base text-[#22160c]">
                    {hunterVictim.name}
                  </div>
                  <div className="text-xs font-bold text-[#665415]">
                    {ROLE_DEFINITIONS[hunterVictim.currentRole].name}
                  </div>
                </div>
              </div>
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-[#e8deb2] text-[#665415] border border-[#d3c690]">
                Abattu
              </span>
            </div>
          </div>
        )}

        {/* Case 5: Lover of hunter victim */}
        {hunterLover && (
          <div className="p-4 rounded-2xl bg-[#faecf0] border border-[#dfa2b5] shadow-sm space-y-2 animate-in fade-in duration-300">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#8c2243]">
              <Heart className="w-3.5 h-3.5 fill-[#8c2243]" />
              <span>Chagrin d'amour lié au tir du Chasseur</span>
            </div>
            <p className="text-xs text-[#6e394b]">
              {hunterLover.name} ({ROLE_DEFINITIONS[hunterLover.currentRole].name}) succombe également de chagrin d'amour.
            </p>
          </div>
        )}
      </div>

      {/* Victory check announcement */}
      {winner ? (
        <div className="p-5 rounded-2xl bg-[#edf5ee] border border-[#a7cca9] shadow-sm space-y-3 text-center">
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
      ) : (
        <div className="p-4 rounded-2xl bg-[#fcf9f2] border border-[#d8c5aa] text-center space-y-1.5 shadow-xs">
          <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-[#824716]">
            <Moon className="w-4 h-4 text-[#824716]" />
            <span>Aucune condition de victoire atteinte</span>
          </div>
          <p className="text-[11px] text-[#634e3b]">
            Le conflit continue. Le village doit s'endormir pour la Nuit {round + 1}.
          </p>
        </div>
      )}

      {/* Floating CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#f5efe3] via-[#f5efe3]/95 to-transparent z-20">
        <div className="max-w-md mx-auto">
          {winner ? (
            <button
              type="button"
              onClick={onProceedToGameOver}
              className="w-full h-12 rounded-xl bg-[#1d592b] hover:bg-[#15421f] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-[#1d592b]/25 border border-[#12391b] cursor-pointer"
            >
              <Trophy className="w-4 h-4 text-[#ffd799]" />
              <span>Consulter l'Épilogue & Victoire</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onProceedToNextNight}
              className="w-full h-12 rounded-xl bg-[#824716] hover:bg-[#6c390f] text-[#fffdf8] font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-[#824716]/25 border border-[#542a06] cursor-pointer"
            >
              <Moon className="w-4 h-4" />
              <span>Lancer la Nuit {round + 1}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
