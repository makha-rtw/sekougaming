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

// Helper to check if a role is a Werewolf (for Renard, Montreur d'Ours & win count)
export function isWerewolfRole(role: RoleId): boolean {
  return (
    role === 'loup_garou' ||
    role === 'grand_mechant_loup' ||
    role === 'infect_pere_des_loups' ||
    role === 'loup_blanc'
  );
}

// Check if any werewolf has been eliminated in the game
export function hasAnyWerewolfDied(players: Player[]): boolean {
  return players.some(p => !p.isAlive && isWerewolfRole(p.currentRole));
}

// Check if Enfant Sauvage's model died, and if so transform Enfant Sauvage into a Loup-Garou
export function checkAndApplyEnfantSauvageTransformation(
  players: Player[],
  modelPlayerId: string | null | undefined,
  round: number,
  phase: 'night' | 'day',
  logs?: string[]
): void {
  if (!modelPlayerId) return;
  const model = players.find(p => p.id === modelPlayerId);
  if (!model || model.isAlive) return;

  for (const p of players) {
    if (p.isAlive && p.currentRole === 'enfant_sauvage') {
      p.currentRole = 'loup_garou';
      p.roleHistory.push({
        role: 'loup_garou',
        round,
        phase,
        note: `Son modèle (${model.name}) est mort : l'Enfant Sauvage devient Loup-Garou !`,
      });
      if (logs) {
        logs.push(
          `Le modèle de l'Enfant Sauvage (${model.name}) a péri : ${p.name} rejoint désormais la meute des Loups-Garous !`
        );
      }
    }
  }
}

