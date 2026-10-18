import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getPolychessDB } from './db.js';
import { DepartmentCode, VALID_DEPARTMENT_CODES } from '../../../shared/chessTypes.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'polychess_super_secure_jwt_secret_2026';

export interface AuthenticatedRequest extends Request {
  userId?: string;
  username?: string;
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Non authentifié.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string; username: string };
    req.userId = payload.userId;
    req.username = payload.username;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Session expirée ou invalide.' });
  }
}

// 1. Register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { username, password, confirmPassword, department } = req.body;

    if (!username || !password || !confirmPassword || !department) {
      return res.status(400).json({ error: 'Tous les champs sont obligatoires.' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Les mots de passe ne correspondent pas.' });
    }

    if (!VALID_DEPARTMENT_CODES.includes(department as DepartmentCode)) {
      return res.status(400).json({
        error: 'Département invalide. Choisissez parmi : INF, TR, Civil, MECA, G, GCBA.',
      });
    }

    const db = getPolychessDB();
    const createRes = await db.createUser(username, password, department as DepartmentCode);

    if (!createRes.success || !createRes.user) {
      return res.status(400).json({ error: createRes.error || 'Erreur lors de la création du compte.' });
    }

    const token = jwt.sign(
      { userId: createRes.user.id, username: createRes.user.username },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    return res.json({
      success: true,
      token,
      user: createRes.user,
    });
  } catch (err: any) {
    console.error('[POLYCHESS REGISTER ERROR]:', err);
    return res.status(500).json({ error: err.message || 'Erreur lors de la création du compte.' });
  }
});

// 2. Login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Veuillez renseigner le pseudo et le mot de passe.' });
    }

    const db = getPolychessDB();
    const verifyRes = await db.verifyUser(username, password);

    if (!verifyRes.success || !verifyRes.user) {
      return res.status(401).json({ error: verifyRes.error || 'Identifiants incorrects.' });
    }

    const token = jwt.sign(
      { userId: verifyRes.user.id, username: verifyRes.user.username },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    return res.json({
      success: true,
      token,
      user: verifyRes.user,
    });
  } catch (err: any) {
    console.error('[POLYCHESS LOGIN ERROR]:', err);
    return res.status(500).json({ error: err.message || 'Erreur lors de la connexion.' });
  }
});

// 3. Me (Current User Profile)
router.get('/me', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.userId) return res.status(401).json({ error: 'Non authentifié.' });

    const db = getPolychessDB();
    const user = await db.getUserById(req.userId);
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable.' });

    return res.json({ success: true, user });
  } catch (err: any) {
    console.error('[POLYCHESS ME ERROR]:', err);
    return res.status(500).json({ error: 'Erreur lors de la récupération du profil.' });
  }
});

// 4. Leaderboard (General or by Department)
router.get('/leaderboard', async (req: Request, res: Response) => {
  try {
    const dept = req.query.department as DepartmentCode | undefined;
    const db = getPolychessDB();
    const leaderboard = await db.getLeaderboard(dept);

    return res.json({ success: true, leaderboard });
  } catch (err: any) {
    console.error('[POLYCHESS LEADERBOARD ERROR]:', err);
    return res.status(500).json({ error: 'Erreur lors de la récupération du classement.' });
  }
});

// 5. Match History
router.get('/history', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.userId) return res.status(401).json({ error: 'Non authentifié.' });

    const db = getPolychessDB();
    const history = await db.getUserMatchHistory(req.userId, 50);

    return res.json({ success: true, history });
  } catch (err: any) {
    console.error('[POLYCHESS HISTORY ERROR]:', err);
    return res.status(500).json({ error: "Erreur lors de la récupération de l'historique." });
  }
});

export default router;
