import pg from 'pg';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { DepartmentCode, DEPARTMENTS, MatchHistoryItem, UserPublic } from '../../../shared/chessTypes.js';
import { calculateElo } from './elo.js';
import { IPolychessDatabase } from './dbInterface.js';

const { Pool } = pg;

export class PostgresPolychessDatabase implements IPolychessDatabase {
  private pool: pg.Pool;
  private initialized = false;

  constructor(connectionString: string) {
    this.pool = new Pool({
      connectionString,
      ssl: {
        rejectUnauthorized: false, // Required for Supabase / Neon cloud connections
      },
      max: 10,
      idleTimeoutMillis: 30000,
    });
  }

  public async init(): Promise<void> {
    if (this.initialized) return;

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        department TEXT NOT NULL,
        elo INTEGER NOT NULL DEFAULT 1200,
        ranked_games INTEGER NOT NULL DEFAULT 0,
        wins INTEGER NOT NULL DEFAULT 0,
        draws INTEGER NOT NULL DEFAULT 0,
        losses INTEGER NOT NULL DEFAULT 0,
        created_at BIGINT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_users_elo ON users (elo DESC, wins DESC, ranked_games ASC);
      CREATE INDEX IF NOT EXISTS idx_users_dept_elo ON users (department, elo DESC);

      CREATE TABLE IF NOT EXISTS games (
        id TEXT PRIMARY KEY,
        room_code TEXT,
        white_user_id TEXT NOT NULL REFERENCES users(id),
        black_user_id TEXT NOT NULL REFERENCES users(id),
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
        created_at BIGINT NOT NULL,
        ended_at BIGINT
      );

      CREATE INDEX IF NOT EXISTS idx_games_white ON games (white_user_id);
      CREATE INDEX IF NOT EXISTS idx_games_black ON games (black_user_id);

      CREATE TABLE IF NOT EXISTS elo_history (
        id TEXT PRIMARY KEY,
        game_id TEXT NOT NULL REFERENCES games(id),
        user_id TEXT NOT NULL REFERENCES users(id),
        elo_before INTEGER NOT NULL,
        elo_after INTEGER NOT NULL,
        change INTEGER NOT NULL,
        result TEXT NOT NULL,
        created_at BIGINT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_elo_history_user ON elo_history (user_id, created_at DESC);
    `);

    this.initialized = true;
    await this.seedDefaultTestAccounts();
  }

  private async seedDefaultTestAccounts(): Promise<void> {
    const res1 = await this.pool.query('SELECT id FROM users WHERE LOWER(username) = LOWER($1)', ['Joueur1']);
    if (res1.rows.length === 0) {
      await this.createUser('Joueur1', 'test1234', 'INF');
    }

    const res2 = await this.pool.query('SELECT id FROM users WHERE LOWER(username) = LOWER($2)', ['Joueur2']);
    if (res2.rows.length === 0) {
      await this.createUser('Joueur2', 'test1234', 'TR');
    }
  }

  public toPublicUser(row: any): UserPublic {
    return {
      id: row.id,
      username: row.username,
      department: row.department,
      departmentName: DEPARTMENTS[row.department as DepartmentCode] || row.department,
      elo: Number(row.elo),
      rankedGames: Number(row.ranked_games),
      wins: Number(row.wins),
      draws: Number(row.draws),
      losses: Number(row.losses),
      createdAt: Number(row.created_at),
    };
  }

  public async createUser(
    username: string,
    passwordPlain: string,
    department: DepartmentCode
  ): Promise<{ success: boolean; user?: UserPublic; error?: string }> {
    await this.init();

    const cleanUsername = username.trim();
    if (cleanUsername.length < 3 || cleanUsername.length > 20) {
      return { success: false, error: 'Le pseudo doit comporter entre 3 et 20 caractères.' };
    }

    if (!passwordPlain || passwordPlain.trim().length < 6) {
      return { success: false, error: 'Le mot de passe doit comporter au moins 6 caractères.' };
    }

    if (!DEPARTMENTS[department]) {
      return { success: false, error: 'Département invalide.' };
    }

    // Check unique username (case-insensitive)
    const existing = await this.pool.query(
      'SELECT id FROM users WHERE LOWER(username) = LOWER($1)',
      [cleanUsername]
    );
    if (existing.rows.length > 0) {
      return { success: false, error: 'Ce pseudo est déjà utilisé.' };
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(passwordPlain, salt);
    const id = `u_${crypto.randomUUID().slice(0, 12)}`;
    const now = Date.now();

    try {
      const insertRes = await this.pool.query(
        `INSERT INTO users (id, username, password_hash, department, elo, ranked_games, wins, draws, losses, created_at)
         VALUES ($1, $2, $3, $4, 1200, 0, 0, 0, 0, $5)
         RETURNING *`,
        [id, cleanUsername, passwordHash, department, now]
      );

      return { success: true, user: this.toPublicUser(insertRes.rows[0]) };
    } catch (err: any) {
      if (err.code === '23505') { // Postgres unique_violation
        return { success: false, error: 'Ce pseudo est déjà utilisé.' };
      }
      return { success: false, error: 'Erreur lors de la création du compte.' };
    }
  }

  public async verifyUser(
    username: string,
    passwordPlain: string
  ): Promise<{ success: boolean; user?: UserPublic; error?: string }> {
    await this.init();

    const res = await this.pool.query(
      'SELECT * FROM users WHERE LOWER(username) = LOWER($1)',
      [username.trim()]
    );
    const row = res.rows[0];
    if (!row) {
      return { success: false, error: 'Identifiants incorrects.' };
    }

    const match = bcrypt.compareSync(passwordPlain, row.password_hash);
    if (!match) {
      return { success: false, error: 'Identifiants incorrects.' };
    }

    return { success: true, user: this.toPublicUser(row) };
  }

  public async getUserById(id: string): Promise<UserPublic | null> {
    await this.init();
    const res = await this.pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return res.rows[0] ? this.toPublicUser(res.rows[0]) : null;
  }

  public async getUserByUsername(username: string): Promise<UserPublic | null> {
    await this.init();
    const res = await this.pool.query(
      'SELECT * FROM users WHERE LOWER(username) = LOWER($1)',
      [username.trim()]
    );
    return res.rows[0] ? this.toPublicUser(res.rows[0]) : null;
  }

  public async getLeaderboard(department?: DepartmentCode, limit: number = 50): Promise<UserPublic[]> {
    await this.init();
    if (department && DEPARTMENTS[department]) {
      const res = await this.pool.query(
        `SELECT * FROM users
         WHERE department = $1
         ORDER BY elo DESC, wins DESC, ranked_games ASC
         LIMIT $2`,
        [department, limit]
      );
      return res.rows.map((r) => this.toPublicUser(r));
    } else {
      const res = await this.pool.query(
        `SELECT * FROM users
         ORDER BY elo DESC, wins DESC, ranked_games ASC
         LIMIT $1`,
        [limit]
      );
      return res.rows.map((r) => this.toPublicUser(r));
    }
  }

  public async createGame(
    gameId: string,
    whiteUserId: string,
    blackUserId: string,
    timeControl: string,
    roomCode?: string
  ): Promise<void> {
    await this.init();
    await this.pool.query(
      `INSERT INTO games (id, room_code, white_user_id, black_user_id, time_control, final_fen, created_at)
       VALUES ($1, $2, $3, $4, $5, 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', $6)`,
      [gameId, roomCode || null, whiteUserId, blackUserId, timeControl, Date.now()]
    );
  }

  public async finalizeGame(
    gameId: string,
    winner: 'white' | 'black' | 'draw',
    endReason: string,
    movesJson: string,
    finalFen: string
  ): Promise<{
    success: boolean;
    whiteEloChange?: number;
    blackEloChange?: number;
    whiteNewElo?: number;
    blackNewElo?: number;
  }> {
    await this.init();

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const gameRes = await client.query('SELECT * FROM games WHERE id = $1 FOR UPDATE', [gameId]);
      const game = gameRes.rows[0];
      if (!game) {
        await client.query('ROLLBACK');
        return { success: false };
      }

      if (Number(game.is_finalized) === 1) {
        await client.query('COMMIT');
        return {
          success: true,
          whiteEloChange: Number(game.white_elo_change) || 0,
          blackEloChange: Number(game.black_elo_change) || 0,
          whiteNewElo: Number(game.white_elo_after) || 1200,
          blackNewElo: Number(game.black_elo_after) || 1200,
        };
      }

      const whiteRes = await client.query('SELECT * FROM users WHERE id = $1 FOR UPDATE', [game.white_user_id]);
      const blackRes = await client.query('SELECT * FROM users WHERE id = $1 FOR UPDATE', [game.black_user_id]);
      const whiteUser = whiteRes.rows[0];
      const blackUser = blackRes.rows[0];

      if (!whiteUser || !blackUser) {
        await client.query('ROLLBACK');
        return { success: false };
      }

      const whiteScore: 1 | 0.5 | 0 = winner === 'white' ? 1 : winner === 'black' ? 0 : 0.5;
      const eloCalc = calculateElo(Number(whiteUser.elo), Number(blackUser.elo), whiteScore);

      const now = Date.now();
      const whiteEloBefore = Number(whiteUser.elo);
      const blackEloBefore = Number(blackUser.elo);
      const whiteEloChange = eloCalc.playerA.change;
      const blackEloChange = eloCalc.playerB.change;
      const whiteNewElo = eloCalc.playerA.newElo;
      const blackNewElo = eloCalc.playerB.newElo;

      // Update game
      await client.query(
        `UPDATE games
         SET result = $1,
             end_reason = $2,
             moves_json = $3,
             final_fen = $4,
             white_elo_before = $5,
             white_elo_after = $6,
             white_elo_change = $7,
             black_elo_before = $8,
             black_elo_after = $9,
             black_elo_change = $10,
             is_finalized = 1,
             ended_at = $11
         WHERE id = $12`,
        [
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
          gameId,
        ]
      );

      // Update white user
      await client.query(
        `UPDATE users
         SET elo = $1,
             ranked_games = ranked_games + 1,
             wins = wins + $2,
             draws = draws + $3,
             losses = losses + $4
         WHERE id = $5`,
        [
          whiteNewElo,
          winner === 'white' ? 1 : 0,
          winner === 'draw' ? 1 : 0,
          winner === 'black' ? 1 : 0,
          whiteUser.id,
        ]
      );

      // Update black user
      await client.query(
        `UPDATE users
         SET elo = $1,
             ranked_games = ranked_games + 1,
             wins = wins + $2,
             draws = draws + $3,
             losses = losses + $4
         WHERE id = $5`,
        [
          blackNewElo,
          winner === 'black' ? 1 : 0,
          winner === 'draw' ? 1 : 0,
          winner === 'white' ? 1 : 0,
          blackUser.id,
        ]
      );

      // Record Elo history
      await client.query(
        `INSERT INTO elo_history (id, game_id, user_id, elo_before, elo_after, change, result, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          `eh_${crypto.randomUUID().slice(0, 10)}`,
          gameId,
          whiteUser.id,
          whiteEloBefore,
          whiteNewElo,
          whiteEloChange,
          winner === 'white' ? 'win' : winner === 'draw' ? 'draw' : 'loss',
          now,
        ]
      );

      await client.query(
        `INSERT INTO elo_history (id, game_id, user_id, elo_before, elo_after, change, result, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          `eh_${crypto.randomUUID().slice(0, 10)}`,
          gameId,
          blackUser.id,
          blackEloBefore,
          blackNewElo,
          blackEloChange,
          winner === 'black' ? 'win' : winner === 'draw' ? 'draw' : 'loss',
          now,
        ]
      );

      await client.query('COMMIT');

      return {
        success: true,
        whiteEloChange,
        blackEloChange,
        whiteNewElo,
        blackNewElo,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('[POLYCHESS POSTGRES DB] Error finalizing game:', err);
      return { success: false };
    } finally {
      client.release();
    }
  }

  public async getUserMatchHistory(userId: string, limit: number = 20): Promise<MatchHistoryItem[]> {
    await this.init();

    const res = await this.pool.query(
      `SELECT g.*,
              wu.username AS white_username,
              wu.department AS white_dept,
              bu.username AS black_username,
              bu.department AS black_dept
       FROM games g
       JOIN users wu ON g.white_user_id = wu.id
       JOIN users bu ON g.black_user_id = bu.id
       WHERE (g.white_user_id = $1 OR g.black_user_id = $1)
         AND g.is_finalized = 1
       ORDER BY g.ended_at DESC
       LIMIT $2`,
      [userId, limit]
    );

    return res.rows.map((r: any) => {
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
        date: Number(r.ended_at || r.created_at),
        opponentUsername,
        opponentDepartment,
        myColor,
        result,
        endReason: r.end_reason || 'checkmate',
        timeControl: r.time_control,
        eloBefore: isWhite ? Number(r.white_elo_before) : Number(r.black_elo_before),
        eloAfter: isWhite ? Number(r.white_elo_after) : Number(r.black_elo_after),
        eloChange: isWhite ? Number(r.white_elo_change) : Number(r.black_elo_change),
      };
    });
  }
}
