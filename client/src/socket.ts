import { io, Socket } from 'socket.io-client';

function getBackendUrl(): string {
  if (import.meta.env.VITE_BACKEND_URL) {
    return import.meta.env.VITE_BACKEND_URL;
  }
  if (import.meta.env.PROD) {
    return window.location.origin;
  }
  // In development, adapt to current hostname (localhost or LAN IP) on port 3001
  if (typeof window !== 'undefined' && window.location.hostname) {
    return `${window.location.protocol}//${window.location.hostname}:3001`;
  }
  return 'http://localhost:3001';
}

const URL = getBackendUrl();

export const socket: Socket = io(URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 15,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
});

export const SESSION_STORAGE_KEY = 'sekouno_session';

export interface SavedSession {
  roomCode: string;
  playerId: string;
  sessionToken: string;
  playerName: string;
}

export const LAST_PLAYER_NAME_KEY = 'sekouno_last_player_name';

export function saveLastPlayerName(name: string) {
  try {
    if (name && name.trim()) {
      localStorage.setItem(LAST_PLAYER_NAME_KEY, name.trim());
    }
  } catch {}
}

export function getLastPlayerName(): string {
  try {
    return localStorage.getItem(LAST_PLAYER_NAME_KEY) || getSavedSession()?.playerName || '';
  } catch {
    return '';
  }
}

export function saveSession(session: SavedSession) {
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  saveLastPlayerName(session.playerName);
}

export function getSavedSession(): SavedSession | null {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(SESSION_STORAGE_KEY);
}
