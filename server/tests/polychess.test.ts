import { describe, it, expect, beforeEach } from 'vitest';
import { PolychessDatabase } from '../src/polychess/db.js';
import { calculateElo, DEFAULT_ELO, K_FACTOR } from '../src/polychess/elo.js';

describe('POLYCHESS Elo Calculation Engine', () => {
  it('Scenario A: Two players at 1200 Elo - White wins -> approx +16 and -16 Elo', () => {
    const res = calculateElo(1200, 1200, 1);
    expect(res.playerA.expected).toBeCloseTo(0.5, 4);
    expect(res.playerB.expected).toBeCloseTo(0.5, 4);
    expect(res.playerA.change).toBe(16);
    expect(res.playerB.change).toBe(-16);
    expect(res.playerA.newElo).toBe(1216);
    expect(res.playerB.newElo).toBe(1184);
  });

  it('Scenario B: Two players at 1200 Elo - Draw -> no change', () => {
    const res = calculateElo(1200, 1200, 0.5);
    expect(res.playerA.change).toBe(0);
    expect(res.playerB.change).toBe(0);
    expect(res.playerA.newElo).toBe(1200);
    expect(res.playerB.newElo).toBe(1200);
  });

  it('Scenario C: Lower-rated player wins against higher-rated -> gains more points than 16', () => {
    const res = calculateElo(1100, 1300, 1);
    expect(res.playerA.expected).toBeLessThan(0.3);
    expect(res.playerA.change).toBeGreaterThan(16);
    expect(res.playerB.change).toBeLessThan(-16);
  });

  it('Scenario D: Higher-rated player loses to lower-rated -> loses more points than 16', () => {
    const res = calculateElo(1400, 1200, 0);
    expect(res.playerA.change).toBeLessThan(-16);
    expect(res.playerB.change).toBeGreaterThan(16);
  });
});

describe('POLYCHESS Database & User Accounts', () => {
  let db: PolychessDatabase;

  beforeEach(() => {
    db = new PolychessDatabase(':memory:');
  });

  it('creates accounts with validation and encrypted passwords', () => {
    const res = db.createUser('sekou_master', 'secret123', 'INF');
    expect(res.success).toBe(true);
    expect(res.user).toBeDefined();
    expect(res.user?.username).toBe('sekou_master');
    expect(res.user?.department).toBe('INF');
    expect(res.user?.elo).toBe(1200);

    // Verify authentication
    const authSuccess = db.verifyUser('sekou_master', 'secret123');
    expect(authSuccess.success).toBe(true);
    expect(authSuccess.user?.id).toBe(res.user?.id);

    // Wrong password
    const authWrong = db.verifyUser('sekou_master', 'badpass');
    expect(authWrong.success).toBe(false);
  });

  it('rejects duplicate usernames (case insensitive)', () => {
    const res1 = db.createUser('PlayerOne', 'pass123', 'TR');
    expect(res1.success).toBe(true);

    const res2 = db.createUser('playerone', 'pass456', 'Civil');
    expect(res2.success).toBe(false);
    expect(res2.error).toContain('déjà utilisé');
  });

  it('rejects invalid department codes', () => {
    const res = db.createUser('ValidUser', 'pass123', 'INVALID' as any);
    expect(res.success).toBe(false);
    expect(res.error).toContain('Département invalide');
  });

  it('Scenario E & F: Idempotent Elo finalization in database transactions', () => {
    const userA = db.createUser('Alice', 'pass123', 'INF').user!;
    const userB = db.createUser('Bob', 'pass123', 'MECA').user!;

    const gameId = 'game_test_1';
    db.createGame(gameId, userA.id, userB.id, '5m');

    // Finalize: Alice (white) wins
    const fin1 = db.finalizeGame(gameId, 'white', 'checkmate', '[]', 'fen_end');
    expect(fin1.success).toBe(true);
    expect(fin1.whiteEloChange).toBe(16);
    expect(fin1.blackEloChange).toBe(-16);
    expect(fin1.whiteNewElo).toBe(1216);
    expect(fin1.blackNewElo).toBe(1184);

    // Check user stats in DB
    const aliceDb = db.getUserById(userA.id)!;
    const bobDb = db.getUserById(userB.id)!;
    expect(aliceDb.elo).toBe(1216);
    expect(aliceDb.wins).toBe(1);
    expect(aliceDb.rankedGames).toBe(1);
    expect(bobDb.elo).toBe(1184);
    expect(bobDb.losses).toBe(1);
    expect(bobDb.rankedGames).toBe(1);

    // Scenario E: Double finalization attempt MUST NOT re-attribute Elo
    const fin2 = db.finalizeGame(gameId, 'white', 'checkmate', '[]', 'fen_end');
    expect(fin2.success).toBe(true);

    const aliceDbAgain = db.getUserById(userA.id)!;
    expect(aliceDbAgain.elo).toBe(1216);
    expect(aliceDbAgain.wins).toBe(1);

    // Match history
    const historyAlice = db.getUserMatchHistory(userA.id);
    expect(historyAlice.length).toBe(1);
    expect(historyAlice[0].result).toBe('win');
    expect(historyAlice[0].opponentUsername).toBe('Bob');
    expect(historyAlice[0].eloChange).toBe(16);
  });

  it('Scenario G: Leaderboards general and by department', () => {
    db.createUser('Alice', 'pass123', 'INF');
    db.createUser('Bob', 'pass123', 'INF');
    db.createUser('Charlie', 'pass123', 'TR');

    const general = db.getLeaderboard();
    expect(general.length).toBe(3);

    const infOnly = db.getLeaderboard('INF');
    expect(infOnly.length).toBe(2);
    expect(infOnly.every(u => u.department === 'INF')).toBe(true);

    const trOnly = db.getLeaderboard('TR');
    expect(trOnly.length).toBe(1);
    expect(trOnly[0].username).toBe('Charlie');
  });
});
