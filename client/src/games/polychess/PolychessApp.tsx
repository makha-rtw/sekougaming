import React, { useState, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { TimeControlKey, UserPublic } from '../../../../shared/chessTypes.js';
import { fetchCurrentUser, clearStoredToken, getStoredToken } from './services/api.js';
import { AuthScreen } from './screens/AuthScreen.js';
import { PolychessMainScreen } from './screens/PolychessMainScreen.js';
import { PolychessLocalScreen } from './screens/PolychessLocalScreen.js';
import { PolychessOnlineScreen } from './screens/PolychessOnlineScreen.js';
import { PolychessLeaderboardScreen } from './screens/PolychessLeaderboardScreen.js';
import { PolychessHistoryScreen } from './screens/PolychessHistoryScreen.js';
import { Loader2 } from 'lucide-react';
import {
  triggerJawooTransition,
  useScreenEnterChoreography,
} from '../../animations/jawooEngine.js';

export type PolychessScreen =
  | 'auth'
  | 'main'
  | 'local'
  | 'online'
  | 'leaderboard'
  | 'history';

interface PolychessAppProps {
  socket: Socket;
  onBackToHub: () => void;
  initialRoomCode?: string | null;
}

export const PolychessApp: React.FC<PolychessAppProps> = ({
  socket,
  onBackToHub,
  initialRoomCode,
}) => {
  const [user, setUser] = useState<UserPublic | null>(null);
  const [screen, setScreen] = useState<PolychessScreen>('auth');
  const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useScreenEnterChoreography(containerRef, [screen, isLoadingAuth]);

  const navigateScreen = (next: PolychessScreen, label: string, subtitle = 'POLYCHESS // FIDE ELO') => {
    triggerJawooTransition(label, () => setScreen(next), subtitle);
  };

  // Online game launch state
  const [onlineConfig, setOnlineConfig] = useState<{
    mode: 'quick' | 'create_private' | 'join_private';
    timeControl: TimeControlKey;
    roomCode?: string;
  }>({
    mode: 'quick',
    timeControl: '5m',
  });

  // Check existing session on mount
  useEffect(() => {
    let isMounted = true;
    const token = getStoredToken();

    if (token) {
      fetchCurrentUser()
        .then((currentUser) => {
          if (isMounted) {
            if (currentUser) {
              setUser(currentUser);
              if (initialRoomCode) {
                setOnlineConfig({
                  mode: 'join_private',
                  timeControl: '5m',
                  roomCode: initialRoomCode,
                });
                setScreen('online');
              } else {
                setScreen('main');
              }
            } else {
              setScreen('auth');
            }
            setIsLoadingAuth(false);
          }
        })
        .catch(() => {
          if (isMounted) {
            setScreen('auth');
            setIsLoadingAuth(false);
          }
        });
    } else {
      setIsLoadingAuth(false);
      setScreen('auth');
    }

    return () => {
      isMounted = false;
    };
  }, [initialRoomCode]);

  const handleAuthSuccess = (authenticatedUser: UserPublic) => {
    triggerJawooTransition(
      initialRoomCode ? `Salon #${initialRoomCode}` : 'Club Polychess',
      () => {
        setUser(authenticatedUser);
        if (initialRoomCode) {
          setOnlineConfig({
            mode: 'join_private',
            timeControl: '5m',
            roomCode: initialRoomCode,
          });
          setScreen('online');
        } else {
          setScreen('main');
        }
      },
      'POLYCHESS // BIENVENUE'
    );
  };

  const handleLogout = () => {
    triggerJawooTransition(
      'Connexion Polychess',
      () => {
        clearStoredToken();
        setUser(null);
        setScreen('auth');
      },
      'POLYCHESS // SESSION FERMÉE'
    );
  };

  if (isLoadingAuth) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center p-4 text-amber-400">
        <Loader2 className="w-10 h-10 animate-spin mb-3" />
        <span className="text-xs font-bold text-slate-300">Chargement de Polychess...</span>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="min-h-[100dvh] w-full">
      {/* 1. Auth Screen (when not logged in and trying to access main/online) */}
      {(!user || screen === 'auth') && (
        <AuthScreen onSuccess={handleAuthSuccess} onBackToHub={onBackToHub} />
      )}

      {/* 2. Local Mode */}
      {user && screen === 'local' && (
        <PolychessLocalScreen
          onBackToMenu={() => navigateScreen('main', 'Club Polychess')}
        />
      )}

      {/* 3. Online Mode */}
      {user && screen === 'online' && (
        <PolychessOnlineScreen
          socket={socket}
          currentUser={user}
          token={getStoredToken() || ''}
          initialMode={onlineConfig.mode}
          timeControl={onlineConfig.timeControl}
          roomCodeToJoin={onlineConfig.roomCode}
          onBackToMenu={() => navigateScreen('main', 'Club Polychess')}
          onUserEloUpdated={(newElo) => {
            setUser((prev) => (prev ? { ...prev, elo: newElo } : null));
          }}
        />
      )}

      {/* 4. Leaderboard Screen */}
      {user && screen === 'leaderboard' && (
        <PolychessLeaderboardScreen
          onBackToMenu={() => navigateScreen('main', 'Club Polychess')}
          currentUserId={user.id}
        />
      )}

      {/* 5. Match History Screen */}
      {user && screen === 'history' && (
        <PolychessHistoryScreen
          onBackToMenu={() => navigateScreen('main', 'Club Polychess')}
        />
      )}

      {/* 6. Main Dashboard */}
      {user && screen === 'main' && (
        <PolychessMainScreen
          user={user}
          onPlayLocal={() => navigateScreen('local', 'Échiquier Local', 'POLYCHESS // PASS & PLAY')}
          onQuickMatch={(tc) => {
            triggerJawooTransition(
              `Match Classé (${tc})`,
              () => {
                setOnlineConfig({ mode: 'quick', timeControl: tc });
                setScreen('online');
              },
              'POLYCHESS // ARÈNE EN LIGNE'
            );
          }}
          onCreatePrivate={(tc) => {
            triggerJawooTransition(
              `Salon Privé (${tc})`,
              () => {
                setOnlineConfig({ mode: 'create_private', timeControl: tc });
                setScreen('online');
              },
              'POLYCHESS // TABLE PRIVÉE'
            );
          }}
          onJoinPrivate={(code) => {
            triggerJawooTransition(
              `Salon #${code}`,
              () => {
                setOnlineConfig({ mode: 'join_private', timeControl: '5m', roomCode: code });
                setScreen('online');
              },
              'POLYCHESS // TABLE PRIVÉE'
            );
          }}
          onOpenLeaderboard={() =>
            navigateScreen('leaderboard', 'Classement Elo', 'POLYCHESS // CLASSEMENT OFFICIEL')
          }
          onOpenHistory={() =>
            navigateScreen('history', 'Historique des Matchs', 'POLYCHESS // ARCHIVES')
          }
          onLogout={handleLogout}
          onBackToHub={onBackToHub}
        />
      )}
    </div>
  );
};

export default PolychessApp;
