/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  GameState,
  NightTargets,
  Player,
  RoleId,
  WinResult,
} from './types/game';
import { getDefaultRoleConfig, ROLE_DEFINITIONS } from './data/roles';
import {
  createEmptyNightTargets,
  eliminatePlayerByVote,
  executeChasseurShot,
  getNightStepsForRound,
  isWerewolfRole,
  resolveNightActions,
  checkVictoryConditions,
  validateRenardSelection,
} from './engine/gameEngine';
import { Header } from './components/Header';
import { LobbyConfigView } from './components/LobbyConfigView';
import { PassAndPlayView } from './components/PassAndPlayView';
import { RosterReadyView } from './components/RosterReadyView';
import { NightPhaseView } from './components/NightPhaseView';
import { NightResolutionView } from './components/NightResolutionView';
import { VillageWakeUpView } from './components/VillageWakeUpView';
import { DayVoteView } from './components/DayVoteView';
import { DayResolutionView } from './components/DayResolutionView';
import { ChasseurShotView } from './components/ChasseurShotView';
import { GameOverView } from './components/GameOverView';
import { ModeratorDrawer } from './components/ModeratorDrawer';
import { RulesModal } from './components/RulesModal';
import { ResetConfirmModal } from './components/ResetConfirmModal';
import { TurnTransition } from './components/TurnTransition';
import { soundFX } from './utils/audio';
import { narration } from './utils/narrationAudio';
import { assetPreloader, PreloadProgress } from './utils/assetPreloader';
import { InitialLoadingScreen } from './components/InitialLoadingScreen';

const STORAGE_KEY = 'sekou_gaming_loup_garou_v2';

export interface LoupGarouAppProps {
  onBackToHub?: () => void;
}

