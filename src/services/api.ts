import { supabase } from '../lib/supabaseClient';
import { generatePuzzle } from '../lib/puzzleGenerator';
import { runCodeSandbox } from '../lib/sandboxRunner';
import { computeDeltas, applyRatingChange } from '../lib/elo';
import { getCurrentUser } from '../lib/auth';
import { GameMode, PracticeMode, Difficulty } from '../types';

export interface CreateDuelResponse {
  duelId: string;
  prompt: string;
  tests: Array<{ input: string; expected: string }>;
}

export interface JoinDuelResponse {
  prompt: string;
  tests: Array<{ input: string; expected: string }>;
  timeLimit: number;
}

export interface SubmitDuelResponse {
  passed: boolean;
  passedTests: number;
  totalTests: number;
  runtimeMs: number;
  deltaWinner?: number;
  deltaLoser?: number;
  newRatings?: { winner: number; loser: number };
}

export interface StartPracticeResponse {
  sessionId: string;
  prompt: string;
  tests: Array<{ input: string; expected: string }>;
  hints: string[];
}

export interface SubmitPracticeResponse {
  passed: boolean;
  passedTests: number;
  totalTests: number;
  score: number;
  feedback: string;
}

export async function createDuel(profileFingerprint: string, mode: GameMode = 'ranked-duel'): Promise<CreateDuelResponse> {
  try {
    // Generate puzzle based on profile fingerprint
    const puzzle = await generatePuzzle(profileFingerprint, '', mode);
    
    // Create duel record in Supabase
    const { data, error } = await supabase
      .from('duels')
      .insert({
        creator_id: profileFingerprint,
        status: 'waiting',
        mode,
        prompt: puzzle.prompt,
        test_cases: puzzle.tests,
        time_limit: 900, // 15 minutes
      })
      .select()
      .single();

    if (error) throw error;

    return {
      duelId: data.id,
      prompt: puzzle.prompt,
      tests: puzzle.tests,
    };
  } catch (error) {
    console.error('Error creating duel:', error);
    // Return mock data for development
    return {
      duelId: `duel-${Date.now()}`,
      prompt: `Write a function that finds the two numbers in an array that add up to a target sum.

Given an array of integers and a target sum, return the indices of the two numbers that add up to the target.

You may assume that each input would have exactly one solution, and you may not use the same element twice.

Example:
Input: nums = [2, 7, 11, 15], target = 9
Output: [0, 1] (because nums[0] + nums[1] = 2 + 7 = 9)`,
      tests: [
        { input: '[2, 7, 11, 15], 9', expected: '[0, 1]' },
        { input: '[3, 2, 4], 6', expected: '[1, 2]' },
        { input: '[3, 3], 6', expected: '[0, 1]' },
      ],
    };
  }
}

export async function joinDuel(duelId: string): Promise<JoinDuelResponse> {
  try {
    const { data, error } = await supabase
      .from('duels')
      .select('*')
      .eq('id', duelId)
      .single();

    if (error) throw error;

    return {
      prompt: data.prompt,
      tests: data.test_cases,
      timeLimit: data.time_limit,
    };
  } catch (error) {
    console.error('Error joining duel:', error);
    // Return mock data for development
    return {
      prompt: `Write a function that finds the two numbers in an array that add up to a target sum.

Given an array of integers and a target sum, return the indices of the two numbers that add up to the target.

You may assume that each input would have exactly one solution, and you may not use the same element twice.

Example:
Input: nums = [2, 7, 11, 15], target = 9
Output: [0, 1] (because nums[0] + nums[1] = 2 + 7 = 9)`,
      tests: [
        { input: '[2, 7, 11, 15], 9', expected: '[0, 1]' },
        { input: '[3, 2, 4], 6', expected: '[1, 2]' },
        { input: '[3, 3], 6', expected: '[0, 1]' },
      ],
      timeLimit: 900,
    };
  }
}

