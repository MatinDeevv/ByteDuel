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
 * Find suitable opponents for a user with enhanced matching
 */
export async function findOpponents(
  userId: string,
  userRating: number,
  mode: 'ranked' | 'casual' = 'ranked',
  ratingRange: number = 200
): Promise<MatchmakingCandidate[]> {
  console.log('🔍 Finding opponents for user:', { userId, userRating, mode, ratingRange });

  // Get users from queue with their ratings
  const { data: queueData, error } = await supabase
    .from('matchmaking_queue')
    .select(`
      user_id,
      mode,
      queued_at,
      users!inner (
        display_name,
        elo_rating
      )
    `)
    .eq('mode', mode)
    .neq('user_id', userId)
    .order('queued_at', { ascending: true });

  if (error) {
    console.error('Error fetching queue data:', error);
    throw new Error(`Failed to find opponents: ${error.message}`);
  }

  if (!queueData || queueData.length === 0) {
    console.log('📭 No other players in queue');
    return [];
  }

  // Transform and filter the data
  const allCandidates: MatchmakingCandidate[] = queueData
    .map((candidate: any) => ({
      user_id: candidate.user_id,
      display_name: candidate.users?.display_name || 'Unknown',
      elo_rating: candidate.users?.elo_rating || 1200,
      queued_at: candidate.queued_at,
      mode: candidate.mode,
    }))
    .filter(candidate => candidate.display_name !== 'Unknown'); // Filter out invalid data

  console.log(`📋 All candidates in queue:`, allCandidates);

  // Priority 1: Exact ELO match (instant connection)
  const exactMatches = allCandidates.filter(opponent => 
    opponent.elo_rating === userRating
  );

  if (exactMatches.length > 0) {
    console.log(`🎯 Found ${exactMatches.length} exact ELO matches:`, exactMatches);
    return exactMatches;
  }

  // Priority 2: Very close matches (within 50 ELO)
  const closeMatches = allCandidates.filter(opponent => {
    const ratingDiff = Math.abs(opponent.elo_rating - userRating);
    return ratingDiff <= 50;
  });

  if (closeMatches.length > 0) {
    console.log(`🎯 Found ${closeMatches.length} close matches (≤50 ELO):`, closeMatches);
    return closeMatches;
  }

  // Priority 3: Good matches (within specified range)
  const goodMatches = allCandidates.filter(opponent => {
    const ratingDiff = Math.abs(opponent.elo_rating - userRating);
    return ratingDiff <= ratingRange;
  });

  if (goodMatches.length > 0) {
    console.log(`🎯 Found ${goodMatches.length} good matches (≤${ratingRange} ELO):`, goodMatches);
    return goodMatches;
  }

  // Priority 4: Any available opponent (if waiting too long)
  console.log(`🎯 No close matches found, returning all ${allCandidates.length} candidates`);
  return allCandidates;
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
 * Enhanced matchmaking process with instant matching for same ELO
 */
export async function processMatchmaking(): Promise<number> {
  console.log('🔄 Processing enhanced matchmaking...');

  try {
    // Get all users in queue with their ratings
    const { data: queueData, error } = await supabase
      .from('matchmaking_queue')
      .select(`
        user_id,
        mode,
        queued_at,
        users!inner (
          display_name,
          elo_rating
        )
      `)
      .order('queued_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to get queue: ${error.message}`);
    }

    if (!queueData || queueData.length < 2) {
      console.log('📭 Not enough players in queue for matching');
      return 0;
    }

    // Transform queue data
    const queuedUsers = queueData
      .map((user: any) => ({
        user_id: user.user_id,
        mode: user.mode,
        queued_at: user.queued_at,
        display_name: user.users?.display_name || 'Unknown',
        elo_rating: user.users?.elo_rating || 1200,
      }))
      .filter(user => user.display_name !== 'Unknown');

    console.log(`👥 Found ${queuedUsers.length} valid players in queue:`, queuedUsers);

    let matchesCreated = 0;
    const processedUsers = new Set<string>();

    // Group users by mode for efficient matching
    const usersByMode = queuedUsers.reduce((acc, user) => {
      if (!acc[user.mode]) acc[user.mode] = [];
      acc[user.mode].push(user);
      return acc;
    }, {} as Record<string, typeof queuedUsers>);

    // Process each mode separately
    for (const [mode, users] of Object.entries(usersByMode)) {
      console.log(`🎮 Processing ${mode} mode with ${users.length} players`);

      // Strategy 1: Instant matching for exact ELO matches
      const eloGroups = users.reduce((acc, user) => {
        if (processedUsers.has(user.user_id)) return acc;
        
        if (!acc[user.elo_rating]) acc[user.elo_rating] = [];
        acc[user.elo_rating].push(user);
        return acc;
      }, {} as Record<number, typeof users>);

      // Match players with exact same ELO instantly
      for (const [elo, eloUsers] of Object.entries(eloGroups)) {
        const availableUsers = eloUsers.filter(user => !processedUsers.has(user.user_id));
        
        while (availableUsers.length >= 2) {
          const player1 = availableUsers.shift()!;
          const player2 = availableUsers.shift()!;

          try {
            console.log(`⚡ INSTANT MATCH - Same ELO (${elo}):`, {
              player1: player1.display_name,
              player2: player2.display_name
            });

            const duelId = await createMatchDuel(
              player1.user_id,
              player2.user_id,
              mode as 'ranked' | 'casual'
            );

            // Remove both players from queue
            await Promise.all([
              leaveMatchmakingQueue(player1.user_id),
              leaveMatchmakingQueue(player2.user_id),
            ]);

            processedUsers.add(player1.user_id);
            processedUsers.add(player2.user_id);
            matchesCreated++;

            console.log(`🎉 Instant match created! Duel ID: ${duelId}`);
            console.log(`🚀 Players should navigate to: /duel/${duelId}`);
          } catch (error) {
            console.error('💥 Failed to create instant match:', error);
          }
        }
      }

      // Strategy 2: Close ELO matching (within 50 points)
      const remainingUsers = users.filter(user => !processedUsers.has(user.user_id));
      
      for (const user of remainingUsers) {
        if (processedUsers.has(user.user_id)) continue;

        const closeMatches = remainingUsers.filter(opponent => 
          !processedUsers.has(opponent.user_id) && 
          opponent.user_id !== user.user_id &&
          Math.abs(opponent.elo_rating - user.elo_rating) <= 50
        );

        if (closeMatches.length > 0) {
          const opponent = closeMatches[0]; // Take the first close match

          try {
            console.log(`🎯 CLOSE MATCH (≤50 ELO):`, {
              player1: `${user.display_name} (${user.elo_rating})`,
              player2: `${opponent.display_name} (${opponent.elo_rating})`,
              difference: Math.abs(opponent.elo_rating - user.elo_rating)
            });

            const duelId = await createMatchDuel(
              user.user_id,
              opponent.user_id,
              mode as 'ranked' | 'casual'
            );

            await Promise.all([
              leaveMatchmakingQueue(user.user_id),
              leaveMatchmakingQueue(opponent.user_id),
            ]);

            processedUsers.add(user.user_id);
            processedUsers.add(opponent.user_id);
            matchesCreated++;

            console.log(`🎉 Close match created! Duel ID: ${duelId}`);
            console.log(`🚀 Players should navigate to: /duel/${duelId}`);
          } catch (error) {
            console.error('💥 Failed to create close match:', error);
          }
        }
      }

      // Strategy 3: Wider range matching for players waiting longer
      const stillWaiting = users.filter(user => !processedUsers.has(user.user_id));
      
      for (const user of stillWaiting) {
        if (processedUsers.has(user.user_id)) continue;

        // Check how long they've been waiting
        const waitTime = Date.now() - new Date(user.queued_at).getTime();
        const maxWaitTime = 60000; // 1 minute

        if (waitTime > maxWaitTime) {
          // Expand search range for long-waiting players
          const wideMatches = stillWaiting.filter(opponent => 
            !processedUsers.has(opponent.user_id) && 
            opponent.user_id !== user.user_id &&
            Math.abs(opponent.elo_rating - user.elo_rating) <= 300
          );

          if (wideMatches.length > 0) {
            const opponent = wideMatches[0];

            try {
              console.log(`⏰ WIDE MATCH (long wait):`, {
                player1: `${user.display_name} (${user.elo_rating})`,
                player2: `${opponent.display_name} (${opponent.elo_rating})`,
                difference: Math.abs(opponent.elo_rating - user.elo_rating),
                waitTime: Math.round(waitTime / 1000) + 's'
              });

              const duelId = await createMatchDuel(
                user.user_id,
                opponent.user_id,
                mode as 'ranked' | 'casual'
              );

              await Promise.all([
                leaveMatchmakingQueue(user.user_id),
                leaveMatchmakingQueue(opponent.user_id),
              ]);

              processedUsers.add(user.user_id);
              processedUsers.add(opponent.user_id);
              matchesCreated++;

              console.log(`🎉 Wide match created! Duel ID: ${duelId}`);
              console.log(`🚀 Players should navigate to: /duel/${duelId}`);
            } catch (error) {
              console.error('💥 Failed to create wide match:', error);
            }
          }
        }
      }
    }

    console.log(`✅ Enhanced matchmaking complete. Created ${matchesCreated} matches.`);
    return matchesCreated;
  } catch (error) {
    console.error('💥 Enhanced matchmaking process failed:', error);
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
  
  // Estimate wait time based on position and recent matching activity
  let estimatedWaitTime = 30; // Base 30 seconds
  
  if (position > 1) {
    estimatedWaitTime = Math.min(120, position * 15); // Max 2 minutes
  }

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