export default function LoupGarouApp({ onBackToHub }: LoupGarouAppProps = {}) {
  // Initialize state with default configuration or localStorage
  const [gameState, setGameState] = useState<GameState>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          // fallback
        }
      }
    }

    const defaultPlayers = 8;
    return {
      phase: 'lobby_config',
      round: 1,
      totalPlayers: defaultPlayers,
      roleConfig: getDefaultRoleConfig(defaultPlayers),
      players: [],
      currentPassPlayerIndex: 0,
      nightStepIndex: 0,
      activeNightSteps: [],
      nightTargets: createEmptyNightTargets(),
      lastNightResolution: null,
      lastVoteResolution: null,
      sorciereState: { hasLifePotion: true, hasDeathPotion: true },
      salvateurState: { lastProtectedId: null },
      grandMechantLoupState: { isPowerLost: false },
      renardState: { hasPower: true },
      infectState: { hasInfected: false },
      ancienState: { hasSurvivedFirstWolfAttack: false, villagePowersLost: false },
      enfantSauvageState: { modelPlayerId: null, actionDone: false },
      idiotState: { isRevealedAndGraced: false },
      necromancienState: { hasUsedRevive: false },
      insomniaqueState: { lastBlockedId: null },
      chienLoupActionDone: false,
      thiefActionDone: false,
      cupidonActionDone: false,
      pendingChasseurShot: null,
      winner: null,
      gameLog: [],
    };
  });

  // UI Modals
  const [isModeratorPanelOpen, setIsModeratorPanelOpen] = useState(false);
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Initial Resource Preloading (13 Icons + 23 Voice Audio files)
  const [preloadProgress, setPreloadProgress] = useState<PreloadProgress>(() => assetPreloader.progress);
  const [isPreloadComplete, setIsPreloadComplete] = useState<boolean>(() => assetPreloader.isReady());

  useEffect(() => {
    const unsubscribe = assetPreloader.subscribe(progress => {
      setPreloadProgress(progress);
      if (progress.isComplete) {
        setIsPreloadComplete(true);
      }
    });

    if (!assetPreloader.isReady()) {
      assetPreloader.start();
    }

    return () => unsubscribe();
  }, []);

  const handleRetryPreload = () => {
    assetPreloader.start(true);
  };

  const handleSkipPreload = () => {
    setIsPreloadComplete(true);
  };

  // Auto-save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(gameState));
    } catch {
      // quota or private mode
    }
  }, [gameState]);

  // Audio mute toggle
  const handleToggleSound = () => {
    const nextVal = !soundEnabled;
    setSoundEnabled(nextVal);
    soundFX.enabled = nextVal;
    narration.enabled = nextVal;
    if (!nextVal) {
      narration.stop();
    }
  };

  // Fisher-Yates shuffle
  const shuffle = <T,>(arr: T[]): T[] => {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  // 1. Start Distribution from Lobby
  const handleStartDistribution = () => {
    const { roleConfig, totalPlayers } = gameState;

    // Build the pool of roles
    const rolePool: RoleId[] = [];
    Object.entries(roleConfig).forEach(([roleId, count]) => {
      for (let i = 0; i < count; i++) {
        rolePool.push(roleId as RoleId);
      }
    });

    const shuffledRoles = shuffle(rolePool);

    // Initialize players placeholder
    const initialPlayers: Player[] = shuffledRoles.map((role, idx) => ({
      id: `p-${idx + 1}-${Date.now()}`,
      name: `Joueur ${idx + 1}`,
      seatNumber: idx + 1,
      currentRole: role,
      initialRole: role,
      roleHistory: [
        {
          role,
          round: 1,
          phase: 'distribution',
          note: 'Attribution initiale secrète',
        },
      ],
      isAlive: true,
      deathReason: null,
      deathRound: null,
      deathPhase: null,
      deathIndirectBy: null,
      isProtected: false,
      isOiled: false,
      isLover: false,
      loverPartnerId: null,
      hasLostVoteRight: false,
      isInfected: false,
    }));

    setGameState(prev => ({
      ...prev,
      players: initialPlayers,
      currentPassPlayerIndex: 0,
      phase: 'pass_and_play',
    }));
  };

  // 2. Pass and play confirm individual player
  const handleConfirmPassPlayer = (name: string) => {
    const nextIndex = gameState.currentPassPlayerIndex + 1;
    const updatedPlayers = gameState.players.map((p, idx) => {
      if (idx === gameState.currentPassPlayerIndex) {
        return { ...p, name };
      }
      return p;
    });

    if (nextIndex >= gameState.totalPlayers) {
      // All players registered!
      setGameState(prev => ({
        ...prev,
        players: updatedPlayers,
        phase: 'roster_ready',
      }));
    } else {
      setGameState(prev => ({
        ...prev,
        players: updatedPlayers,
        currentPassPlayerIndex: nextIndex,
      }));
    }
  };

  // 3. Launch Night 1 from Roster Ready
  const handleStartNight1 = () => {
    const firstNightState: GameState = {
      ...gameState,
      round: 1,
      nightStepIndex: 0,
      nightTargets: createEmptyNightTargets(),
      phase: 'night',
    };

    const steps = getNightStepsForRound(firstNightState);

    narration.playVillageSleeps();

    setGameState({
      ...firstNightState,
      activeNightSteps: steps,
    });
  };

  // 4. Update night targets
  const handleUpdateNightTargets = (targets: Partial<NightTargets>) => {
    setGameState(prev => ({
      ...prev,
      nightTargets: {
        ...prev.nightTargets,
        ...targets,
      },
    }));
  };

  // 4b. Thief Action
  const handleThiefAction = (targetPlayerId: string) => {
    const target = gameState.players.find(p => p.id === targetPlayerId);
    const thief = gameState.players.find(p => p.currentRole === 'voleur');
    if (!target || !thief) return;

    const stolenRole = target.currentRole;

    const updatedPlayers = gameState.players.map(p => {
      if (p.id === target.id) {
        return {
          ...p,
          currentRole: 'villageois' as RoleId,
          roleHistory: [
            ...p.roleHistory,
            {
              role: 'villageois' as RoleId,
              round: gameState.round,
              phase: 'night',
              note: `Rôle (${ROLE_DEFINITIONS[stolenRole].name}) dérobé par le Voleur. Devient Simple Villageois.`,
            },
          ],
        };
      }
      if (p.id === thief.id) {
        return {
          ...p,
          currentRole: stolenRole,
          roleHistory: [
            ...p.roleHistory,
            {
              role: stolenRole,
              round: gameState.round,
              phase: 'night',
              note: `A dérobé le rôle de ${target.name} (${ROLE_DEFINITIONS[stolenRole].name}).`,
            },
          ],
        };
      }
      return p;
    });

    setGameState(prev => ({
      ...prev,
      players: updatedPlayers,
      thiefActionDone: true,
    }));
  };

  // 4c. Cupidon Action
  const handleCupidonAction = (lover1Id: string, lover2Id: string) => {
    const updatedPlayers = gameState.players.map(p => {
      if (p.id === lover1Id) {
        return { ...p, isLover: true, loverPartnerId: lover2Id };
      }
      if (p.id === lover2Id) {
        return { ...p, isLover: true, loverPartnerId: lover1Id };
      }
      return p;
    });

    setGameState(prev => ({
      ...prev,
      players: updatedPlayers,
      cupidonActionDone: true,
    }));
  };

  // 4c-bis. Chien-Loup Action (Nuit 1)
  const handleChienLoupAction = (choice: 'villageois' | 'loup_garou') => {
    const updatedPlayers = gameState.players.map(p => {
      if (p.currentRole === 'chien_loup') {
        return {
          ...p,
          currentRole: choice as RoleId,
          roleHistory: [
            ...p.roleHistory,
            {
              role: choice as RoleId,
              round: gameState.round,
              phase: 'night',
              note:
                choice === 'loup_garou'
                  ? 'Le Chien-Loup a choisi de rejoindre la meute des Loups-Garous.'
                  : 'Le Chien-Loup a choisi de rester un fidèle Villageois.',
            },
          ],
        };
      }
      return p;
    });

    setGameState(prev => ({
      ...prev,
      players: updatedPlayers,
      chienLoupActionDone: true,
      nightTargets: {
        ...prev.nightTargets,
        chienLoupChoice: choice,
      },
    }));
  };

  // 4c-ter. Enfant Sauvage Action (Nuit 1)
  const handleEnfantSauvageAction = (modelPlayerId: string) => {
    const model = gameState.players.find(p => p.id === modelPlayerId);
    const updatedPlayers = gameState.players.map(p => {
      if (p.currentRole === 'enfant_sauvage' && model) {
        return {
          ...p,
          roleHistory: [
            ...p.roleHistory,
            {
              role: 'enfant_sauvage' as RoleId,
              round: gameState.round,
              phase: 'night',
              note: `A choisi ${model.name} comme modèle. Deviendra Loup-Garou si ${model.name} meurt.`,
            },
          ],
        };
      }
      return p;
    });

    setGameState(prev => ({
      ...prev,
      players: updatedPlayers,
      enfantSauvageState: {
        modelPlayerId,
        actionDone: true,
      },
      nightTargets: {
        ...prev.nightTargets,
        enfantSauvageModelId: modelPlayerId,
      },
    }));
  };

  // 4d. Renard Action
  const handleRenardAction = (centerId: string, leftId: string, rightId: string) => {
    const validation = validateRenardSelection(centerId, leftId, rightId);
    if (!validation.isValid) {
      console.warn('Action Renard rejetée :', validation.error);
      return;
    }

    const checked = [centerId, leftId, rightId]
      .map(id => gameState.players.find(p => p.id === id))
      .filter((p): p is Player => Boolean(p));

    const hasWolf = checked.some(p => isWerewolfRole(p.currentRole));

    // Sentence vocale automatique du résultat du flair du Renard
    narration.playRenardResult(hasWolf);

    // Update renard state
    const renardPlayer = gameState.players.find(p => p.currentRole === 'renard');
    let updatedPlayers = gameState.players;

    if (!hasWolf && renardPlayer) {
      updatedPlayers = gameState.players.map(p => {
        if (p.id === renardPlayer.id) {
          return {
            ...p,
            currentRole: 'villageois' as RoleId,
            roleHistory: [
              ...p.roleHistory,
              {
                role: 'villageois' as RoleId,
                round: gameState.round,
                phase: 'night',
                note: 'Flair infructueux. A perdu son pouvoir et devient Simple Villageois.',
              },
            ],
          };
        }
        return p;
      });
    }

    setGameState(prev => ({
      ...prev,
      players: updatedPlayers,
      renardState: {
        hasPower: hasWolf,
      },
      nightTargets: {
        ...prev.nightTargets,
        renardCheckedIds: [centerId, leftId, rightId],
        renardResultHasWolf: hasWolf,
      },
    }));
  };

  // 4e. Night Steps Navigation
  const handleNextNightStep = () => {
    setGameState(prev => ({
      ...prev,
      nightStepIndex: Math.min(prev.activeNightSteps.length - 1, prev.nightStepIndex + 1),
    }));
  };

  const handlePrevNightStep = () => {
    setGameState(prev => ({
      ...prev,
      nightStepIndex: Math.max(0, prev.nightStepIndex - 1),
    }));
  };

  // 5. Resolve Night Actions
  const handleResolveNight = () => {
    if (gameState.phase !== 'night') {
      return;
    }

    const { nextState } = resolveNightActions(gameState);
    const win = checkVictoryConditions(nextState.players);

    // Keep winner in state if won, but ALWAYS proceed to night_resolution so the moderator
    // and village see who died and what happened!
    setGameState({
      ...nextState,
      winner: win,
      phase: 'night_resolution',
    });
  };

  // 6. Day Wake Up Announcement
  const handleProceedToDayWake = () => {
    setGameState(prev => ({
      ...prev,
      phase: 'day_wake',
    }));
  };

  // 7. Proceed to Day Vote or Victory Epilogue
  const handleProceedToVote = () => {
    if (gameState.winner) {
      setGameState(prev => ({
        ...prev,
        phase: 'game_over',
      }));
    } else {
      setGameState(prev => ({
        ...prev,
        phase: 'day_vote',
      }));
    }
  };

  // 8. Confirm Elimination by Vote
  const handleConfirmVoteElimination = (eliminatedId: string | null) => {
    const { nextState } = eliminatePlayerByVote(gameState, eliminatedId);
    setGameState(nextState);
  };

  // 9. Execute Chasseur Shot
  const handleExecuteChasseurShot = (targetId: string) => {
    const nextState = executeChasseurShot(gameState, targetId);
    setGameState(nextState);
  };

  // 10. Start Next Night (Round + 1) from Day Resolution
  const handleStartNextNight = () => {
    const nextRound = gameState.round + 1;
    const nextRoundState: GameState = {
      ...gameState,
      round: nextRound,
      phase: 'night',
      nightStepIndex: 0,
      nightTargets: createEmptyNightTargets(),
      lastVoteResolution: null,
    };
    const steps = getNightStepsForRound(nextRoundState);
    narration.playVillageSleeps();
    setGameState({
      ...nextRoundState,
      activeNightSteps: steps,
    });
  };

  // 11. Proceed to Game Over from Day Resolution
  const handleProceedToGameOver = () => {
    narration.stop();
    setGameState(prev => ({
      ...prev,
      phase: 'game_over',
    }));
  };

  // Reset Game Confirmation handlers
  const handleOpenResetModal = () => {
    setIsResetModalOpen(true);
  };

  const handleConfirmReset = () => {
    setIsResetModalOpen(false);
    narration.stop();
    localStorage.removeItem(STORAGE_KEY);
    const defaultPlayers = 8;
    const freshState: GameState = {
      phase: 'lobby_config',
      round: 1,
      totalPlayers: defaultPlayers,
      roleConfig: getDefaultRoleConfig(defaultPlayers),
      players: [],
      currentPassPlayerIndex: 0,
      nightStepIndex: 0,
      activeNightSteps: [],
      nightTargets: createEmptyNightTargets(),
      lastNightResolution: null,
      lastVoteResolution: null,
      sorciereState: { hasLifePotion: true, hasDeathPotion: true },
      salvateurState: { lastProtectedId: null },
      grandMechantLoupState: { isPowerLost: false },
      renardState: { hasPower: true },
      infectState: { hasInfected: false },
      ancienState: { hasSurvivedFirstWolfAttack: false, villagePowersLost: false },
      enfantSauvageState: { modelPlayerId: null, actionDone: false },
      idiotState: { isRevealedAndGraced: false },
      necromancienState: { hasUsedRevive: false },
      insomniaqueState: { lastBlockedId: null },
      chienLoupActionDone: false,
      thiefActionDone: false,
      cupidonActionDone: false,
      pendingChasseurShot: null,
      winner: null,
      gameLog: [],
    };
    setGameState(freshState);
  };

  // Phase transition metadata for immersive grimoire transitions
  const getPhaseTransitionInfo = () => {
    switch (gameState.phase) {
      case 'night_resolution':
        return {
          title: 'Résolution de la Nuit',
          subTitle: `Nuit ${gameState.round} · Calcul des événements`,
          type: 'night' as const,
        };
      case 'day_wake':
        return {
          title: 'Le Village se Réveille',
          subTitle: `Aube du Jour ${gameState.round} · Révélation`,
          type: 'day' as const,
        };
      case 'day_vote':
        return {
          title: 'Le Conseil du Village',
          subTitle: `Jour ${gameState.round} · Débats et Vote`,
          type: 'vote' as const,
        };
      case 'day_resolution':
        return {
          title: "Bilan de l'Assemblée",
          subTitle: `Jour ${gameState.round} · Sentence Populaire`,
          type: 'vote' as const,
        };
      case 'chasseur_revenge':
        return {
          title: 'Ultime Soupir',
          subTitle: 'Le tir de vengeance du Chasseur',
          type: 'role' as const,
          roleId: 'chasseur' as const,
        };
      case 'game_over':
        return {
          title: 'Fin de la Partie',
          subTitle: 'Épilogue du Grimoire',
          type: 'generic' as const,
        };
      default:
        return null;
    }
  };

  const phaseTransition = getPhaseTransitionInfo();
  const currentPassAssignedRole = gameState.players[gameState.currentPassPlayerIndex]?.currentRole || 'villageois';

  // 0. Initial Preload Screen (before showing the main game)
  if (!isPreloadComplete) {
    return (
      <InitialLoadingScreen
        progress={preloadProgress}
        onRetry={handleRetryPreload}
        onSkip={handleSkipPreload}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#f5efe3] text-[#22160c] flex flex-col font-body selection:bg-[#824716]/20 selection:text-[#542a06]">
      {/* Fullscreen Medieval Phase Transition */}
      {phaseTransition && (
        <TurnTransition
          key={`phase-${gameState.phase}-${gameState.round}`}
          transitionKey={`phase-${gameState.phase}-${gameState.round}`}
          title={phaseTransition.title}
          subTitle={phaseTransition.subTitle}
          type={phaseTransition.type}
          roleId={phaseTransition.roleId}
        />
      )}

      {/* Top Bar Contract Header */}
      <Header
        phase={gameState.phase}
        round={gameState.round}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
        onOpenRules={() => setIsRulesModalOpen(true)}
        onOpenModeratorPanel={() => setIsModeratorPanelOpen(true)}
        onResetGame={handleOpenResetModal}
        onBackToHub={onBackToHub}
      />

      {/* Main Viewport Container */}
      <main className="flex-1 flex flex-col justify-start">
        {gameState.phase === 'lobby_config' && (
          <LobbyConfigView
            totalPlayers={gameState.totalPlayers}
            roleConfig={gameState.roleConfig}
            onTotalPlayersChange={count =>
              setGameState(prev => ({ ...prev, totalPlayers: count }))
            }
            onRoleConfigChange={config =>
              setGameState(prev => ({ ...prev, roleConfig: config }))
            }
            onStartDistribution={handleStartDistribution}
          />
        )}

        {gameState.phase === 'pass_and_play' && (
          <PassAndPlayView
            currentIndex={gameState.currentPassPlayerIndex}
            totalPlayers={gameState.totalPlayers}
            assignedRole={currentPassAssignedRole}
            defaultName={`Joueur ${gameState.currentPassPlayerIndex + 1}`}
            onConfirmPlayer={handleConfirmPassPlayer}
          />
        )}

        {gameState.phase === 'roster_ready' && (
          <RosterReadyView
            players={gameState.players}
            onStartNight={handleStartNight1}
          />
        )}

        {gameState.phase === 'night' && (
          <NightPhaseView
            state={gameState}
            onUpdateNightTargets={handleUpdateNightTargets}
            onThiefAction={handleThiefAction}
            onCupidonAction={handleCupidonAction}
            onChienLoupAction={handleChienLoupAction}
            onEnfantSauvageAction={handleEnfantSauvageAction}
            onRenardAction={handleRenardAction}
            onNextStep={handleNextNightStep}
            onPrevStep={handlePrevNightStep}
            onResolveNight={handleResolveNight}
          />
        )}

        {gameState.phase === 'night_resolution' && gameState.lastNightResolution && (
          <NightResolutionView
            round={gameState.round}
            resolution={gameState.lastNightResolution}
            onProceedToDayWake={handleProceedToDayWake}
          />
        )}

        {gameState.phase === 'day_wake' && (
          <VillageWakeUpView
            round={gameState.round}
            resolution={gameState.lastNightResolution}
            winner={gameState.winner}
            onProceedToVote={handleProceedToVote}
          />
        )}

        {gameState.phase === 'day_vote' && (
          <DayVoteView
            round={gameState.round}
            players={gameState.players}
            corbeauTargetId={gameState.lastNightResolution?.corbeauTargetedPlayerId || null}
            onConfirmElimination={handleConfirmVoteElimination}
          />
        )}

        {gameState.phase === 'day_resolution' && (
          <DayResolutionView
            round={gameState.round}
            resolution={gameState.lastVoteResolution}
            winner={gameState.winner}
            onProceedToNextNight={handleStartNextNight}
            onProceedToGameOver={handleProceedToGameOver}
          />
        )}

        {gameState.phase === 'chasseur_revenge' && gameState.pendingChasseurShot && (
          <ChasseurShotView
            hunterPlayer={
              gameState.players.find(
                p => p.id === gameState.pendingChasseurShot?.hunterPlayerId
              ) || gameState.players[0]
            }
            alivePlayers={gameState.players.filter(p => p.isAlive)}
            onConfirmShot={handleExecuteChasseurShot}
          />
        )}

        {gameState.phase === 'game_over' && (
          <GameOverView
            state={gameState}
            onRestart={handleConfirmReset}
          />
        )}
      </main>

      {/* Secret Moderator Grimoire Drawer */}
      <ModeratorDrawer
        isOpen={isModeratorPanelOpen}
        onClose={() => setIsModeratorPanelOpen(false)}
        state={gameState}
      />

      {/* Rules & Roles Modal */}
      <RulesModal
        isOpen={isRulesModalOpen}
        onClose={() => setIsRulesModalOpen(false)}
      />

      {/* Reset Confirmation Modal */}
      <ResetConfirmModal
        isOpen={isResetModalOpen}
        onConfirm={handleConfirmReset}
        onCancel={() => setIsResetModalOpen(false)}
      />
    </div>
  );
}
