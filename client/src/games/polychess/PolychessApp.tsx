import React, { useState, useEffect } from 'react';
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
  };

  const handleLogout = () => {
    clearStoredToken();
    setUser(null);
    setScreen('auth');
  };

  if (isLoadingAuth) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center p-4 text-amber-400">
        <Loader2 className="w-10 h-10 animate-spin mb-3" />
        <span className="text-xs font-bold text-slate-300">Chargement de Polychess...</span>
      </div>
    );
  }

  // 1. Auth Screen (when not logged in and trying to access main/online)
  if (!user || screen === 'auth') {
    return (
      <AuthScreen
        onSuccess={handleAuthSuccess}
        onBackToHub={onBackToHub}
      />
    );
  }

  // 2. Local Mode
  if (screen === 'local') {
    return <PolychessLocalScreen onBackToMenu={() => setScreen('main')} />;
  }

  // 3. Online Mode
  if (screen === 'online') {
    const token = getStoredToken() || '';
    return (
      <PolychessOnlineScreen
        socket={socket}
        currentUser={user}
        token={token}
        initialMode={onlineConfig.mode}
        timeControl={onlineConfig.timeControl}
        roomCodeToJoin={onlineConfig.roomCode}
        onBackToMenu={() => setScreen('main')}
        onUserEloUpdated={(newElo) => {
          setUser((prev) => (prev ? { ...prev, elo: newElo } : null));
        }}
      />
    );
  }

  // 4. Leaderboard Screen
  if (screen === 'leaderboard') {
    return (
      <PolychessLeaderboardScreen
        onBackToMenu={() => setScreen('main')}
        currentUserId={user.id}
      />
    );
  }

  // 5. Match History Screen
  if (screen === 'history') {
    return <PolychessHistoryScreen onBackToMenu={() => setScreen('main')} />;
  }

  // 6. Main Dashboard
  return (
    <PolychessMainScreen
      user={user}
      onPlayLocal={() => setScreen('local')}
      onQuickMatch={(tc) => {
        setOnlineConfig({ mode: 'quick', timeControl: tc });
        setScreen('online');
      }}
      onCreatePrivate={(tc) => {
        setOnlineConfig({ mode: 'create_private', timeControl: tc });
        setScreen('online');
      }}
      onJoinPrivate={(code) => {
        setOnlineConfig({ mode: 'join_private', timeControl: '5m', roomCode: code });
        setScreen('online');
      }}
      onOpenLeaderboard={() => setScreen('leaderboard')}
      onOpenHistory={() => setScreen('history')}
      onLogout={handleLogout}
      onBackToHub={onBackToHub}
    />
  );
};

export default PolychessApp;
