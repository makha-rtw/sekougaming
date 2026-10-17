import {
  DeadAnnouncement,
  DeathReason,
  GameState,
  NightResolutionResult,
  NightStep,
  NightTargets,
  Player,
  RoleId,
  WinResult,
} from '../types/game';
import { ROLE_DEFINITIONS } from '../data/roles';

// Helper to check if a role is a Werewolf (for Renard & win count)
export function isWerewolfRole(role: RoleId): boolean {
  return role === 'loup_garou' || role === 'grand_mechant_loup' || role === 'loup_blanc';
}

// Check if any werewolf has been eliminated in the game
export function hasAnyWerewolfDied(players: Player[]): boolean {
  return players.some(p => !p.isAlive && isWerewolfRole(p.currentRole));
}

// Generate the list of active night steps based on current round and game state
export function getNightStepsForRound(state: GameState): NightStep[] {
  const steps: NightStep[] = [];
  const { round, players, sorciereState, renardState, grandMechantLoupState, thiefActionDone, cupidonActionDone } = state;

  const isPlayerAlive = (role: RoleId) => players.some(p => p.isAlive && p.currentRole === role);

  if (round === 1) {
    // 1. Voleur
    if (!thiefActionDone && isPlayerAlive('voleur')) {
      steps.push({
        id: 'voleur',
        roleId: 'voleur',
        title: 'Le Voleur',
        subTitle: 'Dérobe l\'identité d\'un villageois (Nuit 1 unique)',
        speech: ROLE_DEFINITIONS.voleur.moderatorSpeech,
        noteForModerator: 'Le Voleur choisit une cible. La cible devient Simple Villageois, le Voleur prend sa carte secrètement.',
        isFirstNightOnly: true,
      });
    }

    // 2. Cupidon
    if (!cupidonActionDone && isPlayerAlive('cupidon')) {
      steps.push({
        id: 'cupidon',
        roleId: 'cupidon',
        title: 'Cupidon',
        subTitle: 'Désigne les deux Amoureux (Nuit 1 unique)',
        speech: ROLE_DEFINITIONS.cupidon.moderatorSpeech,
        noteForModerator: 'Cupidon désigne deux joueurs qui seront liés jusqu\'à la mort.',
        isFirstNightOnly: true,
      });
    }

    // 3. Reconnaissance des Amoureux
    const loversExist = players.filter(p => p.isLover).length === 2;
    if (cupidonActionDone || loversExist) {
      steps.push({
        id: 'amoureux_reco',
        roleId: 'cupidon',
        title: 'Reconnaissance des Amoureux',
        subTitle: 'Les amoureux se réveillent et se reconnaissent',
        speech: 'Cupidon s\'est rendormi. Les deux Amoureux ouvrent discrètement les yeux et se regardent tendrement.',
        noteForModerator: 'Touchez délicatement les épaules des deux amoureux désignés pour qu\'ils ouvrent les yeux et s\'identifient.',
        isFirstNightOnly: true,
      });
    }

    // 4. Salvateur
    if (isPlayerAlive('salvateur')) {
      steps.push({
        id: 'salvateur',
        roleId: 'salvateur',
        title: 'Le Salvateur',
        subTitle: 'Protège une personne cette nuit',
        speech: ROLE_DEFINITIONS.salvateur.moderatorSpeech,
        noteForModerator: 'Le Salvateur désigne un joueur à protéger contre les attaques de cette nuit.',
      });
    }

    // 5. Voyante
    if (isPlayerAlive('voyante')) {
      steps.push({
        id: 'voyante',
        roleId: 'voyante',
        title: 'La Voyante',
        subTitle: 'Sonde l\'âme d\'un joueur',
        speech: ROLE_DEFINITIONS.voyante.moderatorSpeech,
        noteForModerator: 'La Voyante pointe un joueur du doigt. Montrez-lui discrètement son rôle dans l\'application.',
      });
    }

    // 6. Renard
    if (isPlayerAlive('renard') && renardState.hasPower) {
      steps.push({
        id: 'renard',
        roleId: 'renard',
        title: 'Le Renard',
        subTitle: 'Renifle un trio physique assis côte à côte',
        speech: ROLE_DEFINITIONS.renard.moderatorSpeech,
        noteForModerator: 'Sélectionnez la cible et ses deux voisins physiques réels autour de la table.',
      });
    }

    // 7. Loups-Garous (avec rappel Petite Fille)
    const anyWolfAlive = players.some(p => p.isAlive && isWerewolfRole(p.currentRole));
    if (anyWolfAlive) {
      steps.push({
        id: 'loups_garous',
        roleId: 'loup_garou',
        title: 'Les Loups-Garous',
        subTitle: 'Choix de la victime de la meute',
        speech: ROLE_DEFINITIONS.loup_garou.moderatorSpeech,
        noteForModerator: 'Tous les Loups-Garous se réveillent ensemble et s\'accordent sur une victime (la Petite Fille peut discrètement espionner).',
      });
    }

    // 8. Grand Méchant Loup
    const anyWolfDied = hasAnyWerewolfDied(players);
    if (isPlayerAlive('grand_mechant_loup') && !grandMechantLoupState.isPowerLost && !anyWolfDied) {
      steps.push({
        id: 'grand_mechant_loup',
        roleId: 'grand_mechant_loup',
        title: 'Le Grand Méchant Loup',
        subTitle: 'Attaque nocturne supplémentaire',
        speech: ROLE_DEFINITIONS.grand_mechant_loup.moderatorSpeech,
        noteForModerator: 'Le Grand Méchant Loup choisit une seconde victime seule tant qu\'aucun Loup n\'a été tué.',
      });
    }

    // 9. Loup Blanc (Skipped Night 1 according to spec)

    // 10. Pyromane (Night 1: must oil)
    if (isPlayerAlive('pyromane')) {
      steps.push({
        id: 'pyromane',
        roleId: 'pyromane',
        title: 'Le Pyromane',
        subTitle: 'Huile un joueur (Nuit 1)',
        speech: 'Le Pyromane se réveille et choisit une victime à arroser discrètement d\'huile inflammable.',
        noteForModerator: 'Lors de la première nuit, le Pyromane doit obligatoirement huiler une personne.',
      });
    }

    // 11. Sorcière
    if (isPlayerAlive('sorciere') && (sorciereState.hasLifePotion || sorciereState.hasDeathPotion)) {
      steps.push({
        id: 'sorciere',
        roleId: 'sorciere',
        title: 'La Sorcière',
        subTitle: 'Usage de ses potions de vie et de mort',
        speech: ROLE_DEFINITIONS.sorciere.moderatorSpeech,
        noteForModerator: 'Montrez-lui la victime de la nuit. Elle peut choisir de la sauver ou de tuer quelqu\'un d\'autre.',
      });
    }
  } else {
    // NIGHT 2 AND SUBSEQUENT NIGHTS
    // 1. Salvateur
    if (isPlayerAlive('salvateur')) {
      steps.push({
        id: 'salvateur',
        roleId: 'salvateur',
        title: 'Le Salvateur',
        subTitle: 'Protège une personne (différente de la nuit passée)',
        speech: ROLE_DEFINITIONS.salvateur.moderatorSpeech,
        noteForModerator: 'Le Salvateur désigne un joueur à protéger. La cible de la nuit dernière est interdite.',
      });
    }

    // 2. Voyante
    if (isPlayerAlive('voyante')) {
      steps.push({
        id: 'voyante',
        roleId: 'voyante',
        title: 'La Voyante',
        subTitle: 'Sonde l\'âme d\'un joueur',
        speech: ROLE_DEFINITIONS.voyante.moderatorSpeech,
        noteForModerator: 'La Voyante pointe un joueur du doigt. Montrez-lui discrètement son rôle dans l\'application.',
      });
    }

    // 3. Renard
    if (isPlayerAlive('renard') && renardState.hasPower) {
      steps.push({
        id: 'renard',
        roleId: 'renard',
        title: 'Le Renard',
        subTitle: 'Renifle un trio physique assis côte à côte',
        speech: ROLE_DEFINITIONS.renard.moderatorSpeech,
        noteForModerator: 'Le Renard renifle un trio physique. S\'il n\'y a aucun Loup, son pouvoir sera perdu.',
      });
    }

    // 4. Loups-Garous
    const anyWolfAlive = players.some(p => p.isAlive && isWerewolfRole(p.currentRole));
    if (anyWolfAlive) {
      steps.push({
        id: 'loups_garous',
        roleId: 'loup_garou',
        title: 'Les Loups-Garous',
        subTitle: 'Choix de la victime de la meute',
        speech: ROLE_DEFINITIONS.loup_garou.moderatorSpeech,
        noteForModerator: 'Les Loups-Garous se réveillent et désignent ensemble une victime.',
      });
    }

    // 5. Grand Méchant Loup
    const anyWolfDied = hasAnyWerewolfDied(players);
    if (isPlayerAlive('grand_mechant_loup') && !grandMechantLoupState.isPowerLost && !anyWolfDied) {
      steps.push({
        id: 'grand_mechant_loup',
        roleId: 'grand_mechant_loup',
        title: 'Le Grand Méchant Loup',
        subTitle: 'Attaque nocturne supplémentaire',
        speech: ROLE_DEFINITIONS.grand_mechant_loup.moderatorSpeech,
        noteForModerator: 'Attaque supplémentaire toujours disponible tant qu\'aucun Loup n\'est mort.',
      });
    }

    // 6. Loup Blanc (starts night 2, one night out of two: nights 2, 4, 6...)
    if (isPlayerAlive('loup_blanc') && round % 2 === 0) {
      steps.push({
        id: 'loup_blanc',
        roleId: 'loup_blanc',
        title: 'Le Loup Blanc',
        subTitle: 'Peut dévorer un autre Loup-Garou (nuit paire)',
        speech: ROLE_DEFINITIONS.loup_blanc.moderatorSpeech,
        noteForModerator: 'Le Loup Blanc peut éliminer un autre Loup-Garou cette nuit, ou passer son tour.',
      });
    }

    // 7. Pyromane
    if (isPlayerAlive('pyromane')) {
      steps.push({
        id: 'pyromane',
        roleId: 'pyromane',
        title: 'Le Pyromane',
        subTitle: 'Huiler un nouveau joueur OU Embraser les cibles',
        speech: ROLE_DEFINITIONS.pyromane.moderatorSpeech,
        noteForModerator: 'Le Pyromane peut soit imbiber une nouvelle cible d\'huile, soit faire brûler toutes les cibles huilées !',
      });
    }

    // 8. Sorcière
    if (isPlayerAlive('sorciere') && (sorciereState.hasLifePotion || sorciereState.hasDeathPotion)) {
      steps.push({
        id: 'sorciere',
        roleId: 'sorciere',
        title: 'La Sorcière',
        subTitle: 'Usage de ses potions de vie et de mort',
        speech: ROLE_DEFINITIONS.sorciere.moderatorSpeech,
        noteForModerator: 'Indiquez-lui la victime de la meute. Elle peut utiliser la potion de vie et/ou de mort.',
      });
    }
  }

  return steps;
}

