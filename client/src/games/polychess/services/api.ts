import { DepartmentCode, MatchHistoryItem, UserPublic } from '../../../../../shared/chessTypes.js';

const TOKEN_KEY = 'polychess_auth_token';

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function saveStoredToken(token: string) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {}
}

export function clearStoredToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {}
}

export async function registerUser(
  username: string,
  passwordPlain: string,
  confirmPasswordPlain: string,
  department: DepartmentCode
): Promise<{ success: boolean; token?: string; user?: UserPublic; error?: string }> {
  try {
    const res = await fetch('/api/polychess/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        password: passwordPlain,
        confirmPassword: confirmPasswordPlain,
        department,
      }),
    });
    const text = await res.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      return { success: false, error: `Erreur serveur (${res.status})` };
    }
    if (data.success && data.token) {
      saveStoredToken(data.token);
    }
    return data;
  } catch (err: any) {
    return { success: false, error: 'Impossible de joindre le serveur. Vérifiez votre connexion.' };
  }
}

export async function loginUser(
  username: string,
  passwordPlain: string
): Promise<{ success: boolean; token?: string; user?: UserPublic; error?: string }> {
  try {
    const res = await fetch('/api/polychess/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password: passwordPlain }),
    });
    const text = await res.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      return { success: false, error: `Erreur serveur (${res.status})` };
    }
    if (data.success && data.token) {
      saveStoredToken(data.token);
    }
    return data;
  } catch (err: any) {
    return { success: false, error: 'Impossible de joindre le serveur. Vérifiez votre connexion.' };
  }
}

export async function fetchCurrentUser(): Promise<UserPublic | null> {
  const token = getStoredToken();
  if (!token) return null;

  try {
    const res = await fetch('/api/polychess/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (data.success && data.user) {
      return data.user;
    }
    clearStoredToken();
    return null;
  } catch {
    return null;
  }
}

export async function fetchLeaderboard(department?: DepartmentCode): Promise<UserPublic[]> {
  try {
    const url = department
      ? `/api/polychess/leaderboard?department=${encodeURIComponent(department)}`
      : '/api/polychess/leaderboard';
    const res = await fetch(url);
    const data = await res.json();
    return data.leaderboard || [];
  } catch {
    return [];
  }
}

export async function fetchMatchHistory(): Promise<MatchHistoryItem[]> {
  const token = getStoredToken();
  if (!token) return [];

  try {
    const res = await fetch('/api/polychess/history', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    return data.history || [];
  } catch {
    return [];
  }
}
