import React, { useState } from 'react';
import { Chess, Square, PieceSymbol, Color } from 'chess.js';
import { PieceColor } from '../../../../../shared/chessTypes.js';

interface ChessBoardProps {
  chess: Chess;
  orientation?: PieceColor; // 'w' or 'b'
  isInteractive?: boolean;
  onMove?: (move: { from: string; to: string; promotion?: string }) => void;
  lastMove?: { from: string; to: string } | null;
}

// Crisp Vector SVG Chess Pieces
export const ChessPiece: React.FC<{ type: PieceSymbol; color: Color; className?: string }> = ({
  type,
  color,
  className = 'w-full h-full p-1',
}) => {
  const isWhite = color === 'w';

  // High-contrast, clean stylized vector chess pieces
  switch (type) {
    case 'k': // King
      return (
        <svg viewBox="0 0 45 45" className={className}>
          <g
            fill={isWhite ? '#ffffff' : '#1e1b4b'}
            stroke={isWhite ? '#1e293b' : '#f8fafc'}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M22.5 11.63V6M20 8h5" stroke={isWhite ? '#0f172a' : '#f1f5f9'} strokeWidth="1.5" />
            <path d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5" />
            <path d="M11.5 37c5.5 3.5 15.5 3.5 21 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V23.5c-2.5-7.5-12-10.5-16-4-3 6 6 10.5 6 10.5v7" />
            <path d="M11.5 30c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0" />
          </g>
        </svg>
      );
    case 'q': // Queen
      return (
        <svg viewBox="0 0 45 45" className={className}>
          <g
            fill={isWhite ? '#ffffff' : '#1e1b4b'}
            stroke={isWhite ? '#1e293b' : '#f8fafc'}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M8 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm16.5-4.5a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM41 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM16 8.5a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm17 0a2 2 0 1 1-4 0 2 2 0 0 1 4 0z" />
            <path d="M9 26c8.5-1.5 21-1.5 27 0l2-12-7 11V11l-5.5 13.5-3-15-3 15L14 11v14l-7-11 2 12" />
            <path d="M9 26c0 2 1.5 2 2.5 4 2.5 5 1 5.5 11 5.5s8.5-.5 11-5.5c1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0" />
            <path d="M11.5 30c3.5-1 18.5-1 22 0m-21.5 4c3.5-1 17.5-1 21 0m-20.5 4c3.5-1 16.5-1 20 0" />
          </g>
        </svg>
      );
    case 'r': // Rook
      return (
        <svg viewBox="0 0 45 45" className={className}>
          <g
            fill={isWhite ? '#ffffff' : '#1e1b4b'}
            stroke={isWhite ? '#1e293b' : '#f8fafc'}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 39h27v-3H9v3zm3-3v-4.5h21V36H12zm2-4.5c0-4.5 1.5-6.5 2.5-8.5 1-2 1.5-4 1.5-7h9c0 3 .5 5 1.5 7 1 2 2.5 4 2.5 8.5H14z" />
            <path d="M11 16h23v-5H30v2h-3v-2h-4v2h-3v-2H11v5z" />
            <path d="M12 36l1-1h19l1 1" />
          </g>
        </svg>
      );
    case 'b': // Bishop
      return (
        <svg viewBox="0 0 45 45" className={className}>
          <g
            fill={isWhite ? '#ffffff' : '#1e1b4b'}
            stroke={isWhite ? '#1e293b' : '#f8fafc'}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.35.49-2.32.47-3-.5 1.35-1.46 3-2 3-2z" />
            <path d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2zM25 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z" />
            <path d="M17.5 26h10M15 30h15m-7.5-14.5v5m-3-2.5h6" />
          </g>
        </svg>
      );
    case 'n': // Knight
      return (
        <svg viewBox="0 0 45 45" className={className}>
          <g
            fill={isWhite ? '#ffffff' : '#1e1b4b'}
            stroke={isWhite ? '#1e293b' : '#f8fafc'}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21" />
            <path d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.042-.94 1.41-3.04 0-3-1 0 .19 1.23-1 2-1 0-4.003 1-4-4 0-2 6-12 6-12s1.89-1.9 2-3.5c-.73-.994-.5-2-.5-3 1-1 3 2.5 3 2.5h2s.78-1.992 2.5-3c1 0 1 3 1 3" />
            <circle cx="14.5" cy="15.5" r="1" fill={isWhite ? '#0f172a' : '#f8fafc'} />
          </g>
        </svg>
      );
    case 'p': // Pawn
    default:
      return (
        <svg viewBox="0 0 45 45" className={className}>
          <g
            fill={isWhite ? '#ffffff' : '#1e1b4b'}
            stroke={isWhite ? '#1e293b' : '#f8fafc'}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M22 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-2.78-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z" />
            <path d="M12 36c6-1 15-1 21 0" />
          </g>
        </svg>
      );
  }
};

