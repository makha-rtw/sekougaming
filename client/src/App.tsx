import React, { useState, useEffect } from 'react';
import { ClientGameState, PlayableColor } from '../../shared/types.js';
import {
  socket,
  saveSession,
  getSavedSession,
  clearSession,
} from './socket.js';
import { HomeScreen } from './screens/HomeScreen.js';
import { LobbyScreen } from './screens/LobbyScreen.js';
import { GameScreen } from './screens/GameScreen.js';
import { GameOverScreen } from './screens/GameOverScreen.js';
import { HubScreen } from './screens/HubScreen.js';
import LoupGarouApp from './games/loup-garou/LoupGarouApp.js';
import { WifiOff } from 'lucide-react';
import { sounds } from './utils/sound.js';

export type ActiveGame = 'hub' | 'sekouno' | 'loup_garou';

export const App: React.FC = () => {
  const [activeGame, setActiveGame] = useState<ActiveGame>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('room')) return 'sekouno';
      if (params.get('game') === 'loup_garou') return 'loup_garou';
      if (params.get('game') === 'sekouno') return 'sekouno';
    }
    return 'hub';
  });

  const [gameState, setGameState] = useState<ClientGameState | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

  // 1. Hub Screen (Game Selector)
  if (activeGame === 'hub') {
    return <HubScreen onSelectGame={(game) => setActiveGame(game)} />;
  }

  // 2. Loup-Garou Game
  if (activeGame === 'loup_garou') {
    return <LoupGarouApp onBackToHub={() => setActiveGame('hub')} />;
  }

  // 3. Sekouno Flow
  return (
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
          onBackToHub={() => setActiveGame('hub')}
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
  );
};
