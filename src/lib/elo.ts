/**
 * Elo Rating System - Calculate rating changes for competitive matches
 * Implements standard Elo with bonus/penalty for wrong submissions
 */

export interface EloResult {
  deltaWinner: number;
  deltaLoser: number;
}

/**
 * Calculate expected score for player A against player B
 * @param ratingA - Player A's current rating
 * @param ratingB - Player B's current rating
 * @returns Expected score (0-1) for player A
 */
export function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

/**
 * Compute Elo rating deltas for winner and loser
 * @param ratingWinner - Winner's current rating
 * @param ratingLoser - Loser's current rating
 * @param wrongSubmissions - Number of wrong submissions by loser (affects bonus)
 * @param K - K-factor (rating volatility, default 32)
 * @returns Rating changes for both players
 */
export function computeDeltas(
  ratingWinner: number,
  ratingLoser: number,
  wrongSubmissions: number = 0,
  K: number = 32
): EloResult {
  // Calculate expected scores
  const expectedWinner = expectedScore(ratingWinner, ratingLoser);
  const expectedLoser = expectedScore(ratingLoser, ratingWinner);

  // Base Elo calculation (winner gets 1, loser gets 0)
  const baseDeltaWinner = Math.round(K * (1 - expectedWinner));
  const baseDeltaLoser = Math.round(K * (0 - expectedLoser));

  // Wrong submission bonus/penalty
  // Each wrong submission gives up to 20% bonus to winner, penalty to loser
  const wrongSubmissionBonus = Math.min(wrongSubmissions * 0.01, 0.2);
  const bonusPoints = Math.round(baseDeltaWinner * wrongSubmissionBonus);

  return {
    deltaWinner: baseDeltaWinner + bonusPoints,
    deltaLoser: baseDeltaLoser - bonusPoints,
  };
}

/**
 * Apply rating changes to current ratings
 * @param currentRating - Player's current rating
 * @param delta - Rating change (can be positive or negative)
 * @returns New rating (minimum 100)
 */
export function applyRatingChange(currentRating: number, delta: number): number {
  return Math.max(100, currentRating + delta);
}

/**
 * Get rating tier/rank name based on rating
 * @param rating - Player's current rating
 * @returns Tier name and color
 */
export function getRatingTier(rating: number): { name: string; color: string; icon: string } {
  if (rating >= 2400) return { name: 'Grandmaster', color: 'text-purple-400', icon: '👑' };
  if (rating >= 2200) return { name: 'Master', color: 'text-yellow-400', icon: '🏆' };
  if (rating >= 2000) return { name: 'Expert', color: 'text-orange-400', icon: '⭐' };
  if (rating >= 1800) return { name: 'Advanced', color: 'text-blue-400', icon: '💎' };
  if (rating >= 1600) return { name: 'Intermediate', color: 'text-green-400', icon: '🔥' };
  if (rating >= 1400) return { name: 'Novice', color: 'text-gray-400', icon: '⚡' };
  return { name: 'Beginner', color: 'text-gray-500', icon: '🌱' };
}