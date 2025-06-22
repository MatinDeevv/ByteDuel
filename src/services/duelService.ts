/**
 * Duel Service - Competitive coding match management
 * Handles duel creation, joining, submissions, and results
 */
import { supabase, type Duel, type Submission, type Profile } from '../lib/supabaseClient';
import { runCodeSandbox } from '../lib/sandboxRunner';
import { generatePuzzle } from '../lib/puzzleGenerator';

export interface CreateDuelOptions {
  mode: 'ranked' | 'casual' | 'tournament' | 'practice';
  difficulty: 'easy' | 'medium' | 'hard';
  topic: string;
  timeLimit?: number;
  maxAttempts?: number;
}

export interface JoinDuelResult {
  duel: Duel;
  opponent: Profile;
}

export interface SubmissionResult {
  submission: Submission;
  duel: Duel;
  isWinner: boolean;
  ratingChange?: number;
  newRating?: number;
}

/**
 * Create a new duel
 */
export async function createDuel(
  creatorId: string,
  options: CreateDuelOptions
): Promise<Duel> {
  // Generate puzzle based on options
  const puzzle = await generatePuzzle('', '', 'duel', {
    topic: options.topic,
    difficulty: options.difficulty,
    mode: 'drills', // Convert to practice mode type
  });

  const duelData = {
    creator_id: creatorId,
    mode: options.mode,
    difficulty: options.difficulty,
    topic: options.topic,
    prompt: puzzle.prompt,
    test_cases: puzzle.tests,
    time_limit: options.timeLimit || 900, // 15 minutes default
    max_attempts: options.maxAttempts || 10,
  };

  const { data, error } = await supabase
    .from('duels')
    .insert(duelData)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Join an existing duel
 */
export async function joinDuel(duelId: string, opponentId: string): Promise<JoinDuelResult> {
  // Update duel with opponent and start it
  const { data: duel, error: duelError } = await supabase
    .from('duels')
    .update({
      opponent_id: opponentId,
      status: 'active',
      started_at: new Date().toISOString(),
    })
    .eq('id', duelId)
    .eq('status', 'waiting')
    .select()
    .single();

  if (duelError) {
    throw duelError;
  }

  // Get opponent profile
  const { data: opponent, error: opponentError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', duel.creator_id)
    .single();

  if (opponentError) {
    throw opponentError;
  }

  return { duel, opponent };
}

/**
 * Get duel by ID with participants
 */
export async function getDuelWithParticipants(duelId: string): Promise<{
  duel: Duel;
  creator: Profile;
  opponent?: Profile;
}> {
  const { data: duel, error: duelError } = await supabase
    .from('duels')
    .select('*')
    .eq('id', duelId)
    .single();

  if (duelError) {
    throw duelError;
  }

  // Get creator profile
  const { data: creator, error: creatorError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', duel.creator_id)
    .single();

  if (creatorError) {
    throw creatorError;
  }

  let opponent: Profile | undefined;
  if (duel.opponent_id) {
    const { data: opponentData, error: opponentError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', duel.opponent_id)
      .single();

    if (!opponentError) {
      opponent = opponentData;
    }
  }

  return { duel, creator, opponent };
}

/**
 * Submit code for a duel
 */
export async function submitCode(
  duelId: string,
  userId: string,
  code: string,
  language = 'javascript'
): Promise<SubmissionResult> {
  // Get duel data
  const { data: duel, error: duelError } = await supabase
    .from('duels')
    .select('*')
    .eq('id', duelId)
    .single();

  if (duelError) {
    throw duelError;
  }

  // Get current attempt number
  const { data: submissions } = await supabase
    .from('submissions')
    .select('attempt_number')
    .eq('duel_id', duelId)
    .eq('user_id', userId)
    .order('attempt_number', { ascending: false })
    .limit(1);

  const attemptNumber = (submissions?.[0]?.attempt_number || 0) + 1;

  // Run code in sandbox
  const result = await runCodeSandbox(code, duel.test_cases);

  // Create submission record
  const submissionData = {
    duel_id: duelId,
    user_id: userId,
    code,
    language,
    passed_tests: result.passedTests,
    total_tests: result.totalTests,
    runtime_ms: result.runtimeMs,
    test_results: result.testResults,
    is_final: result.passed,
    attempt_number: attemptNumber,
  };

  const { data: submission, error: submissionError } = await supabase
    .from('submissions')
    .insert(submissionData)
    .select()
    .single();

  if (submissionError) {
    throw submissionError;
  }

  let isWinner = false;
  let ratingChange: number | undefined;
  let newRating: number | undefined;

  // If solution is correct, handle duel completion
  if (result.passed) {
    const completionTime = Math.floor(result.runtimeMs / 1000);
    const isCreator = userId === duel.creator_id;

    // Update duel with completion data
    const updateData = isCreator
      ? {
          creator_completion_time: completionTime,
          creator_attempts: attemptNumber,
          winner_id: userId,
          status: 'completed' as const,
          ended_at: new Date().toISOString(),
        }
      : {
          opponent_completion_time: completionTime,
          opponent_attempts: attemptNumber,
          winner_id: userId,
          status: 'completed' as const,
          ended_at: new Date().toISOString(),
        };

    // Calculate ELO changes for ranked duels
    if (duel.mode === 'ranked' && duel.opponent_id) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, elo_rating')
        .in('id', [duel.creator_id, duel.opponent_id]);

      if (profiles && profiles.length === 2) {
        const winner = profiles.find(p => p.id === userId)!;
        const loser = profiles.find(p => p.id !== userId)!;

        // Calculate ELO changes using database function
        const { data: eloChanges } = await supabase.rpc('calculate_elo_change', {
          winner_rating: winner.elo_rating,
          loser_rating: loser.elo_rating,
        });

        if (eloChanges && eloChanges.length > 0) {
          const changes = eloChanges[0];
          ratingChange = changes.winner_change;
          newRating = winner.elo_rating + ratingChange;

          // Update duel with rating changes
          Object.assign(updateData, {
            creator_rating_before: profiles.find(p => p.id === duel.creator_id)!.elo_rating,
            opponent_rating_before: profiles.find(p => p.id === duel.opponent_id)!.elo_rating,
            creator_rating_after: isCreator ? newRating : loser.elo_rating + changes.loser_change,
            opponent_rating_after: isCreator ? loser.elo_rating + changes.loser_change : newRating,
            creator_rating_change: isCreator ? ratingChange : changes.loser_change,
            opponent_rating_change: isCreator ? changes.loser_change : ratingChange,
          });
        }
      }
    }

    // Update duel
    const { data: updatedDuel, error: updateError } = await supabase
      .from('duels')
      .update(updateData)
      .eq('id', duelId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    isWinner = true;
    return { submission, duel: updatedDuel, isWinner, ratingChange, newRating };
  }

  return { submission, duel, isWinner };
}

/**
 * Get user's submissions for a duel
 */
export async function getUserSubmissions(duelId: string, userId: string): Promise<Submission[]> {
  const { data, error } = await supabase
    .from('submissions')
    .select('*')
    .eq('duel_id', duelId)
    .eq('user_id', userId)
    .order('submitted_at', { ascending: true });

  if (error) {
    throw error;
  }

  return data || [];
}

/**
 * Get active duels for matchmaking
 */
export async function getActiveDuels(
  mode: 'ranked' | 'casual' = 'ranked',
  limit = 10
): Promise<Duel[]> {
  const { data, error } = await supabase
    .from('duels')
    .select('*')
    .eq('status', 'waiting')
    .eq('mode', mode)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) {
    throw error;
  }

  return data || [];
}

/**
 * Get user's recent duels
 */
export async function getUserRecentDuels(
  userId: string,
  limit = 10
): Promise<Array<Duel & { opponent_name?: string; opponent_avatar?: string }>> {
  const { data, error } = await supabase
    .from('duels')
    .select(`
      *,
      creator:creator_id(display_name, avatar_url),
      opponent:opponent_id(display_name, avatar_url)
    `)
    .or(`creator_id.eq.${userId},opponent_id.eq.${userId}`)
    .eq('status', 'completed')
    .order('ended_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return (data || []).map(duel => ({
    ...duel,
    opponent_name: userId === duel.creator_id 
      ? (duel.opponent as any)?.display_name 
      : (duel.creator as any)?.display_name,
    opponent_avatar: userId === duel.creator_id 
      ? (duel.opponent as any)?.avatar_url 
      : (duel.creator as any)?.avatar_url,
  }));
}

/**
 * Cancel a duel
 */
export async function cancelDuel(duelId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('duels')
    .update({ status: 'cancelled' })
    .eq('id', duelId)
    .eq('creator_id', userId)
    .eq('status', 'waiting');

  if (error) {
    throw error;
  }
}

/**
 * Get duel statistics
 */
export async function getDuelStats(): Promise<{
  totalDuels: number;
  activeDuels: number;
  completedToday: number;
  averageDuration: number;
}> {
  const [totalResult, activeResult, todayResult] = await Promise.all([
    supabase.from('duels').select('id', { count: 'exact', head: true }),
    supabase.from('duels').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('duels').select('id', { count: 'exact', head: true })
      .eq('status', 'completed')
      .gte('ended_at', new Date().toISOString().split('T')[0]),
  ]);

  // Calculate average duration from completed duels
  const { data: completedDuels } = await supabase
    .from('duels')
    .select('created_at, ended_at')
    .eq('status', 'completed')
    .not('ended_at', 'is', null)
    .limit(100);

  let averageDuration = 0;
  if (completedDuels && completedDuels.length > 0) {
    const totalDuration = completedDuels.reduce((sum, duel) => {
      const start = new Date(duel.created_at).getTime();
      const end = new Date(duel.ended_at!).getTime();
      return sum + (end - start);
    }, 0);
    averageDuration = Math.floor(totalDuration / completedDuels.length / 1000); // in seconds
  }

  return {
    totalDuels: totalResult.count || 0,
    activeDuels: activeResult.count || 0,
    completedToday: todayResult.count || 0,
    averageDuration,
  };
}