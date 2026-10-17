import React, { useState } from 'react';
import { Eye, EyeOff, ShieldCheck, ArrowRight, UserCheck } from 'lucide-react';
import { RoleId } from '../types/game';
import { ROLE_DEFINITIONS } from '../data/roles';
import { RoleIcon } from './RoleIcon';
import { getRoleCustomIcon } from '../assets/roleCustomIcons';
import { soundFX } from '../utils/audio';

interface PassAndPlayViewProps {
  currentIndex: number;
  totalPlayers: number;
  assignedRole: RoleId;
  defaultName: string;
  onConfirmPlayer: (name: string) => void;
}

type StepState = 'enter_name' | 'ready_to_reveal' | 'revealed';

export const PassAndPlayView: React.FC<PassAndPlayViewProps> = ({
  currentIndex,
  totalPlayers,
  assignedRole,
  defaultName,
  onConfirmPlayer,
}) => {
  const [step, setStep] = useState<StepState>('enter_name');
  const [playerName, setPlayerName] = useState(defaultName);
  const roleDef = ROLE_DEFINITIONS[assignedRole];
  const customRoleIcon = getRoleCustomIcon(assignedRole);

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim()) return;
    setStep('ready_to_reveal');
  };

  const handleReveal = () => {
    soundFX.playSecretReveal();
    setStep('revealed');
  };

  const handleFinishAndPass = () => {
    onConfirmPlayer(playerName.trim());
    // Reset state for next player
    setStep('enter_name');
    setPlayerName(`Joueur ${currentIndex + 2}`);
  };

  return (
    <div className="w-full max-w-md mx-auto p-4 flex flex-col justify-between min-h-[calc(100vh-80px)]">
      {/* Top Progress & Seat Indicator */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-[#634e3b]">
          <span>
            Joueur {currentIndex + 1} sur {totalPlayers}
          </span>
          <span className="font-display text-[#824716] font-bold">
            Siège n°{currentIndex + 1}
          </span>
        </div>
        <div className="w-full h-2 bg-[#eae0cb] rounded-full overflow-hidden border border-[#d2c0a4]">
          <div
            className="h-full bg-[#824716] rounded-full transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / totalPlayers) * 100}%` }}
          />
        </div>
      </div>

      {/* Main Interactive Container */}
      <div className="my-auto py-6">
        {step === 'enter_name' && (
          <form onSubmit={handleNameSubmit} className="space-y-6 text-center">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-[#faecea] border border-[#dea299] flex items-center justify-center text-[#871c1c] shadow-xs">
              <UserCheck className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="font-display text-2xl font-bold text-[#22160c]">
                Qui prend le téléphone ?
              </h2>
              <p className="text-xs text-[#5e4b37] max-w-xs mx-auto">
                Prenez l'appareil en main et saisissez votre prénom pour recevoir votre rôle secret du grimoire.
              </p>
            </div>

            <div className="space-y-3">
              <input
                type="text"
                value={playerName}
                onChange={e => setPlayerName(e.target.value)}
                placeholder="Ex : Alexandre, Sarah, Thomas..."
                maxLength={24}
                autoFocus
                className="w-full px-4 py-3.5 rounded-xl bg-[#fcf9f2] border-2 border-[#d5c2a6] text-[#22160c] text-center font-semibold placeholder-[#9d8973] focus:outline-none focus:border-[#824716] transition-colors shadow-2xs"
              />

              <button
                type="submit"
                disabled={!playerName.trim()}
                className="w-full h-12 rounded-xl bg-[#824716] hover:bg-[#6c390f] disabled:opacity-40 text-[#fffdf8] font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-[#824716]/20 border border-[#542a06] active:scale-[0.99] transition-all cursor-pointer"
              >
                <span>Confirmer mon nom</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}

        {step === 'ready_to_reveal' && (
          <div className="space-y-6 text-center">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-[#fcf7ec] border border-[#d8c39b] flex items-center justify-center text-[#63431a] shadow-xs">
              <EyeOff className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="font-display text-2xl font-bold text-[#22160c]">
                {playerName}
              </h2>
              <p className="text-xs text-[#5e4b37] max-w-xs mx-auto">
                Assurez-vous qu'aucun autre participant ne regarde votre écran.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#fcf9f2] border border-[#d8c5aa] text-xs text-[#594532] flex items-center gap-2.5 shadow-2xs">
              <ShieldCheck className="w-5 h-5 text-[#256c35] shrink-0" />
              <span className="text-left">
                Votre rôle reste strictement confidentiel. Personne d'autre ne doit l'apprendre.
              </span>
            </div>

            <button
              type="button"
              onClick={handleReveal}
              className="w-full h-14 rounded-2xl bg-[#824716] hover:bg-[#6c390f] text-[#fffdf8] font-extrabold text-base flex items-center justify-center gap-3 shadow-lg shadow-[#824716]/25 border border-[#542a06] active:scale-[0.98] transition-all cursor-pointer"
            >
              <Eye className="w-5 h-5" />
              <span>Révéler mon Rôle Secret</span>
            </button>
          </div>
        )}

        {step === 'revealed' && (
          <div className="space-y-5 animate-in fade-in zoom-in-95 duration-200">
            {/* Secret Card */}
            <div
              className={`p-6 rounded-3xl border-2 ${roleDef.colorScheme.bg} ${roleDef.colorScheme.border} shadow-lg space-y-4 text-center relative overflow-hidden`}
            >
              <div>
                <span className="inline-block px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-widest text-[#7a644f] bg-[#fffdfa]/65 border border-[#d8c5aa] font-display shadow-2xs">
                  Votre identité secrète
                </span>
              </div>

              {customRoleIcon ? (
                <div className="w-52 h-52 sm:w-60 sm:h-60 mx-auto flex items-center justify-center select-none py-1">
                  <img
                    src={customRoleIcon}
                    alt={roleDef.name}
                    className="w-full h-full object-contain drop-shadow-md select-none"
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="w-24 h-24 mx-auto rounded-2xl flex items-center justify-center border shadow-inner bg-[#fdfbf7] border-[#d8c5aa]">
                    <RoleIcon roleId={assignedRole} className={`w-12 h-12 ${roleDef.colorScheme.text}`} />
                  </div>
                  <h2 className={`font-display text-2xl font-extrabold tracking-wide ${roleDef.colorScheme.text}`}>
                    {roleDef.name}
                  </h2>
                </div>
              )}

              <div className="text-xs font-semibold text-[#5a4634]">
                Camp : {roleDef.camp === 'loups_garous' ? 'Loups-Garous' : roleDef.camp === 'villageois' ? 'Villageois' : 'Indépendant'}
              </div>

              <div className="p-3.5 rounded-xl bg-[#fffdfa] border border-[#d8c5aa] text-xs text-[#3d2b1b] leading-relaxed text-left shadow-2xs">
                <div className="font-bold text-[#22160c] mb-1 flex items-center gap-1.5">
                  <span>Votre pouvoir :</span>
                </div>
                {roleDef.shortPower}
              </div>
            </div>

            <div className="text-center text-[11px] text-[#6e5844]">
              Mémorisez bien votre rôle avant de masquer l'écran.
            </div>

            <button
              type="button"
              onClick={handleFinishAndPass}
              className="w-full h-12 rounded-xl bg-[#eee3cf] hover:bg-[#e4d5bf] text-[#2c1d10] font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.99] transition-all cursor-pointer border border-[#cdbc9f]"
            >
              <EyeOff className="w-4 h-4 text-[#6e5844]" />
              <span>J'ai mémorisé mon rôle · Masquer</span>
            </button>
          </div>
        )}
      </div>

      {/* Bottom Confidentiality Reminder */}
      <div className="text-center text-[11px] text-[#86715b]">
        Sekou-Gaming · Protocole de confidentialité stricte
      </div>
    </div>
  );
};
