import React, { useState, useEffect, useRef } from 'react';
import { Chess } from 'chess.js';
import { Socket } from 'socket.io-client';
import {
  ChessGameStatePublic,
  PieceColor,
  TimeControlKey,
  UserPublic,
} from '../../../../../shared/chessTypes.js';
import { ChessBoard } from '../components/ChessBoard.js';
import { ClockView } from '../components/ClockView.js';
import { chessSounds } from '../utils/sound.js';
import {
  ArrowLeft,
  Copy,
  Check,
  Flag,
  Handshake,
  Volume2,
  VolumeX,
  Trophy,
  Loader2,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';

interface PolychessOnlineScreenProps {
  socket: Socket;
  currentUser: UserPublic;
  token: string;
  initialMode: 'quick' | 'create_private' | 'join_private';
  timeControl: TimeControlKey;
  roomCodeToJoin?: string;
  onBackToMenu: () => void;
  onUserEloUpdated?: (newElo: number) => void;
}

export const PolychessOnlineScreen: React.FC<PolychessOnlineScreenProps> = ({
  socket,
  currentUser,
  token,
  initialMode,
  timeControl,
  roomCodeToJoin,
  onBackToMenu,
  onUserEloUpdated,
}) => {
  const [gameState, setGameState] = useState<ChessGameStatePublic | null>(null);
  const [isSearching, setIsSearching] = useState<boolean>(initialMode === 'quick');
  const [createdRoomCode, setCreatedRoomCode] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(chessSounds.isMuted());
  const [drawOffered, setDrawOffered] = useState(false);

  // Local chess instance for fast responsive rendering
  const chessRef = useRef<Chess>(new Chess());
  const [, setRerender] = useState(0);

  // My assigned piece color
  const myColor: PieceColor | null = gameState
    ? gameState.whitePlayer?.id === currentUser.id
      ? 'w'
      : gameState.blackPlayer?.id === currentUser.id
      ? 'b'
      : null
    : null;

  // Active player turn
  const isMyTurn = gameState && !gameState.isGameOver && gameState.currentTurn === myColor;

  // Last move
  const lastMove =
    gameState && gameState.moves.length > 0
      ? {
          from: gameState.moves[gameState.moves.length - 1].from,
          to: gameState.moves[gameState.moves.length - 1].to,
        }
      : null;

  useEffect(() => {
    // Socket Listeners
    const onChessState = (state: ChessGameStatePublic) => {
      setGameState(state);
      setIsSearching(false);
      setError(null);

      // Synchronize chess.js instance
      try {
        chessRef.current = new Chess(state.fen);
      } catch {
        chessRef.current = new Chess();
      }
      setRerender((v) => v + 1);

      // Sound design based on game events
      if (state.isGameOver) {
        if (state.winner === 'draw') {
          // No special sound or neutral
        } else if (
          (state.winner === 'w' && state.whitePlayer?.id === currentUser.id) ||
          (state.winner === 'b' && state.blackPlayer?.id === currentUser.id)
        ) {
          chessSounds.playVictory();
        } else {
          chessSounds.playDefeat();
        }

        // Notify parent if user Elo changed
        const myChange =
          state.whitePlayer?.id === currentUser.id
            ? state.whiteEloChange
            : state.blackEloChange;
        if (myChange !== undefined) {
          onUserEloUpdated?.(currentUser.elo + myChange);
        }
      } else {
        const last = state.moves[state.moves.length - 1];
        if (last) {
          if (state.isCheck) {
            chessSounds.playCheck();
          } else if (last.san.includes('x')) {
            chessSounds.playCapture();
          } else {
            chessSounds.playMove();
          }
        }
      }
    };

    socket.on('chess_state', onChessState);

    // Initial action on mount
    if (initialMode === 'quick') {
      socket.emit(
        'chess_find_match',
        { token, timeControl },
        (res: any) => {
          if (!res.success) {
            setError(res.error || 'Erreur lors de la recherche.');
            setIsSearching(false);
          }
        }
      );
    } else if (initialMode === 'create_private') {
      socket.emit(
        'chess_create_private_room',
        { token, timeControl },
        (res: any) => {
          if (res.success) {
            setCreatedRoomCode(res.roomCode);
          } else {
            setError(res.error || 'Erreur lors de la création du salon privé.');
          }
        }
      );
    } else if (initialMode === 'join_private' && roomCodeToJoin) {
      socket.emit(
        'chess_join_private_room',
        { token, roomCode: roomCodeToJoin },
        (res: any) => {
          if (!res.success) {
            setError(res.error || 'Code de partie invalide ou partie expirée.');
          }
        }
      );
    }

    return () => {
      socket.off('chess_state', onChessState);
      if (isSearching) {
        socket.emit('chess_cancel_match', { token });
      }
    };
  }, []);

  const handleMove = (moveAttempt: { from: string; to: string; promotion?: string }) => {
    if (!gameState || !isMyTurn || gameState.isGameOver) return;

    socket.emit(
      'chess_move',
      {
        token,
        gameId: gameState.gameId,
        from: moveAttempt.from,
        to: moveAttempt.to,
        promotion: moveAttempt.promotion,
      },
      (res: any) => {
        if (!res.success) {
          setError(res.error || 'Coup refusé par le serveur.');
        }
      }
    );
  };

  const handleResign = () => {
    if (!gameState || gameState.isGameOver) return;
    if (window.confirm('Voulez-vous vraiment abandonner la partie ?')) {
      socket.emit('chess_resign', { token, gameId: gameState.gameId });
    }
  };

  const handleOfferDraw = () => {
    if (!gameState || gameState.isGameOver) return;
    socket.emit('chess_offer_draw', { token, gameId: gameState.gameId }, (res: any) => {
      if (res.success) {
        setDrawOffered(true);
      }
    });
  };

  const handleAcceptDraw = () => {
    if (!gameState || gameState.isGameOver) return;
    socket.emit('chess_accept_draw', { token, gameId: gameState.gameId });
  };

  const handleDeclineDraw = () => {
    if (!gameState || gameState.isGameOver) return;
    socket.emit('chess_decline_draw', { token, gameId: gameState.gameId });
  };

  const handleCancelSearch = () => {
    socket.emit('chess_cancel_match', { token });
    onBackToMenu();
  };

  const handleCopyCode = () => {
    if (createdRoomCode) {
      navigator.clipboard.writeText(createdRoomCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  // 1. MATCHMAKING SEARCHING VIEW
  if (isSearching) {
    return (
      <div className="min-h-[100dvh] flex flex-col justify-between p-4 max-w-md mx-auto pt-safe pb-safe select-none text-center">
        <header className="flex justify-start">
          <button
            type="button"
            onClick={handleCancelSearch}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-amber-400 hover:text-white cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Annuler</span>
          </button>
        </header>

        <main className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl backdrop-blur-md my-auto flex flex-col items-center">
          <div className="relative mb-4">
            <div className="w-20 h-20 rounded-full border-4 border-amber-400/30 border-t-amber-400 animate-spin flex items-center justify-center" />
            <div className="absolute inset-0 flex items-center justify-center font-black text-2xl text-amber-400">
              ♚
            </div>
          </div>

          <h2 className="text-xl font-black text-white mb-1">Recherche d'un adversaire...</h2>
          <p className="text-xs text-slate-400 mb-4">
            Cadence : <strong className="text-amber-300">{timeControl}</strong> • Matchmaking équilibré
          </p>

          <button
            type="button"
            onClick={handleCancelSearch}
            className="py-2.5 px-6 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition-all cursor-pointer"
          >
            Annuler la recherche
          </button>
        </main>

        <footer className="text-xs text-slate-500 py-2">
          Le serveur vous associera automatiquement au premier joueur disponible.
        </footer>
      </div>
    );
  }

  // 2. WAITING IN PRIVATE ROOM VIEW
  if (createdRoomCode && !gameState) {
    return (
      <div className="min-h-[100dvh] flex flex-col justify-between p-4 max-w-md mx-auto pt-safe pb-safe select-none text-center">
        <header className="flex justify-start">
          <button
            type="button"
            onClick={onBackToMenu}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-amber-400 hover:text-white cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Annuler</span>
          </button>
        </header>

        <main className="bg-slate-900/95 border-2 border-amber-500/60 rounded-3xl p-6 shadow-2xl backdrop-blur-md my-auto flex flex-col items-center">
          <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 text-xs font-black uppercase mb-3">
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            <span>Salon Privé Polychess</span>
          </div>

          <h2 className="text-lg font-black text-white mb-2">Partagez ce code avec votre ami</h2>
          <p className="text-xs text-slate-400 mb-4">
            La partie commencera automatiquement dès que votre adversaire rejoindra.
          </p>

          <div
            onClick={handleCopyCode}
            className="w-full py-4 px-6 rounded-2xl bg-slate-950 border-2 border-dashed border-amber-400/80 flex items-center justify-center gap-3 cursor-pointer group active:scale-98 transition-all mb-4"
          >
            <span className="font-mono text-3xl sm:text-4xl font-black text-amber-400 tracking-widest">
              {createdRoomCode}
            </span>
            <button
              type="button"
              className="p-2 rounded-xl bg-amber-500/20 text-amber-300 group-hover:bg-amber-500 group-hover:text-slate-950 transition-all"
            >
              {copiedCode ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
            </button>
          </div>

          <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
            <span>En attente de l'adversaire...</span>
          </p>
        </main>

        <footer className="text-xs text-slate-500 py-2">
          Cadence choisie : {timeControl} • La partie compte pour le classement Elo.
        </footer>
      </div>
    );
  }

  // 3. ACTIVE GAME / GAME OVER VIEW
  if (!gameState) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center p-4">
        {error ? (
          <div className="bg-red-950 border border-red-500 rounded-2xl p-4 text-center max-w-xs">
            <ShieldAlert className="w-6 h-6 text-red-400 mx-auto mb-2" />
            <p className="text-xs text-red-200 mb-3">{error}</p>
            <button
              type="button"
              onClick={onBackToMenu}
              className="py-1.5 px-4 rounded-xl bg-red-800 text-xs font-bold text-white"
            >
              Retour au menu
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
            <span className="text-xs text-slate-400">Chargement de la partie...</span>
          </div>
        )}
      </div>
    );
  }

  // Identify opponent player
  const opponent =
    myColor === 'w' ? gameState.blackPlayer : gameState.whitePlayer;
  const opponentConnected =
    myColor === 'w' ? gameState.blackConnected : gameState.whiteConnected;
  const myConnected =
    myColor === 'w' ? gameState.whiteConnected : gameState.blackConnected;

  const opponentTimeMs =
    myColor === 'w' ? gameState.blackTimeMs : gameState.whiteTimeMs;
  const myTimeMs =
    myColor === 'w' ? gameState.whiteTimeMs : gameState.blackTimeMs;

  const isOpponentTurn =
    !gameState.isGameOver && gameState.currentTurn !== myColor;

  const myEloChange =
    myColor === 'w' ? gameState.whiteEloChange : gameState.blackEloChange;
  const opponentEloChange =
    myColor === 'w' ? gameState.blackEloChange : gameState.whiteEloChange;

  const hasDrawOfferFromOpponent =
    gameState.drawOfferedBy && gameState.drawOfferedBy !== myColor;

  return (
    <div className="min-h-[100dvh] flex flex-col justify-between p-2 sm:p-4 max-w-lg mx-auto pt-safe pb-safe select-none">
      {/* Top Header Controls */}
      <header className="flex items-center justify-between mb-1">
        <button
          type="button"
          onClick={gameState.isGameOver ? onBackToMenu : handleResign}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300 hover:text-white cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{gameState.isGameOver ? 'Menu' : 'Quitter'}</span>
        </button>

        <div className="flex items-center gap-2">
          {gameState.roomCode && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-amber-300 border border-slate-700">
              Salon : {gameState.roomCode}
            </span>
          )}

          <button
            type="button"
            onClick={() => setIsMuted(chessSounds.toggleMute())}
            className="p-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Opponent Card & Clock (Top) */}
      <div className="mb-1.5">
        <ClockView
          player={opponent}
          timeMs={opponentTimeMs}
          isActiveTurn={isOpponentTurn}
          color={myColor === 'w' ? 'b' : 'w'}
          isConnected={opponentConnected}
        />
      </div>

      {/* Draw Offer Notification Banner */}
      {hasDrawOfferFromOpponent && !gameState.isGameOver && (
        <div className="mb-2 p-2.5 rounded-xl bg-amber-950/90 border border-amber-500/80 flex items-center justify-between gap-2 shadow-lg animate-in slide-in-from-top">
          <span className="text-xs font-bold text-amber-200">
            {opponent?.username} propose la nulle (match nul).
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleAcceptDraw}
              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white"
            >
              Accepter
            </button>
            <button
              type="button"
              onClick={handleDeclineDraw}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300"
            >
              Refuser
            </button>
          </div>
        </div>
      )}

      {/* Central Chessboard */}
      <div className="my-auto py-1">
        <ChessBoard
          chess={chessRef.current}
          orientation={myColor || 'w'}
          isInteractive={isMyTurn && !gameState.isGameOver}
          onMove={handleMove}
          lastMove={lastMove}
        />
      </div>

      {/* Player Card & Clock (Bottom) */}
      <div className="mt-1.5">
        <ClockView
          player={myColor === 'w' ? gameState.whitePlayer : gameState.blackPlayer}
          timeMs={myTimeMs}
          isActiveTurn={Boolean(isMyTurn)}
          color={myColor || 'w'}
          isConnected={myConnected}
        />
      </div>

      {/* Active Game Action Buttons */}
      {!gameState.isGameOver && (
        <footer className="mt-2.5 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleOfferDraw}
            disabled={Boolean(gameState.drawOfferedBy)}
            className="py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-300 flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
          >
            <Handshake className="w-3.5 h-3.5 text-amber-400" />
            <span>{gameState.drawOfferedBy === myColor ? 'Nulle proposée...' : 'Proposer nulle'}</span>
          </button>

          <button
            type="button"
            onClick={handleResign}
            className="py-2 rounded-xl bg-slate-900 hover:bg-red-950/50 border border-slate-800 hover:border-red-500/60 text-xs font-bold text-red-400 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <Flag className="w-3.5 h-3.5" />
            <span>Abandonner</span>
          </button>
        </footer>
      )}

      {/* Game Over Modal with Exact Elo Calculations */}
      {gameState.isGameOver && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-amber-400 rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl animate-in zoom-in-95 duration-150">
            <Trophy className="w-12 h-12 text-amber-400 mx-auto mb-2" />
            <h3 className="text-xl font-black text-white mb-1">
              {gameState.winner === 'draw'
                ? 'Match Nul'
                : gameState.winner === myColor
                ? 'Victoire !'
                : 'Défaite'}
            </h3>

            <p className="text-xs font-bold text-slate-400 mb-4 capitalize">
              {gameState.terminationReason === 'checkmate'
                ? 'Par échec et mat'
                : gameState.terminationReason === 'resignation'
                ? 'Par abandon'
                : gameState.terminationReason === 'timeout'
                ? 'Au temps écoulé'
                : gameState.terminationReason === 'stalemate'
                ? 'Par pat'
                : gameState.terminationReason === 'threefold_repetition'
                ? 'Par répétition de coups'
                : gameState.terminationReason === 'insufficient_material'
                ? 'Par matériel insuffisant'
                : gameState.terminationReason === 'mutual_agreement'
                ? 'Par accord mutuel'
                : 'Partie terminée'}
            </p>

            {/* Elo Change Display */}
            {myEloChange !== undefined && (
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 mb-5">
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                  Variation Elo
                </div>
                <div
                  className={`text-2xl font-black font-mono ${
                    myEloChange > 0
                      ? 'text-emerald-400'
                      : myEloChange < 0
                      ? 'text-red-400'
                      : 'text-slate-300'
                  }`}
                >
                  {myEloChange > 0 ? `+${myEloChange}` : myEloChange} Elo
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  Nouveau classement :{' '}
                  <strong className="text-amber-400">
                    {currentUser.elo + myEloChange}
                  </strong>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={onBackToMenu}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-600 to-orange-500 font-black text-xs uppercase tracking-wider text-white shadow-lg cursor-pointer"
            >
              Retourner au menu Polychess
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
