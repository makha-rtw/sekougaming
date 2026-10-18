// Elo calculation engine for POLYCHESS

export const K_FACTOR = 32;
export const DEFAULT_ELO = 1200;

export interface EloCalculationResult {
  playerA: {
    expected: number;
    change: number;
    newElo: number;
  };
  playerB: {
    expected: number;
    change: number;
    newElo: number;
  };
}

/**
 * Calculates Elo updates for two players.
 *
 * Formulas:
 * E_A = 1 / (1 + 10^((R_B - R_A) / 400))
 * E_B = 1 / (1 + 10^((R_A - R_B) / 400))
 *
 * R_new = round(R_old + K * (S - E)) with K = 32
 *
 * @param ratingA Initial Elo rating of player A
 * @param ratingB Initial Elo rating of player B
 * @param scoreA Score of player A (1 = win, 0.5 = draw, 0 = loss)
 * @param k Custom K-factor (defaults to 32)
 */
export function calculateElo(
  ratingA: number,
  ratingB: number,
  scoreA: 1 | 0.5 | 0,
  k: number = K_FACTOR
): EloCalculationResult {
  const scoreB: 1 | 0.5 | 0 = scoreA === 1 ? 0 : scoreA === 0 ? 1 : 0.5;

  const expectedA = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
  const expectedB = 1 / (1 + Math.pow(10, (ratingA - ratingB) / 400));

  // Consistent mathematical rounding: Math.round
  const changeA = Math.round(k * (scoreA - expectedA));
  const changeB = Math.round(k * (scoreB - expectedB));

  // Minimum Elo rating clamp (prevent negative Elo)
  const newEloA = Math.max(100, ratingA + changeA);
  const newEloB = Math.max(100, ratingB + changeB);

  return {
    playerA: {
      expected: expectedA,
      change: changeA,
      newElo: newEloA,
    },
    playerB: {
      expected: expectedB,
      change: changeB,
      newElo: newEloB,
    },
  };
}
