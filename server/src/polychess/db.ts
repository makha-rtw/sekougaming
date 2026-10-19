// SQLite Database persistence for POLYCHESS using built-in node:sqlite
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { DepartmentCode, DEPARTMENTS, MatchHistoryItem, UserPublic } from '../../../shared/chessTypes.js';
import { calculateElo } from './elo.js';
import { IPolychessDatabase } from './dbInterface.js';
import { PostgresPolychessDatabase } from './postgresDb.js';

export interface UserRow {
  id: string;
  username: string;
  password_hash: string;
  department: DepartmentCode;
  elo: number;
  ranked_games: number;
  wins: number;
  draws: number;
  losses: number;
  created_at: number;
}

export interface GameRow {
  id: string;
  room_code: string | null;
  white_user_id: string;
  black_user_id: string;
  time_control: string;
  result: 'white' | 'black' | 'draw' | null;
  end_reason: string | null;
  moves_json: string;
  final_fen: string;
  white_elo_before: number | null;
  white_elo_after: number | null;
  white_elo_change: number | null;
  black_elo_before: number | null;
  black_elo_after: number | null;
  black_elo_change: number | null;
  is_ranked: number;
  is_finalized: number;
  created_at: number;
  ended_at: number | null;
}

export class PolychessDatabase implements IPolychessDatabase {
  public db: DatabaseSync;

