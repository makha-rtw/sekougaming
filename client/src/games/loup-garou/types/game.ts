export type RoleId =
  | 'loup_garou'
  | 'grand_mechant_loup'
  | 'infect_pere_des_loups'
  | 'loup_blanc'
  | 'villageois'
  | 'voyante'
  | 'petite_fille'
  | 'renard'
  | 'sorciere'
  | 'salvateur'
  | 'ancien'
  | 'corbeau'
  | 'enfant_sauvage'
  | 'idiot_du_village'
  | 'montreur_ours'
  | 'necromancien'
  | 'insomniaque'
  | 'ange'
  | 'chasseur'
  | 'cupidon'
  | 'voleur'
  | 'pyromane'
  | 'chien_loup';

export type CampType = 'loups_garous' | 'villageois' | 'independant';

export interface RoleDefinition {
  id: RoleId;
  name: string;
  camp: CampType;
  description: string;
  shortPower: string;
  nightInstructions: string;
  moderatorSpeech: string;
  iconName: string;
  colorScheme: {
    bg: string;
    text: string;
    border: string;
    badgeBg: string;
  };
  isUnique: boolean;
  isOptional: boolean;
  defaultIncluded: boolean;
  wakesAtNight: boolean;
}

export type DeathReason =
  | 'loups_garous'
  | 'grand_mechant_loup'
  | 'loup_blanc'
  | 'sorciere_mort'
  | 'pyromane'
  | 'amoureux'
  | 'vote'
  | 'chasseur';

export interface PlayerRoleHistory {
  role: RoleId;
  round: number;
  phase: string;
  note: string;
}

export interface Player {
  id: string;
  name: string;
  seatNumber: number;
  currentRole: RoleId;
  initialRole: RoleId;
  roleHistory: PlayerRoleHistory[];
  isAlive: boolean;
  deathReason: DeathReason | null;
  deathRound: number | null;
  deathPhase: 'night' | 'day' | null;
  deathIndirectBy: string | null;
  isProtected: boolean;
  isOiled: boolean;
  isLover: boolean;
  loverPartnerId: string | null;
  hasLostVoteRight?: boolean;
  isInfected?: boolean;
}

export interface SorciereState {
  hasLifePotion: boolean;
  hasDeathPotion: boolean;
}

export interface SalvateurState {
  lastProtectedId: string | null;
}

export interface GrandMechantLoupState {
  isPowerLost: boolean; // Lost if any werewolf has been killed
}

export interface RenardState {
  hasPower: boolean; // Lost if scan reveals 0 werewolves
}

export interface InfectState {
  hasInfected: boolean; // Once per game
}

export interface AncienState {
  hasSurvivedFirstWolfAttack: boolean;
  villagePowersLost: boolean;
}

export interface EnfantSauvageState {
  modelPlayerId: string | null;
  actionDone: boolean;
}

export interface IdiotState {
  isRevealedAndGraced: boolean;
}

export interface NecromancienState {
  hasUsedRevive: boolean;
}

export interface InsomniaqueState {
  lastBlockedId: string | null;
}

export interface NightTargets {
  voleurTargetId: string | null;
  cupidonLover1Id: string | null;
  cupidonLover2Id: string | null;
  chienLoupChoice: 'villageois' | 'loup_garou' | null;
  enfantSauvageModelId: string | null;
  insomniaqueTargetId: string | null;
  salvateurProtectedId: string | null;
  voyanteRevealedPlayerId: string | null;
  renardCheckedIds: [string, string, string] | null;
  renardResultHasWolf: boolean | null;
  werewolfTargetId: string | null;
  infectUsedThisNight: boolean;
  gmlTargetId: string | null;
  loupBlancTargetId: string | null;
  pyromaneAction: 'oil' | 'burn' | 'none' | null;
  pyromaneOiledTargetId: string | null;
  sorciereSavedId: string | null;
  sorciereKilledId: string | null;
  corbeauTargetId: string | null;
  necromancienAction: 'commune' | 'revive' | 'none' | null;
  necromancienTargetId: string | null;
}

export interface DeadAnnouncement {
  playerId: string;
  playerName: string;
  currentRole: RoleId;
  initialRole: RoleId;
  deathReason: DeathReason;
  deathIndirectBy: string | null;
}

export interface NightResolutionResult {
  deaths: DeadAnnouncement[];
  logs: string[];
  bearGrowled?: boolean | null;
  corbeauTargetedPlayerId?: string | null;
  corbeauTargetedPlayerName?: string | null;
  revivedPlayerName?: string | null;
  infectedPlayerName?: string | null;
}

export type WinType =
  | 'loups_garous'
  | 'villageois'
  | 'ange'
  | 'loup_blanc'
  | 'amoureux'
  | 'pyromane'
  | 'egalite';

export interface WinResult {
  winner: WinType;
  title: string;
  subtitle: string;
  description: string;
  winningPlayerIds: string[];
}

export type GamePhase =
  | 'lobby_config'
  | 'pass_and_play'
  | 'roster_ready'
  | 'night'
  | 'night_resolution'
  | 'day_wake'
  | 'day_vote'
  | 'day_resolution'
  | 'chasseur_revenge'
  | 'game_over';

export interface VoteResolutionInfo {
  eliminatedPlayer: Player | null;
  idiotGracedPlayer?: Player | null;
  ancienPowerLossTriggered?: boolean;
  cascadePartner: Player | null;
  chasseurShotVictim?: Player | null;
  chasseurShotLover?: Player | null;
  immediateAngelWin: boolean;
  chasseurShotNeeded: boolean;
}

export interface GameLogEntry {
  id: string;
  round: number;
  phase: 'lobby' | 'distribution' | 'night' | 'day';
  timestamp: string;
  text: string;
  type: 'info' | 'action' | 'death' | 'victory';
}

export interface NightStep {
  id: string;
  roleId: RoleId;
  title: string;
  subTitle: string;
  speech: string;
  noteForModerator: string;
  isFirstNightOnly?: boolean;
}

export interface GameState {
  phase: GamePhase;
  round: number;
  totalPlayers: number;
  roleConfig: Record<RoleId, number>;
  players: Player[];
  currentPassPlayerIndex: number;
  nightStepIndex: number;
  activeNightSteps: NightStep[];
  nightTargets: NightTargets;
  lastNightResolution: NightResolutionResult | null;
  lastVoteResolution: VoteResolutionInfo | null;
  sorciereState: SorciereState;
  salvateurState: SalvateurState;
  grandMechantLoupState: GrandMechantLoupState;
  renardState: RenardState;
  infectState: InfectState;
  ancienState: AncienState;
  enfantSauvageState: EnfantSauvageState;
  idiotState: IdiotState;
  necromancienState: NecromancienState;
  insomniaqueState: InsomniaqueState;
  chienLoupActionDone: boolean;
  thiefActionDone: boolean;
  cupidonActionDone: boolean;
  pendingChasseurShot: { hunterPlayerId: string } | null;
  winner: WinResult | null;
  gameLog: GameLogEntry[];
}


