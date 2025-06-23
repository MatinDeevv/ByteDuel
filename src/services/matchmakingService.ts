/**
 * Real Matchmaking Service - Connects players together
 * Implements skill-based matching with automatic duel creation
 */
import { supabase } from '../lib/supabaseClient';
import { generatePuzzle } from '../lib/puzzleGenerator';

export interface MatchmakingCandidate {
  user_id: string;
  display_name: string;
  elo_rating: number;
  queued_at: string;
  mode: string;
}

export interface MatchResult {
  duel_id: string;
  opponent: {
    id: string;
    name: string;
    rating: number;
  };
}

/**
 * Add user to matchmaking queue
 */
export async function joinMatchmakingQueue(
  userId: string,
  mode: 'ranked' | 'casual' = 'ranked'
): Promise<void> {
  console.log('🎯 Adding user to matchmaking queue:', { userId, mode });

  const { error } = await supabase
    .from('matchmaking_queue')
    .upsert({
      user_id: userId,
      mode,
      queued_at: new Date().toISOString(),
    });

  if (error) {
    throw new Error(`Failed to join queue: ${error.message}`);
  }

  console.log('✅ Successfully added to queue');
}

/**
 * Remove user from matchmaking queue
 */
export async function leaveMatchmakingQueue(userId: string): Promise<void> {
  console.log('🚪 Removing user from matchmaking queue:', userId);

  const { error } = await supabase
    .from('matchmaking_queue')
    .delete()
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Failed to leave queue: ${error.message}`);
  }

  console.log('✅ Successfully removed from queue');
}

/**
 * Find suitable opponents for a user
 */
export async function findOpponents(
  userId: string,
  userRating: number,
  mode: 'ranked' | 'casual' = 'ranked',
  ratingRange: number = 200
): Promise<MatchmakingCandidate[]> {
  console.log('🔍 Finding opponents for user:', { userId, userRating, mode, ratingRange });

  // Get users from queue with similar ratings
  const { data: candidates, error } = await supabase
    .from('matchmaking_queue')
    .select(`
      user_id,
      mode,
      queued_at,
      user:user_id (
        display_name,
        elo_rating
      )
    `)
    .eq('mode', mode)
    .neq('user_id', userId)
    .order('queued_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to find opponents: ${error.message}`);
  }

  // Transform and filter the data
  const opponents: MatchmakingCandidate[] = (candidates || [])
    .map((candidate: any) => ({
      user_id: candidate.user_id,
      display_name: candidate.user?.display_name || 'Unknown',
      elo_rating: candidate.user?.elo_rating || 1200,
      queued_at: candidate.queued_at,
      mode: candidate.mode,
    }))
    .filter(opponent => {
      const ratingDiff = Math.abs(opponent.elo_rating - userRating);
      return ratingDiff <= ratingRange;
    });

  console.log(`🎯 Found ${opponents.length} potential opponents:`, opponents);
  return opponents;
}

/**
 * Create a duel between two players
 */