  constructor(dbPath?: string) {
    if (dbPath === ':memory:') {
      this.db = new DatabaseSync(':memory:');
    } else {
      const resolvedPath = dbPath || path.resolve(process.cwd(), 'data/polychess.sqlite');
      const dir = path.dirname(resolvedPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      this.db = new DatabaseSync(resolvedPath);
    }

    this.initSchema();
    if (dbPath !== ':memory:') {
      this.seedDefaultTestAccounts();
    }
  }

  private seedDefaultTestAccounts() {
    const checkStmt = this.db.prepare('SELECT id FROM users WHERE username = ? COLLATE NOCASE');
    if (!checkStmt.get('Joueur1')) {
      this.createUser('Joueur1', 'test1234', 'INF');
    }
    if (!checkStmt.get('Joueur2')) {
      this.createUser('Joueur2', 'test1234', 'TR');
    }
  }

  private initSchema() {
    this.db.exec(`
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL COLLATE NOCASE,
        password_hash TEXT NOT NULL,
        department TEXT NOT NULL,
        elo INTEGER NOT NULL DEFAULT 1200,
        ranked_games INTEGER NOT NULL DEFAULT 0,
        wins INTEGER NOT NULL DEFAULT 0,
        draws INTEGER NOT NULL DEFAULT 0,
        losses INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_users_elo ON users (elo DESC, wins DESC, ranked_games ASC);
      CREATE INDEX IF NOT EXISTS idx_users_dept_elo ON users (department, elo DESC);

      CREATE TABLE IF NOT EXISTS games (
        id TEXT PRIMARY KEY,
        room_code TEXT,
        white_user_id TEXT NOT NULL,
        black_user_id TEXT NOT NULL,
        time_control TEXT NOT NULL,
        result TEXT,
        end_reason TEXT,
        moves_json TEXT NOT NULL DEFAULT '[]',
        final_fen TEXT NOT NULL,
        white_elo_before INTEGER,
        white_elo_after INTEGER,
        white_elo_change INTEGER,
        black_elo_before INTEGER,
        black_elo_after INTEGER,
        black_elo_change INTEGER,
        is_ranked INTEGER NOT NULL DEFAULT 1,
        is_finalized INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        ended_at INTEGER,
        FOREIGN KEY (white_user_id) REFERENCES users(id),
        FOREIGN KEY (black_user_id) REFERENCES users(id)
      );

      CREATE INDEX IF NOT EXISTS idx_games_white ON games (white_user_id);
      CREATE INDEX IF NOT EXISTS idx_games_black ON games (black_user_id);

      CREATE TABLE IF NOT EXISTS elo_history (
        id TEXT PRIMARY KEY,
        game_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        elo_before INTEGER NOT NULL,
        elo_after INTEGER NOT NULL,
        change INTEGER NOT NULL,
        result TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (game_id) REFERENCES games(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      CREATE INDEX IF NOT EXISTS idx_elo_history_user ON elo_history (user_id, created_at DESC);
    `);
  }

  public toPublicUser(row: UserRow): UserPublic {
    return {
      id: row.id,
      username: row.username,
      department: row.department,
      departmentName: DEPARTMENTS[row.department] || row.department,
      elo: row.elo,
      rankedGames: row.ranked_games,
      wins: row.wins,
      draws: row.draws,
      losses: row.losses,
      createdAt: row.created_at,
    };
  }

  // User Management
  public createUser(username: string, passwordPlain: string, department: DepartmentCode): { success: boolean; user?: UserPublic; error?: string } {
    const trimmed = username.trim();
    if (trimmed.length < 3 || trimmed.length > 20) {
      return { success: false, error: 'Le pseudo doit comporter entre 3 et 20 caractères.' };
    }
    if (!/^[a-zA-Z0-9_\-\u00C0-\u017F ]+$/.test(trimmed)) {
      return { success: false, error: 'Le pseudo ne peut contenir que des lettres, chiffres, espaces, tirets et underscores.' };
    }
    if (!DEPARTMENTS[department]) {
      return { success: false, error: 'Département invalide.' };
    }
    if (!passwordPlain || passwordPlain.trim().length < 6) {
      return { success: false, error: 'Le mot de passe doit comporter au moins 6 caractères.' };
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(passwordPlain, salt);
    const id = `u_${crypto.randomUUID().slice(0, 12)}`;
    const now = Date.now();

    try {
      const stmt = this.db.prepare(`
        INSERT INTO users (id, username, password_hash, department, elo, ranked_games, wins, draws, losses, created_at)
        VALUES (?, ?, ?, ?, 1200, 0, 0, 0, 0, ?)
      `);
      stmt.run(id, trimmed, passwordHash, department, now);

      const created = this.getUserById(id);
      if (!created) return { success: false, error: 'Erreur lors de la création du compte.' };
      return { success: true, user: created };
    } catch (err: any) {
      if (err.message && err.message.includes('UNIQUE constraint failed')) {
        return { success: false, error: 'Ce pseudo est déjà utilisé.' };
      }
      return { success: false, error: 'Erreur lors de la création du compte.' };
    }
  }

  public upsertUserMirror(user: UserPublic, passwordPlain: string): void {
    try {
      const salt = bcrypt.genSaltSync(10);
      const passwordHash = bcrypt.hashSync(passwordPlain, salt);
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO users (id, username, password_hash, department, elo, ranked_games, wins, draws, losses, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        user.id,
        user.username,
        passwordHash,
        user.department,
        user.elo,
        user.rankedGames,
        user.wins,
        user.draws,
        user.losses,
        user.createdAt || Date.now()
      );
    } catch {
      // Ignore mirror errors
    }
  }

  public verifyUser(username: string, passwordPlain: string): { success: boolean; user?: UserPublic; error?: string } {
    const stmt = this.db.prepare(`SELECT * FROM users WHERE username = ? COLLATE NOCASE`);
    const row = stmt.get(username.trim()) as UserRow | undefined;

    if (!row) {
      return { success: false, error: 'Identifiants incorrects.' };
    }

    const match =
      bcrypt.compareSync(passwordPlain, row.password_hash) ||
      bcrypt.compareSync(passwordPlain.trim(), row.password_hash);
    if (!match) {
      return { success: false, error: 'Identifiants incorrects.' };
    }

    return { success: true, user: this.toPublicUser(row) };
  }

  public getUserById(id: string): UserPublic | null {
    const stmt = this.db.prepare(`SELECT * FROM users WHERE id = ?`);
    const row = stmt.get(id) as UserRow | undefined;
    return row ? this.toPublicUser(row) : null;
  }

  public getUserByUsername(username: string): UserPublic | null {
    const stmt = this.db.prepare(`SELECT * FROM users WHERE username = ? COLLATE NOCASE`);
    const row = stmt.get(username.trim()) as UserRow | undefined;
    return row ? this.toPublicUser(row) : null;
  }

  // Leaderboard
  public getLeaderboard(department?: DepartmentCode, limit: number = 50): UserPublic[] {
    let stmt;
    if (department && DEPARTMENTS[department]) {
      stmt = this.db.prepare(`
        SELECT * FROM users
        WHERE department = ?
        ORDER BY elo DESC, wins DESC, ranked_games ASC
        LIMIT ?
      `);
      const rows = stmt.all(department, limit) as unknown as UserRow[];
      return rows.map(r => this.toPublicUser(r));
    } else {
      stmt = this.db.prepare(`
        SELECT * FROM users
        ORDER BY elo DESC, wins DESC, ranked_games ASC
        LIMIT ?
      `);
      const rows = stmt.all(limit) as unknown as UserRow[];
      return rows.map(r => this.toPublicUser(r));
    }
  }

  // Games & Elo Finalization
  public createGame(
    gameId: string,
    whiteUserId: string,
    blackUserId: string,
    timeControl: string,
    roomCode?: string
  ): void {
    const stmt = this.db.prepare(`
      INSERT INTO games (id, room_code, white_user_id, black_user_id, time_control, final_fen, created_at)
      VALUES (?, ?, ?, ?, ?, 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', ?)
    `);
    stmt.run(gameId, roomCode || null, whiteUserId, blackUserId, timeControl, Date.now());
  }

  /**
   * Finalizes a game atomically and calculates/updates Elo and user statistics.
   * Completely protected against double-counting via an atomic transaction and is_finalized check.
   */
  public finalizeGame(
    gameId: string,
    winner: 'white' | 'black' | 'draw',
    endReason: string,
    movesJson: string,
    finalFen: string
  ): {
    success: boolean;
    whiteEloChange?: number;
    blackEloChange?: number;
    whiteNewElo?: number;
    blackNewElo?: number;
  } {
    // 1. Check if game already finalized
    const checkStmt = this.db.prepare(`SELECT * FROM games WHERE id = ?`);
    const game = checkStmt.get(gameId) as GameRow | undefined;

    if (!game) {
      return { success: false };
    }

    if (game.is_finalized === 1) {
      // Idempotent: Return already computed changes
      return {
        success: true,
        whiteEloChange: game.white_elo_change || 0,
        blackEloChange: game.black_elo_change || 0,
        whiteNewElo: game.white_elo_after || 1200,
        blackNewElo: game.black_elo_after || 1200,
      };
    }

    const whiteStmt = this.db.prepare(`SELECT * FROM users WHERE id = ?`);
    const blackStmt = this.db.prepare(`SELECT * FROM users WHERE id = ?`);

    const whiteUser = whiteStmt.get(game.white_user_id) as UserRow | undefined;
    const blackUser = blackStmt.get(game.black_user_id) as UserRow | undefined;

    if (!whiteUser || !blackUser) {
      return { success: false };
    }

    // 2. Calculate Elo
    const whiteScore: 1 | 0.5 | 0 = winner === 'white' ? 1 : winner === 'black' ? 0 : 0.5;
    const eloCalc = calculateElo(whiteUser.elo, blackUser.elo, whiteScore);

    const now = Date.now();
    const whiteEloBefore = whiteUser.elo;
    const blackEloBefore = blackUser.elo;
    const whiteEloChange = eloCalc.playerA.change;
    const blackEloChange = eloCalc.playerB.change;
    const whiteNewElo = eloCalc.playerA.newElo;
    const blackNewElo = eloCalc.playerB.newElo;

    // 3. Atomic Transaction
    this.db.exec('BEGIN TRANSACTION;');

    try {
      // Re-verify inside transaction to prevent race conditions
      const recheck = checkStmt.get(gameId) as GameRow | undefined;
      if (!recheck || recheck.is_finalized === 1) {
        this.db.exec('ROLLBACK;');
        return {
          success: true,
          whiteEloChange: recheck?.white_elo_change || 0,
          blackEloChange: recheck?.black_elo_change || 0,
          whiteNewElo: recheck?.white_elo_after || 1200,
          blackNewElo: recheck?.black_elo_after || 1200,
        };
      }

      // Update game
      const updateGameStmt = this.db.prepare(`
        UPDATE games
        SET result = ?,
            end_reason = ?,
            moves_json = ?,
            final_fen = ?,
            white_elo_before = ?,
            white_elo_after = ?,
            white_elo_change = ?,
            black_elo_before = ?,
            black_elo_after = ?,
            black_elo_change = ?,
            is_finalized = 1,
            ended_at = ?
        WHERE id = ?
      `);
      updateGameStmt.run(
        winner,
        endReason,
        movesJson,
        finalFen,
        whiteEloBefore,
        whiteNewElo,
        whiteEloChange,
        blackEloBefore,
        blackNewElo,
        blackEloChange,
        now,
        gameId
      );

      // Update white user
      const whiteWinsInc = winner === 'white' ? 1 : 0;
      const whiteDrawsInc = winner === 'draw' ? 1 : 0;
      const whiteLossesInc = winner === 'black' ? 1 : 0;

      const updateWhiteStmt = this.db.prepare(`
        UPDATE users
        SET elo = ?,
            ranked_games = ranked_games + 1,
            wins = wins + ?,
            draws = draws + ?,
            losses = losses + ?
        WHERE id = ?
      `);
      updateWhiteStmt.run(whiteNewElo, whiteWinsInc, whiteDrawsInc, whiteLossesInc, whiteUser.id);

      // Update black user
      const blackWinsInc = winner === 'black' ? 1 : 0;
      const blackDrawsInc = winner === 'draw' ? 1 : 0;
      const blackLossesInc = winner === 'white' ? 1 : 0;

      const updateBlackStmt = this.db.prepare(`
        UPDATE users
        SET elo = ?,
            ranked_games = ranked_games + 1,
            wins = wins + ?,
            draws = draws + ?,
            losses = losses + ?
        WHERE id = ?
      `);
      updateBlackStmt.run(blackNewElo, blackWinsInc, blackDrawsInc, blackLossesInc, blackUser.id);

      // Insert Elo History
      const histStmt = this.db.prepare(`
        INSERT INTO elo_history (id, game_id, user_id, elo_before, elo_after, change, result, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      histStmt.run(
        `eh_${crypto.randomUUID().slice(0, 10)}`,
        gameId,
        whiteUser.id,
        whiteEloBefore,
        whiteNewElo,
        whiteEloChange,
        winner === 'white' ? 'win' : winner === 'draw' ? 'draw' : 'loss',
        now
      );

      histStmt.run(
        `eh_${crypto.randomUUID().slice(0, 10)}`,
        gameId,
        blackUser.id,
        blackEloBefore,
        blackNewElo,
        blackEloChange,
        winner === 'black' ? 'win' : winner === 'draw' ? 'draw' : 'loss',
        now
      );

      this.db.exec('COMMIT;');

      return {
        success: true,
        whiteEloChange,
        blackEloChange,
        whiteNewElo,
        blackNewElo,
      };
    } catch (err) {
      this.db.exec('ROLLBACK;');
      console.error('[POLYCHESS DB] Error finalizing game:', err);
      return { success: false };
    }
  }

  // Match History
  public getUserMatchHistory(userId: string, limit: number = 20): MatchHistoryItem[] {
    const stmt = this.db.prepare(`
      SELECT g.*,
             wu.username AS white_username,
             wu.department AS white_dept,
             bu.username AS black_username,
             bu.department AS black_dept
      FROM games g
      JOIN users wu ON g.white_user_id = wu.id
      JOIN users bu ON g.black_user_id = bu.id
      WHERE (g.white_user_id = ? OR g.black_user_id = ?)
        AND g.is_finalized = 1
      ORDER BY g.ended_at DESC
      LIMIT ?
    `);

    const rows = stmt.all(userId, userId, limit) as any[];

    return rows.map((r) => {
      const isWhite = r.white_user_id === userId;
      const myColor = isWhite ? 'w' : 'b';
      const opponentUsername = isWhite ? r.black_username : r.white_username;
      const opponentDepartment = isWhite ? r.black_dept : r.white_dept;

      let result: 'win' | 'loss' | 'draw';
      if (r.result === 'draw') {
        result = 'draw';
      } else if ((r.result === 'white' && isWhite) || (r.result === 'black' && !isWhite)) {
        result = 'win';
      } else {
        result = 'loss';
      }

      return {
        id: r.id,
        date: r.ended_at || r.created_at,
        opponentUsername,
        opponentDepartment,
        myColor,
        result,
        endReason: r.end_reason || 'checkmate',
        timeControl: r.time_control,
        eloBefore: isWhite ? r.white_elo_before : r.black_elo_before,
        eloAfter: isWhite ? r.white_elo_after : r.black_elo_after,
        eloChange: isWhite ? r.white_elo_change : r.black_elo_change,
      };
    });
  }
}

// Global Singleton for the application
let dbInstance: IPolychessDatabase | null = null;

export function getPolychessDB(): IPolychessDatabase {
  if (!dbInstance) {
    if (process.env.DATABASE_URL) {
      console.log('[POLYCHESS] Initializing persistent PostgreSQL database from DATABASE_URL');
      dbInstance = new PostgresPolychessDatabase(process.env.DATABASE_URL);
    } else {
      dbInstance = new PolychessDatabase();
    }
  }
  return dbInstance;
}
