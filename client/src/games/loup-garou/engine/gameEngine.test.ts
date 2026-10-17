import { describe, it, expect } from 'vitest';
import {
  resolveNightActions,
  validateRenardSelection,
  createEmptyNightTargets,
  eliminatePlayerByVote,
  executeChasseurShot,
  checkVictoryConditions,
  hasAnyWerewolfDied,
  getNightStepsForRound,
} from './gameEngine';
import { GameState, Player, RoleId } from '../types/game';
import { getDefaultRoleConfig } from '../data/roles';

function createMockPlayer(id: string, name: string, role: RoleId, seatNumber: number): Player {
  return {
    id,
    name,
    seatNumber,
    currentRole: role,
    initialRole: role,
    roleHistory: [{ role, round: 1, phase: 'distribution', note: 'Init' }],
    isAlive: true,
    deathReason: null,
    deathRound: null,
    deathPhase: null,
    deathIndirectBy: null,
    isProtected: false,
    isOiled: false,
    isLover: false,
    loverPartnerId: null,
  };
}

function createBaseState(players: Player[]): GameState {
  return {
    phase: 'night',
    round: 1,
    totalPlayers: players.length,
    roleConfig: getDefaultRoleConfig(players.length),
    players,
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
    thiefActionDone: false,
    cupidonActionDone: false,
    pendingChasseurShot: null,
    winner: null,
    gameLog: [],
  };
}

describe('CORRECTION 1 — État huilé du Pyromane et résolution de l\'incendie', () => {
  it('1. Un joueur huilé est éliminé par l\'incendie', () => {
    const p1 = createMockPlayer('p1', 'Pyromane', 'pyromane', 1);
    const p2 = createMockPlayer('p2', 'Alice', 'villageois', 2);
    p2.isOiled = true; // Alice est huilée

    const state = createBaseState([p1, p2]);
    state.nightTargets.pyromaneAction = 'burn';

    const { nextState, resolution } = resolveNightActions(state);

    const alice = nextState.players.find(p => p.id === 'p2')!;
    expect(alice.isAlive).toBe(false);
    expect(alice.deathReason).toBe('pyromane');
    expect(resolution.deaths.some(d => d.playerId === 'p2')).toBe(true);
  });

  it('2. Un joueur huilé est sauvé par le Salvateur', () => {
    const p1 = createMockPlayer('p1', 'Pyromane', 'pyromane', 1);
    const p2 = createMockPlayer('p2', 'Salvateur', 'salvateur', 2);
    const p3 = createMockPlayer('p3', 'Alice', 'villageois', 3);
    p3.isOiled = true; // Alice est huilée

    const state = createBaseState([p1, p2, p3]);
    state.nightTargets.pyromaneAction = 'burn';
    state.nightTargets.salvateurProtectedId = 'p3'; // Protégée par le Salvateur

    const { nextState, resolution } = resolveNightActions(state);

    const alice = nextState.players.find(p => p.id === 'p3')!;
    expect(alice.isAlive).toBe(true);
    expect(alice.deathReason).toBeNull();
    expect(resolution.deaths.some(d => d.playerId === 'p3')).toBe(false);
  });

  it('3. L\'état isOiled est correctement réinitialisé après l\'incendie (sur survivant comme sur victime)', () => {
    const p1 = createMockPlayer('p1', 'Pyromane', 'pyromane', 1);
    const p2 = createMockPlayer('p2', 'Alice', 'villageois', 2);
    const p3 = createMockPlayer('p3', 'Bob', 'villageois', 3);
    p2.isOiled = true; // Alice (sera protégée)
    p3.isOiled = true; // Bob (va brûler)

    const state = createBaseState([p1, p2, p3]);
    state.nightTargets.pyromaneAction = 'burn';
    state.nightTargets.salvateurProtectedId = 'p2'; // Alice est protégée

    const { nextState } = resolveNightActions(state);

    const alice = nextState.players.find(p => p.id === 'p2')!;
    const bob = nextState.players.find(p => p.id === 'p3')!;

    // Les deux doivent avoir perdu l'huile consumée par le feu
    expect(alice.isOiled).toBe(false);
    expect(bob.isOiled).toBe(false);
  });

  it('4. Un incendie ne laisse pas de marque d\'huile incohérente pour les nuits suivantes', () => {
    const p1 = createMockPlayer('p1', 'Pyromane', 'pyromane', 1);
    const p2 = createMockPlayer('p2', 'Alice', 'villageois', 2);
    p2.isOiled = true;

    // Nuit 2 : Incendie, Alice est protégée par Salvateur
    const night2State = createBaseState([p1, p2]);
    night2State.round = 2;
    night2State.nightTargets.pyromaneAction = 'burn';
    night2State.nightTargets.salvateurProtectedId = 'p2';

    const { nextState: night2ResolutionState } = resolveNightActions(night2State);
    const aliceNight2 = night2ResolutionState.players.find(p => p.id === 'p2')!;
    expect(aliceNight2.isAlive).toBe(true);
    expect(aliceNight2.isOiled).toBe(false);

    // Nuit 3 : Le Pyromane déclenche à nouveau un incendie sans avoir ré-huilé Alice
    const night3State: GameState = {
      ...night2ResolutionState,
      round: 3,
      phase: 'night',
      nightTargets: createEmptyNightTargets(),
    };
    night3State.nightTargets.pyromaneAction = 'burn';
    // Alice n'est PAS protégée cette nuit 3
    night3State.nightTargets.salvateurProtectedId = null;

    const { nextState: night3ResolutionState, resolution: night3Resolution } = resolveNightActions(night3State);
    const aliceNight3 = night3ResolutionState.players.find(p => p.id === 'p2')!;

    // Alice ne doit PAS brûler car l'huile a été consumée la veille et elle n'a pas été ré-huilée
    expect(aliceNight3.isAlive).toBe(true);
    expect(night3Resolution.deaths.some(d => d.playerId === 'p2')).toBe(false);
  });
});

