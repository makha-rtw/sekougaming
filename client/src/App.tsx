import React, { useState, useEffect } from 'react';
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
import { HubScreen, GameId } from './screens/HubScreen.js';
import { SmoothScroll } from './components/jawoo/SmoothScroll.js';
import { JawooIntroLoader } from './components/jawoo/JawooIntroLoader.js';
import { JawooPageTransition } from './components/jawoo/JawooPageTransition.js';
import { JawooMenuDrawer } from './components/jawoo/JawooMenuDrawer.js';
import { triggerJawooTransition, notifyPageReveal } from './animations/jawooEngine.js';
import LoupGarouApp from './games/loup-garou/LoupGarouApp.js';
import PolychessApp from './games/polychess/PolychessApp.js';
import SekouBombApp from './games/sekou-bomb/SekouBombApp.js';
import { WifiOff } from 'lucide-react';
import { sounds } from './utils/sound.js';

export type ActiveGame = 'hub' | 'sekouno' | 'loup_garou' | 'polychess' | 'sekou_bomb';

const GAME_TRANSITION_META: Record<ActiveGame, { label: string; subtitle: string }> = {
  hub: { label: 'Portail Principal', subtitle: 'SEKOUGAMING // CATALOGUE OFFICIEL' },
  sekouno: { label: 'Sekouno', subtitle: '01 // SALON DE CARTES EN LIGNE' },
  loup_garou: { label: 'Loups-Garous', subtitle: '02 // GRIMOIRE & VOIX NARRÉE' },
  polychess: { label: 'Polychess', subtitle: '03 // ÉCHECS FIDE & CLASSEMENT ELO' },
  sekou_bomb: { label: 'Sekou Bomb', subtitle: '04 // SURVIE LEXICALE SOUS PRESSION' },
};

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

  const [isMenuOpen, setIsMenuOpen] = useState(false);

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
        socket.emit(
          'reconnect_session',
          {
            roomCode: session.roomCode,
            sessionToken: session.sessionToken,
          },
          (res: any) => {
            if (!res.success) {
              clearSession();
            }
          }
        );
      }
    };

    const onDisconnect = () => {
      setIsConnected(false);
    };

    const onGameState = (state: ClientGameState) => {
      setGameState((prev) => {
        const statusChanged = prev?.public.status !== state.public.status;
        if (statusChanged && prev) {
          const statusLabels: Record<string, { label: string; sub: string }> = {
            waiting: { label: `Salon #${state.public.roomCode}`, sub: 'SEKOUNO // FOYER DE TABLE' },
            in_game: { label: 'La Manche Commence', sub: 'SEKOUNO // TABLE OFFICIELLE' },
            game_over: { label: 'Fin de Manche', sub: 'SEKOUNO // PALMARÈS' },
          };
          const meta = statusLabels[state.public.status];
          if (meta) {
            window.requestAnimationFrame(() => notifyPageReveal());
          }
        }
        return state;
      });
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
      triggerJawooTransition(
        'Casa Sekouno',
        () => {
          clearSession();
          setGameState(null);
          setErrorMessage(null);
        },
        'SALON FERMÉ'
      );
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
      triggerJawooTransition(
        'Casa Sekouno',
        () => {
          clearSession();
          setGameState(null);
          setErrorMessage(null);
        },
        'RETOUR AU SALON'
      );
    });
  };

  // Navigation helper with Jawoo Curtain Transition + history push + sound
  const handleSelectGame = (game: ActiveGame) => {
    if (game === activeGame) return;
    sounds.buttonClick();
    const meta = GAME_TRANSITION_META[game];
    triggerJawooTransition(
      meta.label,
      () => {
        if (typeof window !== 'undefined') {
          const url =
            game === 'hub'
              ? window.location.pathname
              : `${window.location.pathname}?game=${game}`;
          window.history.pushState({}, '', url);
        }
        setActiveGame(game);
      },
      meta.subtitle
    );
  };

  const handleQuickJoinFromPortal = (gameId: GameId, code: string) => {
    sounds.buttonClick();
    const meta = GAME_TRANSITION_META[gameId];
    triggerJawooTransition(
      `${meta.label} #${code}`,
      () => {
        if (gameId === 'sekouno') {
          setInvitedRoomCode(code);
        } else if (gameId === 'sekou_bomb') {
          setBombRoomCode(code);
        } else if (gameId === 'polychess') {
          setChessRoomCode(code);
        }
        if (typeof window !== 'undefined') {
          window.history.pushState({}, '', `${window.location.pathname}?game=${gameId}`);
        }
        setActiveGame(gameId);
      },
      'CONNEXION DIRECTE À LA TABLE'
    );
  };

  const handleReturnToHub = () => {
    sounds.buttonClick();
    const meta = GAME_TRANSITION_META.hub;
    triggerJawooTransition(
      meta.label,
      () => {
        if (typeof window !== 'undefined') {
          window.history.pushState({}, '', window.location.pathname);
        }
        setBombRoomCode(null);
        setChessRoomCode(null);
        setActiveGame('hub');
      },
      meta.subtitle
    );
  };

  // Sync browser back/forward buttons with active game state + curtain transition
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      let target: ActiveGame = 'hub';
      if (params.get('room') || params.get('game') === 'sekouno') {
        target = 'sekouno';
      } else if (params.get('game') === 'loup_garou') {
        target = 'loup_garou';
      } else if (params.get('game') === 'polychess' || params.get('chessRoom')) {
        target = 'polychess';
      } else if (params.get('game') === 'sekou_bomb' || params.get('bombRoom')) {
        target = 'sekou_bomb';
      }
      const meta = GAME_TRANSITION_META[target];
      triggerJawooTransition(
        meta.label,
        () => {
          setActiveGame(target);
        },
        meta.subtitle
      );
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  return (
    <SmoothScroll enabled={activeGame === 'hub'}>
      {/* 1. Jawoo.io Fullscreen Intro Loader (0% -> 100% Lerp + Curtain Lift) */}
      <JawooIntroLoader />

      {/* 2. Jawoo.io Horizontal Curtain Page Transition */}
      <JawooPageTransition />

      {/* 3. Jawoo.io Fullscreen Drawer Menu with Fan-Out Hover Previews */}
      <JawooMenuDrawer
        isOpen={isMenuOpen}
        activeGame={activeGame}
        onClose={() => setIsMenuOpen(false)}
        onSelectGame={handleSelectGame}
      />

      <div className="relative min-h-[100dvh] w-full overflow-x-hidden">
        {activeGame === 'hub' && (
          <HubScreen
            onSelectGame={(game) => handleSelectGame(game)}
            onOpenMenu={() => setIsMenuOpen(true)}
            onQuickJoinRoom={handleQuickJoinFromPortal}
          />
        )}

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
      </div>
    </SmoothScroll>
  );
};
