/**
 * Legacy API Service - Compatibility layer for existing components
 * This provides backward compatibility while we migrate to the new service architecture
 */
import { supabase } from '../lib/supabaseClient';
import { generatePuzzle } from '../lib/puzzleGenerator';
import { runCodeSandbox } from '../lib/sandboxRunner';

// Legacy interfaces for backward compatibility
export interface JoinDuelResponse {
  prompt: string;
  tests: Array<{ input: string; expected: string }>;
  timeLimit: number;
}

export interface SubmitDuelResponse {
  passed: boolean;
  passedTests: number;
  totalTests: number;
  deltaWinner?: number;
  newRatings?: {
    winner: number;
    loser: number;
  };
  speedBonus?: number;
  performanceScore?: number;
}

export interface StartPracticeResponse {
  sessionId: string;
  prompt: string;
  tests: Array<{ input: string; expected: string }>;
  hints: string[];
}

export interface SubmitPracticeResponse {
  passedTests: number;
  totalTests: number;
  score: number;
  feedback: string;
}

/**
 * Join a duel (legacy compatibility)
 */
export async function joinDuel(duelId: string): Promise<JoinDuelResponse> {
  const { data: duel, error } = await supabase
    .from('duels')
    .select('*')
    .eq('id', duelId)
    .single();

  if (error) {
    throw new Error(`Failed to join duel: ${error.message}`);
  }

  return {
    prompt: duel.prompt,
    tests: duel.test_cases,
    timeLimit: duel.time_limit,
  };
}

/**
 * Submit duel code (legacy compatibility)
 */
export async function submitDuel(duelId: string, code: string): Promise<SubmitDuelResponse> {
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  // Get duel data
  const { data: duel, error: duelError } = await supabase
    .from('duels')
    .select('*')
    .eq('id', duelId)
    .single();

  if (duelError) {
    throw new Error(`Failed to get duel: ${duelError.message}`);
  }

  // Run code in sandbox
  const result = await runCodeSandbox(code, duel.test_cases);

  // Create submission record
  const { error: submissionError } = await supabase
    .from('submissions')
    .insert({
      duel_id: duelId,
      user_id: user.id,
      code,
      passed_tests: result.passedTests,
      total_tests: result.totalTests,
      runtime_ms: result.runtimeMs,
    });

  if (submissionError) {
    throw new Error(`Failed to save submission: ${submissionError.message}`);
  }

  // If solution is correct and this is a ranked duel, handle completion
  if (result.passed && duel.mode === 'ranked' && duel.opponent_id) {
    // Update duel status
    await supabase
      .from('duels')
      .update({
        status: 'completed',
        winner_id: user.id,
        ended_at: new Date().toISOString(),
      })
      .eq('id', duelId);

    // Mock ELO changes for now
    return {
      passed: true,
      passedTests: result.passedTests,
      totalTests: result.totalTests,
      deltaWinner: 25 + (result.speedBonus || 0),
      newRatings: {
        winner: 1225 + (result.speedBonus || 0),
        loser: 1175,
      },
      speedBonus: result.speedBonus,
      performanceScore: result.performanceScore,
    };
  }

  return {
    passed: result.passed,
    passedTests: result.passedTests,
    totalTests: result.totalTests,
    speedBonus: result.speedBonus,
    performanceScore: result.performanceScore,
  };
}

/**
 * Start practice session (legacy compatibility)
 */
export async function startPractice(
  topic: string,
  difficulty: 'easy' | 'medium' | 'hard',
  mode: string
): Promise<StartPracticeResponse> {
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  // Generate puzzle
  const puzzle = await generatePuzzle('', '', 'practice', {
    topic,
    difficulty,
    mode: 'drills', // Convert to practice mode type
  });

  // Create practice session
  const { data: session, error } = await supabase
    .from('practice_sessions')
    .insert({
      user_id: user.id,
      topic,
      difficulty,
      prompt: puzzle.prompt,
      test_cases: puzzle.tests,
      hints: puzzle.hints || [],
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create practice session: ${error.message}`);
  }

  return {
    sessionId: session.id,
    prompt: puzzle.prompt,
    tests: puzzle.tests,
    hints: puzzle.hints || [],
  };
}

/**
 * Submit practice code (legacy compatibility)
 */
export async function submitPractice(sessionId: string, code: string): Promise<SubmitPracticeResponse> {
  // Get session data
  const { data: session, error: sessionError } = await supabase
    .from('practice_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (sessionError) {
    throw new Error(`Failed to get practice session: ${sessionError.message}`);
  }

  // Run code in sandbox
  const result = await runCodeSandbox(code, session.test_cases);

  // Calculate score
  const score = Math.round((result.passedTests / result.totalTests) * 100);

  // Update session
  await supabase
    .from('practice_sessions')
    .update({
      completed: result.passed,
      score,
      attempts: session.attempts + 1,
      final_code: result.passed ? code : session.final_code,
      completed_at: result.passed ? new Date().toISOString() : session.completed_at,
    })
    .eq('id', sessionId);

  // Generate feedback
  let feedback = '';
  if (result.passed) {
    feedback = 'Excellent work! All tests passed.';
  } else {
    const passedPercentage = Math.round((result.passedTests / result.totalTests) * 100);
    feedback = `Good effort! ${result.passedTests}/${result.totalTests} tests passed (${passedPercentage}%).`;
  }

  return {
    passedTests: result.passedTests,
    totalTests: result.totalTests,
    score,
    feedback,
  };
}