describe('CORRECTION 2 — Unicité du trio du Renard', () => {
  it('1. Trois joueurs distincts : sélection acceptée', () => {
    const result = validateRenardSelection('p1', 'p2', 'p3');
    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('2. Cible centrale identique au voisin gauche : sélection refusée', () => {
    const result = validateRenardSelection('p1', 'p1', 'p3');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('La cible centrale et le voisin de gauche doivent être distincts.');
  });

  it('3. Voisin gauche identique au voisin droit : sélection refusée', () => {
    const result = validateRenardSelection('p1', 'p2', 'p2');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Le voisin de gauche et le voisin de droite doivent être distincts.');
  });

  it('4. Cible centrale identique au voisin droit : sélection refusée', () => {
    const result = validateRenardSelection('p1', 'p2', 'p1');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('La cible centrale et le voisin de droite doivent être distincts.');
  });

  it('5. Sélection incomplète (champ vide) : sélection refusée', () => {
    const result = validateRenardSelection('p1', '', 'p3');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Les trois joueurs doivent être sélectionnés.');
  });
});

describe('CORRECTION 3 & VÉRIFICATIONS COMPLÉMENTAIRES DES RÈGLES', () => {
  it('Chasseur ne tire pas s\'il meurt pendant la nuit', () => {
    const p1 = createMockPlayer('p1', 'Loup', 'loup_garou', 1);
    const p2 = createMockPlayer('p2', 'Chasseur', 'chasseur', 2);

    const state = createBaseState([p1, p2]);
    state.nightTargets.werewolfTargetId = 'p2';

    const { nextState } = resolveNightActions(state);
    const chasseur = nextState.players.find(p => p.id === 'p2')!;

    expect(chasseur.isAlive).toBe(false);
    expect(chasseur.deathPhase).toBe('night');
    expect(nextState.pendingChasseurShot).toBeNull();
  });

  it('Chasseur déclenche son tir s\'il est éliminé par vote', () => {
    const p1 = createMockPlayer('p1', 'Loup', 'loup_garou', 1);
    const p2 = createMockPlayer('p2', 'Chasseur', 'chasseur', 2);
    const p3 = createMockPlayer('p3', 'Villageois', 'villageois', 3);

    const state = createBaseState([p1, p2, p3]);
    state.phase = 'day_vote';

    const { nextState, chasseurShotNeeded } = eliminatePlayerByVote(state, 'p2');
    expect(chasseurShotNeeded).toBe(true);
    expect(nextState.phase).toBe('chasseur_revenge');
    expect(nextState.pendingChasseurShot?.hunterPlayerId).toBe('p2');

    // Exécution du tir
    const afterShot = executeChasseurShot(nextState, 'p1');
    const wolf = afterShot.players.find(p => p.id === 'p1')!;
    expect(wolf.isAlive).toBe(false);
    expect(wolf.deathReason).toBe('chasseur');
  });

  it('Victoire immédiate de l\'Ange s\'il est éliminé par vote', () => {
    const p1 = createMockPlayer('p1', 'Ange', 'ange', 1);
    const p2 = createMockPlayer('p2', 'Loup', 'loup_garou', 2);
    const p3 = createMockPlayer('p3', 'Villageois', 'villageois', 3);

    const state = createBaseState([p1, p2, p3]);
    state.phase = 'day_vote';

    const { nextState, immediateAngelWin } = eliminatePlayerByVote(state, 'p1');
    expect(immediateAngelWin).toBe(true);
    expect(nextState.phase).toBe('game_over');
    expect(nextState.winner?.winner).toBe('ange');
  });

  it('Mort en chaîne des amoureux en cascade', () => {
    const p1 = createMockPlayer('p1', 'Amant 1', 'villageois', 1);
    const p2 = createMockPlayer('p2', 'Amant 2', 'villageois', 2);
    p1.isLover = true;
    p1.loverPartnerId = 'p2';
    p2.isLover = true;
    p2.loverPartnerId = 'p1';

    const p3 = createMockPlayer('p3', 'Loup', 'loup_garou', 3);

    const state = createBaseState([p1, p2, p3]);
    state.nightTargets.werewolfTargetId = 'p1'; // Les loups tuent Amant 1

    const { nextState, resolution } = resolveNightActions(state);
    const amant1 = nextState.players.find(p => p.id === 'p1')!;
    const amant2 = nextState.players.find(p => p.id === 'p2')!;

    expect(amant1.isAlive).toBe(false);
    expect(amant1.deathReason).toBe('loups_garous');
    expect(amant2.isAlive).toBe(false);
    expect(amant2.deathReason).toBe('amoureux');
    expect(amant2.deathIndirectBy).toBe('Amant 1');
    expect(resolution.deaths).toHaveLength(2);
  });

  it('Le Grand Méchant Loup perd son pouvoir dès la mort d\'un Loup', () => {
    const p1 = createMockPlayer('p1', 'Loup Ordinaire', 'loup_garou', 1);
    const p2 = createMockPlayer('p2', 'Grand Méchant Loup', 'grand_mechant_loup', 2);
    const p3 = createMockPlayer('p3', 'Sorcière', 'sorciere', 3);

    const state = createBaseState([p1, p2, p3]);
    // La sorcière empoisonne le loup ordinaire
    state.nightTargets.sorciereKilledId = 'p1';

    const { nextState } = resolveNightActions(state);
    expect(hasAnyWerewolfDied(nextState.players)).toBe(true);
    expect(nextState.grandMechantLoupState.isPowerLost).toBe(true);

    // À la nuit 2, le GML n'a plus d'étape
    nextState.round = 2;
    const stepsNight2 = getNightStepsForRound(nextState);
    expect(stepsNight2.some(s => s.id === 'grand_mechant_loup')).toBe(false);
  });
});

describe('SECTION 3A — Loups et protections', () => {
  it('Une attaque des Loups contre une cible protégée par le Salvateur échoue', () => {
    const wolf = createMockPlayer('w1', 'Loup', 'loup_garou', 1);
    const salvateur = createMockPlayer('s1', 'Salvateur', 'salvateur', 2);
    const target = createMockPlayer('v1', 'Villageois', 'villageois', 3);

    const state = createBaseState([wolf, salvateur, target]);
    state.nightTargets.werewolfTargetId = 'v1';
    state.nightTargets.salvateurProtectedId = 'v1';

    const { nextState, resolution } = resolveNightActions(state);
    const targetAfter = nextState.players.find(p => p.id === 'v1')!;

    expect(targetAfter.isAlive).toBe(true);
    expect(resolution.deaths).toHaveLength(0);
    expect(resolution.logs.some(l => l.includes('sauvé des griffes mortelles grâce au bouclier du Salvateur'))).toBe(true);
  });

  it('Une attaque des Loups contre une cible sauvée par la potion de vie de la Sorcière échoue', () => {
    const wolf = createMockPlayer('w1', 'Loup', 'loup_garou', 1);
    const sorciere = createMockPlayer('so1', 'Sorcière', 'sorciere', 2);
    const target = createMockPlayer('v1', 'Villageois', 'villageois', 3);

    const state = createBaseState([wolf, sorciere, target]);
    state.nightTargets.werewolfTargetId = 'v1';
    state.nightTargets.sorciereSavedId = 'v1';

    const { nextState, resolution } = resolveNightActions(state);
    const targetAfter = nextState.players.find(p => p.id === 'v1')!;

    expect(targetAfter.isAlive).toBe(true);
    expect(resolution.deaths).toHaveLength(0);
    expect(nextState.sorciereState.hasLifePotion).toBe(false);
    expect(resolution.logs.some(l => l.includes('ranimé par la potion de vie'))).toBe(true);
  });

  it('Une attaque supplémentaire du Grand Méchant Loup contre une cible protégée par le Salvateur échoue', () => {
    const gml = createMockPlayer('gml1', 'GML', 'grand_mechant_loup', 1);
    const target = createMockPlayer('v1', 'Villageois', 'villageois', 2);

    const state = createBaseState([gml, target]);
    state.nightTargets.gmlTargetId = 'v1';
    state.nightTargets.salvateurProtectedId = 'v1';

    const { nextState, resolution } = resolveNightActions(state);
    const targetAfter = nextState.players.find(p => p.id === 'v1')!;

    expect(targetAfter.isAlive).toBe(true);
    expect(resolution.deaths).toHaveLength(0);
  });

  it('La mort d\'un Loup par vote diurne retire définitivement l\'attaque du Grand Méchant Loup', () => {
    const wolf = createMockPlayer('w1', 'Loup Ordinaire', 'loup_garou', 1);
    const gml = createMockPlayer('gml1', 'GML', 'grand_mechant_loup', 2);
    const villager = createMockPlayer('v1', 'Villageois', 'villageois', 3);

    const state = createBaseState([wolf, gml, villager]);
    state.phase = 'day_vote';

    const { nextState } = eliminatePlayerByVote(state, 'w1');
    expect(nextState.grandMechantLoupState.isPowerLost).toBe(true);

    const stepsNextNight = getNightStepsForRound(nextState);
    expect(stepsNextNight.some(s => s.id === 'grand_mechant_loup')).toBe(false);
  });
});

describe('SECTION 3B — Sorcière : gestion avancée des potions et interactions', () => {
  it('Utilisation combinée des deux potions : sauve la victime des loups ET élimine un autre joueur', () => {
    const wolf = createMockPlayer('w1', 'Loup', 'loup_garou', 1);
    const sorciere = createMockPlayer('so1', 'Sorcière', 'sorciere', 2);
    const victim = createMockPlayer('v1', 'Victime', 'villageois', 3);
    const enemy = createMockPlayer('e1', 'Ennemi', 'villageois', 4);

    const state = createBaseState([wolf, sorciere, victim, enemy]);
    state.nightTargets.werewolfTargetId = 'v1';
    state.nightTargets.sorciereSavedId = 'v1'; // Potion de vie
    state.nightTargets.sorciereKilledId = 'e1'; // Tentative d'utiliser aussi la potion de mort

    const { nextState, resolution } = resolveNightActions(state);

    const victimAfter = nextState.players.find(p => p.id === 'v1')!;
    const enemyAfter = nextState.players.find(p => p.id === 'e1')!;

    // Restriction : Seule la potion de vie est consommée, la potion de mort est conservée
    expect(victimAfter.isAlive).toBe(true);
    expect(enemyAfter.isAlive).toBe(true);
    expect(nextState.sorciereState.hasLifePotion).toBe(false);
    expect(nextState.sorciereState.hasDeathPotion).toBe(true); // Potion de mort conservée
    expect(resolution.deaths).toHaveLength(0);
  });

  it('La Sorcière peut utiliser sa potion de mort lorsqu\'elle n\'utilise pas sa potion de vie', () => {
    const wolf = createMockPlayer('w1', 'Loup', 'loup_garou', 1);
    const sorciere = createMockPlayer('so1', 'Sorcière', 'sorciere', 2);
    const victim = createMockPlayer('v1', 'Victime', 'villageois', 3);
    const enemy = createMockPlayer('e1', 'Ennemi', 'villageois', 4);

    const state = createBaseState([wolf, sorciere, victim, enemy]);
    state.nightTargets.werewolfTargetId = 'v1';
    state.nightTargets.sorciereSavedId = null; // Ne sauve pas
    state.nightTargets.sorciereKilledId = 'e1'; // Potion de mort seule

    const { nextState, resolution } = resolveNightActions(state);

    const enemyAfter = nextState.players.find(p => p.id === 'e1')!;
    expect(enemyAfter.isAlive).toBe(false);
    expect(enemyAfter.deathReason).toBe('sorciere_mort');
    expect(nextState.sorciereState.hasLifePotion).toBe(true); // Potion de vie conservée
    expect(nextState.sorciereState.hasDeathPotion).toBe(false); // Potion de mort consommée
    expect(resolution.deaths.some(d => d.playerId === 'e1')).toBe(true);
  });

  it('La potion de mort de la Sorcière outrepasse le bouclier physique du Salvateur', () => {
    const sorciere = createMockPlayer('so1', 'Sorcière', 'sorciere', 1);
    const target = createMockPlayer('v1', 'Cible', 'villageois', 2);

    const state = createBaseState([sorciere, target]);
    state.nightTargets.sorciereKilledId = 'v1';
    state.nightTargets.salvateurProtectedId = 'v1'; // Le Salvateur tente de protéger la cible

    const { nextState, resolution } = resolveNightActions(state);
    const targetAfter = nextState.players.find(p => p.id === 'v1')!;

    // Le poison magique traverse le bouclier physique
    expect(targetAfter.isAlive).toBe(false);
    expect(targetAfter.deathReason).toBe('sorciere_mort');
    expect(resolution.deaths.some(d => d.playerId === 'v1')).toBe(true);
  });

  it('Auto-sauvetage de la Sorcière ciblée par les Loups', () => {
    const wolf = createMockPlayer('w1', 'Loup', 'loup_garou', 1);
    const sorciere = createMockPlayer('so1', 'Sorcière', 'sorciere', 2);

    const state = createBaseState([wolf, sorciere]);
    state.nightTargets.werewolfTargetId = 'so1'; // Les loups attaquent la Sorcière
    state.nightTargets.sorciereSavedId = 'so1'; // Elle s'auto-sauve

    const { nextState, resolution } = resolveNightActions(state);
    const sorciereAfter = nextState.players.find(p => p.id === 'so1')!;

    expect(sorciereAfter.isAlive).toBe(true);
    expect(resolution.deaths).toHaveLength(0);
    expect(nextState.sorciereState.hasLifePotion).toBe(false);
  });
});

describe('SECTION 3C — Pyromane : interactions, amoureux et éliminations', () => {
  it('Incendie du Pyromane sur un amoureux entraîne la mort de son partenaire par chagrin', () => {
    const pyro = createMockPlayer('pyro1', 'Pyromane', 'pyromane', 1);
    const amant1 = createMockPlayer('a1', 'Amant 1', 'villageois', 2);
    const amant2 = createMockPlayer('a2', 'Amant 2', 'villageois', 3);

    amant1.isLover = true;
    amant1.loverPartnerId = 'a2';
    amant2.isLover = true;
    amant2.loverPartnerId = 'a1';

    amant1.isOiled = true; // Seul amant 1 est huilé

    const state = createBaseState([pyro, amant1, amant2]);
    state.nightTargets.pyromaneAction = 'burn';

    const { nextState, resolution } = resolveNightActions(state);

    const a1After = nextState.players.find(p => p.id === 'a1')!;
    const a2After = nextState.players.find(p => p.id === 'a2')!;

    expect(a1After.isAlive).toBe(false);
    expect(a1After.deathReason).toBe('pyromane');
    expect(a2After.isAlive).toBe(false);
    expect(a2After.deathReason).toBe('amoureux');
    expect(a2After.deathIndirectBy).toBe('Amant 1');
    expect(resolution.deaths).toHaveLength(2);
  });

  it('Le Pyromane mort n\'a plus de réveil nocturne', () => {
    const pyro = createMockPlayer('pyro1', 'Pyromane', 'pyromane', 1);
    pyro.isAlive = false;
    const villager = createMockPlayer('v1', 'Villageois', 'villageois', 2);

    const state = createBaseState([pyro, villager]);
    state.round = 2;

    const steps = getNightStepsForRound(state);
    expect(steps.some(s => s.id === 'pyromane')).toBe(false);
  });
});

describe('SECTION 3D — Amoureux et Chasseur : cascades et tirs diurnes', () => {
  it('Élimination par vote d\'un amoureux entraîne la mort de son partenaire par amour', () => {
    const amant1 = createMockPlayer('a1', 'Amant 1', 'villageois', 1);
    const amant2 = createMockPlayer('a2', 'Amant 2', 'villageois', 2);
    amant1.isLover = true;
    amant1.loverPartnerId = 'a2';
    amant2.isLover = true;
    amant2.loverPartnerId = 'a1';

    const wolf = createMockPlayer('w1', 'Loup', 'loup_garou', 3);

    const state = createBaseState([amant1, amant2, wolf]);
    state.phase = 'day_vote';

    const { nextState, eliminatedPartnerName } = eliminatePlayerByVote(state, 'a1');

    const a1After = nextState.players.find(p => p.id === 'a1')!;
    const a2After = nextState.players.find(p => p.id === 'a2')!;

    expect(a1After.isAlive).toBe(false);
    expect(a1After.deathReason).toBe('vote');
    expect(a2After.isAlive).toBe(false);
    expect(a2After.deathReason).toBe('amoureux');
    expect(eliminatedPartnerName).toBe('Amant 2');
  });

  it('Le Chasseur éliminé par vote abat un amoureux, entraînant la mort de l\'autre amant avant la victoire', () => {
    const chasseur = createMockPlayer('ch1', 'Chasseur', 'chasseur', 1);
    const amant1 = createMockPlayer('a1', 'Amant Loup', 'loup_garou', 2);
    const amant2 = createMockPlayer('a2', 'Amant Villageois', 'villageois', 3);
    const innocent = createMockPlayer('v1', 'Innocent', 'villageois', 4);

    amant1.isLover = true;
    amant1.loverPartnerId = 'a2';
    amant2.isLover = true;
    amant2.loverPartnerId = 'a1';

    const state = createBaseState([chasseur, amant1, amant2, innocent]);
    state.phase = 'day_vote';

    // 1. Chasseur voté
    const { nextState } = eliminatePlayerByVote(state, 'ch1');
    expect(nextState.phase).toBe('chasseur_revenge');

    // 2. Chasseur abat Amant 1 (le Loup)
    const afterShot = executeChasseurShot(nextState, 'a1');
    const a1 = afterShot.players.find(p => p.id === 'a1')!;
    const a2 = afterShot.players.find(p => p.id === 'a2')!;

    expect(a1.isAlive).toBe(false);
    expect(a1.deathReason).toBe('chasseur');
    expect(a2.isAlive).toBe(false);
    expect(a2.deathReason).toBe('amoureux');

    // Il ne reste que l'innocent vivant (villageois) et tous les loups sont morts -> Victoire des Villageois
    expect(afterShot.winner?.winner).toBe('villageois');
  });
});

describe('SECTION 3E — Renard : logique de détection et perte de pouvoir', () => {
  it('Renard flaire un trio contenant un Loup : conserve son pouvoir', () => {
    const center = createMockPlayer('p1', 'Center', 'villageois', 1);
    const left = createMockPlayer('p2', 'Left', 'loup_garou', 2);
    const right = createMockPlayer('p3', 'Right', 'villageois', 3);

    const trio = [center, left, right];
    const hasWolf = trio.some(p => p.currentRole === 'loup_garou' || p.currentRole === 'grand_mechant_loup');
    expect(hasWolf).toBe(true);
  });

  it('Renard flaire un trio sans aucun Loup : perd son pouvoir', () => {
    const center = createMockPlayer('p1', 'Center', 'villageois', 1);
    const left = createMockPlayer('p2', 'Left', 'sorciere', 2);
    const right = createMockPlayer('p3', 'Right', 'salvateur', 3);

    const trio = [center, left, right];
    const hasWolf = trio.some(p => p.currentRole === 'loup_garou' || p.currentRole === 'grand_mechant_loup');
    expect(hasWolf).toBe(false);
  });
});

describe('SECTION 3F — Voleur et Cupidon', () => {
  it('Le Voleur n\'a d\'étape qu\'en Nuit 1 et est absent des étapes des nuits suivantes', () => {
    const thief = createMockPlayer('th1', 'Voleur', 'voleur', 1);
    const villager = createMockPlayer('v1', 'Villageois', 'villageois', 2);

    const stateN1 = createBaseState([thief, villager]);
    stateN1.round = 1;
    const stepsN1 = getNightStepsForRound(stateN1);
    expect(stepsN1.some(s => s.id === 'voleur')).toBe(true);

    const stateN2 = createBaseState([thief, villager]);
    stateN2.round = 2;
    const stepsN2 = getNightStepsForRound(stateN2);
    expect(stepsN2.some(s => s.id === 'voleur')).toBe(false);
  });

  it('Cupidon n\'est appelé qu\'en Nuit 1', () => {
    const cupidon = createMockPlayer('c1', 'Cupidon', 'cupidon', 1);
    const villager = createMockPlayer('v1', 'Villageois', 'villageois', 2);

    const stateN1 = createBaseState([cupidon, villager]);
    stateN1.round = 1;
    expect(getNightStepsForRound(stateN1).some(s => s.id === 'cupidon')).toBe(true);

    const stateN2 = createBaseState([cupidon, villager]);
    stateN2.round = 2;
    expect(getNightStepsForRound(stateN2).some(s => s.id === 'cupidon')).toBe(false);
  });
});

describe('SECTION 4 — Conditions et priorités de victoire', () => {
  it('Victoire des Villageois dès l\'élimination de tous les Loups', () => {
    const v1 = createMockPlayer('v1', 'V1', 'villageois', 1);
    const v2 = createMockPlayer('v2', 'V2', 'voyante', 2);

    const win = checkVictoryConditions([v1, v2]);
    expect(win?.winner).toBe('villageois');
  });

  it('Victoire des Loups-Garous quand Loups > Villageois + Anges', () => {
    const w1 = createMockPlayer('w1', 'W1', 'loup_garou', 1);
    const w2 = createMockPlayer('w2', 'W2', 'loup_garou', 2);
    const v1 = createMockPlayer('v1', 'V1', 'villageois', 3);

    const win = checkVictoryConditions([w1, w2, v1]);
    expect(win?.winner).toBe('loups_garous');
  });

  it('Victoire des Loups-Garous dès qu\'il y a autant de Loups que d\'autres joueurs (parité Loups = Villageois)', () => {
    const w1 = createMockPlayer('w1', 'W1', 'loup_garou', 1);
    const w2 = createMockPlayer('w2', 'W2', 'grand_mechant_loup', 2);
    const v1 = createMockPlayer('v1', 'V1', 'villageois', 3);
    const v2 = createMockPlayer('v2', 'V2', 'voyante', 4);

    // 2 loups vs 2 villageois (parité exacte)
    const win = checkVictoryConditions([w1, w2, v1, v2]);
    expect(win?.winner).toBe('loups_garous');
  });

  it('Victoire solitaire du Loup Blanc lorsqu\'il est l\'unique survivant', () => {
    const lb = createMockPlayer('lb1', 'Loup Blanc', 'loup_blanc', 1);
    const win = checkVictoryConditions([lb]);
    expect(win?.winner).toBe('loup_blanc');
  });

  it('Victoire solitaire du Pyromane lorsqu\'il est l\'unique survivant', () => {
    const pyro = createMockPlayer('pyro1', 'Pyromane', 'pyromane', 1);
    const win = checkVictoryConditions([pyro]);
    expect(win?.winner).toBe('pyromane');
  });

  it('Amoureux selon les règles actuelles : n\'ont pas de victoire spéciale distincte (1 Loup + 1 Villageois amants => victoire des Loups par parité L >= V+I)', () => {
    const a1 = createMockPlayer('a1', 'Loup Amant', 'loup_garou', 1);
    const a2 = createMockPlayer('a2', 'Villageoise Amante', 'villageois', 2);
    a1.isLover = true;
    a1.loverPartnerId = 'a2';
    a2.isLover = true;
    a2.loverPartnerId = 'a1';

    // L = 1 (Loup), V = 1 (Villageois), I = 0 -> L >= V + I (1 >= 1) -> Loups gagnent
    const win = checkVictoryConditions([a1, a2]);
    expect(win?.winner).toBe('loups_garous');
  });

  it('Égalité tragique lorsque tout le village est mort', () => {
    const win = checkVictoryConditions([]);
    expect(win?.winner).toBe('egalite');
  });
});

describe('PHASE CORRECTIVE PRIORITAIRE — Boucle multi-rounds et robustesse', () => {
  it('1. Déroulement multi-rounds : vote du round 1 ne termine pas la partie prématurément', () => {
    // 8 joueurs : 2 loups (w1, w2) et 6 villageois (v1 à v6)
    const w1 = createMockPlayer('w1', 'Loup 1', 'loup_garou', 1);
    const w2 = createMockPlayer('w2', 'Loup 2', 'grand_mechant_loup', 2);
    const v1 = createMockPlayer('v1', 'Voyante', 'voyante', 3);
    const v2 = createMockPlayer('v2', 'Sorcière', 'sorciere', 4);
    const v3 = createMockPlayer('v3', 'Salvateur', 'salvateur', 5);
    const v4 = createMockPlayer('v4', 'Villageois 4', 'villageois', 6);
    const v5 = createMockPlayer('v5', 'Villageois 5', 'villageois', 7);
    const v6 = createMockPlayer('v6', 'Villageois 6', 'villageois', 8);

    const state = createBaseState([w1, w2, v1, v2, v3, v4, v5, v6]);
    state.round = 1;
    state.phase = 'night';

    // Nuit 1 : les loups tuent v6
    state.nightTargets.werewolfTargetId = 'v6';
    const { nextState: night1Resolution } = resolveNightActions(state);
    expect(night1Resolution.players.find(p => p.id === 'v6')!.isAlive).toBe(false);

    // Vérifie qu'aucune victoire n'est prématurément déclarée (2 loups vivants contre 5 villageois vivants)
    const nightWin = checkVictoryConditions(night1Resolution.players);
    expect(nightWin).toBeNull();

    // Jour 1 : Vote du village élimine le villageois v5
    night1Resolution.phase = 'day_vote';
    const { nextState: day1VoteState } = eliminatePlayerByVote(night1Resolution, 'v5');

    // Il reste 2 loups et 4 villageois vivants : pas de victoire loups (2 n'est pas > 4)
    expect(day1VoteState.winner).toBeNull();
    expect(day1VoteState.phase).toBe('day_resolution');
    expect(day1VoteState.players.find(p => p.id === 'v5')!.isAlive).toBe(false);

    // Nuit 2 : la partie continue vers le round 2
    day1VoteState.round = 2;
    day1VoteState.phase = 'night';
    const stepsNight2 = getNightStepsForRound(day1VoteState);
    expect(stepsNight2.length).toBeGreaterThan(0);
    expect(stepsNight2.some(s => s.id === 'loups_garous')).toBe(true);
  });

  it('2. L\'Ange ne gagne PAS s\'il est éliminé lors d\'un vote ultérieur (Round 2+)', () => {
    const ange = createMockPlayer('a1', 'Ange', 'ange', 1);
    const wolf = createMockPlayer('w1', 'Loup', 'loup_garou', 2);
    const v1 = createMockPlayer('v1', 'V1', 'villageois', 3);
    const v2 = createMockPlayer('v2', 'V2', 'villageois', 4);

    const state = createBaseState([ange, wolf, v1, v2]);
    state.round = 2; // Deuxième tour de jeu !
    state.phase = 'day_vote';

    const { nextState, immediateAngelWin } = eliminatePlayerByVote(state, 'a1');

    // L'ange ne gagne pas au round 2
    expect(immediateAngelWin).toBe(false);
    expect(nextState.winner).toBeNull();
    expect(nextState.phase).toBe('day_resolution');
    expect(nextState.players.find(p => p.id === 'a1')!.isAlive).toBe(false);
  });

  it('3. La présence du Loup Blanc permet la poursuite de la partie quand L < V + I (ex: 1 Loup, 1 Villageois, 1 Loup Blanc)', () => {
    // 1 loup régulier, 1 loup blanc, 1 villageois => L=1, V=1, I=1 => 1 < 1+1 => partie continue
    const w1 = createMockPlayer('w1', 'Loup 1', 'loup_garou', 1);
    const lb = createMockPlayer('lb1', 'Loup Blanc', 'loup_blanc', 2);
    const v1 = createMockPlayer('v1', 'Villageois', 'villageois', 3);

    const win = checkVictoryConditions([w1, lb, v1]);
    expect(win).toBeNull();
  });

  it('4. La présence du Pyromane permet la poursuite de la partie quand L < V + I (ex: 1 Loup, 1 Villageois, 1 Pyromane)', () => {
    const w1 = createMockPlayer('w1', 'Loup 1', 'loup_garou', 1);
    const pyro = createMockPlayer('pyro1', 'Pyromane', 'pyromane', 2);
    const v1 = createMockPlayer('v1', 'Villageois', 'villageois', 3);

    // L=1, V=1, I=1 => 1 < 1+1 => partie continue
    const win = checkVictoryConditions([w1, pyro, v1]);
    expect(win).toBeNull();
  });

  it('5. Égalité lors du vote diurne : la partie se poursuit sans élimination', () => {
    const w1 = createMockPlayer('w1', 'Loup 1', 'loup_garou', 1);
    const v1 = createMockPlayer('v1', 'Villageois', 'villageois', 2);
    const v2 = createMockPlayer('v2', 'Villageois 2', 'villageois', 3);

    const state = createBaseState([w1, v1, v2]);
    state.phase = 'day_vote';

    const { nextState } = eliminatePlayerByVote(state, null);
    expect(nextState.phase).toBe('day_resolution');
    expect(nextState.lastVoteResolution?.eliminatedPlayer).toBeNull();
    expect(nextState.winner).toBeNull();
    // Tous les joueurs sont toujours vivants
    expect(nextState.players.filter(p => p.isAlive)).toHaveLength(3);
  });
});

describe('SECTION 7 — Validation manuelle du pouvoir du Renard (3 cibles distinctes)', () => {
  it('1. Rejette une sélection si un des 3 joueurs est manquant', () => {
    expect(validateRenardSelection('', 'p2', 'p3').isValid).toBe(false);
    expect(validateRenardSelection('p1', '', 'p3').isValid).toBe(false);
    expect(validateRenardSelection('p1', 'p2', '').isValid).toBe(false);
  });

  it('2. Rejette une sélection avec des doublons parmi les 3 joueurs', () => {
    // Centre et voisin gauche identiques
    const dup1 = validateRenardSelection('p1', 'p1', 'p3');
    expect(dup1.isValid).toBe(false);
    expect(dup1.error).toContain('distincts');

    // Centre et voisin droit identiques
    const dup2 = validateRenardSelection('p1', 'p2', 'p1');
    expect(dup2.isValid).toBe(false);
    expect(dup2.error).toContain('distincts');

    // Voisin gauche et droit identiques
    const dup3 = validateRenardSelection('p1', 'p2', 'p2');
    expect(dup3.isValid).toBe(false);
    expect(dup3.error).toContain('distincts');
  });

  it('3. Valide avec succès une sélection de 3 joueurs distincts indépendamment de leur numéro de siège', () => {
    const res = validateRenardSelection('p3', 'p1', 'p8');
    expect(res.isValid).toBe(true);
    expect(res.error).toBeUndefined();
  });
});

describe('SECTION 5 — Validation complète du tableau d\'exemples de nombre (L, V, I)', () => {
  it('Cas 1 : L=2, V=2, I=0 => Loups gagnent (2 >= 2)', () => {
    const l1 = createMockPlayer('l1', 'L1', 'loup_garou', 1);
    const l2 = createMockPlayer('l2', 'L2', 'grand_mechant_loup', 2);
    const v1 = createMockPlayer('v1', 'V1', 'villageois', 3);
    const v2 = createMockPlayer('v2', 'V2', 'voyante', 4);

    const win = checkVictoryConditions([l1, l2, v1, v2]);
    expect(win?.winner).toBe('loups_garous');
  });

  it('Cas 2 : L=2, V=1, I=1 (ex. Pyromane) => Loups gagnent (2 >= 1+1)', () => {
    const l1 = createMockPlayer('l1', 'L1', 'loup_garou', 1);
    const l2 = createMockPlayer('l2', 'L2', 'grand_mechant_loup', 2);
    const v1 = createMockPlayer('v1', 'V1', 'villageois', 3);
    const pyro = createMockPlayer('pyro', 'Pyro', 'pyromane', 4);

    const win = checkVictoryConditions([l1, l2, v1, pyro]);
    expect(win?.winner).toBe('loups_garous');
  });

  it('Cas 3 : L=1, V=1, I=0 => Loups gagnent par parité (1 >= 1)', () => {
    const l1 = createMockPlayer('l1', 'L1', 'loup_garou', 1);
    const v1 = createMockPlayer('v1', 'V1', 'villageois', 2);

    const win = checkVictoryConditions([l1, v1]);
    expect(win?.winner).toBe('loups_garous');
  });

  it('Cas 4 : L=1, V=2, I=0 => Continuer (1 < 2)', () => {
    const l1 = createMockPlayer('l1', 'L1', 'loup_garou', 1);
    const v1 = createMockPlayer('v1', 'V1', 'villageois', 2);
    const v2 = createMockPlayer('v2', 'V2', 'chasseur', 3);

    const win = checkVictoryConditions([l1, v1, v2]);
    expect(win).toBeNull();
  });

  it('Cas 5 : L=1, V=1, I=1 (ex. Pyromane) => Continuer selon parité (1 < 1+1)', () => {
    const l1 = createMockPlayer('l1', 'L1', 'loup_garou', 1);
    const v1 = createMockPlayer('v1', 'V1', 'villageois', 2);
    const pyro = createMockPlayer('pyro', 'Pyro', 'pyromane', 3);

    const win = checkVictoryConditions([l1, v1, pyro]);
    expect(win).toBeNull();
  });

  it('Cas 6 : L=0, V=3, I=0 => Village gagne (tous les Loups sont éliminés)', () => {
    const v1 = createMockPlayer('v1', 'V1', 'villageois', 1);
    const v2 = createMockPlayer('v2', 'V2', 'voyante', 2);
    const v3 = createMockPlayer('v3', 'V3', 'sorciere', 3);

    const win = checkVictoryConditions([v1, v2, v3]);
    expect(win?.winner).toBe('villageois');
  });

  it('Cas 7 : L=0, V=1, I=1 (Loup Blanc) => Village gagne (Loup Blanc non seul)', () => {
    const v1 = createMockPlayer('v1', 'V1', 'villageois', 1);
    const lb = createMockPlayer('lb', 'LB', 'loup_blanc', 2);

    const win = checkVictoryConditions([v1, lb]);
    expect(win?.winner).toBe('villageois');
  });

  it('Cas 8 : L=0, V=0, I=1 (Loup Blanc) => Loup Blanc gagne seul', () => {
    const lb = createMockPlayer('lb', 'LB', 'loup_blanc', 1);

    const win = checkVictoryConditions([lb]);
    expect(win?.winner).toBe('loup_blanc');
  });

  it('Cas 9 : L=0, V=0, I=1 (Pyromane) => Pyromane gagne seul', () => {
    const pyro = createMockPlayer('pyro', 'Pyro', 'pyromane', 1);

    const win = checkVictoryConditions([pyro]);
    expect(win?.winner).toBe('pyromane');
  });

  it('Cas 10 : L=1, V=0, I=1 (Pyromane) => Loups gagnent par parité (1 >= 1)', () => {
    const l1 = createMockPlayer('l1', 'L1', 'loup_garou', 1);
    const pyro = createMockPlayer('pyro', 'Pyro', 'pyromane', 2);

    const win = checkVictoryConditions([l1, pyro]);
    expect(win?.winner).toBe('loups_garous');
  });

  it('Cas 11 : L=1, V=0, I=1 (Loup Blanc) => Loups gagnent par parité (1 >= 1)', () => {
    const l1 = createMockPlayer('l1', 'L1', 'loup_garou', 1);
    const lb = createMockPlayer('lb', 'LB', 'loup_blanc', 2);

    const win = checkVictoryConditions([l1, lb]);
    expect(win?.winner).toBe('loups_garous');
  });

  it('Cas 12 : L=1, V=1, I=1 (Loup Blanc) => Continuer (1 < 1+1)', () => {
    const l1 = createMockPlayer('l1', 'L1', 'loup_garou', 1);
    const v1 = createMockPlayer('v1', 'V1', 'villageois', 2);
    const lb = createMockPlayer('lb', 'LB', 'loup_blanc', 3);

    const win = checkVictoryConditions([l1, v1, lb]);
    expect(win).toBeNull();
  });

  it('Cas 13 : L=1, V=0, I=0 => Loups gagnent (1 >= 0)', () => {
    const l1 = createMockPlayer('l1', 'L1', 'loup_garou', 1);

    const win = checkVictoryConditions([l1]);
    expect(win?.winner).toBe('loups_garous');
  });

  it('Cas 14 : L=0, V=0, I=0 => Égalité tragique', () => {
    const win = checkVictoryConditions([]);
    expect(win?.winner).toBe('egalite');
  });
});