export async function createMatchDuel(
  player1Id: string,
  player2Id: string,
  mode: 'ranked' | 'casual' = 'ranked'
): Promise<string> {
  console.log('⚔️ Creating duel between players:', { player1Id, player2Id, mode });

  try {
    // Generate a coding problem
    const puzzle = await generatePuzzle('', '', 'ranked-duel');
    
    // Create the duel
    const { data: duel, error } = await supabase
      .from('duels')
      .insert({
        creator_id: player1Id,
        opponent_id: player2Id,
        status: 'active',
        mode,
        prompt: puzzle.prompt,
        test_cases: puzzle.tests,
        time_limit: 900, // 15 minutes
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create duel: ${error.message}`);
    }

    console.log('✅ Duel created successfully:', duel.id);
    return duel.id;
  } catch (error) {
    console.error('💥 Failed to create duel:', error);
    throw error;
  }
}

/**
 * Process matchmaking - find and match players
 */
export async function processMatchmaking(): Promise<number> {
  console.log('🔄 Processing matchmaking...');

  try {
    // Get all users in queue with their ratings
    const { data: queuedUsers, error } = await supabase
      .from('matchmaking_queue')
      .select(`
        user_id,
        mode,
        queued_at,
        user:user_id (
          display_name,
          elo_rating
        )
      `)
      .order('queued_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to get queue: ${error.message}`);
    }

    if (!queuedUsers || queuedUsers.length < 2) {
      console.log('📭 Not enough players in queue for matching');
      return 0;
    }

    console.log(`👥 Found ${queuedUsers.length} players in queue`);

    let matchesCreated = 0;
    const processedUsers = new Set<string>();

    // Try to match players
    for (const user of queuedUsers) {
      if (processedUsers.has(user.user_id)) continue;

      const userRating = (user.user as any)?.elo_rating || 1200;
      
      // Find suitable opponents
      const opponents = await findOpponents(
        user.user_id,
        userRating,
        user.mode as 'ranked' | 'casual',
        300 // Wider range for better matching
      );

      // Filter out already processed users
      const availableOpponents = opponents.filter(
        opponent => !processedUsers.has(opponent.user_id)
      );

      if (availableOpponents.length > 0) {
        const opponent = availableOpponents[0]; // Take the first (oldest in queue)
        
        try {
          // Create the duel
          const duelId = await createMatchDuel(
            user.user_id,
            opponent.user_id,
            user.mode as 'ranked' | 'casual'
          );

          // Remove both players from queue
          await Promise.all([
            leaveMatchmakingQueue(user.user_id),
            leaveMatchmakingQueue(opponent.user_id),
          ]);

          // Mark as processed
          processedUsers.add(user.user_id);
          processedUsers.add(opponent.user_id);
          matchesCreated++;

          console.log(`🎉 Match created! Duel ID: ${duelId}`);
          console.log(`👤 Player 1: ${(user.user as any)?.display_name} (${userRating})`);
          console.log(`👤 Player 2: ${opponent.display_name} (${opponent.elo_rating})`);
        } catch (error) {
          console.error('💥 Failed to create match:', error);
        }
      }
    }

    console.log(`✅ Matchmaking complete. Created ${matchesCreated} matches.`);
    return matchesCreated;
  } catch (error) {
    console.error('💥 Matchmaking process failed:', error);
    return 0;
  }
}

/**
 * Get queue status for a user
 */
export async function getQueueStatus(userId: string): Promise<{
  inQueue: boolean;
  position?: number;
  estimatedWaitTime?: number;
}> {
  const { data: userQueue, error } = await supabase
    .from('matchmaking_queue')
    .select('queued_at, mode')
    .eq('user_id', userId)
    .single();

  if (error || !userQueue) {
    return { inQueue: false };
  }

  // Get position in queue
  const { count } = await supabase
    .from('matchmaking_queue')
    .select('*', { count: 'exact', head: true })
    .eq('mode', userQueue.mode)
    .lt('queued_at', userQueue.queued_at);

  const position = (count || 0) + 1;
  const estimatedWaitTime = Math.max(30, position * 15); // 15 seconds per person ahead

  return {
    inQueue: true,
    position,
    estimatedWaitTime,
  };
}

/**
 * Add demo users to queue for testing
 */
export async function addDemoUsersToQueue(): Promise<void> {
  console.log('🎭 Adding demo users to queue for testing...');
  
  const demoUsers = [
    '550e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440002',
    '550e8400-e29b-41d4-a716-446655440003',
  ];

  for (const userId of demoUsers) {
    try {
      await joinMatchmakingQueue(userId, 'ranked');
      // Add small delay to create different queue times
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.log(`Demo user ${userId} already in queue or error:`, error);
    }
  }
  
  console.log('✅ Demo users added to queue');
}