// Generate the list of active night steps based on current round and game state
export function getNightStepsForRound(state: GameState): NightStep[] {
  const steps: NightStep[] = [];
  const {
    round,
    players,
    sorciereState,
    renardState,
    grandMechantLoupState,
    thiefActionDone,
    cupidonActionDone,
  } = state;

  const villagePowersLost = state.ancienState?.villagePowersLost || false;
  const isPlayerAlive = (role: RoleId) => players.some(p => p.isAlive && p.currentRole === role);

  if (round === 1) {
    // 1. Voleur
    if (!thiefActionDone && isPlayerAlive('voleur')) {
      steps.push({
        id: 'voleur',
        roleId: 'voleur',
        title: 'Le Voleur',
        subTitle: "Dérobe l'identité d'un villageois (Nuit 1 unique)",
        speech: ROLE_DEFINITIONS.voleur.moderatorSpeech,
        noteForModerator:
          'Le Voleur choisit une cible. La cible devient Simple Villageois, le Voleur prend sa carte secrètement.',
        isFirstNightOnly: true,
      });
    }

    // 2. Cupidon
    if (!cupidonActionDone && isPlayerAlive('cupidon') && !villagePowersLost) {
      steps.push({
        id: 'cupidon',
        roleId: 'cupidon',
        title: 'Cupidon',
        subTitle: 'Désigne les deux Amoureux (Nuit 1 unique)',
        speech: ROLE_DEFINITIONS.cupidon.moderatorSpeech,
        noteForModerator: "Cupidon désigne deux joueurs qui seront liés jusqu'à la mort.",
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
        speech:
          "Cupidon s'est rendormi. Les deux Amoureux ouvrent discrètement les yeux et se regardent tendrement.",
        noteForModerator:
          "Touchez délicatement les épaules des deux amoureux désignés pour qu'ils ouvrent les yeux et s'identifient.",
        isFirstNightOnly: true,
      });
    }

    // 4. Chien-Loup (Nuit 1 unique)
    if (!state.chienLoupActionDone && isPlayerAlive('chien_loup')) {
      steps.push({
        id: 'chien_loup',
        roleId: 'chien_loup',
        title: 'Le Chien-Loup',
        subTitle: 'Choisit son camp pour la partie (Nuit 1 unique)',
        speech: ROLE_DEFINITIONS.chien_loup.moderatorSpeech,
        noteForModerator:
          "Le Chien-Loup indique s'il reste un fidèle Villageois ou s'il devient un Loup-Garou dès cette nuit.",
        isFirstNightOnly: true,
      });
    }

    // 5. Enfant Sauvage (Nuit 1 unique)
    if (!state.enfantSauvageState?.actionDone && isPlayerAlive('enfant_sauvage') && !villagePowersLost) {
      steps.push({
        id: 'enfant_sauvage',
        roleId: 'enfant_sauvage',
        title: "L'Enfant Sauvage",
        subTitle: 'Choisit secrètement son modèle (Nuit 1 unique)',
        speech: ROLE_DEFINITIONS.enfant_sauvage.moderatorSpeech,
        noteForModerator:
          "L'Enfant Sauvage désigne un joueur modèle. Si ce modèle meurt au cours de la partie, l'Enfant Sauvage deviendra Loup-Garou.",
        isFirstNightOnly: true,
      });
    }

    // 6. Insomniaque
    if (isPlayerAlive('insomniaque') && !villagePowersLost) {
      steps.push({
        id: 'insomniaque',
        roleId: 'insomniaque',
        title: "L'Insomniaque",
        subTitle: 'Rend visite à un joueur et bloque son pouvoir nocturne',
        speech: ROLE_DEFINITIONS.insomniaque.moderatorSpeech,
        noteForModerator:
          "L'Insomniaque désigne un joueur dont le pouvoir nocturne sera bloqué cette nuit. Il doit changer de cible chaque nuit.",
      });
    }

    // 7. Salvateur
    if (isPlayerAlive('salvateur') && !villagePowersLost) {
      steps.push({
        id: 'salvateur',
        roleId: 'salvateur',
        title: 'Le Salvateur',
        subTitle: 'Protège une personne cette nuit',
        speech: ROLE_DEFINITIONS.salvateur.moderatorSpeech,
        noteForModerator: 'Le Salvateur désigne un joueur à protéger contre les attaques de cette nuit.',
      });
    }

    // 8. Voyante
    if (isPlayerAlive('voyante') && !villagePowersLost) {
      steps.push({
        id: 'voyante',
        roleId: 'voyante',
        title: 'La Voyante',
        subTitle: "Sonde l'âme d'un joueur",
        speech: ROLE_DEFINITIONS.voyante.moderatorSpeech,
        noteForModerator:
          "La Voyante pointe un joueur du doigt. Montrez-lui discrètement son rôle dans l'application.",
      });
    }

    // 9. Renard
    if (isPlayerAlive('renard') && renardState.hasPower && !villagePowersLost) {
      steps.push({
        id: 'renard',
        roleId: 'renard',
        title: 'Le Renard',
        subTitle: 'Renifle un trio physique assis côte à côte',
        speech: ROLE_DEFINITIONS.renard.moderatorSpeech,
        noteForModerator: 'Sélectionnez la cible et ses deux voisins physiques réels autour de la table.',
      });
    }

    // 10. Corbeau
    if (isPlayerAlive('corbeau') && !villagePowersLost) {
      steps.push({
        id: 'corbeau',
        roleId: 'corbeau',
        title: 'Le Corbeau',
        subTitle: "Ajoute 2 votes d'office contre un suspect demain",
        speech: ROLE_DEFINITIONS.corbeau.moderatorSpeech,
        noteForModerator:
          'Le Corbeau désigne un suspect qui commencera le vote du village avec 2 voix contre lui.',
      });
    }

    // 11. Loups-Garous (avec rappel Petite Fille)
    const anyWolfAlive = players.some(
      p => p.isAlive && (isWerewolfRole(p.currentRole) || p.currentRole === 'chien_loup')
    );
    if (anyWolfAlive) {
      steps.push({
        id: 'loups_garous',
        roleId: 'loup_garou',
        title: 'Les Loups-Garous',
        subTitle: 'Choix de la victime de la meute',
        speech: ROLE_DEFINITIONS.loup_garou.moderatorSpeech,
        noteForModerator:
          "Tous les Loups-Garous se réveillent ensemble et s'accordent sur une victime (la Petite Fille peut discrètement espionner).",
      });
    }

    // 12. Infect Père des Loups
    if (isPlayerAlive('infect_pere_des_loups') && !state.infectState?.hasInfected) {
      steps.push({
        id: 'infect_pere_des_loups',
        roleId: 'infect_pere_des_loups',
        title: "L'Infect Père des Loups",
        subTitle: 'Peut transformer la victime en Loup-Garou (1 fois par partie)',
        speech: ROLE_DEFINITIONS.infect_pere_des_loups.moderatorSpeech,
        noteForModerator:
          "S'il utilise son pouvoir unique, la victime dévorée ne meurt pas et devient secrètement un Loup-Garou !",
      });
    }

    // 13. Grand Méchant Loup
    const anyWolfDied = hasAnyWerewolfDied(players);
    if (isPlayerAlive('grand_mechant_loup') && !grandMechantLoupState.isPowerLost && !anyWolfDied) {
      steps.push({
        id: 'grand_mechant_loup',
        roleId: 'grand_mechant_loup',
        title: 'Le Grand Méchant Loup',
        subTitle: 'Attaque nocturne supplémentaire',
        speech: ROLE_DEFINITIONS.grand_mechant_loup.moderatorSpeech,
        noteForModerator:
          "Le Grand Méchant Loup choisit une seconde victime seule tant qu'aucun Loup n'a été tué.",
      });
    }

    // 14. Pyromane (Night 1: must oil)
    if (isPlayerAlive('pyromane')) {
      steps.push({
        id: 'pyromane',
        roleId: 'pyromane',
        title: 'Le Pyromane',
        subTitle: 'Huile un joueur (Nuit 1)',
        speech:
          "Le Pyromane se réveille et choisit une victime à arroser discrètement d'huile inflammable.",
        noteForModerator:
          'Lors de la première nuit, le Pyromane doit obligatoirement huiler une personne.',
      });
    }

    // 15. Sorcière
    if (
      isPlayerAlive('sorciere') &&
      (sorciereState.hasLifePotion || sorciereState.hasDeathPotion) &&
      !villagePowersLost
    ) {
      steps.push({
        id: 'sorciere',
        roleId: 'sorciere',
        title: 'La Sorcière',
        subTitle: 'Usage de ses potions de vie et de mort',
        speech: ROLE_DEFINITIONS.sorciere.moderatorSpeech,
        noteForModerator:
          "Montrez-lui la victime de la nuit. Elle peut choisir de la sauver ou de tuer quelqu'un d'autre.",
      });
    }
  } else {
    // NIGHT 2 AND SUBSEQUENT NIGHTS
    // 1. Insomniaque
    if (isPlayerAlive('insomniaque') && !villagePowersLost) {
      steps.push({
        id: 'insomniaque',
        roleId: 'insomniaque',
        title: "L'Insomniaque",
        subTitle: 'Rend visite à un joueur différent de la veille',
        speech: ROLE_DEFINITIONS.insomniaque.moderatorSpeech,
        noteForModerator:
          "L'Insomniaque bloque le pouvoir nocturne d'un joueur. La cible de la nuit dernière est interdite.",
      });
    }

    // 2. Salvateur
    if (isPlayerAlive('salvateur') && !villagePowersLost) {
      steps.push({
        id: 'salvateur',
        roleId: 'salvateur',
        title: 'Le Salvateur',
        subTitle: 'Protège une personne (différente de la nuit passée)',
        speech: ROLE_DEFINITIONS.salvateur.moderatorSpeech,
        noteForModerator:
          'Le Salvateur désigne un joueur à protéger. La cible de la nuit dernière est interdite.',
      });
    }

    // 3. Voyante
    if (isPlayerAlive('voyante') && !villagePowersLost) {
      steps.push({
        id: 'voyante',
        roleId: 'voyante',
        title: 'La Voyante',
        subTitle: "Sonde l'âme d'un joueur",
        speech: ROLE_DEFINITIONS.voyante.moderatorSpeech,
        noteForModerator:
          "La Voyante pointe un joueur du doigt. Montrez-lui discrètement son rôle dans l'application.",
      });
    }

    // 4. Renard
    if (isPlayerAlive('renard') && renardState.hasPower && !villagePowersLost) {
      steps.push({
        id: 'renard',
        roleId: 'renard',
        title: 'Le Renard',
        subTitle: 'Renifle un trio physique assis côte à côte',
        speech: ROLE_DEFINITIONS.renard.moderatorSpeech,
        noteForModerator:
          "Le Renard renifle un trio physique. S'il n'y a aucun Loup, son pouvoir sera perdu.",
      });
    }

    // 5. Corbeau
    if (isPlayerAlive('corbeau') && !villagePowersLost) {
      steps.push({
        id: 'corbeau',
        roleId: 'corbeau',
        title: 'Le Corbeau',
        subTitle: "Ajoute 2 votes d'office contre un suspect demain",
        speech: ROLE_DEFINITIONS.corbeau.moderatorSpeech,
        noteForModerator:
          'Le Corbeau désigne un suspect qui commencera le vote du village avec 2 voix contre lui.',
      });
    }

    // 6. Nécromancien (si au moins 1 joueur mort)
    const anyDeadPlayer = players.some(p => !p.isAlive);
    if (isPlayerAlive('necromancien') && anyDeadPlayer && !villagePowersLost) {
      steps.push({
        id: 'necromancien',
        roleId: 'necromancien',
        title: 'Le Nécromancien',
        subTitle: 'Dialogue avec les morts ou réanime une âme',
        speech: ROLE_DEFINITIONS.necromancien.moderatorSpeech,
        noteForModerator:
          'Le Nécromancien peut sonder un joueur mort ou utiliser son unique pouvoir de résurrection.',
      });
    }

    // 7. Loups-Garous
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

    // 8. Infect Père des Loups
    if (isPlayerAlive('infect_pere_des_loups') && !state.infectState?.hasInfected) {
      steps.push({
        id: 'infect_pere_des_loups',
        roleId: 'infect_pere_des_loups',
        title: "L'Infect Père des Loups",
        subTitle: 'Peut transformer la victime en Loup-Garou (1 fois par partie)',
        speech: ROLE_DEFINITIONS.infect_pere_des_loups.moderatorSpeech,
        noteForModerator:
          "S'il utilise son pouvoir unique, la victime dévorée ne meurt pas et devient secrètement un Loup-Garou !",
      });
    }

    // 9. Grand Méchant Loup
    const anyWolfDied = hasAnyWerewolfDied(players);
    if (isPlayerAlive('grand_mechant_loup') && !grandMechantLoupState.isPowerLost && !anyWolfDied) {
      steps.push({
        id: 'grand_mechant_loup',
        roleId: 'grand_mechant_loup',
        title: 'Le Grand Méchant Loup',
        subTitle: 'Attaque nocturne supplémentaire',
        speech: ROLE_DEFINITIONS.grand_mechant_loup.moderatorSpeech,
        noteForModerator: "Attaque supplémentaire toujours disponible tant qu'aucun Loup n'est mort.",
      });
    }

    // 10. Loup Blanc (starts night 2, one night out of two: nights 2, 4, 6...)
    if (isPlayerAlive('loup_blanc') && round % 2 === 0) {
      steps.push({
        id: 'loup_blanc',
        roleId: 'loup_blanc',
        title: 'Le Loup Blanc',
        subTitle: 'Peut dévorer un autre Loup-Garou (nuit paire)',
        speech: ROLE_DEFINITIONS.loup_blanc.moderatorSpeech,
        noteForModerator:
          'Le Loup Blanc peut éliminer un autre Loup-Garou cette nuit, ou passer son tour.',
      });
    }

    // 11. Pyromane
    if (isPlayerAlive('pyromane')) {
      steps.push({
        id: 'pyromane',
        roleId: 'pyromane',
        title: 'Le Pyromane',
        subTitle: 'Huiler un nouveau joueur OU Embraser les cibles',
        speech: ROLE_DEFINITIONS.pyromane.moderatorSpeech,
        noteForModerator:
          "Le Pyromane peut soit imbiber une nouvelle cible d'huile, soit faire brûler toutes les cibles huilées !",
      });
    }

    // 12. Sorcière
    if (
      isPlayerAlive('sorciere') &&
      (sorciereState.hasLifePotion || sorciereState.hasDeathPotion) &&
      !villagePowersLost
    ) {
      steps.push({
        id: 'sorciere',
        roleId: 'sorciere',
        title: 'La Sorcière',
        subTitle: 'Usage de ses potions de vie et de mort',
        speech: ROLE_DEFINITIONS.sorciere.moderatorSpeech,
        noteForModerator:
          'Indiquez-lui la victime de la meute. Elle peut utiliser la potion de vie et/ou de mort.',
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
  const updatedPlayers: Player[] = players.map(p => ({ ...p, roleHistory: [...p.roleHistory] }));
  const logs: string[] = [];
  const deaths: DeadAnnouncement[] = [];

  const updatedInfectState = { ...(state.infectState || { hasInfected: false }) };
  const updatedAncienState = {
    ...(state.ancienState || { hasSurvivedFirstWolfAttack: false, villagePowersLost: false }),
  };
  const updatedNecromancienState = { ...(state.necromancienState || { hasUsedRevive: false }) };
  const updatedInsomniaqueState = { ...(state.insomniaqueState || { lastBlockedId: null }) };

  // 0. Insomniaque block check
  const blockedPlayerId = nightTargets.insomniaqueTargetId || null;
  if (blockedPlayerId) {
    updatedInsomniaqueState.lastBlockedId = blockedPlayerId;
    const blockedPlayer = updatedPlayers.find(p => p.id === blockedPlayerId);
    if (blockedPlayer) {
      logs.push(
        `L'Insomniaque a rendu visite à ${blockedPlayer.name} (${ROLE_DEFINITIONS[blockedPlayer.currentRole].name}), bloquant son pouvoir nocturne.`
      );
    }
  }

  const isRoleBlockedByInsomniaque = (role: RoleId): boolean => {
    if (!blockedPlayerId) return false;
    const roleHolder = updatedPlayers.find(p => p.isAlive && p.currentRole === role);
    return Boolean(roleHolder && roleHolder.id === blockedPlayerId);
  };

  // Track who is protected this night
  const protectedId = isRoleBlockedByInsomniaque('salvateur')
    ? null
    : nightTargets.salvateurProtectedId;
  if (nightTargets.salvateurProtectedId) {
    if (isRoleBlockedByInsomniaque('salvateur')) {
      logs.push("Le Salvateur a été bloqué par l'Insomniaque : sa protection n'a pas pu s'appliquer.");
    } else {
      const p = updatedPlayers.find(pl => pl.id === protectedId);
      if (p) {
        logs.push(`Le Salvateur a placé ${p.name} sous sa protection.`);
      }
    }
  }

  // Set of targeted victims with their causes
  const pendingFatalAttacks: {
    playerId: string;
    reason: DeathReason;
    isCoveredBySalvateur: boolean;
  }[] = [];

  let infectedPlayerName: string | null = null;

  // 1. Werewolves attack & Infect Père des Loups
  if (nightTargets.werewolfTargetId) {
    const wolfVictim = updatedPlayers.find(p => p.id === nightTargets.werewolfTargetId);
    const canInfect =
      nightTargets.infectUsedThisNight &&
      !updatedInfectState.hasInfected &&
      !isRoleBlockedByInsomniaque('infect_pere_des_loups');

    if (canInfect && wolfVictim && wolfVictim.isAlive) {
      // Transform victim into Loup-Garou instead of killing them
      const prevRoleName = ROLE_DEFINITIONS[wolfVictim.currentRole].name;
      wolfVictim.currentRole = 'loup_garou';
      wolfVictim.isInfected = true;
      wolfVictim.roleHistory.push({
        role: 'loup_garou',
        round,
        phase: 'night',
        note: `Infecté(e) par l'Infect Père des Loups (était ${prevRoleName}). Devient Loup-Garou.`,
      });
      updatedInfectState.hasInfected = true;
      infectedPlayerName = wolfVictim.name;
      logs.push(
        `L'Infect Père des Loups a infecté ${wolfVictim.name} : la victime survit et devient secrètement un Loup-Garou !`
      );
    } else {
      if (nightTargets.infectUsedThisNight && isRoleBlockedByInsomniaque('infect_pere_des_loups')) {
        logs.push(
          "L'Infect Père des Loups a été bloqué par l'Insomniaque : l'infection a échoué, la victime subit l'attaque normale."
        );
      }
      pendingFatalAttacks.push({
        playerId: nightTargets.werewolfTargetId,
        reason: 'loups_garous',
        isCoveredBySalvateur: true,
      });
    }
  }

  // 2. Grand Méchant Loup attack
  if (nightTargets.gmlTargetId) {
    if (isRoleBlockedByInsomniaque('grand_mechant_loup')) {
      logs.push("Le Grand Méchant Loup a été bloqué par l'Insomniaque cette nuit.");
    } else {
      pendingFatalAttacks.push({
        playerId: nightTargets.gmlTargetId,
        reason: 'grand_mechant_loup',
        isCoveredBySalvateur: true,
      });
    }
  }

  // 3. Loup Blanc attack
  if (nightTargets.loupBlancTargetId) {
    if (isRoleBlockedByInsomniaque('loup_blanc')) {
      logs.push("Le Loup Blanc a été bloqué par l'Insomniaque cette nuit.");
    } else {
      pendingFatalAttacks.push({
        playerId: nightTargets.loupBlancTargetId,
        reason: 'loup_blanc',
        isCoveredBySalvateur: true,
      });
    }
  }

  // 4. Pyromane burn / oil
  if (isRoleBlockedByInsomniaque('pyromane') && nightTargets.pyromaneAction) {
    logs.push("Le Pyromane a été bloqué par l'Insomniaque cette nuit.");
  } else if (nightTargets.pyromaneAction === 'burn') {
    const oiledPlayers = updatedPlayers.filter(p => p.isAlive && p.isOiled);
    for (const op of oiledPlayers) {
      pendingFatalAttacks.push({
        playerId: op.id,
        reason: 'pyromane',
        isCoveredBySalvateur: true,
      });
      op.isOiled = false;
    }
    logs.push(
      `Le Pyromane a allumé l'incendie sur ${oiledPlayers.length} cible(s) huilée(s). L'huile a été consumée.`
    );
  } else if (nightTargets.pyromaneAction === 'oil' && nightTargets.pyromaneOiledTargetId) {
    const oiled = updatedPlayers.find(p => p.id === nightTargets.pyromaneOiledTargetId);
    if (oiled) {
      oiled.isOiled = true;
      logs.push(`Le Pyromane a aspergé d'huile ${oiled.name}.`);
    }
  }

  // 5. Sorcière potions
  const sorciereBlocked = isRoleBlockedByInsomniaque('sorciere');
  if (sorciereBlocked && (nightTargets.sorciereSavedId || nightTargets.sorciereKilledId)) {
    logs.push("La Sorcière a été bloquée par l'Insomniaque : ses potions n'ont pas pu agir.");
  }
  const isLifePotionUsed = !sorciereBlocked && Boolean(nightTargets.sorciereSavedId);
  const effectiveDeathTargetId =
    sorciereBlocked || isLifePotionUsed ? null : nightTargets.sorciereKilledId;

  if (effectiveDeathTargetId) {
    pendingFatalAttacks.push({
      playerId: effectiveDeathTargetId,
      reason: 'sorciere_mort',
      isCoveredBySalvateur: false,
    });
    logs.push(`La Sorcière a utilisé sa potion de mort.`);
  }

  // Process attacks against protections, potions, and Ancien's 1st life
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
    if ( !sorciereBlocked && target.id === nightTargets.sorciereSavedId) {
      logs.push(`${target.name} a été miraculeusement ranimé par la potion de vie de la Sorcière !`);
      continue;
    }

    // Is Ancien surviving his 1st werewolf attack?
    if (
      target.currentRole === 'ancien' &&
      (attack.reason === 'loups_garous' || attack.reason === 'grand_mechant_loup') &&
      !updatedAncienState.hasSurvivedFirstWolfAttack &&
      !updatedAncienState.villagePowersLost
    ) {
      updatedAncienState.hasSurvivedFirstWolfAttack = true;
      logs.push(
        `L'Ancien (${target.name}) a survécu à sa première attaque des Loups-Garous !`
      );
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

      // If Ancien was killed by Sorcière's poison, village loses powers!
      if (p.currentRole === 'ancien' && info.reason === 'sorciere_mort') {
        updatedAncienState.villagePowersLost = true;
        logs.push(
          "Malheur ! L'Ancien a été empoisonné par la Sorcière : tous les villageois perdent définitivement leurs pouvoirs !"
        );
      }
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

        logs.push(
          `${partner.name} est mort(e) de chagrin en découvrant la mort de son amoureux(se) ${p.name}.`
        );
      }
    }
  }

  // 6. Nécromancien revival (once per game)
  let revivedPlayerName: string | null = null;
  if (
    nightTargets.necromancienAction === 'revive' &&
    nightTargets.necromancienTargetId &&
    !updatedNecromancienState.hasUsedRevive &&
    !isRoleBlockedByInsomniaque('necromancien')
  ) {
    const deadSoul = updatedPlayers.find(
      p => p.id === nightTargets.necromancienTargetId && !p.isAlive
    );
    if (deadSoul) {
      deadSoul.isAlive = true;
      deadSoul.deathReason = null;
      deadSoul.deathRound = null;
      deadSoul.deathPhase = null;
      deadSoul.deathIndirectBy = null;
      updatedNecromancienState.hasUsedRevive = true;
      revivedPlayerName = deadSoul.name;
      logs.push(
        `Le Nécromancien a réanimé l'âme de ${deadSoul.name}, qui revient parmi les vivants !`
      );
    }
  } else if (
    nightTargets.necromancienAction === 'commune' &&
    nightTargets.necromancienTargetId &&
    !isRoleBlockedByInsomniaque('necromancien')
  ) {
    const deadSoul = updatedPlayers.find(p => p.id === nightTargets.necromancienTargetId);
    if (deadSoul) {
      logs.push(`Le Nécromancien a communiqué avec l'esprit de ${deadSoul.name}.`);
    }
  }

  // 7. Enfant Sauvage check (if his model died tonight)
  checkAndApplyEnfantSauvageTransformation(
    updatedPlayers,
    state.enfantSauvageState?.modelPlayerId,
    round,
    'night',
    logs
  );

  // 8. Corbeau suspect (+2 votes tomorrow)
  let corbeauTargetedPlayerId: string | null = null;
  let corbeauTargetedPlayerName: string | null = null;
  if (nightTargets.corbeauTargetId) {
    if (isRoleBlockedByInsomniaque('corbeau')) {
      logs.push("Le Corbeau a été bloqué par l'Insomniaque : aucun suspect n'est désigné.");
    } else {
      const suspect = updatedPlayers.find(p => p.id === nightTargets.corbeauTargetId && p.isAlive);
      if (suspect) {
        corbeauTargetedPlayerId = suspect.id;
        corbeauTargetedPlayerName = suspect.name;
        logs.push(
          `Le Corbeau a désigné ${suspect.name} : il reçoit 2 votes d'office pour le conseil du jour !`
        );
      }
    }
  }

  // 9. Montreur d'Ours morning growl check
  let bearGrowled: boolean | null = null;
  const montreur = updatedPlayers.find(
    p => p.isAlive && p.currentRole === 'montreur_ours'
  );
  if (
    montreur &&
    !updatedAncienState.villagePowersLost &&
    blockedPlayerId !== montreur.id
  ) {
    const aliveRing = updatedPlayers
      .filter(p => p.isAlive)
      .sort((a, b) => a.seatNumber - b.seatNumber);
    const idx = aliveRing.findIndex(p => p.id === montreur.id);
    if (idx !== -1 && aliveRing.length >= 2) {
      const leftNeighbor = aliveRing[(idx - 1 + aliveRing.length) % aliveRing.length];
      const rightNeighbor = aliveRing[(idx + 1) % aliveRing.length];
      bearGrowled =
        isWerewolfRole(leftNeighbor.currentRole) ||
        isWerewolfRole(rightNeighbor.currentRole) ||
        Boolean(montreur.isInfected);
      logs.push(
        bearGrowled
          ? `🐻 GROGNEMENT DE L'OURS ! Un Loup-Garou se trouve parmi les voisins directs du Montreur d'Ours (${leftNeighbor.name} ou ${rightNeighbor.name}).`
          : `🐻 L'ours du Montreur d'Ours reste calme ce matin.`
      );
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
  if (
    sorcierePlayer &&
    !updatedSorciereState.hasLifePotion &&
    !updatedSorciereState.hasDeathPotion
  ) {
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
    logs.push(
      'Un Loup-Garou a péri : le Grand Méchant Loup perd définitivement son attaque supplémentaire.'
    );
  }

  const resolution: NightResolutionResult = {
    deaths,
    logs,
    bearGrowled,
    corbeauTargetedPlayerId,
    corbeauTargetedPlayerName,
    revivedPlayerName,
    infectedPlayerName,
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
    infectState: updatedInfectState,
    ancienState: updatedAncienState,
    necromancienState: updatedNecromancienState,
    insomniaqueState: updatedInsomniaqueState,
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
): {
  nextState: GameState;
  immediateAngelWin: boolean;
  chasseurShotNeeded: boolean;
  eliminatedPartnerName: string | null;
} {
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

  const updatedPlayers = state.players.map(p => ({ ...p, roleHistory: [...p.roleHistory] }));
  const target = updatedPlayers.find(p => p.id === eliminatedPlayerId);

  if (!target || !target.isAlive) {
    return {
      nextState: state,
      immediateAngelWin: false,
      chasseurShotNeeded: false,
      eliminatedPartnerName: null,
    };
  }

  const updatedAncienState = {
    ...(state.ancienState || { hasSurvivedFirstWolfAttack: false, villagePowersLost: false }),
  };
  const updatedIdiotState = { ...(state.idiotState || { isRevealedAndGraced: false }) };

  // Special Case: Idiot du Village is pardoned on his 1st execution by village vote!
  if (
    target.currentRole === 'idiot_du_village' &&
    !updatedIdiotState.isRevealedAndGraced &&
    !updatedAncienState.villagePowersLost
  ) {
    updatedIdiotState.isRevealedAndGraced = true;
    target.hasLostVoteRight = true;
    target.roleHistory.push({
      role: 'idiot_du_village',
      round: state.round,
      phase: 'day',
      note: 'Gracié par le village lors du vote ! Perd son droit de vote.',
    });

    return {
      nextState: {
        ...state,
        players: updatedPlayers,
        idiotState: updatedIdiotState,
        lastVoteResolution: {
          eliminatedPlayer: null,
          idiotGracedPlayer: target,
          cascadePartner: null,
          immediateAngelWin: false,
          chasseurShotNeeded: false,
        },
        phase: 'day_resolution',
      },
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
      title: "Victoire de l'Ange !",
      subtitle: `${target.name} a accompli son dessein céleste`,
      description:
        "L'Ange a réussi à se faire éliminer par le vote du village lors du conseil ! Il remporte immédiatement et seul la victoire.",
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

  // Check if Ancien was eliminated by village vote -> all villagers lose their powers!
  let ancienPowerLossTriggered = false;
  if (target.currentRole === 'ancien' && !updatedAncienState.villagePowersLost) {
    updatedAncienState.villagePowersLost = true;
    ancienPowerLossTriggered = true;
  }

  // Check if Chasseur was eliminated by vote (and village hasn't lost powers)
  const isChasseur = target.currentRole === 'chasseur' && !updatedAncienState.villagePowersLost;

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

  // Check Enfant Sauvage transformation if his model died during the vote
  checkAndApplyEnfantSauvageTransformation(
    updatedPlayers,
    state.enfantSauvageState?.modelPlayerId,
    state.round,
    'day'
  );

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
        ancienState: updatedAncienState,
        grandMechantLoupState: updatedGmlState,
        pendingChasseurShot: { hunterPlayerId: target.id },
        lastVoteResolution: {
          eliminatedPlayer: target,
          ancienPowerLossTriggered,
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
      ancienState: updatedAncienState,
      grandMechantLoupState: updatedGmlState,
      winner: win,
      lastVoteResolution: {
        eliminatedPlayer: target,
        ancienPowerLossTriggered,
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
  const updatedPlayers = state.players.map(p => ({ ...p, roleHistory: [...p.roleHistory] }));
  const target = updatedPlayers.find(p => p.id === shotTargetId);
  let loverPartnerObj: Player | null = null;
  const updatedAncienState = {
    ...(state.ancienState || { hasSurvivedFirstWolfAttack: false, villagePowersLost: false }),
  };
  let ancienPowerLossTriggered = state.lastVoteResolution?.ancienPowerLossTriggered || false;

  if (target && target.isAlive) {
    target.isAlive = false;
    target.deathReason = 'chasseur';
    target.deathRound = state.round;
    target.deathPhase = 'day';

    if (target.currentRole === 'ancien' && !updatedAncienState.villagePowersLost) {
      updatedAncienState.villagePowersLost = true;
      ancienPowerLossTriggered = true;
    }

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

  // Check Enfant Sauvage transformation if his model was shot by the Chasseur
  checkAndApplyEnfantSauvageTransformation(
    updatedPlayers,
    state.enfantSauvageState?.modelPlayerId,
    state.round,
    'day'
  );

  const wolfDied = hasAnyWerewolfDied(updatedPlayers);
  const updatedGmlState = {
    isPowerLost: state.grandMechantLoupState.isPowerLost || wolfDied,
  };

  const win = checkVictoryConditions(updatedPlayers);

  return {
    ...state,
    players: updatedPlayers,
    ancienState: updatedAncienState,
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
      ancienPowerLossTriggered,
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
      description: "Il ne reste aucun survivant dans le village. Personne ne l'emporte.",
      winningPlayerIds: [],
    };
  }

  // PRIORITÉ 2 — Loup Blanc seul survivant
  if (alivePlayers.length === 1 && alivePlayers[0].currentRole === 'loup_blanc') {
    return {
      winner: 'loup_blanc',
      title: 'Victoire du Loup Blanc !',
      subtitle: `${alivePlayers[0].name} règne seul sur les ruines`,
      description:
        'Le Loup Blanc a éliminé tous les autres villageois et Loups-Garous. Il est le seul et unique survivant !',
      winningPlayerIds: [alivePlayers[0].id],
    };
  }

  // PRIORITÉ 3 — Pyromane seul survivant
  if (alivePlayers.length === 1 && alivePlayers[0].currentRole === 'pyromane') {
    return {
      winner: 'pyromane',
      title: 'Victoire du Pyromane !',
      subtitle: `${alivePlayers[0].name} a réduit le village en cendres`,
      description:
        "Le Pyromane a consumé tous les habitants par le feu. Il est le dernier rescapé de l'incendie.",
      winningPlayerIds: [alivePlayers[0].id],
    };
  }

  // Amoureux seuls survivants (si couple mixte ou derniers survivants)
  if (
    alivePlayers.length === 2 &&
    alivePlayers[0].isLover &&
    alivePlayers[1].isLover &&
    alivePlayers[0].loverPartnerId === alivePlayers[1].id
  ) {
    return {
      winner: 'amoureux',
      title: 'Victoire des Amoureux !',
      subtitle: `${alivePlayers[0].name} & ${alivePlayers[1].name} triomphent par l'amour`,
      description:
        'Uniquement unis par la flèche de Cupidon, les deux Amoureux ont survécu à tous les périls du village !',
      winningPlayerIds: [alivePlayers[0].id, alivePlayers[1].id],
    };
  }

  const wolves = alivePlayers.filter(
    p => ROLE_DEFINITIONS[p.currentRole].camp === 'loups_garous'
  );
  const villagers = alivePlayers.filter(
    p => ROLE_DEFINITIONS[p.currentRole].camp === 'villageois'
  );
  const independents = alivePlayers.filter(
    p => ROLE_DEFINITIONS[p.currentRole].camp === 'independant'
  );

  const L = wolves.length;
  const V = villagers.length;
  const I = independents.length;

  // PRIORITÉ 4 — VICTOIRE DES LOUPS PAR PARITÉ OU MAJORITÉ
  if (L >= V + I && L > 0) {
    return {
      winner: 'loups_garous',
      title: 'Victoire des Loups-Garous !',
      subtitle: 'La meute a submergé le village',
      description:
        'Le nombre de Loups-Garous a atteint ou dépassé celui des autres survivants. Le village est tombé !',
      winningPlayerIds: wolves.map(p => p.id),
    };
  }

  // PRIORITÉ 5 — VICTOIRE DU VILLAGE
  if (L === 0 && (V > 0 || I > 0)) {
    return {
      winner: 'villageois',
      title: 'Victoire des Villageois !',
      subtitle: 'La paix revient sur le hameau',
      description:
        'Tous les Loups-Garous ont été éradiqués ! Les survivants du village peuvent enfin dormir en paix.',
      winningPlayerIds: villagers.map(p => p.id),
    };
  }

  return null;
}

export function formatDeathReason(reason: DeathReason): string {
  switch (reason) {
    case 'loups_garous':
      return 'Dévoré(e) par la meute des Loups-Garous';
    case 'grand_mechant_loup':
      return 'Égorgé(e) par le Grand Méchant Loup';
    case 'loup_blanc':
      return 'Déchiqueté(e) par le Loup Blanc';
    case 'sorciere_mort':
      return 'Empoisonné(e) par la potion de mort de la Sorcière';
    case 'pyromane':
      return "Brûlé(e) vif par l'incendie du Pyromane";
    case 'amoureux':
      return "Mort(e) de chagrin d'amour";
    case 'vote':
      return 'Condamné(e) par le vote populaire du village';
    case 'chasseur':
      return "Abattu(e) par le tir d'ultime recours du Chasseur";
    default:
      return 'Mort mystérieuse';
  }
}

export function createEmptyNightTargets(): NightTargets {
  return {
    voleurTargetId: null,
    cupidonLover1Id: null,
    cupidonLover2Id: null,
    chienLoupChoice: null,
    enfantSauvageModelId: null,
    insomniaqueTargetId: null,
    salvateurProtectedId: null,
    voyanteRevealedPlayerId: null,
    renardCheckedIds: null,
    renardResultHasWolf: null,
    werewolfTargetId: null,
    infectUsedThisNight: false,
    gmlTargetId: null,
    loupBlancTargetId: null,
    pyromaneAction: null,
    pyromaneOiledTargetId: null,
    sorciereSavedId: null,
    sorciereKilledId: null,
    corbeauTargetId: null,
    necromancienAction: null,
    necromancienTargetId: null,
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
    return {
      isValid: false,
      error: 'La cible centrale et le voisin de gauche doivent être distincts.',
    };
  }
  if (centerId === rightId) {
    return {
      isValid: false,
      error: 'La cible centrale et le voisin de droite doivent être distincts.',
    };
  }
  if (leftId === rightId) {
    return {
      isValid: false,
      error: 'Le voisin de gauche et le voisin de droite doivent être distincts.',
    };
  }
  return { isValid: true };
}