export const ChessBoard: React.FC<ChessBoardProps> = ({
  chess,
  orientation = 'w',
  isInteractive = true,
  onMove,
  lastMove,
}) => {
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [legalMoves, setLegalMoves] = useState<string[]>([]);
  const [pendingPromotion, setPendingPromotion] = useState<{ from: string; to: string } | null>(null);

  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];

  const displayFiles = orientation === 'w' ? files : [...files].reverse();
  const displayRanks = orientation === 'w' ? ranks : [...ranks].reverse();

  // Find king in check
  let checkKingSquare: Square | null = null;
  if (chess.inCheck()) {
    const turn = chess.turn();
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const sq = (files[f] + ranks[r]) as Square;
        const p = chess.get(sq);
        if (p && p.type === 'k' && p.color === turn) {
          checkKingSquare = sq;
          break;
        }
      }
    }
  }

  const handleSquareClick = (square: Square) => {
    if (!isInteractive) return;

    // 1. If square is selected, clicking it again cancels selection
    if (selectedSquare === square) {
      setSelectedSquare(null);
      setLegalMoves([]);
      return;
    }

    // 2. If a piece was already selected and clicked square is in legal moves
    if (selectedSquare && legalMoves.includes(square)) {
      const piece = chess.get(selectedSquare);
      const isPawnPromotion =
        piece?.type === 'p' &&
        ((piece.color === 'w' && square[1] === '8') || (piece.color === 'b' && square[1] === '1'));

      if (isPawnPromotion) {
        setPendingPromotion({ from: selectedSquare, to: square });
      } else {
        onMove?.({ from: selectedSquare, to: square });
      }

      setSelectedSquare(null);
      setLegalMoves([]);
      return;
    }

    // 3. Otherwise, select the piece if it belongs to current turn
    const piece = chess.get(square);
    if (piece && piece.color === chess.turn()) {
      setSelectedSquare(square);
      const moves = chess.moves({ square, verbose: true });
      setLegalMoves(moves.map((m) => m.to));
    } else {
      setSelectedSquare(null);
      setLegalMoves([]);
    }
  };

  const handleChoosePromotion = (promo: 'q' | 'r' | 'b' | 'n') => {
    if (pendingPromotion) {
      onMove?.({ from: pendingPromotion.from, to: pendingPromotion.to, promotion: promo });
      setPendingPromotion(null);
    }
  };

  return (
    <div className="relative w-full max-w-[min(94vw,430px)] sm:max-w-[480px] aspect-square mx-auto select-none">
      {/* Outer Luxury Board Frame */}
      <div className="w-full h-full rounded-2xl bg-slate-900 border-4 border-slate-800 shadow-2xl p-2 sm:p-2.5 flex flex-col justify-between">
        <div className="grid grid-cols-8 grid-rows-8 w-full h-full rounded-xl overflow-hidden border border-slate-700/60 shadow-inner">
          {displayRanks.map((rank, rIdx) =>
            displayFiles.map((file, fIdx) => {
              const square = `${file}${rank}` as Square;
              const piece = chess.get(square);

              // Standard chess light/dark pattern
              const isLight = (file.charCodeAt(0) - 97 + parseInt(rank)) % 2 === 1;

              const isSelected = selectedSquare === square;
              const isLegalTarget = legalMoves.includes(square);
              const isCaptureTarget = isLegalTarget && piece !== null;
              const isLastMove = lastMove && (lastMove.from === square || lastMove.to === square);
              const isCheckKing = checkKingSquare === square;

              return (
                <div
                  key={square}
                  onClick={() => handleSquareClick(square)}
                  className={`relative flex items-center justify-center cursor-pointer transition-colors duration-150 ${
                    isLight ? 'bg-[#ebecd0]' : 'bg-[#739552]'
                  } ${isLastMove ? (isLight ? '!bg-[#f7ec7d]' : '!bg-[#baca44]') : ''} ${
                    isSelected ? '!bg-amber-400/80 ring-2 ring-amber-500' : ''
                  } ${isCheckKing ? '!bg-red-500/90 animate-pulse' : ''}`}
                >
                  {/* File & Rank coordinate labels on board edges */}
                  {fIdx === 0 && (
                    <span
                      className={`absolute top-0.5 left-1 text-[9px] font-black pointer-events-none ${
                        isLight ? 'text-[#739552]' : 'text-[#ebecd0]'
                      }`}
                    >
                      {rank}
                    </span>
                  )}
                  {rIdx === 7 && (
                    <span
                      className={`absolute bottom-0.5 right-1 text-[9px] font-black pointer-events-none ${
                        isLight ? 'text-[#739552]' : 'text-[#ebecd0]'
                      }`}
                    >
                      {file}
                    </span>
                  )}

                  {/* Piece Graphic */}
                  {piece && (
                    <div className="w-full h-full flex items-center justify-center transform active:scale-95 transition-transform">
                      <ChessPiece type={piece.type} color={piece.color} />
                    </div>
                  )}

                  {/* Legal Move Indicators */}
                  {isLegalTarget && !isCaptureTarget && (
                    <div className="absolute w-3.5 h-3.5 sm:w-4 sm:h-4 bg-slate-900/35 rounded-full pointer-events-none" />
                  )}
                  {isCaptureTarget && (
                    <div className="absolute inset-0.5 rounded-full border-4 border-slate-900/35 pointer-events-none" />
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Pawn Promotion Modal */}
      {pendingPromotion && (
        <div className="absolute inset-0 z-50 bg-black/75 backdrop-blur-sm rounded-2xl flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-amber-400/80 rounded-2xl p-4 shadow-2xl text-center max-w-xs w-full animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-sm font-black uppercase text-amber-300 mb-3 tracking-wider">
              Choisissez la promotion
            </h3>
            <div className="grid grid-cols-4 gap-2">
              {(['q', 'r', 'b', 'n'] as const).map((promoType) => (
                <button
                  key={promoType}
                  type="button"
                  onClick={() => handleChoosePromotion(promoType)}
                  className="aspect-square bg-slate-800 hover:bg-slate-700 active:scale-95 border border-slate-600 rounded-xl flex items-center justify-center p-2 shadow-md transition-all cursor-pointer"
                >
                  <ChessPiece type={promoType} color={chess.turn()} />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