// Deterministic Night Resolution Engine
export function resolveNightActions(state: GameState): {
  nextState: GameState;
  resolution: NightResolutionResult;
} {
  const { players, nightTargets, round, sorciereState } = state;
  const updatedPlayers: Player[] = players.map(p => ({ ...p }));
  const logs: string[] = [];
  const deaths: DeadAnnouncement[] = [];

  // Track who is protected this night
  const protectedId = nightTargets.salvateurProtectedId;
  if (protectedId) {
    const p = updatedPlayers.find(pl => pl.id === protectedId);
    if (p) {
      logs.push(`Le Salvateur a placé ${p.name} sous sa protection.`);
    }
  }

  // Set of targeted victims with their causes
  const pendingFatalAttacks: { playerId: string; reason: DeathReason; isCoveredBySalvateur: boolean }[] = [];

  // 1. Werewolves attack
  if (nightTargets.werewolfTargetId) {
    pendingFatalAttacks.push({
      playerId: nightTargets.werewolfTargetId,
      reason: 'loups_garous',
      isCoveredBySalvateur: true,
    });
  }

  // 2. Grand Méchant Loup attack
  if (nightTargets.gmlTargetId) {
    pendingFatalAttacks.push({
      playerId: nightTargets.gmlTargetId,
      reason: 'grand_mechant_loup',
      isCoveredBySalvateur: true,
    });
  }

  // 3. Loup Blanc attack
  if (nightTargets.loupBlancTargetId) {
    pendingFatalAttacks.push({
      playerId: nightTargets.loupBlancTargetId,
      reason: 'loup_blanc',
      isCoveredBySalvateur: true,
    });
  }

  // 4. Pyromane burn
  if (nightTargets.pyromaneAction === 'burn') {
    const oiledPlayers = updatedPlayers.filter(p => p.isAlive && p.isOiled);
    for (const op of oiledPlayers) {
      pendingFatalAttacks.push({
        playerId: op.id,
        reason: 'pyromane',
        isCoveredBySalvateur: true, // Salvateur protection covers burn per spec 4.14
      });
      // Oil is consumed by the blaze (survivors and victims lose the oiled state)
      op.isOiled = false;
    }
    logs.push(`Le Pyromane a allumé l'incendie sur ${oiledPlayers.length} cible(s) huilée(s). L'huile a été consumée.`);
  } else if (nightTargets.pyromaneAction === 'oil' && nightTargets.pyromaneOiledTargetId) {
    const oiled = updatedPlayers.find(p => p.id === nightTargets.pyromaneOiledTargetId);
    if (oiled) {
      oiled.isOiled = true;
      logs.push(`Le Pyromane a aspergé d'huile ${oiled.name}.`);
    }
  }

  // 5. Sorcière death potion
  // Restriction : La Sorcière ne peut utiliser qu'une seule potion à la fois par nuit
  const isLifePotionUsed = Boolean(nightTargets.sorciereSavedId);
  const effectiveDeathTargetId = isLifePotionUsed ? null : nightTargets.sorciereKilledId;

  if (effectiveDeathTargetId) {
    pendingFatalAttacks.push({
      playerId: effectiveDeathTargetId,
      reason: 'sorciere_mort',
      isCoveredBySalvateur: false, // Magic poison bypasses physical shield
    });
    logs.push(`La Sorcière a utilisé sa potion de mort.`);
  }

  // Process attacks against protections and potions
  const confirmedDeadMap = new Map<string, { reason: DeathReason; indirectBy: string | null }>();

  for (const attack of pendingFatalAttacks) {
    const target = updatedPlayers.find(p => p.id === attack.playerId);
    if (!target || !target.isAlive) continue;

    // Is protected by Salvateur?
    if (attack.isCoveredBySalvateur && target.id === protectedId) {
      logs.push(`${target.name} a été sauvé des griffes mortelles grâce au bouclier du Salvateur !`);
      continue;
    }

    // Is saved by Sorcière life potion?
    if (target.id === nightTargets.sorciereSavedId) {
      logs.push(`${target.name} a été miraculeusement ranimé par la potion de vie de la Sorcière !`);
      continue;
    }

    // Confirmed fatal attack
    if (!confirmedDeadMap.has(target.id)) {
      confirmedDeadMap.set(target.id, { reason: attack.reason, indirectBy: null });
    }
  }

  // Apply initial deaths
  for (const [deadId, info] of confirmedDeadMap.entries()) {
    const p = updatedPlayers.find(pl => pl.id === deadId);
    if (p && p.isAlive) {
      p.isAlive = false;
      p.deathReason = info.reason;
      p.deathRound = round;
      p.deathPhase = 'night';
      p.deathIndirectBy = null;

      deaths.push({
        playerId: p.id,
        playerName: p.name,
        currentRole: p.currentRole,
        initialRole: p.initialRole,
        deathReason: info.reason,
        deathIndirectBy: null,
      });

      logs.push(`${p.name} est mort(e) durant la nuit (${formatDeathReason(info.reason)}).`);
    }
  }

  // Process cascade: Lover death (chagrin d'amour)
  for (const dead of [...deaths]) {
    const p = updatedPlayers.find(pl => pl.id === dead.playerId);
    if (p && p.isLover && p.loverPartnerId) {
      const partner = updatedPlayers.find(pl => pl.id === p.loverPartnerId);
      if (partner && partner.isAlive) {
        partner.isAlive = false;
        partner.deathReason = 'amoureux';
        partner.deathRound = round;
        partner.deathPhase = 'night';
        partner.deathIndirectBy = p.name;

        deaths.push({
          playerId: partner.id,
          playerName: partner.name,
          currentRole: partner.currentRole,
          initialRole: partner.initialRole,
          deathReason: 'amoureux',
          deathIndirectBy: p.name,
        });

        logs.push(`${partner.name} est mort(e) de chagrin en découvrant la mort de son amoureux(se) ${p.name}.`);
      }
    }
  }

  // Update Sorciere potions usage (1 potion maximum per night)
  const updatedSorciereState = { ...sorciereState };
  if (isLifePotionUsed) {
    updatedSorciereState.hasLifePotion = false;
  } else if (effectiveDeathTargetId) {
    updatedSorciereState.hasDeathPotion = false;
  }

  // If Sorcière has no potions left, update role label/note if desired
  const sorcierePlayer = updatedPlayers.find(p => p.currentRole === 'sorciere');
  if (sorcierePlayer && !updatedSorciereState.hasLifePotion && !updatedSorciereState.hasDeathPotion) {
    sorcierePlayer.roleHistory.push({
      role: 'villageois',
      round,
      phase: 'night',
      note: 'A épuisé ses deux potions (devient Villageois ex-Sorcière).',
    });
  }

  // Check Grand Méchant Loup power loss (lost as soon as any wolf dies)
  const wolfDied = hasAnyWerewolfDied(updatedPlayers);
  const updatedGmlState = {
    isPowerLost: state.grandMechantLoupState.isPowerLost || wolfDied,
  };
  if (updatedGmlState.isPowerLost && !state.grandMechantLoupState.isPowerLost) {
    logs.push('Un Loup-Garou a péri : le Grand Méchant Loup perd définitivement son attaque supplémentaire.');
  }

  const resolution: NightResolutionResult = {
    deaths,
    logs,
  };

  const nightWinner = checkVictoryConditions(updatedPlayers);

  const nextState: GameState = {
    ...state,
    players: updatedPlayers,
    sorciereState: updatedSorciereState,
    salvateurState: {
      lastProtectedId: protectedId, // remember for next night
    },
    grandMechantLoupState: updatedGmlState,
    lastNightResolution: resolution,
    winner: nightWinner,
    phase: 'night_resolution',
  };

  return { nextState, resolution };
}

