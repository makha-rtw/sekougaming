import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { ClientGameState, PlayableColor } from '../../shared/types.js';
import {
  socket,
  saveSession,
  getSavedSession,
  clearSession,
  getLastPlayerName,
} from './socket.js';
import { HomeScreen } from './screens/HomeScreen.js';
import { LobbyScreen } from './screens/LobbyScreen.js';
import { GameScreen } from './screens/GameScreen.js';
import { GameOverScreen } from './screens/GameOverScreen.js';
import { HubScreen } from './screens/HubScreen.js';
import {
  PlatformSplashScreen,
  preloadPortalAssets,
} from './components/PlatformSplashScreen.js';
import LoupGarouApp from './games/loup-garou/LoupGarouApp.js';
import PolychessApp from './games/polychess/PolychessApp.js';
import SekouBombApp from './games/sekou-bomb/SekouBombApp.js';
import { WifiOff } from 'lucide-react';
import { sounds } from './utils/sound.js';

export type ActiveGame = 'hub' | 'sekouno' | 'loup_garou' | 'polychess' | 'sekou_bomb';

export const App: React.FC = () => {
  const [activeGame, setActiveGame] = useState<ActiveGame>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('room')) return 'sekouno';
      if (params.get('game') === 'loup_garou') return 'loup_garou';
      if (params.get('game') === 'sekouno') return 'sekouno';
      if (params.get('game') === 'polychess' || params.get('chessRoom')) return 'polychess';
      if (params.get('game') === 'sekou_bomb' || params.get('bombRoom')) return 'sekou_bomb';
    }
    return 'hub';
  });

  const [bombRoomCode, setBombRoomCode] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const bombRoom = params.get('bombRoom');
      return bombRoom ? bombRoom.trim().toUpperCase() : null;
    }
    return null;
  });

  const [chessRoomCode, setChessRoomCode] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const chessRoom = params.get('chessRoom');
      return chessRoom ? chessRoom.trim().toUpperCase() : null;
    }
    return null;
  });

  const [invitedRoomCode, setInvitedRoomCode] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const room = params.get('room');
      return room ? room.trim().toUpperCase() : null;
    }
    return null;
  });

  const [gameState, setGameState] = useState<ClientGameState | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPortalReady, setIsPortalReady] = useState<boolean>(false);
  const [portalLoadProgress, setPortalLoadProgress] = useState<number>(0.08);

  // Preload and decode main portal visuals before revealing HubScreen
  useEffect(() => {
    let cancelled = false;
    const elapsedSinceNav = typeof performance !== 'undefined' ? performance.now() : 0;
    const minRemainingMs = elapsedSinceNav < 750 ? 750 - elapsedSinceNav : 220;

    const minDelayPromise = new Promise<void>((resolve) => {
      window.setTimeout(resolve, minRemainingMs);
    });

    const safetyTimeoutId = window.setTimeout(() => {
      if (!cancelled) {
        setPortalLoadProgress(1);
        setIsPortalReady(true);
      }
    }, 4500);

    const { promise, unsubscribe } = preloadPortalAssets((ratio) => {
      if (!cancelled) {
        setPortalLoadProgress(ratio);
      }
    });

    Promise.all([promise, minDelayPromise]).then(() => {
      if (!cancelled) {
        window.clearTimeout(safetyTimeoutId);
        setPortalLoadProgress(1);
        setIsPortalReady(true);
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
      window.clearTimeout(safetyTimeoutId);
    };
  }, []);

  // Signal active match status to the Service Worker controllerchange guard
  useEffect(() => {
    const inLiveMatch =
      activeGame !== 'hub' &&
      (activeGame !== 'sekouno' || gameState?.public.status === 'in_game');
    if (inLiveMatch) {
      document.documentElement.setAttribute('data-in-live-match', 'true');
    } else {
      document.documentElement.removeAttribute('data-in-live-match');
    }
  }, [activeGame, gameState?.public.status]);

  useEffect(() => {
    socket.connect();

    const onConnect = () => {
      setIsConnected(true);
      const session = getSavedSession();
      if (session) {
        socket.emit('reconnect_session', {
          roomCode: session.roomCode,
          sessionToken: session.sessionToken,
        }, (res: any) => {
          if (!res.success) {
            clearSession();
          }
        });
      }
    };

    const onDisconnect = () => {
      setIsConnected(false);
    };

    const onGameState = (state: ClientGameState) => {
      setGameState(state);
      setIsLoading(false);
      setErrorMessage(null);
      setInvitedRoomCode(null);
      if (typeof window !== 'undefined' && window.location.search.includes('room=')) {
        window.history.replaceState({}, '', `${window.location.pathname}?game=sekouno`);
      }
    };

    const onRoomClosed = ({ message }: { message: string }) => {
      clearSession();
      setGameState(null);
      setErrorMessage(message || "Le salon a été fermé par l'hôte.");
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('game_state', onGameState);
    socket.on('room_closed', onRoomClosed);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('game_state', onGameState);
      socket.off('room_closed', onRoomClosed);
    };
  }, []);

  // Check URL query parameters for invitation link (?room=CODE)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomFromUrl = params.get('room');
    if (roomFromUrl && !gameState) {
      const currentSession = getSavedSession();
      if (currentSession && currentSession.roomCode !== roomFromUrl.toUpperCase()) {
        clearSession();
      }
    }
  }, [gameState]);

  const handleCreateRoom = (playerName: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    socket.emit('create_room', { playerName }, (res: any) => {
      setIsLoading(false);
      if (res.success) {
        saveSession({
          roomCode: res.roomCode,
          playerId: res.playerId,
          sessionToken: res.sessionToken,
          playerName,
        });
      } else {
        setErrorMessage(res.error || 'Erreur lors de la création de la salle.');
      }
    });
  };

  const handleJoinRoom = (roomCode: string, playerName: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    socket.emit('join_room', { roomCode, playerName }, (res: any) => {
      setIsLoading(false);
      if (res.success) {
        saveSession({
          roomCode: res.roomCode,
          playerId: res.playerId,
          sessionToken: res.sessionToken,
          playerName,
        });
      } else {
        setErrorMessage(res.error || 'Erreur lors de la connexion à la salle.');
      }
    });
  };

  const handleStartGame = () => {
    setIsLoading(true);
    setErrorMessage(null);
    socket.emit('start_game', (res: any) => {
      setIsLoading(false);
      if (!res.success) {
        setErrorMessage(res.error || 'Impossible de démarrer la partie.');
      }
    });
  };

  const handlePlayCard = (cardId: string, chosenColor?: PlayableColor) => {
    setErrorMessage(null);
    socket.emit('play_card', { cardId, chosenColor }, (res: any) => {
      if (!res.success) {
        setErrorMessage(res.error || 'Action refusée.');
      }
    });
  };

  const handleDrawCard = () => {
    setErrorMessage(null);
    socket.emit('draw_card', (res: any) => {
      if (!res.success) {
        setErrorMessage(res.error || 'Impossible de piocher.');
      }
    });
  };

  const handlePassTurn = () => {
    setErrorMessage(null);
    socket.emit('pass_turn', (res: any) => {
      if (!res.success) {
        setErrorMessage(res.error || 'Impossible de passer son tour.');
      }
    });
  };

  const handleCallUno = () => {
    setErrorMessage(null);
    socket.emit('call_uno', (res: any) => {
      if (!res.success) {
        setErrorMessage(res.error || 'Impossible de déclarer UNO.');
      }
    });
  };

  const handleCatchUno = (targetPlayerId: string) => {
    setErrorMessage(null);
    socket.emit('catch_uno', { targetPlayerId }, (res: any) => {
      if (!res.success) {
        setErrorMessage(res.error || 'Action Contre-UNO impossible.');
      }
    });
  };

  const handleHostGivePenalty = (targetPlayerId: string, count: number) => {
    setErrorMessage(null);
    socket.emit('host_give_penalty', { targetPlayerId, count }, (res: any) => {
      if (!res.success) {
        setErrorMessage(res.error || 'Action refusée.');
      } else {
        sounds.penalty();
      }
    });
  };

  const handleCloseRoom = () => {
    if (!window.confirm('Voulez-vous vraiment fermer ce salon pour tous les joueurs ?')) {
      return;
    }
    socket.emit('close_room', () => {
      clearSession();
      setGameState(null);
      setErrorMessage(null);
    });
  };

  const handleRestartGame = () => {
    setIsLoading(true);
    setErrorMessage(null);
    socket.emit('restart_game', (res: any) => {
      setIsLoading(false);
      if (!res.success) {
        setErrorMessage(res.error || 'Impossible de relancer la partie.');
      }
    });
  };

  const handleReturnToLobby = () => {
    setIsLoading(true);
    setErrorMessage(null);
    socket.emit('return_to_lobby', (res: any) => {
      setIsLoading(false);
      if (!res.success) {
        setErrorMessage(res.error || 'Impossible de retourner au salon.');
      }
    });
  };

  const handleLeaveRoom = () => {
    socket.emit('leave_room', () => {
      clearSession();
      setGameState(null);
      setErrorMessage(null);
    });
  };

  const reduceMotion = useReducedMotion();

  // Navigation helper with history push and sound
  const handleSelectGame = (game: ActiveGame) => {
    sounds.buttonClick();
    if (typeof window !== 'undefined') {
      const url = game === 'hub' ? window.location.pathname : `${window.location.pathname}?game=${game}`;
      window.history.pushState({}, '', url);
    }
    setActiveGame(game);
  };

  const handleReturnToHub = () => {
    sounds.buttonClick();
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', window.location.pathname);
    }
    setBombRoomCode(null);
    setChessRoomCode(null);
    setActiveGame('hub');
  };

  // Sync browser back/forward buttons with active game state
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      if (params.get('room') || params.get('game') === 'sekouno') {
        setActiveGame('sekouno');
      } else if (params.get('game') === 'loup_garou') {
        setActiveGame('loup_garou');
      } else if (params.get('game') === 'polychess' || params.get('chessRoom')) {
        setActiveGame('polychess');
      } else if (params.get('game') === 'sekou_bomb' || params.get('bombRoom')) {
        setActiveGame('sekou_bomb');
      } else {
        setActiveGame('hub');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  return (
    <div className="relative min-h-[100dvh] w-full bg-[#0A0F1E] overflow-x-hidden">
      {/* 1. Platform Splash Screen on initial portal asset load */}
      <AnimatePresence>
        {!isPortalReady && (
          <PlatformSplashScreen key="platform-splash" progress={portalLoadProgress} />
        )}
      </AnimatePresence>

      {/* 2. Base Layer: Main Platform Portal (HubScreen) with smooth depth & scale when covered */}
      {isPortalReady && (
        <motion.div
          className="relative min-h-[100dvh] w-full"
          animate={
            reduceMotion
              ? { opacity: activeGame === 'hub' ? 1 : 0 }
              : activeGame === 'hub'
              ? { x: '0%', scale: 1, opacity: 1, filter: 'brightness(100%)' }
              : { x: '-8%', scale: 0.95, opacity: 0.45, filter: 'brightness(60%)' }
          }
          transition={{
            duration: 0.55,
            ease: [0.16, 1, 0.3, 1],
          }}
          style={{
            pointerEvents: activeGame === 'hub' ? 'auto' : 'none',
            transformOrigin: 'center center',
          }}
          inert={activeGame !== 'hub' ? true : undefined}
        >
          <HubScreen onSelectGame={(game) => handleSelectGame(game as ActiveGame)} />
        </motion.div>
      )}

      {/* 3. Top Layer: Smooth "Cover" Page Transition for Active Game */}
      <AnimatePresence initial={false}>
        {activeGame !== 'hub' && (
          <motion.div
            key={activeGame}
            className="fixed inset-0 z-40 overflow-y-auto overflow-x-hidden overscroll-contain bg-[#0A0F1E]"
            style={{
              boxShadow: '-24px 0 60px rgba(0, 0, 0, 0.85), -6px 0 20px rgba(0, 0, 0, 0.6)',
            }}
            initial={reduceMotion ? { opacity: 0 } : { x: '100%' }}
            animate={reduceMotion ? { opacity: 1 } : { x: '0%' }}
            exit={reduceMotion ? { opacity: 0 } : { x: '100%' }}
            transition={{
              duration: 0.52,
              ease: [0.16, 1, 0.3, 1], // Smooth snappy curve
            }}
          >
            {/* Visual sheet left border edge glow */}
            <div
              aria-hidden="true"
              className="pointer-events-none fixed left-0 top-0 bottom-0 w-2 z-50 bg-gradient-to-r from-white/10 to-transparent"
            />

            {/* Sub-game router */}
            {activeGame === 'sekou_bomb' && (
              <SekouBombApp
                socket={socket}
                initialRoomCode={bombRoomCode}
                onBackToHub={handleReturnToHub}
              />
            )}

            {activeGame === 'polychess' && (
              <PolychessApp
                socket={socket}
                initialRoomCode={chessRoomCode}
                onBackToHub={handleReturnToHub}
              />
            )}

            {activeGame === 'loup_garou' && (
              <LoupGarouApp onBackToHub={handleReturnToHub} />
            )}

            {activeGame === 'sekouno' && (
              <div className="relative min-h-screen text-slate-100 flex flex-col justify-between">
                {/* Offline / Reconnecting banner for Sekouno multiplayer */}
                {!isConnected && (
                  <div className="fixed top-0 inset-x-0 z-50 bg-red-600 text-white text-xs font-bold py-1.5 px-4 text-center flex items-center justify-center gap-2 shadow-lg">
                    <WifiOff className="w-4 h-4 animate-pulse" />
                    <span>Connexion perdue avec le serveur Sekouno. Reconnexion en cours...</span>
                  </div>
                )}

                {/* Screen Router */}
                {!gameState ? (
                  <HomeScreen
                    onCreateRoom={handleCreateRoom}
                    onJoinRoom={handleJoinRoom}
                    onBackToHub={handleReturnToHub}
                    invitedRoomCode={invitedRoomCode}
                    savedPlayerName={getLastPlayerName()}
                    isConnected={isConnected}
                    isLoading={isLoading}
                    error={errorMessage}
                  />
                ) : gameState.public.status === 'waiting' ? (
                  <LobbyScreen
                    publicState={gameState.public}
                    myPlayerId={gameState.myPlayerId}
                    onStartGame={handleStartGame}
                    onLeaveRoom={handleLeaveRoom}
                    onCloseRoom={handleCloseRoom}
                    isLoading={isLoading}
                    error={errorMessage}
                  />
                ) : gameState.public.status === 'in_game' ? (
                  <GameScreen
                    clientState={gameState}
                    onPlayCard={handlePlayCard}
                    onDrawCard={handleDrawCard}
                    onPassTurn={handlePassTurn}
                    onCallUno={handleCallUno}
                    onCatchUno={handleCatchUno}
                    onHostGivePenalty={handleHostGivePenalty}
                    onLeaveRoom={handleLeaveRoom}
                    onCloseRoom={handleCloseRoom}
                    error={errorMessage}
                  />
                ) : (
                  <GameOverScreen
                    publicState={gameState.public}
                    myPlayerId={gameState.myPlayerId}
                    onRestartGame={handleRestartGame}
                    onReturnToLobby={handleReturnToLobby}
                    onLeaveRoom={handleLeaveRoom}
                    isLoading={isLoading}
                  />
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
