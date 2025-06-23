/**
 * Enhanced Elo Rating System - Calculate rating changes with speed bonuses
 * Implements standard Elo with performance-based bonuses and penalties
 */

export interface EloResult {
  deltaWinner: number;
  deltaLoser: number;
  speedBonus: number;
  performanceMultiplier: number;
}

export interface PerformanceMetrics {
  executionTime: number; // in milliseconds
  performanceScore: number; // 0-100
  wrongSubmissions: number;
  codeQuality: number; // 0-100 based on code analysis
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
 * Compute enhanced Elo rating deltas with performance bonuses
 * @param ratingWinner - Winner's current rating
 * @param ratingLoser - Loser's current rating
 * @param winnerMetrics - Winner's performance metrics
 * @param loserMetrics - Loser's performance metrics (optional)
 * @param K - K-factor (rating volatility, default 32)
 * @returns Enhanced rating changes for both players
 */
export function computeEnhancedDeltas(
  ratingWinner: number,
  ratingLoser: number,
  winnerMetrics: PerformanceMetrics,
  loserMetrics?: PerformanceMetrics,
  K: number = 32
): EloResult {
  // Calculate expected scores
  const expectedWinner = expectedScore(ratingWinner, ratingLoser);
  const expectedLoser = expectedScore(ratingLoser, ratingWinner);

  // Base Elo calculation (winner gets 1, loser gets 0)
  const baseDeltaWinner = Math.round(K * (1 - expectedWinner));
  const baseDeltaLoser = Math.round(K * (0 - expectedLoser));

  // Calculate performance multiplier based on execution speed
  const performanceMultiplier = calculatePerformanceMultiplier(winnerMetrics);
  
  // Calculate speed bonus (0-50 points)
  const speedBonus = calculateSpeedBonus(winnerMetrics.executionTime, winnerMetrics.performanceScore);
  
  // Calculate quality bonus based on code quality and wrong submissions
  const qualityBonus = calculateQualityBonus(winnerMetrics.wrongSubmissions, winnerMetrics.codeQuality);
  
  // Calculate difficulty bonus based on rating difference
  const difficultyBonus = calculateDifficultyBonus(ratingWinner, ratingLoser);
  
  // Apply all bonuses and multipliers
  const enhancedDeltaWinner = Math.round(
    (baseDeltaWinner * performanceMultiplier) + speedBonus + qualityBonus + difficultyBonus
  );
  
  // Loser penalty is reduced if they had good performance metrics
  let enhancedDeltaLoser = baseDeltaLoser;
  if (loserMetrics) {
    const loserPerformanceMultiplier = calculatePerformanceMultiplier(loserMetrics);
    // Reduce penalty for good performance even in loss
    enhancedDeltaLoser = Math.round(baseDeltaLoser * (2 - loserPerformanceMultiplier));
  }

  return {
    deltaWinner: Math.max(1, enhancedDeltaWinner), // Minimum 1 point gain
    deltaLoser: Math.min(-1, enhancedDeltaLoser), // Minimum 1 point loss
    speedBonus,
    performanceMultiplier,
  };
}

/**
 * Calculate performance multiplier based on execution metrics
 * @param metrics - Performance metrics
 * @returns Multiplier between 0.5 and 2.0
 */
function calculatePerformanceMultiplier(metrics: PerformanceMetrics): number {
  let multiplier = 1.0;
  
  // Speed multiplier (faster = higher multiplier)
  if (metrics.executionTime <= 100) {
    multiplier += 0.5; // Very fast: +50%
  } else if (metrics.executionTime <= 500) {
    multiplier += 0.3; // Fast: +30%
  } else if (metrics.executionTime <= 1000) {
    multiplier += 0.1; // Good: +10%
  } else if (metrics.executionTime > 3000) {
    multiplier -= 0.2; // Slow: -20%
  }
  
  // Performance score multiplier
  const performanceBonus = (metrics.performanceScore - 50) / 100; // -0.5 to +0.5
  multiplier += performanceBonus;
  
  // Ensure multiplier stays within reasonable bounds
  return Math.max(0.5, Math.min(2.0, multiplier));
}

/**
 * Calculate speed bonus points
 * @param executionTime - Time in milliseconds
 * @param performanceScore - Performance score 0-100
 * @returns Bonus points (0-50)
 */
function calculateSpeedBonus(executionTime: number, performanceScore: number): number {
  // Speed tiers with diminishing returns
  const speedTiers = [
    { threshold: 50, bonus: 50 },    // Lightning fast: 50ms
    { threshold: 100, bonus: 40 },   // Very fast: 100ms
    { threshold: 200, bonus: 30 },   // Fast: 200ms
    { threshold: 500, bonus: 20 },   // Good: 500ms
    { threshold: 1000, bonus: 10 },  // Average: 1s
    { threshold: 2000, bonus: 5 },   // Slow: 2s
  ];
  
  let speedBonus = 0;
  for (const tier of speedTiers) {
    if (executionTime <= tier.threshold) {
      speedBonus = tier.bonus;
      break;
    }
  }
  
  // Apply performance score modifier
  const performanceModifier = performanceScore / 100;
  speedBonus = Math.round(speedBonus * performanceModifier);
  
  return Math.max(0, speedBonus);
}

/**
 * Calculate quality bonus based on code quality metrics
 * @param wrongSubmissions - Number of wrong submissions
 * @param codeQuality - Code quality score 0-100
 * @returns Bonus points (can be negative for poor quality)
 */
function calculateQualityBonus(wrongSubmissions: number, codeQuality: number): number {
  let qualityBonus = 0;
  
  // Penalty for wrong submissions
  const submissionPenalty = Math.min(wrongSubmissions * 3, 15); // Max 15 point penalty
  qualityBonus -= submissionPenalty;
  
  // Bonus for high code quality
  if (codeQuality >= 90) {
    qualityBonus += 10; // Excellent code
  } else if (codeQuality >= 80) {
    qualityBonus += 5; // Good code
  } else if (codeQuality < 50) {
    qualityBonus -= 5; // Poor code quality penalty
  }
  
  // First attempt bonus
  if (wrongSubmissions === 0) {
    qualityBonus += 15; // Perfect submission bonus
  }
  
  return qualityBonus;
}

/**
 * Calculate difficulty bonus based on rating difference
 * @param winnerRating - Winner's rating
 * @param loserRating - Loser's rating
 * @returns Bonus points for beating higher-rated opponent
 */
function calculateDifficultyBonus(winnerRating: number, loserRating: number): number {
  const ratingDifference = loserRating - winnerRating;
  
  if (ratingDifference > 200) {
    return Math.min(25, Math.round(ratingDifference / 20)); // Major upset bonus
  } else if (ratingDifference > 100) {
    return Math.min(15, Math.round(ratingDifference / 25)); // Upset bonus
  } else if (ratingDifference < -200) {
    return -5; // Expected win penalty
  }
  
  return 0; // No bonus for similar ratings
}

/**
 * Legacy function for backward compatibility
 */
export function computeDeltas(
  ratingWinner: number,
  ratingLoser: number,
  wrongSubmissions: number = 0,
  K: number = 32
): EloResult {
  const winnerMetrics: PerformanceMetrics = {
    executionTime: 1000, // Default average time
    performanceScore: 75, // Default good performance
    wrongSubmissions,
    codeQuality: 70, // Default decent quality
  };
  
  return computeEnhancedDeltas(ratingWinner, ratingLoser, winnerMetrics, undefined, K);
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

/**
 * Calculate rating change preview
 * @param playerRating - Current player rating
 * @param opponentRating - Opponent's rating
 * @param metrics - Expected performance metrics
 * @returns Estimated rating changes for win/loss scenarios
 */
export function calculateRatingPreview(
  playerRating: number,
  opponentRating: number,
  metrics: Partial<PerformanceMetrics> = {}
): {
  winScenario: EloResult;
  lossScenario: { deltaLoser: number };
} {
  const defaultMetrics: PerformanceMetrics = {
    executionTime: 1000,
    performanceScore: 75,
    wrongSubmissions: 1,
    codeQuality: 70,
    ...metrics,
  };
  
  const winScenario = computeEnhancedDeltas(playerRating, opponentRating, defaultMetrics);
  const lossScenario = computeEnhancedDeltas(opponentRating, playerRating, defaultMetrics);
  
  return {
    winScenario,
    lossScenario: { deltaLoser: lossScenario.deltaLoser },
  };
}

/**
 * Analyze code quality for ELO calculation
 * @param code - Source code to analyze
 * @returns Quality score 0-100
 */
export function analyzeCodeQuality(code: string): number {
  let score = 50; // Base score
  
  // Length analysis
  const codeLength = code.trim().length;
  if (codeLength < 50) {
    score += 20; // Concise solution bonus
  } else if (codeLength > 500) {
    score -= 10; // Verbose solution penalty
  }
  
  // Complexity analysis
  const complexityFactors = [
    { pattern: /for\s*\(/g, impact: -2, name: 'loops' },
    { pattern: /while\s*\(/g, impact: -2, name: 'while loops' },
    { pattern: /if\s*\(/g, impact: -1, name: 'conditionals' },
    { pattern: /function\s+/g, impact: 5, name: 'functions' },
    { pattern: /=>\s*/g, impact: 3, name: 'arrow functions' },
    { pattern: /\/\//g, impact: 2, name: 'comments' },
    { pattern: /const\s+/g, impact: 1, name: 'const declarations' },
    { pattern: /let\s+/g, impact: 0, name: 'let declarations' },
    { pattern: /var\s+/g, impact: -3, name: 'var declarations' },
  ];
  
  complexityFactors.forEach(({ pattern, impact }) => {
    const matches = code.match(pattern);
    if (matches) {
      score += matches.length * impact;
    }
  });
  
  // Style analysis
  if (code.includes('\n')) {
    score += 5; // Multi-line formatting bonus
  }
  
  if (/^\s+/m.test(code)) {
    score += 5; // Indentation bonus
  }
  
  // Algorithm efficiency hints
  if (code.includes('sort')) {
    score += 10; // Using built-in sort
  }
  
  if (code.includes('Map') || code.includes('Set')) {
    score += 15; // Using efficient data structures
  }
  
  if (code.includes('O(n)') || code.includes('O(1)')) {
    score += 10; // Big O notation awareness
  }
  
  // Ensure score stays within bounds
  return Math.max(0, Math.min(100, score));
}