// Eliminate a player by day vote
export function eliminatePlayerByVote(
  state: GameState,
  eliminatedPlayerId: string | null
): { nextState: GameState; immediateAngelWin: boolean; chasseurShotNeeded: boolean; eliminatedPartnerName: string | null } {
  if (!eliminatedPlayerId) {
    // Vote tied or nobody voted out
    return {
      nextState: {
        ...state,
        phase: 'day_resolution',
        lastVoteResolution: {
          eliminatedPlayer: null,
          cascadePartner: null,
          immediateAngelWin: false,
          chasseurShotNeeded: false,
        },
      },
      immediateAngelWin: false,
      chasseurShotNeeded: false,
      eliminatedPartnerName: null,
    };
  }

  const updatedPlayers = state.players.map(p => ({ ...p }));
  const target = updatedPlayers.find(p => p.id === eliminatedPlayerId);

  if (!target || !target.isAlive) {
    return {
      nextState: state,
      immediateAngelWin: false,
      chasseurShotNeeded: false,
      eliminatedPartnerName: null,
    };
  }

  // 1. Mark target dead by vote
  target.isAlive = false;
  target.deathReason = 'vote';
  target.deathRound = state.round;
  target.deathPhase = 'day';

  // Check Priority 1: L'Ange win condition (First vote / Day 1 vote only per spec 4.10)
  if (target.currentRole === 'ange' && state.round === 1) {
    const angelWin: WinResult = {
      winner: 'ange',
      title: 'Victoire de l\'Ange !',
      subtitle: `${target.name} a accompli son dessein céleste`,
      description: 'L\'Ange a réussi à se faire éliminer par le vote du village lors du conseil ! Il remporte immédiatement et seul la victoire.',
      winningPlayerIds: [target.id],
    };

    return {
      nextState: {
        ...state,
        players: updatedPlayers,
        winner: angelWin,
        lastVoteResolution: {
          eliminatedPlayer: target,
          cascadePartner: null,
          immediateAngelWin: true,
          chasseurShotNeeded: false,
        },
        phase: 'game_over',
      },
      immediateAngelWin: true,
      chasseurShotNeeded: false,
      eliminatedPartnerName: null,
    };
  }

  // Check if Chasseur was eliminated by vote
  const isChasseur = target.currentRole === 'chasseur';

  // Check lover death
  let eliminatedPartnerName: string | null = null;
  let partnerDeadObj: Player | null = null;
  if (target.isLover && target.loverPartnerId) {
    const partner = updatedPlayers.find(p => p.id === target.loverPartnerId);
    if (partner && partner.isAlive) {
      partner.isAlive = false;
      partner.deathReason = 'amoureux';
      partner.deathRound = state.round;
      partner.deathPhase = 'day';
      partner.deathIndirectBy = target.name;
      eliminatedPartnerName = partner.name;
      partnerDeadObj = partner;
    }
  }

  // Update GML power loss if a wolf was voted out
  const wolfDied = hasAnyWerewolfDied(updatedPlayers);
  const updatedGmlState = {
    isPowerLost: state.grandMechantLoupState.isPowerLost || wolfDied,
  };

  if (isChasseur) {
    return {
      nextState: {
        ...state,
        players: updatedPlayers,
        grandMechantLoupState: updatedGmlState,
        pendingChasseurShot: { hunterPlayerId: target.id },
        lastVoteResolution: {
          eliminatedPlayer: target,
          cascadePartner: partnerDeadObj,
          immediateAngelWin: false,
          chasseurShotNeeded: true,
        },
        phase: 'chasseur_revenge',
      },
      immediateAngelWin: false,
      chasseurShotNeeded: true,
      eliminatedPartnerName,
    };
  }

  // Check victory conditions immediately
  const win = checkVictoryConditions(updatedPlayers);

  return {
    nextState: {
      ...state,
      players: updatedPlayers,
      grandMechantLoupState: updatedGmlState,
      winner: win,
      lastVoteResolution: {
        eliminatedPlayer: target,
        cascadePartner: partnerDeadObj,
        immediateAngelWin: false,
        chasseurShotNeeded: false,
      },
      phase: 'day_resolution',
    },
    immediateAngelWin: false,
    chasseurShotNeeded: false,
    eliminatedPartnerName,
  };
}

