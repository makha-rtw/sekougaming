import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';

describe('POLYCHESS Chess Rules & Engine Verification (Section 15.2)', () => {
  it('validates legal moves and rejects illegal moves', () => {
    const chess = new Chess();

    // Legal move
    const legalMove = chess.move('e4');
    expect(legalMove).toBeDefined();
    expect(legalMove.san).toBe('e4');
    expect(chess.turn()).toBe('b');

    // Illegal move: attempting an impossible move on black's turn
    expect(() => chess.move('Qh5')).toThrow();
  });

  it('detects check (Échec)', () => {
    const chess = new Chess();
    // 1. e4 f6 2. d4 g5 3. Qh5# (Fool's mate check and mate)
    chess.move('e4');
    chess.move('f6');
    chess.move('d4');
    chess.move('g5');
    chess.move('Qh5+');

    expect(chess.inCheck()).toBe(true);
    expect(chess.isCheckmate()).toBe(true);
  });

  it('detects checkmate (Échec et mat) via Scholar’s Mate', () => {
    const chess = new Chess();
    // 1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6 4. Qxf7#
    chess.move('e4');
    chess.move('e5');
    chess.move('Bc4');
    chess.move('Nc6');
    chess.move('Qh5');
    chess.move('Nf6');
    chess.move('Qxf7#');

    expect(chess.inCheck()).toBe(true);
    expect(chess.isCheckmate()).toBe(true);
    expect(chess.isGameOver()).toBe(true);
  });

  it('detects stalemate (Pat)', () => {
    // 8/8/8/8/8/5k2/5q2/7K w - - 0 1 -> White to move: King on h1 has no legal moves and is NOT in check
    const chess = new Chess('8/8/8/8/8/5k2/5q2/7K w - - 0 1');
    expect(chess.inCheck()).toBe(false);
    expect(chess.isStalemate()).toBe(true);
    expect(chess.isGameOver()).toBe(true);
  });

  it('handles Kingside and Queenside castling (Roque)', () => {
    const chess = new Chess('r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1');

    // White Kingside castle: e1 to g1 (O-O)
    const moveKingside = chess.move('O-O');
    expect(moveKingside).toBeDefined();
    expect(moveKingside.san).toBe('O-O');
    expect(chess.get('g1')?.type).toBe('k');
    expect(chess.get('f1')?.type).toBe('r');

    // Black Queenside castle: e8 to c8 (O-O-O)
    const moveQueenside = chess.move('O-O-O');
    expect(moveQueenside).toBeDefined();
    expect(moveQueenside.san).toBe('O-O-O');
    expect(chess.get('c8')?.type).toBe('k');
    expect(chess.get('d8')?.type).toBe('r');
  });

  it('handles pawn promotion (Promotion)', () => {
    // White pawn on a7 ready to promote on a8
    const chess = new Chess('8/P7/8/8/8/8/8/k6K w - - 0 1');

    const promoMove = chess.move({ from: 'a7', to: 'a8', promotion: 'q' });
    expect(promoMove).toBeDefined();
    expect(promoMove.san).toBe('a8=Q+');
    expect(chess.get('a8')?.type).toBe('q');
    expect(chess.get('a8')?.color).toBe('w');
  });

  it('handles en passant capture (Prise en passant)', () => {
    const chess = new Chess();
    // 1. e4 Nf6 2. e5 d5 3. exd6
    chess.move('e4');
    chess.move('Nf6');
    chess.move('e5');
    chess.move('d5');

    // White captures en passant exd6
    const epMove = chess.move({ from: 'e5', to: 'd6' });
    expect(epMove).toBeDefined();
    expect(epMove.flags).toContain('e'); // en passant flag
    expect(chess.get('d5')).toBeFalsy(); // Black pawn captured, square d5 is now empty
    expect(chess.get('d6')?.type).toBe('p');
    expect(chess.get('d6')?.color).toBe('w');
  });

  it('detects draws (insufficient material, threefold repetition, 50 moves)', () => {
    // Insufficient material: King vs King
    const chessMaterial = new Chess('8/8/8/4k3/8/8/4K3/8 w - - 0 1');
    expect(chessMaterial.isInsufficientMaterial()).toBe(true);
    expect(chessMaterial.isDraw()).toBe(true);

    // Threefold repetition
    const chessRep = new Chess();
    // 1. Nf3 Nf6 2. Ng1 Ng8 3. Nf3 Nf6 4. Ng1 Ng8
    chessRep.move('Nf3'); chessRep.move('Nf6');
    chessRep.move('Ng1'); chessRep.move('Ng8');
    chessRep.move('Nf3'); chessRep.move('Nf6');
    chessRep.move('Ng1'); chessRep.move('Ng8');
    expect(chessRep.isThreefoldRepetition()).toBe(true);
    expect(chessRep.isDraw()).toBe(true);
  });
});