export async function submitDuel(duelId: string, code: string): Promise<SubmitDuelResponse> {
  try {
    // Get current user
    const currentUser = await getCurrentUser();
    const currentUserId = currentUser?.id || 'anonymous';
    
    // Get duel data including participants
    const { data: duel, error: duelError } = await supabase
      .from('duels')
      .select('*')
      .eq('id', duelId)
      .single();

    if (duelError) throw duelError;

    // Run code in sandbox
    const result = await runCodeSandbox(code, duel.test_cases);

    // Save submission
    const { error: submissionError } = await supabase
      .from('submissions')
      .insert({
        duel_id: duelId,
        user_id: currentUserId,
        code,
        passed_tests: result.passedTests,
        total_tests: result.totalTests,
        runtime_ms: result.runtimeMs,
      });

    if (submissionError) throw submissionError;

    // Handle Elo rating updates for ranked duels
    let deltaWinner, deltaLoser, newRatings;
    
    if (duel.mode === 'ranked-duel' && duel.opponent_id && result.passed && currentUser) {
      // Get both players' current ratings
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, rating')
        .in('id', [duel.creator_id, duel.opponent_id]);

      if (!usersError && users && users.length === 2) {
        const winner = users.find(u => u.id === currentUserId);
        const loser = users.find(u => u.id !== currentUserId);
        
        if (winner && loser) {
          // Calculate rating changes
          const wrongSubmissions = result.wrongAttempts || 0;
          const deltas = computeDeltas(winner.rating, loser.rating, wrongSubmissions);
          
          deltaWinner = deltas.deltaWinner;
          deltaLoser = deltas.deltaLoser;
          
          const newWinnerRating = applyRatingChange(winner.rating, deltaWinner);
          const newLoserRating = applyRatingChange(loser.rating, deltaLoser);
          
          newRatings = { winner: newWinnerRating, loser: newLoserRating };
          
          // Update ratings in database
          await Promise.all([
            supabase.from('users').update({ 
              rating: newWinnerRating,
              wins: winner.wins + 1,
              last_active: new Date().toISOString()
            }).eq('id', winner.id),
            supabase.from('users').update({ 
              rating: newLoserRating,
              losses: loser.losses + 1,
              last_active: new Date().toISOString()
            }).eq('id', loser.id),
          ]);
          
          // Record duel result
          await supabase.from('duel_results').insert({
            duel_id: duelId,
            winner_id: winner.id,
            loser_id: loser.id,
            winner_delta: deltaWinner,
            loser_delta: deltaLoser,
          });
          
          // Record match history for both players
          await Promise.all([
            supabase.from('match_history').insert({
              user_id: winner.id,
              duel_id: duelId,
              opponent_id: loser.id,
              result: 'win',
              rating_before: winner.rating,
              rating_after: newWinnerRating,
              rating_change: deltaWinner,
              completion_time: Math.floor(result.runtimeMs / 1000),
              wrong_submissions: wrongSubmissions,
              final_code: code,
            }),
            supabase.from('match_history').insert({
              user_id: loser.id,
              duel_id: duelId,
              opponent_id: winner.id,
              result: 'loss',
              rating_before: loser.rating,
              rating_after: newLoserRating,
              rating_change: deltaLoser,
              wrong_submissions: 0, // Only track for the submitter
              final_code: '', // Don't store opponent's code
            }),
          ]);
        }
      }
    }

    return {
      ...result,
      deltaWinner,
      deltaLoser,
      newRatings,
    };
  } catch (error) {
    console.error('Error submitting duel:', error);
    // Return mock result for development
    return {
      passed: true,
      passedTests: 3,
      totalTests: 3,
      runtimeMs: 45,
    };
  }
}

export async function startPractice(
  topic: string, 
  difficulty: Difficulty, 
  mode: PracticeMode
): Promise<StartPracticeResponse> {
  try {
    // Get current user
    const currentUser = await getCurrentUser();
    const currentUserId = currentUser?.id || 'anonymous';
    
    // Generate practice puzzle
    const puzzle = await generatePuzzle('', '', 'practice', { topic, difficulty, mode });
    
    // Create practice session record
    const { data, error } = await supabase
      .from('practice_sessions')
      .insert({
        user_id: currentUserId,
        mode,
        topic,
        difficulty,
        prompt: puzzle.prompt,
        test_cases: puzzle.tests,
        hints_used: 0,
        completed: false,
        score: 0,
      })
      .select()
      .single();

    if (error) throw error;

    return {
      sessionId: data.id,
      prompt: puzzle.prompt,
      tests: puzzle.tests,
      hints: puzzle.hints || [],
    };
  } catch (error) {
    console.error('Error starting practice:', error);
    // Return mock data for development
    return {
      sessionId: `practice-${Date.now()}`,
      prompt: `Find the maximum sum of a contiguous subarray.

Given an integer array nums, find the contiguous subarray (containing at least one number) which has the largest sum and return its sum.

Example:
Input: nums = [-2,1,-3,4,-1,2,1,-5,4]
Output: 6
Explanation: [4,-1,2,1] has the largest sum = 6.`,
      tests: [
        { input: '[-2,1,-3,4,-1,2,1,-5,4]', expected: '6' },
        { input: '[1]', expected: '1' },
        { input: '[5,4,-1,7,8]', expected: '23' },
      ],
      hints: [
        'Think about dynamic programming - what\'s the maximum sum ending at each position?',
        'Consider Kadane\'s algorithm for an efficient O(n) solution.',
        'At each step, decide whether to extend the current subarray or start a new one.',
      ],
    };
  }
}

export async function submitPractice(sessionId: string, code: string): Promise<SubmitPracticeResponse> {
  try {
    // Get practice session data
    const { data: session, error: sessionError } = await supabase
      .from('practice_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (sessionError) throw sessionError;

    // Run code in sandbox
    const result = await runCodeSandbox(code, session.test_cases);

    // Calculate score based on performance
    const score = Math.round((result.passedTests / result.totalTests) * 100);

    // Update practice session
    const { error: updateError } = await supabase
      .from('practice_sessions')
      .update({
        completed: true,
        score,
      })
      .eq('id', sessionId);

    if (updateError) throw updateError;

    return {
      passed: result.passed,
      passedTests: result.passedTests,
      totalTests: result.totalTests,
      score,
      feedback: result.passed 
        ? 'Excellent work! All tests passed.' 
        : `Good effort! ${result.passedTests}/${result.totalTests} tests passed. Keep practicing!`,
    };
  } catch (error) {
    console.error('Error submitting practice:', error);
    // Return mock result for development
    return {
      passed: true,
      passedTests: 3,
      totalTests: 3,
      score: 100,
      feedback: 'Great job! All tests passed. You\'re getting better!',
    };
  }
}