// Execute Chasseur revenge shot
export function executeChasseurShot(state: GameState, shotTargetId: string): GameState {
  const updatedPlayers = state.players.map(p => ({ ...p }));
  const target = updatedPlayers.find(p => p.id === shotTargetId);
  let loverPartnerObj: Player | null = null;

  if (target && target.isAlive) {
    target.isAlive = false;
    target.deathReason = 'chasseur';
    target.deathRound = state.round;
    target.deathPhase = 'day';

    // Cascade lover
    if (target.isLover && target.loverPartnerId) {
      const partner = updatedPlayers.find(p => p.id === target.loverPartnerId);
      if (partner && partner.isAlive) {
        partner.isAlive = false;
        partner.deathReason = 'amoureux';
        partner.deathRound = state.round;
        partner.deathPhase = 'day';
        partner.deathIndirectBy = target.name;
        loverPartnerObj = partner;
      }
    }
  }

  const wolfDied = hasAnyWerewolfDied(updatedPlayers);
  const updatedGmlState = {
    isPowerLost: state.grandMechantLoupState.isPowerLost || wolfDied,
  };

  const win = checkVictoryConditions(updatedPlayers);

  return {
    ...state,
    players: updatedPlayers,
    grandMechantLoupState: updatedGmlState,
    pendingChasseurShot: null,
    winner: win,
    lastVoteResolution: {
      ...(state.lastVoteResolution || {
        eliminatedPlayer: null,
        cascadePartner: null,
        immediateAngelWin: false,
        chasseurShotNeeded: false,
      }),
      chasseurShotVictim: target || null,
      chasseurShotLover: loverPartnerObj,
    },
    phase: 'day_resolution',
  };
}

