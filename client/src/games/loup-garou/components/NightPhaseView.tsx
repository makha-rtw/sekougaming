import React, { useState, useEffect } from 'react';
import {
  Moon,
  ArrowRight,
  Eye,
  EyeOff,
  Heart,
  VenetianMask,
  Flame,
  Shield,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Lock,
  X,
  Compass,
  ChevronDown,
  Skull,
  FlaskConical,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { GameState, NightStep, NightTargets, Player } from '../types/game';
import { ROLE_DEFINITIONS } from '../data/roles';
import { RoleIcon } from './RoleIcon';
import { getRoleCustomIcon } from '../assets/roleCustomIcons';
import { isWerewolfRole, validateRenardSelection } from '../engine/gameEngine';
import { narration } from '../utils/narrationAudio';
import { TurnTransition } from './TurnTransition';

interface NightPhaseViewProps {
  state: GameState;
  onUpdateNightTargets: (targets: Partial<NightTargets>) => void;
  onThiefAction: (targetPlayerId: string) => void;
  onCupidonAction: (lover1Id: string, lover2Id: string) => void;
  onRenardAction: (centerId: string, leftId: string, rightId: string) => void;
  onChienLoupAction: (choice: 'villageois' | 'loup_garou') => void;
  onEnfantSauvageAction: (modelPlayerId: string) => void;
  onNextStep: () => void;
  onPrevStep: () => void;
  onResolveNight: () => void;
}

export const NightPhaseView: React.FC<NightPhaseViewProps> = ({
  state,
  onUpdateNightTargets,
  onThiefAction,
  onCupidonAction,
  onRenardAction,
  onChienLoupAction,
  onEnfantSauvageAction,
  onNextStep,
  onPrevStep,
  onResolveNight,
}) => {
  const {
    round,
    nightStepIndex,
    activeNightSteps,
    players,
    nightTargets,
    salvateurState,
    sorciereState,
  } = state;

  const currentStep: NightStep | undefined = activeNightSteps[nightStepIndex];
  const isLastStep = nightStepIndex === activeNightSteps.length - 1;

  // Local modal & role states
  const [revealedCardPlayerId, setRevealedCardPlayerId] = useState<string | null>(null);
  const [renardCenter, setRenardCenter] = useState<string>(nightTargets.renardCheckedIds?.[0] || '');
  const [renardLeft, setRenardLeft] = useState<string>(nightTargets.renardCheckedIds?.[1] || '');
  const [renardRight, setRenardRight] = useState<string>(nightTargets.renardCheckedIds?.[2] || '');
  const [renardSkipped, setRenardSkipped] = useState<boolean>(false);
  const [loupBlancPassed, setLoupBlancPassed] = useState<boolean>(false);
  const [corbeauPassed, setCorbeauPassed] = useState<boolean>(false);
  const [necromancienPassed, setNecromancienPassed] = useState<boolean>(false);
  const [isPlayingVoice, setIsPlayingVoice] = useState<boolean>(false);

  // Sync voice playing state
  useEffect(() => {
    return narration.subscribe((playing) => {
      setIsPlayingVoice(playing);
    });
  }, []);

  // When night step changes, play the role wake-up narration
  useEffect(() => {
    if (currentStep?.roleId) {
      narration.playRoleWakeUp(currentStep.roleId);
    }
    return () => {
      narration.stop();
    };
  }, [nightStepIndex, currentStep?.roleId]);

  const handleTogglePlayVoice = () => {
    if (isPlayingVoice) {
      narration.stop();
    } else if (currentStep?.roleId) {
      narration.playRoleWakeUp(currentStep.roleId);
    }
  };

  // Alive players
  const alivePlayers = players.filter(p => p.isAlive);
  const aliveWerewolves = alivePlayers.filter(p => isWerewolfRole(p.currentRole));

  // Determine if the current step's action is complete
  const isCurrentActionComplete = (): boolean => {
    if (!currentStep) return true;

    switch (currentStep.id) {
      case 'voleur':
        return state.thiefActionDone === true;

      case 'chien_loup':
        return state.chienLoupActionDone === true;

      case 'enfant_sauvage':
        return state.enfantSauvageActionDone === true;

      case 'cupidon':
        return state.cupidonActionDone === true;

      case 'amoureux_reco':
        // Acknowledgment step: lovers look at each other
        return true;

      case 'insomniaque':
        return Boolean(nightTargets.insomniaqueTargetId);

      case 'salvateur':
        return Boolean(nightTargets.salvateurProtectedId);

      case 'voyante':
        return Boolean(nightTargets.voyanteRevealedPlayerId);

      case 'renard':
        return nightTargets.renardResultHasWolf !== null || renardSkipped;

      case 'corbeau':
        return Boolean(nightTargets.corbeauTargetId) || corbeauPassed;

      case 'necromancien':
        return (
          Boolean(nightTargets.necromancienCommunicatedDeadId || nightTargets.necromancienRevivedId) ||
          necromancienPassed
        );

      case 'loups_garous':
        return Boolean(nightTargets.werewolfTargetId);

      case 'infect_pere_des_loups':
        return true;

      case 'grand_mechant_loup':
        return Boolean(nightTargets.gmlTargetId);

      case 'loup_blanc':
        return Boolean(nightTargets.loupBlancTargetId) || loupBlancPassed;

      case 'pyromane':
        if (round === 1) {
          return Boolean(nightTargets.pyromaneOiledTargetId);
        }
        if (nightTargets.pyromaneAction === 'oil') {
          return Boolean(nightTargets.pyromaneOiledTargetId);
        }
        if (nightTargets.pyromaneAction === 'burn') {
          return true;
        }
        return false;

      case 'sorciere':
        // Exception: Sorcière can use 0, 1 or 2 potions and proceed freely
        return true;

      default:
        return true;
    }
  };

  const canProceed = isCurrentActionComplete();

  // Renard direct tap-to-select 3 players logic
  const handleAssignRenardPlayer = (playerId: string) => {
    setRenardSkipped(false);

    // If player is already selected, unselect them
    if (renardCenter === playerId) {
      setRenardCenter('');
      return;
    }
    if (renardLeft === playerId) {
      setRenardLeft('');
      return;
    }
    if (renardRight === playerId) {
      setRenardRight('');
      return;
    }

    // Otherwise assign to the first free slot
    if (!renardCenter) {
      setRenardCenter(playerId);
    } else if (!renardLeft) {
      setRenardLeft(playerId);
    } else if (!renardRight) {
      setRenardRight(playerId);
    } else {
      // If all 3 are already filled, replace the center and clear the other two
      setRenardCenter(playerId);
      setRenardLeft('');
      setRenardRight('');
    }
  };

  // Anti-double click lock for night resolution
  const isResolvingRef = React.useRef(false);
  const [isResolving, setIsResolving] = useState(false);

  const handleSafeResolveNight = () => {
    if (!canProceed || isResolvingRef.current) return;
    isResolvingRef.current = true;
    setIsResolving(true);
    try {
      onResolveNight();
    } catch (err) {
      isResolvingRef.current = false;
      setIsResolving(false);
      throw err;
    }
  };

  if (!currentStep) {
    return (
      <div className="w-full max-w-md mx-auto p-4 text-center space-y-4">
        <p className="text-sm text-[#6c5641]">Tous les tours nocturnes sont achevés.</p>
        <button
          type="button"
          onClick={handleSafeResolveNight}
          disabled={isResolving}
          className="w-full h-12 rounded-xl bg-[#824716] hover:bg-[#6c390f] disabled:opacity-40 text-[#fffdf8] font-bold text-sm cursor-pointer shadow-md shadow-[#824716]/20 border border-[#542a06]"
        >
          {isResolving ? 'Résolution en cours...' : 'Résoudre les événements nocturnes'}
        </button>
      </div>
    );
  }

  const roleDef = ROLE_DEFINITIONS[currentStep.roleId];

  // Render specific interactive form for each role
  const renderRoleInteraction = () => {
    switch (currentStep.id) {
      case 'voleur': {
        const thiefPlayer = alivePlayers.find(p => p.currentRole === 'voleur');
        const availableTargets = alivePlayers.filter(p => p.currentRole !== 'voleur');

        return (
          <div className="space-y-4 bg-[#fcf9f2] border border-[#d8c5aa] rounded-2xl p-4 shadow-sm">
            <div className="text-xs text-[#433120] font-semibold">
              Désignez le joueur dont le Voleur ({thiefPlayer?.name || 'Voleur'}) dérobe l'identité :
            </div>

            <div className="grid grid-cols-2 gap-2">
              {availableTargets.map(p => {
                const isSelected = nightTargets.voleurTargetId === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      onUpdateNightTargets({ voleurTargetId: p.id });
                    }}
                    className={`p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#242959] border-[#161a3b] text-[#f4f4fc] font-bold shadow-sm ring-1 ring-[#161a3b]'
                        : 'bg-[#f8f3e7] border-[#d8c6aa] text-[#362719] hover:bg-[#f3ebd9]'
                    }`}
                  >
                    <div className="font-semibold truncate">{p.name}</div>
                    <div className={`text-[10px] ${isSelected ? 'text-[#c8ccf2]' : 'text-[#78644e]'}`}>
                      Siège {p.seatNumber}
                    </div>
                  </button>
                );
              })}
            </div>

            {nightTargets.voleurTargetId && (
              <button
                type="button"
                onClick={() => {
                  const target = players.find(p => p.id === nightTargets.voleurTargetId);
                  if (target) {
                    setRevealedCardPlayerId(target.id);
                    onThiefAction(target.id);
                  }
                }}
                className="w-full h-11 rounded-xl bg-[#363b78] hover:bg-[#282c60] text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-[#363b78]/25"
              >
                <VenetianMask className="w-4 h-4" />
                <span>Révéler et voler le rôle secret</span>
              </button>
            )}

            {state.thiefActionDone && (
              <div className="p-3 rounded-xl bg-[#edf5ee] border border-[#a7cca9] text-xs text-[#1d592b] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#256c35] shrink-0" />
                <span>Vol de rôle accompli avec succès.</span>
              </div>
            )}
          </div>
        );
      }

      case 'cupidon': {
        return (
          <div className="space-y-4 bg-[#fcf9f2] border border-[#d8c5aa] rounded-2xl p-4 shadow-sm">
            <div className="text-xs text-[#433120] font-semibold">
              Sélectionnez manuellement les deux amoureux désignés par Cupidon :
            </div>

            <div className="space-y-2">
              <label className="text-[11px] text-[#695440] font-medium block">Premier amoureux :</label>
              <select
                value={nightTargets.cupidonLover1Id || ''}
                onChange={e => onUpdateNightTargets({ cupidonLover1Id: e.target.value || null })}
                className="w-full px-3 py-2 rounded-xl bg-[#fffdfa] border-2 border-[#d5c2a6] text-[#22160c] text-xs font-medium focus:outline-none focus:border-[#8c2243]"
              >
                <option value="">-- Choisir un joueur --</option>
                {alivePlayers.map(p => (
                  <option key={p.id} value={p.id} disabled={p.id === nightTargets.cupidonLover2Id}>
                    {p.name} (Siège {p.seatNumber})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] text-[#695440] font-medium block">Deuxième amoureux :</label>
              <select
                value={nightTargets.cupidonLover2Id || ''}
                onChange={e => onUpdateNightTargets({ cupidonLover2Id: e.target.value || null })}
                className="w-full px-3 py-2 rounded-xl bg-[#fffdfa] border-2 border-[#d5c2a6] text-[#22160c] text-xs font-medium focus:outline-none focus:border-[#8c2243]"
              >
                <option value="">-- Choisir un joueur --</option>
                {alivePlayers.map(p => (
                  <option key={p.id} value={p.id} disabled={p.id === nightTargets.cupidonLover1Id}>
                    {p.name} (Siège {p.seatNumber})
                  </option>
                ))}
              </select>
            </div>

            {nightTargets.cupidonLover1Id && nightTargets.cupidonLover2Id && (
              <button
                type="button"
                onClick={() => {
                  onCupidonAction(nightTargets.cupidonLover1Id!, nightTargets.cupidonLover2Id!);
                }}
                className="w-full h-11 rounded-xl bg-[#8c2243] hover:bg-[#741834] text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-[#8c2243]/20"
              >
                <Heart className="w-4 h-4 fill-white" />
                <span>Lier ces deux amoureux pour la partie</span>
              </button>
            )}

            {state.cupidonActionDone && (
              <div className="p-3 rounded-xl bg-[#faecf0] border border-[#dfa2b5] text-xs text-[#8c2243] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#8c2243] shrink-0" />
                <span>Les deux amoureux ont été unis par la flèche de Cupidon.</span>
              </div>
            )}
          </div>
        );
      }

      case 'amoureux_reco': {
        const lovers = players.filter(p => p.isLover);
        return (
          <div className="space-y-4 bg-[#fcf9f2] border border-[#d8c5aa] rounded-2xl p-4 text-center shadow-sm">
            <div className="w-12 h-12 mx-auto rounded-xl bg-[#faecf0] border border-[#dfa2b5] flex items-center justify-center text-[#8c2243]">
              <Heart className="w-6 h-6 fill-[#8c2243]/30" />
            </div>

            <div className="text-xs text-[#433120]">
              Touchez discrètement l'épaule de :
              <div className="font-display font-bold text-[#8c2243] text-sm mt-1">
                {lovers.map(l => `${l.name} (Siège ${l.seatNumber})`).join('  &  ')}
              </div>
            </div>

            <p className="text-[11px] text-[#6e5844] leading-relaxed">
              Ils ouvrent les yeux, se reconnaissent mutuellement en silence, puis se rendorment.
            </p>
          </div>
        );
      }

      case 'salvateur': {
        const lastProtectedId = salvateurState.lastProtectedId;

        return (
          <div className="space-y-4 bg-[#fcf9f2] border border-[#d8c5aa] rounded-2xl p-4 shadow-sm">
            <div className="text-xs text-[#433120] font-semibold">
              Sélectionnez le joueur que le Salvateur immunise contre les attaques de cette nuit :
            </div>

            <div className="grid grid-cols-2 gap-2">
              {alivePlayers.map(p => {
                const isSelected = nightTargets.salvateurProtectedId === p.id;
                const isForbidden = p.id === lastProtectedId;

                return (
                  <button
                    key={p.id}
                    type="button"
                    disabled={isForbidden}
                    onClick={() => {
                      onUpdateNightTargets({
                        salvateurProtectedId: isSelected ? null : p.id,
                      });
                    }}
                    className={`p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#1b4d27] border-[#0f3017] text-[#f2faf3] font-bold shadow-sm ring-1 ring-[#0f3017]'
                        : isForbidden
                        ? 'bg-[#f0e8d9]/50 border-[#dfd0bb] text-[#9f8d77] opacity-60 cursor-not-allowed'
                        : 'bg-[#f8f3e7] border-[#d8c6aa] text-[#362719] hover:bg-[#f3ebd9]'
                    }`}
                  >
                    <div className="font-semibold truncate">{p.name}</div>
                    <div className={`text-[10px] ${isSelected ? 'text-[#b8deb9]' : 'text-[#78644e]'}`}>
                      {isForbidden ? 'Protégé hier (Interdit)' : `Siège ${p.seatNumber}`}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      }

      case 'voyante': {
        return (
          <div className="space-y-4 bg-[#fcf9f2] border border-[#d8c5aa] rounded-2xl p-4 shadow-sm">
            <div className="text-xs text-[#433120] font-semibold">
              Sélectionnez le joueur désigné par la Voyante :
            </div>

            <div className="grid grid-cols-2 gap-2">
              {alivePlayers.map(p => {
                const isSelected = nightTargets.voyanteRevealedPlayerId === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      onUpdateNightTargets({ voyanteRevealedPlayerId: p.id });
                      setRevealedCardPlayerId(p.id);
                    }}
                    className={`p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#12445a] border-[#0a2734] text-[#f0f8fc] font-bold shadow-sm ring-1 ring-[#0a2734]'
                        : 'bg-[#f8f3e7] border-[#d8c6aa] text-[#362719] hover:bg-[#f3ebd9]'
                    }`}
                  >
                    <div className="font-semibold truncate">{p.name}</div>
                    <div className={`text-[10px] ${isSelected ? 'text-[#a5d4e8]' : 'text-[#78644e]'}`}>
                      Siège {p.seatNumber}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      }

      case 'renard': {
        // Fox manual 3-player selection
        const renardValidation = validateRenardSelection(renardCenter, renardLeft, renardRight);
        const canExecuteScan = renardValidation.isValid;

        const centerPlayer = alivePlayers.find(p => p.id === renardCenter);
        const leftPlayer = alivePlayers.find(p => p.id === renardLeft);
        const rightPlayer = alivePlayers.find(p => p.id === renardRight);

        return (
          <div className="space-y-4 bg-[#fcf9f2] border border-[#d8c5aa] rounded-2xl p-4 shadow-sm">
            <div className="space-y-1">
              <div className="text-xs text-[#2b1b0e] font-bold">
                Sélection manuelle du trio physique (Cible + ses 2 voisins réels) :
              </div>
              <p className="text-[11px] text-[#6b553e] leading-relaxed">
                Le pouvoir du Renard dépend de la disposition physique réelle autour de la table. Sélectionnez séparément la cible centrale et ses deux voisins immédiats.
              </p>
            </div>

            {/* Selected Trio Status Summary */}
            <div className="p-3 rounded-xl bg-[#f5ecdc] border border-[#d8c3aa] space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#543b25]">
                  Trio sélectionné ({[renardCenter, renardLeft, renardRight].filter(Boolean).length}/3) :
                </span>
                {(renardCenter || renardLeft || renardRight) && (
                  <button
                    type="button"
                    onClick={() => {
                      setRenardCenter('');
                      setRenardLeft('');
                      setRenardRight('');
                    }}
                    className="text-[11px] font-semibold text-[#873a0c] hover:text-[#522105] flex items-center gap-1 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                    Réinitialiser
                  </button>
                )}
              </div>
              <div className="grid grid-cols-3 gap-1.5 text-center text-[11px]">
                <div className={`p-2 rounded-lg border transition-all ${
                  centerPlayer 
                    ? 'bg-[#8a3c0b] text-[#fff8ed] border-[#5e2704] font-bold shadow-xs' 
                    : 'bg-[#ede1ce] text-[#7d6852] border-[#dac9b3] border-dashed'
                }`}>
                  <div className="text-[9px] opacity-80 uppercase tracking-wider font-semibold">1. Cible</div>
                  <div className="truncate mt-0.5">{centerPlayer ? centerPlayer.name : '—'}</div>
                </div>

                <div className={`p-2 rounded-lg border transition-all ${
                  leftPlayer 
                    ? 'bg-[#a34b12] text-[#fff8ed] border-[#6b3008] font-bold shadow-xs' 
                    : 'bg-[#ede1ce] text-[#7d6852] border-[#dac9b3] border-dashed'
                }`}>
                  <div className="text-[9px] opacity-80 uppercase tracking-wider font-semibold">2. Voisin 1</div>
                  <div className="truncate mt-0.5">{leftPlayer ? leftPlayer.name : '—'}</div>
                </div>

                <div className={`p-2 rounded-lg border transition-all ${
                  rightPlayer 
                    ? 'bg-[#a34b12] text-[#fff8ed] border-[#6b3008] font-bold shadow-xs' 
                    : 'bg-[#ede1ce] text-[#7d6852] border-[#dac9b3] border-dashed'
                }`}>
                  <div className="text-[9px] opacity-80 uppercase tracking-wider font-semibold">3. Voisin 2</div>
                  <div className="truncate mt-0.5">{rightPlayer ? rightPlayer.name : '—'}</div>
                </div>
              </div>
            </div>

            {/* Direct Clickable Player List */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-bold text-[#3d2716] block">
                Touchez 3 joueurs dans la liste (la cible centrale, puis ses 2 voisins physiques) :
              </span>
              <div className="grid grid-cols-2 gap-2">
                {alivePlayers.map(p => {
                  const isCenter = renardCenter === p.id;
                  const isLeft = renardLeft === p.id;
                  const isRight = renardRight === p.id;
                  const isSelected = isCenter || isLeft || isRight;

                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleAssignRenardPlayer(p.id)}
                      className={`p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#8a3c0b] border-[#5e2704] text-[#fff8ed] font-bold shadow-sm ring-1 ring-[#5e2704]'
                          : 'bg-[#fbf7f0] border-[#d8c5aa] text-[#3a281a] hover:bg-[#f3ead8]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="truncate">{p.name}</span>
                        <span className={`text-[9px] ${isSelected ? 'text-[#fce4c8]' : 'text-[#7d674f]'}`}>
                          Siège {p.seatNumber}
                        </span>
                      </div>
                      {isSelected ? (
                        <span className="text-[10px] font-extrabold text-[#ffeac9] mt-1 block">
                          {isCenter ? '● 1. Cible centrale' : isLeft ? '● 2. Voisin gauche' : '● 3. Voisin droite'}
                        </span>
                      ) : (
                        <span className="text-[9px] text-[#937b65] mt-1 block">
                          Touchez pour sélectionner
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Validation errors if any */}
            {!canExecuteScan && (renardCenter || renardLeft || renardRight) && renardValidation.error && (
              <p className="text-[11px] text-[#8c3d0d] bg-[#fcf0e7] border border-[#e3ad86] p-2.5 rounded-xl font-medium">
                {renardValidation.error}
              </p>
            )}

            {/* Action Buttons */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                disabled={!canExecuteScan || nightTargets.renardResultHasWolf !== null}
                onClick={() => {
                  if (canExecuteScan) {
                    onRenardAction(renardCenter, renardLeft, renardRight);
                  }
                }}
                className="w-full h-11 rounded-xl bg-[#824716] hover:bg-[#6c390f] disabled:opacity-40 disabled:hover:bg-[#824716] text-[#fffdf8] font-bold text-xs flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed shadow-md shadow-[#824716]/20 border border-[#542a06]"
              >
                <Compass className="w-4 h-4" />
                <span>Vérifier le flair (3 cibles)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setRenardSkipped(true);
                  onUpdateNightTargets({
                    renardCheckedIds: null,
                    renardResultHasWolf: null,
                  });
                }}
                className={`w-full py-2.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                  renardSkipped
                    ? 'bg-[#fbf7ec] border-[#d8c39b] text-[#63431a]'
                    : 'bg-[#eee4cf] border-[#cdbda0] text-[#54402e] hover:bg-[#e4d7bf]'
                }`}
              >
                {renardSkipped
                  ? 'Tour passé sans flairer (Pouvoir conservé)'
                  : 'Ne pas utiliser le flair cette nuit (Conserver le pouvoir)'}
              </button>
            </div>

            {/* Result display */}
            {nightTargets.renardResultHasWolf !== null && (
              <div
                className={`p-3.5 rounded-xl border text-xs space-y-1 ${
                  nightTargets.renardResultHasWolf
                    ? 'bg-[#edf5ee] border-[#a7cca9] text-[#1d592b]'
                    : 'bg-[#faecea] border-[#dea299] text-[#871c1c]'
                }`}
              >
                {nightTargets.renardResultHasWolf ? (
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#256c35] shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold">Flair réussi !</div>
                      <p className="text-[11px] text-[#22572d] mt-0.5">
                        Au moins un Loup-Garou se cache parmi ces 3 personnes. Le Renard <strong>conserve son pouvoir</strong>.
                      </p>
                      <p className="text-[10px] text-[#59755d] italic mt-1">
                        Consigne modérateur : Montrez discrètement 1 doigt ou hochez positivement la tête au Renard.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-[#871c1c] shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold">Piste froide !</div>
                      <p className="text-[11px] text-[#7a2222] mt-0.5">
                        Aucun Loup-Garou dans ce groupe. Le Renard <strong>perd définitivement son pouvoir</strong> et devient Simple Villageois.
                      </p>
                      <p className="text-[10px] text-[#7d4e4e] italic mt-1">
                        Consigne modérateur : Hochez négativement la tête au Renard pour signifier l'échec.
                      </p>
                    </div>
                  </div>
                )}

                <div className="pt-2 border-t border-current/15 flex justify-end">
                  <button
                    type="button"
                    onClick={() => narration.playRenardResult(!!nightTargets.renardResultHasWolf)}
                    className="inline-flex items-center gap-1.5 text-[11px] font-bold underline opacity-85 hover:opacity-100 cursor-pointer"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Écouter la sentence vocale du Renard</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      }

      case 'loups_garous': {
        return (
          <div className="space-y-4 bg-[#fcf9f2] border border-[#d8c5aa] rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between text-xs text-[#523d29] pb-1 font-semibold">
              <span>Victime désignée par la meute :</span>
              <span className="text-[#8c2243] text-[11px]">Petite Fille peut espionner</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {alivePlayers.map(p => {
                const isSelected = nightTargets.werewolfTargetId === p.id;
                const isWolf = isWerewolfRole(p.currentRole);

                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      onUpdateNightTargets({
                        werewolfTargetId: isSelected ? null : p.id,
                      });
                    }}
                    className={`p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#7a1818] border-[#4a0b0b] text-[#fdf4f4] font-bold shadow-sm ring-1 ring-[#4a0b0b]'
                        : 'bg-[#f8f3e7] border-[#d8c6aa] text-[#362719] hover:bg-[#f3ebd9]'
                    }`}
                  >
                    <div className="font-semibold truncate flex items-center justify-between">
                      <span>{p.name}</span>
                      {isWolf && <span className={`text-[10px] font-bold ${isSelected ? 'text-[#ffdada]' : 'text-[#871c1c]'}`}>Loup</span>}
                    </div>
                    <div className={`text-[10px] ${isSelected ? 'text-[#f5c6c6]' : 'text-[#78644e]'}`}>
                      Siège {p.seatNumber}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      }

      case 'grand_mechant_loup': {
        return (
          <div className="space-y-4 bg-[#fcf9f2] border border-[#d8c5aa] rounded-2xl p-4 shadow-sm">
            <div className="text-xs text-[#433120] font-semibold">
              Victime supplémentaire du Grand Méchant Loup :
            </div>

            <div className="grid grid-cols-2 gap-2">
              {alivePlayers.map(p => {
                const isSelected = nightTargets.gmlTargetId === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      onUpdateNightTargets({
                        gmlTargetId: isSelected ? null : p.id,
                      });
                    }}
                    className={`p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#6b0f0f] border-[#400707] text-[#fdf4f4] font-bold shadow-sm ring-1 ring-[#400707]'
                        : 'bg-[#f8f3e7] border-[#d8c6aa] text-[#362719] hover:bg-[#f3ebd9]'
                    }`}
                  >
                    <div className="font-semibold truncate">{p.name}</div>
                    <div className={`text-[10px] ${isSelected ? 'text-[#f5c6c6]' : 'text-[#78644e]'}`}>
                      Siège {p.seatNumber}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      }

      case 'loup_blanc': {
        return (
          <div className="space-y-4 bg-[#fcf9f2] border border-[#d8c5aa] rounded-2xl p-4 shadow-sm">
            <div className="text-xs text-[#433120] font-semibold">
              Loup-Garou ciblé par le Loup Blanc (ou passer son tour) :
            </div>

            <div className="grid grid-cols-2 gap-2">
              {aliveWerewolves
                .filter(w => w.currentRole !== 'loup_blanc')
                .map(p => {
                  const isSelected = nightTargets.loupBlancTargetId === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setLoupBlancPassed(false);
                        onUpdateNightTargets({
                          loupBlancTargetId: isSelected ? null : p.id,
                        });
                      }}
                      className={`p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#3b342e] border-[#201c18] text-[#fdfbf7] font-bold shadow-sm ring-1 ring-[#201c18]'
                          : 'bg-[#f8f3e7] border-[#d8c6aa] text-[#362719] hover:bg-[#f3ebd9]'
                      }`}
                    >
                      <div className="font-semibold truncate">{p.name}</div>
                      <div className={`text-[10px] ${isSelected ? 'text-[#d8cdbf]' : 'text-[#78644e]'}`}>
                        Siège {p.seatNumber}
                      </div>
                    </button>
                  );
                })}
            </div>

            <button
              type="button"
              onClick={() => {
                setLoupBlancPassed(true);
                onUpdateNightTargets({ loupBlancTargetId: null });
              }}
              className={`w-full py-2.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                loupBlancPassed && !nightTargets.loupBlancTargetId
                  ? 'bg-[#3b342e] border-[#201c18] text-[#fdfbf7] font-bold shadow-xs'
                  : 'bg-[#eee4cf] border-[#cdbda0] text-[#54402e] hover:bg-[#e4d7bf]'
              }`}
            >
              Ne dévorer aucun loup cette nuit (Passer)
            </button>
          </div>
        );
      }

      case 'pyromane': {
        const isNight1 = round === 1;
        const currentAction = nightTargets.pyromaneAction || (isNight1 ? 'oil' : null);
        const oiledCount = alivePlayers.filter(p => p.isOiled).length;

        return (
          <div className="space-y-4 bg-[#fcf9f2] border border-[#d8c5aa] rounded-2xl p-4 shadow-sm">
            {!isNight1 && (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onUpdateNightTargets({ pyromaneAction: 'oil' })}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    currentAction === 'oil'
                      ? 'bg-[#8a3304] border-[#592001] text-[#fff8f0] shadow-sm ring-1 ring-[#592001]'
                      : 'bg-[#f8f3e7] border-[#d8c6aa] text-[#55402e] hover:bg-[#f3ebd9]'
                  }`}
                >
                  <Flame className={`w-4 h-4 mx-auto mb-1 ${currentAction === 'oil' ? 'text-[#fed2aa]' : 'text-[#8c3d0d]'}`} />
                  <span>Huiler un joueur</span>
                </button>

                <button
                  type="button"
                  onClick={() => onUpdateNightTargets({ pyromaneAction: 'burn' })}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    currentAction === 'burn'
                      ? 'bg-[#7a1818] border-[#4a0b0b] text-[#fdf4f4] shadow-sm ring-1 ring-[#4a0b0b]'
                      : 'bg-[#f8f3e7] border-[#d8c6aa] text-[#55402e] hover:bg-[#f3ebd9]'
                  }`}
                >
                  <Flame className={`w-4 h-4 mx-auto mb-1 ${currentAction === 'burn' ? 'text-[#fdf4f4] fill-[#fdf4f4]' : 'text-[#871c1c] fill-[#871c1c]'}`} />
                  <span>Allumer le Brasier ({oiledCount})</span>
                </button>
              </div>
            )}

            {currentAction === 'oil' && (
              <div className="space-y-2">
                <div className="text-xs text-[#433120] font-semibold">
                  Sélectionnez le joueur à asperger d'huile inflammable :
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {alivePlayers.map(p => {
                    const isSelected = nightTargets.pyromaneOiledTargetId === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => onUpdateNightTargets({ pyromaneOiledTargetId: p.id })}
                        className={`p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#8a3304] border-[#592001] text-[#fff8f0] font-bold shadow-sm ring-1 ring-[#592001]'
                            : 'bg-[#f8f3e7] border-[#d8c6aa] text-[#362719] hover:bg-[#f3ebd9]'
                        }`}
                      >
                        <div className="font-semibold truncate flex items-center justify-between">
                          <span>{p.name}</span>
                          {p.isOiled && (
                            <span className={`text-[10px] font-bold ${isSelected ? 'text-[#fed2aa]' : 'text-[#8c3d0d]'}`}>
                              Huilé
                            </span>
                          )}
                        </div>
                        <div className={`text-[10px] ${isSelected ? 'text-[#fed2aa]' : 'text-[#78644e]'}`}>
                          Siège {p.seatNumber}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {currentAction === 'burn' && (
              <div className="p-3.5 rounded-xl bg-[#faecea] border border-[#dea299] text-xs text-[#871c1c] space-y-1">
                <div className="font-bold">Incendie mortel déclenché !</div>
                <p className="text-[11px] leading-relaxed">
                  Toutes les personnes enduites d'huile ({oiledCount} vivant(s)) prendront feu cette nuit à moins d'une protection.
                </p>
              </div>
            )}
          </div>
        );
      }

      case 'sorciere': {
        const wolfVictim = alivePlayers.find(p => p.id === nightTargets.werewolfTargetId);
        const killedPlayer = alivePlayers.find(p => p.id === nightTargets.sorciereKilledId);
        const isLifeActive = Boolean(nightTargets.sorciereSavedId);
        const isDeathActive = Boolean(nightTargets.sorciereKilledId);

        return (
          <div className="space-y-4 bg-[#fcf9f2] border border-[#d8c5aa] rounded-2xl p-4 shadow-sm">
            {/* Rule restriction badge */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#faedf4] border border-[#dca6c6] text-[11px] text-[#58266e] font-semibold">
              <FlaskConical className="w-3.5 h-3.5 text-[#58266e] shrink-0" />
              <span>Restriction : La Sorcière ne peut utiliser qu'une seule potion à la fois par nuit.</span>
            </div>

            {/* Werewolf victim info */}
            <div className="p-3 rounded-xl bg-[#faecea] border border-[#dea299] text-xs">
              <span className="text-[#6d3e38] font-medium">Victime attaquée par les loups cette nuit :</span>
              <div className="font-bold text-[#871c1c] text-sm mt-0.5">
                {wolfVictim ? `${wolfVictim.name} (Siège ${wolfVictim.seatNumber})` : 'Aucune victime désignée'}
              </div>
            </div>

            {/* Potion de Vie */}
            <div className={`p-3.5 rounded-xl border space-y-2 transition-all ${
              isLifeActive
                ? 'bg-[#edf5ee] border-[#75b081] shadow-xs'
                : 'bg-[#f4edf8] border-[#c9aadb]'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#256c35]" />
                  <span className="text-xs font-bold text-[#58266e]">1. Potion de Vie (Guérison)</span>
                </div>
                <span className="text-[10px] font-semibold text-[#735185]">
                  {sorciereState.hasLifePotion ? 'Disponible (1 usage)' : 'Épuisée'}
                </span>
              </div>

              {sorciereState.hasLifePotion && wolfVictim ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      if (isLifeActive) {
                        onUpdateNightTargets({ sorciereSavedId: null });
                      } else {
                        // Enforce restriction: activating Life potion clears Death potion
                        onUpdateNightTargets({
                          sorciereSavedId: wolfVictim.id,
                          sorciereKilledId: null,
                        });
                      }
                    }}
                    className={`w-full py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer shadow-xs flex items-center justify-center gap-2 ${
                      isLifeActive
                        ? 'bg-[#1b4d27] border-[#0f3017] text-[#f2faf3] shadow-sm ring-1 ring-[#0f3017]'
                        : 'bg-[#fffdf9] border-[#c9aadb] text-[#58266e] hover:bg-[#ede0f5]'
                    }`}
                  >
                    <CheckCircle2 className={`w-4 h-4 ${isLifeActive ? 'text-[#a7e8b3]' : 'text-[#58266e]'}`} />
                    <span>
                      {isLifeActive
                        ? `Sauvetage confirmé : ${wolfVictim.name} vivra (Toucher pour annuler)`
                        : `Sauver ${wolfVictim.name}`}
                    </span>
                  </button>

                  {isDeathActive && !isLifeActive && (
                    <div className="text-[10px] text-[#7e2558] italic font-medium px-1">
                      ⚠️ Activer ce sauvetage désactivera la Potion de Mort.
                    </div>
                  )}
                </>
              ) : (
                <p className="text-[11px] text-[#78644e] italic">
                  {!sorciereState.hasLifePotion
                    ? 'La potion de vie a déjà été utilisée lors d\'une nuit précédente.'
                    : 'Aucune victime des loups à réanimer cette nuit.'}
                </p>
              )}
            </div>

            {/* Potion de Mort */}
            <div className={`p-3.5 rounded-xl border space-y-2.5 transition-all ${
              isDeathActive
                ? 'bg-[#f4edf8] border-[#a874be] shadow-xs'
                : 'bg-[#f4edf8] border-[#c9aadb]'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Skull className="w-4 h-4 text-[#8a1e1e]" />
                  <span className="text-xs font-bold text-[#58266e]">2. Potion de Mort (Poison)</span>
                </div>
                <span className="text-[10px] font-semibold text-[#735185]">
                  {sorciereState.hasDeathPotion ? 'Disponible (1 usage)' : 'Épuisée'}
                </span>
              </div>

              {sorciereState.hasDeathPotion ? (
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold text-[#543b60] block">
                    Sélectionnez la victime à empoisonner :
                  </label>

                  {/* Styled Medieval Dropdown */}
                  <div className="relative">
                    <div className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${
                      isDeathActive ? 'text-[#f0d4fc]' : 'text-[#58266e]'
                    }`}>
                      <FlaskConical className="w-4 h-4" />
                    </div>

                    <select
                      value={nightTargets.sorciereKilledId || ''}
                      onChange={e => {
                        const targetId = e.target.value || null;
                        // Enforce restriction: selecting Death potion clears Life potion
                        onUpdateNightTargets({
                          sorciereKilledId: targetId,
                          sorciereSavedId: targetId ? null : nightTargets.sorciereSavedId,
                        });
                      }}
                      className={`w-full pl-9 pr-9 py-2.5 rounded-xl border-2 text-xs font-bold transition-all appearance-none cursor-pointer focus:outline-none ${
                        isDeathActive
                          ? 'bg-[#3f1254] border-[#250833] text-[#fff8fe] shadow-sm ring-1 ring-[#250833]'
                          : 'bg-[#fffdf9] border-[#baa0ce] text-[#341842] hover:border-[#85459e] focus:border-[#441259]'
                      }`}
                    >
                      <option value="" className="bg-[#fffdf9] text-[#4d3257] font-medium">
                        -- Ne tuer personne (Conserver la potion de mort) --
                      </option>
                      {alivePlayers.map(p => (
                        <option
                          key={p.id}
                          value={p.id}
                          className="bg-[#fffdf9] text-[#22160c] py-1 font-semibold"
                        >
                          ☠️ Empoisonner {p.name} (Siège {p.seatNumber})
                        </option>
                      ))}
                    </select>

                    <div className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none ${
                      isDeathActive ? 'text-[#f0d4fc]' : 'text-[#753b8f]'
                    }`}>
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </div>

                  {/* Selected Victim Confirmation Card */}
                  {killedPlayer && (
                    <div className="p-3 rounded-xl bg-[#3f1254] border border-[#250833] text-[#fff8fe] flex items-center justify-between shadow-sm animate-in fade-in">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-[#591b75] border border-[#792ca0] flex items-center justify-center shrink-0">
                          <Skull className="w-4 h-4 text-[#ffd0d0]" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[10px] font-bold text-[#e1b7f2] uppercase tracking-wider">
                            Poison mortel administré
                          </div>
                          <div className="text-xs font-extrabold truncate text-white">
                            {killedPlayer.name} (Siège {killedPlayer.seatNumber})
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onUpdateNightTargets({ sorciereKilledId: null })}
                        className="px-2.5 py-1.5 rounded-lg bg-[#581f72] hover:bg-[#6c288b] text-[#fbeeff] text-[11px] font-bold border border-[#7e34a0] transition-colors cursor-pointer shrink-0"
                      >
                        Annuler
                      </button>
                    </div>
                  )}

                  {isLifeActive && !isDeathActive && (
                    <div className="text-[10px] text-[#7e2558] italic font-medium px-1">
                      ⚠️ Choisir une victime ci-dessus désactivera la Potion de Vie.
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-[11px] text-[#78644e] italic">
                  La potion de mort a déjà été consommée lors d'une nuit précédente.
                </p>
              )}
            </div>
          </div>
        );
      }

      case 'chien_loup': {
        const chienLoupPlayer = alivePlayers.find(
          p => p.initialRole === 'chien_loup' || p.currentRole === 'chien_loup'
        );
        const currentChoice = nightTargets.chienLoupChoice;

        return (
          <div className="space-y-4 bg-[#fcf9f2] border border-[#d8c5aa] rounded-2xl p-4 shadow-sm">
            <div className="text-xs text-[#433120] font-semibold">
              Quel camp le Chien-Loup ({chienLoupPlayer?.name || 'Chien-Loup'}) choisit-il pour le reste de la partie ?
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => onChienLoupAction('villageois')}
                className={`p-3 rounded-xl border text-center text-xs transition-all cursor-pointer ${
                  currentChoice === 'villageois'
                    ? 'bg-[#1b4d27] border-[#0f3017] text-[#f2faf3] font-bold shadow-sm ring-1 ring-[#0f3017]'
                    : 'bg-[#f8f3e7] border-[#d8c6aa] text-[#362719] hover:bg-[#f3ebd9]'
                }`}
              >
                <div className="font-bold text-sm">🛡️ Villageois</div>
                <div className={`text-[10px] mt-1 ${currentChoice === 'villageois' ? 'text-[#b8deb9]' : 'text-[#78644e]'}`}>
                  Fidèle au Village
                </div>
              </button>

              <button
                type="button"
                onClick={() => onChienLoupAction('loup_garou')}
                className={`p-3 rounded-xl border text-center text-xs transition-all cursor-pointer ${
                  currentChoice === 'loup_garou'
                    ? 'bg-[#7a1818] border-[#4a0b0b] text-[#fdf4f4] font-bold shadow-sm ring-1 ring-[#4a0b0b]'
                    : 'bg-[#f8f3e7] border-[#d8c6aa] text-[#362719] hover:bg-[#f3ebd9]'
                }`}
              >
                <div className="font-bold text-sm">🐺 Loup-Garou</div>
                <div className={`text-[10px] mt-1 ${currentChoice === 'loup_garou' ? 'text-[#f5c6c6]' : 'text-[#78644e]'}`}>
                  Rejoint la Meute
                </div>
              </button>
            </div>

            {state.chienLoupActionDone && (
              <div className="p-3 rounded-xl bg-[#edf5ee] border border-[#a7cca9] text-xs text-[#1d592b] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#256c35] shrink-0" />
                <span>
                  Allégeance enregistrée :{' '}
                  <strong>
                    {currentChoice === 'loup_garou' ? 'Camp des Loups-Garous' : 'Camp des Villageois'}
                  </strong>
                </span>
              </div>
            )}
          </div>
        );
      }

      case 'enfant_sauvage': {
        const esPlayer = alivePlayers.find(p => p.currentRole === 'enfant_sauvage');
        const availableModels = alivePlayers.filter(p => p.id !== esPlayer?.id);

        return (
          <div className="space-y-4 bg-[#fcf9f2] border border-[#d8c5aa] rounded-2xl p-4 shadow-sm">
            <div className="text-xs text-[#433120] font-semibold">
              Sélectionnez le modèle secret de l'Enfant Sauvage ({esPlayer?.name || 'Enfant Sauvage'}) :
            </div>
            <p className="text-[11px] text-[#6b553e] leading-relaxed">
              Tant que ce modèle est en vie, l'Enfant Sauvage est un Villageois. Dès que ce modèle meurt, il se transforme en Loup-Garou !
            </p>

            <div className="grid grid-cols-2 gap-2">
              {availableModels.map(p => {
                const isSelected =
                  nightTargets.enfantSauvageModelId === p.id ||
                  state.enfantSauvageState?.modelPlayerId === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => onEnfantSauvageAction(p.id)}
                    className={`p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#284a23] border-[#162b13] text-[#f2faf0] font-bold shadow-sm ring-1 ring-[#162b13]'
                        : 'bg-[#f8f3e7] border-[#d8c6aa] text-[#362719] hover:bg-[#f3ebd9]'
                    }`}
                  >
                    <div className="font-semibold truncate">{p.name}</div>
                    <div className={`text-[10px] ${isSelected ? 'text-[#bce0b6]' : 'text-[#78644e]'}`}>
                      Siège {p.seatNumber}
                    </div>
                  </button>
                );
              })}
            </div>

            {state.enfantSauvageActionDone && (
              <div className="p-3 rounded-xl bg-[#edf5ee] border border-[#a7cca9] text-xs text-[#1d592b] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#256c35] shrink-0" />
                <span>Modèle secret enregistré pour toute la partie.</span>
              </div>
            )}
          </div>
        );
      }

      case 'insomniaque': {
        const insPlayer = alivePlayers.find(p => p.currentRole === 'insomniaque');
        const lastBlockedId = state.insomniaqueState?.lastBlockedId;

        return (
          <div className="space-y-4 bg-[#fcf9f2] border border-[#d8c5aa] rounded-2xl p-4 shadow-sm">
            <div className="text-xs text-[#433120] font-semibold">
              Sélectionnez le joueur que l'Insomniaque visite cette nuit pour bloquer son pouvoir :
            </div>
            <p className="text-[11px] text-[#6b553e] leading-relaxed">
              Le joueur visité ne pourra pas activer son pouvoir nocturne cette nuit. L'Insomniaque doit obligatoirement changer de cible chaque nuit.
            </p>

            <div className="grid grid-cols-2 gap-2">
              {alivePlayers
                .filter(p => p.id !== insPlayer?.id)
                .map(p => {
                  const isSelected = nightTargets.insomniaqueTargetId === p.id;
                  const isForbidden = p.id === lastBlockedId;

                  return (
                    <button
                      key={p.id}
                      type="button"
                      disabled={isForbidden}
                      onClick={() =>
                        onUpdateNightTargets({
                          insomniaqueTargetId: isSelected ? null : p.id,
                        })
                      }
                      className={`p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#1a3c54] border-[#0d2230] text-[#f0f7fc] font-bold shadow-sm ring-1 ring-[#0d2230]'
                          : isForbidden
                          ? 'bg-[#f0e8d9]/50 border-[#dfd0bb] text-[#9f8d77] opacity-60 cursor-not-allowed'
                          : 'bg-[#f8f3e7] border-[#d8c6aa] text-[#362719] hover:bg-[#f3ebd9]'
                      }`}
                    >
                      <div className="font-semibold truncate">{p.name}</div>
                      <div className={`text-[10px] ${isSelected ? 'text-[#aed3eb]' : 'text-[#78644e]'}`}>
                        {isForbidden ? 'Visité hier (Interdit)' : `Siège ${p.seatNumber}`}
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>
        );
      }

      case 'corbeau': {
        return (
          <div className="space-y-4 bg-[#fcf9f2] border border-[#d8c5aa] rounded-2xl p-4 shadow-sm">
            <div className="text-xs text-[#433120] font-semibold">
              Sélectionnez le suspect désigné par le Corbeau (+2 votes d'office demain matin) :
            </div>

            <div className="grid grid-cols-2 gap-2">
              {alivePlayers.map(p => {
                const isSelected = nightTargets.corbeauTargetId === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setCorbeauPassed(false);
                      onUpdateNightTargets({
                        corbeauTargetId: isSelected ? null : p.id,
                      });
                    }}
                    className={`p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#25254d] border-[#14142b] text-[#f2f2fa] font-bold shadow-sm ring-1 ring-[#14142b]'
                        : 'bg-[#f8f3e7] border-[#d8c6aa] text-[#362719] hover:bg-[#f3ebd9]'
                    }`}
                  >
                    <div className="font-semibold truncate">{p.name}</div>
                    <div className={`text-[10px] ${isSelected ? 'text-[#c2c2eb]' : 'text-[#78644e]'}`}>
                      Siège {p.seatNumber}
                    </div>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => {
                setCorbeauPassed(true);
                onUpdateNightTargets({ corbeauTargetId: null });
              }}
              className={`w-full py-2.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                corbeauPassed && !nightTargets.corbeauTargetId
                  ? 'bg-[#25254d] border-[#14142b] text-[#f2f2fa] font-bold shadow-xs'
                  : 'bg-[#eee4cf] border-[#cdbda0] text-[#54402e] hover:bg-[#e4d7bf]'
              }`}
            >
              Ne maudire personne cette nuit (Passer)
            </button>
          </div>
        );
      }

      case 'necromancien': {
        const deadPlayers = players.filter(p => !p.isAlive);
        const canRevive = state.necromancienState?.hasRevivePower !== false;

        return (
          <div className="space-y-4 bg-[#fcf9f2] border border-[#d8c5aa] rounded-2xl p-4 shadow-sm">
            <div className="text-xs text-[#433120] font-semibold">
              Pouvoir du Nécromancien auprès des âmes défuntes ({deadPlayers.length} mort(s)) :
            </div>

            {deadPlayers.length === 0 ? (
              <p className="text-xs text-[#6b553e] italic">
                Aucun joueur n'est encore mort. Vous pouvez passer cette étape.
              </p>
            ) : (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <div className="text-[11px] font-bold text-[#4a1d78]">
                    1. Communiquer avec un mort (Voir son rôle / interroger son esprit) :
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {deadPlayers.map(p => {
                      const isSelected = nightTargets.necromancienCommunicatedDeadId === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setNecromancienPassed(false);
                            onUpdateNightTargets({
                              necromancienCommunicatedDeadId: p.id,
                            });
                            setRevealedCardPlayerId(p.id);
                          }}
                          className={`p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[#4a1d78] border-[#2b0f47] text-[#f7f0fc] font-bold shadow-sm'
                              : 'bg-[#f8f3e7] border-[#d8c6aa] text-[#362719] hover:bg-[#f3ebd9]'
                          }`}
                        >
                          <div className="font-semibold truncate">{p.name}</div>
                          <div className={`text-[10px] ${isSelected ? 'text-[#dfc2fa]' : 'text-[#78644e]'}`}>
                            {ROLE_DEFINITIONS[p.currentRole].name}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-[#e2d3bd]">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#1d592b]">
                      2. Réanimer une âme défunte (1 fois par partie) :
                    </span>
                    <span className="text-[10px] font-semibold text-[#5c4936]">
                      {canRevive ? 'Disponible' : 'Déjà utilisé'}
                    </span>
                  </div>

                  {canRevive ? (
                    <div className="grid grid-cols-2 gap-2">
                      {deadPlayers.map(p => {
                        const isRevived = nightTargets.necromancienRevivedId === p.id;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              setNecromancienPassed(false);
                              onUpdateNightTargets({
                                necromancienRevivedId: isRevived ? null : p.id,
                              });
                            }}
                            className={`p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                              isRevived
                                ? 'bg-[#1b4d27] border-[#0f3017] text-[#f2faf3] font-bold shadow-sm'
                                : 'bg-[#edf5ee] border-[#a7cca9] text-[#1d592b] hover:bg-[#dfeee1]'
                            }`}
                          >
                            <div className="font-semibold truncate">✨ {p.name}</div>
                            <div className={`text-[10px] ${isRevived ? 'text-[#b8deb9]' : 'text-[#396e45]'}`}>
                              {isRevived ? 'Sera réanimé(e) !' : 'Toucher pour réanimer'}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-[11px] text-[#78644e] italic">
                      Le pouvoir de résurrection a déjà été utilisé lors d'une nuit précédente.
                    </p>
                  )}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setNecromancienPassed(true);
                onUpdateNightTargets({
                  necromancienCommunicatedDeadId: null,
                  necromancienRevivedId: null,
                });
              }}
              className={`w-full py-2.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                necromancienPassed &&
                !nightTargets.necromancienCommunicatedDeadId &&
                !nightTargets.necromancienRevivedId
                  ? 'bg-[#4a1d78] border-[#2b0f47] text-[#f7f0fc] font-bold shadow-xs'
                  : 'bg-[#eee4cf] border-[#cdbda0] text-[#54402e] hover:bg-[#e4d7bf]'
              }`}
            >
              Passer sans utiliser la nécromancie cette nuit
            </button>
          </div>
        );
      }

      case 'infect_pere_des_loups': {
        const wolfVictim = alivePlayers.find(p => p.id === nightTargets.werewolfTargetId);
        const isInfected = nightTargets.infectUsedThisNight === true;

        return (
          <div className="space-y-4 bg-[#fcf9f2] border border-[#d8c5aa] rounded-2xl p-4 shadow-sm">
            <div className="p-3 rounded-xl bg-[#faecea] border border-[#dea299] text-xs">
              <span className="text-[#6d3e38] font-medium">Victime désignée par les Loups-Garous :</span>
              <div className="font-bold text-[#871c1c] text-sm mt-0.5">
                {wolfVictim ? `${wolfVictim.name} (Siège ${wolfVictim.seatNumber})` : 'Aucune victime désignée'}
              </div>
            </div>

            {wolfVictim ? (
              <div className="space-y-2.5">
                <div className="text-xs text-[#433120] font-semibold">
                  L'Infect Père des Loups souhaite-t-il utiliser son unique infection de la partie ?
                </div>

                <button
                  type="button"
                  onClick={() => onUpdateNightTargets({ infectUsedThisNight: !isInfected })}
                  className={`w-full py-3 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    isInfected
                      ? 'bg-[#611010] border-[#380707] text-[#fff5f5] shadow-md ring-1 ring-[#380707]'
                      : 'bg-[#faecea] border-[#dea299] text-[#871c1c] hover:bg-[#f4d8d3]'
                  }`}
                >
                  <Skull className="w-4 h-4" />
                  <span>
                    {isInfected
                      ? `🩸 Infection activée : ${wolfVictim.name} devient Loup-Garou !`
                      : `Infecter ${wolfVictim.name} (Transformer en Loup-Garou)`}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => onUpdateNightTargets({ infectUsedThisNight: false })}
                  className={`w-full py-2.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                    !isInfected
                      ? 'bg-[#3b342e] border-[#201c18] text-[#fdfbf7] font-bold'
                      : 'bg-[#eee4cf] border-[#cdbda0] text-[#54402e] hover:bg-[#e4d7bf]'
                  }`}
                >
                  Ne pas infecter cette nuit (Conserver le pouvoir)
                </button>
              </div>
            ) : (
              <p className="text-xs text-[#6b553e] italic">
                Aucune victime n'a été désignée par les loups cette nuit.
              </p>
            )}
          </div>
        );
      }

      default:
        return null;
    }
  };

  const targetPlayerForSecretModal = revealedCardPlayerId
    ? players.find(p => p.id === revealedCardPlayerId)
    : null;

  return (
    <div className="w-full max-w-md mx-auto p-4 space-y-5 pb-28">
      {/* Fullscreen Animated Turn Transition Banner */}
      <TurnTransition
        transitionKey={`${round}-${nightStepIndex}-${currentStep.id}`}
        title={currentStep.title}
        subTitle={currentStep.subTitle}
        roleId={currentStep.roleId}
        type="night"
      />

      {/* Night Step Progress Bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-[#634e3b]">
          <span>
            Étape {nightStepIndex + 1} sur {activeNightSteps.length}
          </span>
          <span className="font-display text-[#824716] font-bold">
            Nuit {round}
          </span>
        </div>
        <div className="w-full h-2 bg-[#eae0cb] rounded-full overflow-hidden border border-[#d2c0a4]">
          <div
            className="h-full bg-[#824716] rounded-full transition-all duration-300"
            style={{ width: `${((nightStepIndex + 1) / activeNightSteps.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Role Header Banner */}
      <div className={`p-4 rounded-2xl border ${roleDef.colorScheme.bg} ${roleDef.colorScheme.border} flex items-center justify-between gap-3 shadow-xs`}>
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center border ${roleDef.colorScheme.badgeBg} ${roleDef.colorScheme.border} ${roleDef.colorScheme.text}`}>
            <RoleIcon roleId={currentStep.roleId} className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-display font-bold text-lg text-[#22160c]">
              {currentStep.title}
            </h1>
            <p className="text-xs text-[#614e3b]">{currentStep.subTitle}</p>
          </div>
        </div>
      </div>

      {/* Moderator Spoken Speech Box with Voice TTS Narration player */}
      <div className="p-4 rounded-2xl bg-[#fcf9f2] border border-[#d8c5aa] shadow-xs space-y-2.5">
        <blockquote className="font-serif italic text-sm text-[#2f1f12] border-l-3 border-[#824716] pl-3 leading-relaxed">
          « {currentStep.speech || roleDef.moderatorSpeech} »
        </blockquote>

        {currentStep.roleId && narration.getRoleWakeUpSrc(currentStep.roleId) && (
          <div className="pt-2 border-t border-[#ebdcc7] flex items-center justify-between">
            <button
              type="button"
              onClick={handleTogglePlayVoice}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isPlayingVoice
                  ? 'bg-[#824716] text-[#fffdf8] shadow-sm active:scale-95'
                  : 'bg-[#eee4cf] hover:bg-[#e4d7bf] text-[#4d3826] border border-[#d2c0a4]'
              }`}
            >
              {isPlayingVoice ? (
                <>
                  <VolumeX className="w-3.5 h-3.5 animate-pulse text-[#ffd799]" />
                  <span>Arrêter la voix</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-[#824716]" />
                  <span>Écouter la voix du narrateur</span>
                </>
              )}
            </button>
            <span className="text-[10px] text-[#78614c] font-medium italic">Narration vocale TTS</span>
          </div>
        )}
      </div>

      {/* Moderator Guidance Note */}
      {currentStep.noteForModerator && (
        <div className="text-[11px] text-[#55402e] bg-[#f8f3e7] p-3 rounded-xl border border-[#d8c6aa] leading-relaxed">
          <strong className="text-[#2c1d10]">Guide :</strong> {currentStep.noteForModerator}
        </div>
      )}

      {/* Role-specific Interaction Form */}
      {renderRoleInteraction()}

      {/* Secret Card Popup Modal (Voyante / Voleur) */}
      {targetPlayerForSecretModal && (
        <div className="fixed inset-0 bg-[#20140a]/65 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#fcf9f2] border-2 border-[#bfa686] rounded-3xl p-6 text-center space-y-4 shadow-2xl animate-in zoom-in-95">
            <div>
              <span className="inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest text-[#7a644f] bg-[#fffdfa]/65 border border-[#d8c5aa] font-display shadow-2xs">
                Révélation Secrète
              </span>
              <h2 className="font-display text-xl font-extrabold text-[#22160c] mt-2">
                {targetPlayerForSecretModal.name}
              </h2>
            </div>

            {getRoleCustomIcon(targetPlayerForSecretModal.currentRole) ? (
              <div className="w-44 h-44 mx-auto flex items-center justify-center select-none py-1">
                <img
                  src={getRoleCustomIcon(targetPlayerForSecretModal.currentRole)!}
                  alt={ROLE_DEFINITIONS[targetPlayerForSecretModal.currentRole].name}
                  className="w-full h-full object-contain drop-shadow-md select-none"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-[#edf3f6] border border-[#9fc1d1] flex items-center justify-center text-[#18485e]">
                  <RoleIcon roleId={targetPlayerForSecretModal.currentRole} className="w-8 h-8" />
                </div>
                <div className="font-display font-bold text-base text-[#18485e]">
                  {ROLE_DEFINITIONS[targetPlayerForSecretModal.currentRole].name}
                </div>
              </div>
            )}

            <p className="text-xs text-[#55402e] bg-[#f8f3e7] p-3 rounded-xl border border-[#d8c6aa] leading-relaxed">
              {ROLE_DEFINITIONS[targetPlayerForSecretModal.currentRole].shortPower}
            </p>

            <button
              type="button"
              onClick={() => setRevealedCardPlayerId(null)}
              className="w-full h-11 rounded-xl bg-[#eee3cf] hover:bg-[#e4d5bf] text-[#2c1d10] text-xs font-bold flex items-center justify-center gap-2 border border-[#cdbc9f] cursor-pointer"
            >
              <EyeOff className="w-4 h-4 text-[#6e5844]" />
              <span>Masquer immédiatement la carte</span>
            </button>
          </div>
        </div>
      )}

      {/* Floating Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#f5efe3] via-[#f5efe3]/95 to-transparent z-20">
        <div className="max-w-md mx-auto flex items-center gap-3">
          {nightStepIndex > 0 && (
            <button
              type="button"
              onClick={onPrevStep}
              className="h-12 px-4 rounded-xl bg-[#eee3cf] hover:bg-[#e4d5bf] border border-[#cdbc9f] text-[#3d2b1b] text-xs font-bold cursor-pointer"
            >
              Précédent
            </button>
          )}

          {isLastStep ? (
            <button
              type="button"
              onClick={canProceed ? handleSafeResolveNight : undefined}
              disabled={!canProceed || isResolving}
              className={`flex-1 h-12 rounded-xl font-bold text-sm flex items-center justify-center gap-2 border transition-all ${
                canProceed && !isResolving
                  ? 'bg-[#824716] hover:bg-[#6c390f] text-[#fffdf8] border-[#542a06] shadow-md shadow-[#824716]/25 cursor-pointer'
                  : 'bg-[#e5d9c2]/70 border-[#cfbe9f] text-[#8e7a63] cursor-not-allowed opacity-60'
              }`}
            >
              <Moon className="w-4 h-4" />
              <span>{isResolving ? 'Résolution en cours...' : 'Calculer et Résoudre la Nuit'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={canProceed ? onNextStep : undefined}
              disabled={!canProceed}
              className={`flex-1 h-12 rounded-xl font-bold text-sm flex items-center justify-center gap-2 border transition-all ${
                canProceed
                  ? 'bg-[#824716] hover:bg-[#6c390f] text-[#fffdf8] border-[#542a06] shadow-md shadow-[#824716]/25 cursor-pointer'
                  : 'bg-[#e5d9c2]/70 border-[#cfbe9f] text-[#8e7a63] cursor-not-allowed opacity-60'
              }`}
            >
              {!canProceed && <Lock className="w-3.5 h-3.5" />}
              <span>Étape suivante</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