// Check victory conditions with strict priority specified in Section 4
export function checkVictoryConditions(players: Player[]): WinResult | null {
  const alivePlayers = players.filter(p => p.isAlive);

  // PRIORITÉ 6 — Aucun survivant => égalité / aucune victoire
  if (alivePlayers.length === 0) {
    return {
      winner: 'egalite',
      title: 'Égalité tragique',
      subtitle: 'Tout le village a succombé',
      description: 'Il ne reste aucun survivant dans le village. Personne ne l\'emporte.',
      winningPlayerIds: [],
    };
  }

  // PRIORITÉ 2 — Loup Blanc seul survivant
  // Si le Loup Blanc est vivant et qu'il est le seul joueur vivant (total survivants = 1), il gagne immédiatement seul.
  if (alivePlayers.length === 1 && alivePlayers[0].currentRole === 'loup_blanc') {
    return {
      winner: 'loup_blanc',
      title: 'Victoire du Loup Blanc !',
      subtitle: `${alivePlayers[0].name} règne seul sur les ruines`,
      description: 'Le Loup Blanc a éliminé tous les autres villageois et Loups-Garous. Il est le seul et unique survivant !',
      winningPlayerIds: [alivePlayers[0].id],
    };
  }

  // PRIORITÉ 3 — Pyromane seul survivant
  // Si le Pyromane est vivant et qu'il est le seul joueur vivant après résolution (total survivants = 1), il gagne seul.
  if (alivePlayers.length === 1 && alivePlayers[0].currentRole === 'pyromane') {
    return {
      winner: 'pyromane',
      title: 'Victoire du Pyromane !',
      subtitle: `${alivePlayers[0].name} a réduit le village en cendres`,
      description: 'Le Pyromane a consumé tous les habitants par le feu. Il est le dernier rescapé de l\'incendie.',
      winningPlayerIds: [alivePlayers[0].id],
    };
  }

  // DÉFINITIONS POUR LES CALCULS (Section 2) :
  // L = nombre de survivants du camp des Loups (Loup-Garou, Grand Méchant Loup, etc.)
  // Important : Le Loup Blanc a camp === 'independant', il ne compte pas dans L.
  const wolves = alivePlayers.filter(p => ROLE_DEFINITIONS[p.currentRole].camp === 'loups_garous');

  // V = nombre de survivants du camp du Village (Simple Villageois, Voyante, Petite Fille, Renard, Sorcière, Salvateur, Chasseur, Cupidon, etc.)
  const villagers = alivePlayers.filter(p => ROLE_DEFINITIONS[p.currentRole].camp === 'villageois');

  // I = nombre de survivants indépendants (Loup Blanc, Pyromane, Ange si raté son vote, Voleur s'il reste indépendant)
  const independents = alivePlayers.filter(p => ROLE_DEFINITIONS[p.currentRole].camp === 'independant');

  const L = wolves.length;
  const V = villagers.length;
  const I = independents.length;

  // PRIORITÉ 4 — VICTOIRE DES LOUPS PAR PARITÉ OU MAJORITÉ
  // Règle recommandée : si L >= V + I, le camp des Loups gagne.
  // Autrement dit, les Loups gagnent dès qu'ils sont aussi nombreux que tous les survivants qui ne sont pas dans leur camp.
  if (L >= V + I && L > 0) {
    return {
      winner: 'loups_garous',
      title: 'Victoire des Loups-Garous !',
      subtitle: 'La meute a submergé le village',
      description: 'Le nombre de Loups-Garous a atteint ou dépassé celui des autres survivants. Le village est tombé !',
      winningPlayerIds: wolves.map(p => p.id),
    };
  }

  // PRIORITÉ 5 — VICTOIRE DU VILLAGE
  // Si L = 0, tous les membres du camp des Loups sont éliminés.
  // Règle recommandée : le Village gagne si L = 0, sauf si une victoire solo prioritaire est déjà remplie.
  // Les indépendants encore vivants ne bloquent pas automatiquement la victoire du Village.
  if (L === 0 && (V > 0 || I > 0)) {
    return {
      winner: 'villageois',
      title: 'Victoire des Villageois !',
      subtitle: 'La paix revient sur le hameau',
      description: 'Tous les Loups-Garous ont été éradiqués ! Les survivants du village peuvent enfin dormir en paix.',
      winningPlayerIds: villagers.map(p => p.id),
    };
  }

  // Aucun cas de victoire atteint -> la partie continue
  return null;
}

export function formatDeathReason(reason: DeathReason): string {
  switch (reason) {
    case 'loups_garous':
      return 'Dévoué(e) par la meute des Loups-Garous';
    case 'grand_mechant_loup':
      return 'Égorgé(e) par le Grand Méchant Loup';
    case 'loup_blanc':
      return 'Déchiqueté(e) par le Loup Blanc';
    case 'sorciere_mort':
      return 'Empoisonné(e) par la potion de mort de la Sorcière';
    case 'pyromane':
      return 'Brûlé(e) vif par l\'incendie du Pyromane';
    case 'amoureux':
      return 'Mort(e) de chagrin d\'amour';
    case 'vote':
      return 'Condamné(e) par le vote populaire du village';
    case 'chasseur':
      return 'Abattu(e) par le tir d\'ultime recours du Chasseur';
    default:
      return 'Mort mystérieuse';
  }
}

export function createEmptyNightTargets(): NightTargets {
  return {
    voleurTargetId: null,
    cupidonLover1Id: null,
    cupidonLover2Id: null,
    salvateurProtectedId: null,
    voyanteRevealedPlayerId: null,
    renardCheckedIds: null,
    renardResultHasWolf: null,
    werewolfTargetId: null,
    gmlTargetId: null,
    loupBlancTargetId: null,
    pyromaneAction: null,
    pyromaneOiledTargetId: null,
    sorciereSavedId: null,
    sorciereKilledId: null,
  };
}

// Defensive validator ensuring the 3 physical neighbors are strictly distinct
export function validateRenardSelection(
  centerId: string | null | undefined,
  leftId: string | null | undefined,
  rightId: string | null | undefined
): { isValid: boolean; error?: string } {
  if (!centerId || !leftId || !rightId) {
    return { isValid: false, error: 'Les trois joueurs doivent être sélectionnés.' };
  }
  if (centerId === leftId) {
    return { isValid: false, error: 'La cible centrale et le voisin de gauche doivent être distincts.' };
  }
  if (centerId === rightId) {
    return { isValid: false, error: 'La cible centrale et le voisin de droite doivent être distincts.' };
  }
  if (leftId === rightId) {
    return { isValid: false, error: 'Le voisin de gauche et le voisin de droite doivent être distincts.' };
  }
  return { isValid: true };
}

