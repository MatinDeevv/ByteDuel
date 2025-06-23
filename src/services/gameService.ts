/**
 * Game Service - Simple client-side game management
 * Handles game creation, listing, and joining without complex database queues
 */
import { supabase } from '../lib/supabaseClient';
import { generatePuzzle } from '../lib/puzzleGenerator';

export interface GameLobby {
  id: string;
  host_id: string;
  host_name: string;
  host_rating: number;
  host_avatar?: string;
  mode: 'ranked' | 'casual' | 'practice';
  difficulty: 'easy' | 'medium' | 'hard';
  topic: string;
  max_players: number;
  current_players: number;
  status: 'waiting' | 'starting' | 'active';
  created_at: string;
  time_limit: number;
  description?: string;
}

export interface JoinGameResult {
  success: boolean;
  duelId?: string;
  error?: string;
}

/**
 * Get all available games
 */
export async function getAllGames(): Promise<GameLobby[]> {
  try {
    const { data: duels, error } = await supabase
      .from('duels')
      .select(`
        id,
        creator_id,
        mode,
        prompt,
        time_limit,
        created_at,
        status,
        creator:users!creator_id (
          display_name,
          elo_rating,
          avatar_url
        )
      `)
      .in('status', ['waiting', 'starting'])
      .is('opponent_id', null)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Supabase query error:', error);
      return [];
    }

    return (duels || []).map((duel: any) => ({
      id: duel.id,
      host_id: duel.creator_id,
      host_name: duel.creator?.display_name || 'Unknown',
      host_rating: duel.creator?.elo_rating || 1200,
      host_avatar: duel.creator?.avatar_url,
      mode: duel.mode || 'ranked',
      difficulty: 'medium', // Default, could be stored in duel
      topic: 'algorithms', // Default, could be extracted from prompt
      max_players: 2,
      current_players: 1,
      status: duel.status,
      created_at: duel.created_at,
      time_limit: duel.time_limit,
      description: duel.prompt?.slice(0, 100) + '...',
    }));
  } catch (error) {
    console.error('Failed to fetch games:', error);
    return [];
  }
}

/**
 * Create a new game
 */
export async function createGame(options: {
  mode: 'ranked' | 'casual' | 'practice';
  difficulty: 'easy' | 'medium' | 'hard';
  topic: string;
  timeLimit?: number;
  description?: string;
}): Promise<GameLobby> {
  console.log('🎮 Creating game with options:', options);
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  // Get user profile
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('display_name, elo_rating, avatar_url')
    .eq('id', user.id)
    .single();

  if (profileError) {
    console.error('Failed to get user profile:', profileError);
    throw new Error('Failed to get user profile');
  }

  // Generate puzzle
  const puzzle = await generatePuzzle('', '', 'ranked-duel', {
    topic: options.topic,
    difficulty: options.difficulty,
    mode: 'drills',
  });

  console.log('🧩 Generated puzzle:', { 
    promptLength: puzzle.prompt.length, 
    testCount: puzzle.tests.length 
  });

  // Create duel
  const duelData = {
    creator_id: user.id,
    mode: options.mode,
    prompt: puzzle.prompt,
    test_cases: puzzle.tests,
    time_limit: options.timeLimit || 900,
    status: 'waiting' as const,
  };

  console.log('💾 Inserting duel data:', duelData);

  const { data: duel, error } = await supabase
    .from('duels')
    .insert(duelData)
    .select()
    .single();

  if (error) {
    console.error('Failed to create duel:', error);
    throw new Error(`Failed to create game: ${error.message}`);
  }

  console.log('✅ Game created successfully:', duel.id);

  return {
    id: duel.id,
    host_id: user.id,
    host_name: profile?.display_name || 'Unknown',
    host_rating: profile?.elo_rating || 1200,
    host_avatar: profile?.avatar_url,
    mode: options.mode,
    difficulty: options.difficulty,
    topic: options.topic,
    max_players: 2,
    current_players: 1,
    status: 'waiting',
    created_at: duel.created_at,
    time_limit: options.timeLimit || 900,
    description: options.description,
  };
}

/**
 * Join an existing game
 */
export async function joinGame(gameId: string): Promise<JoinGameResult> {
  console.log('🚪 Attempting to join game:', gameId);
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'User not authenticated' };
  }

  try {
    // First check if the game exists and is available
    const { data: existingDuel, error: checkError } = await supabase
      .from('duels')
      .select('id, creator_id, status, opponent_id')
      .eq('id', gameId)
      .single();

    if (checkError) {
      console.error('Game check error:', checkError);
      return { success: false, error: 'Game not found' };
    }

    if (existingDuel.status !== 'waiting') {
      return { success: false, error: 'Game is no longer available' };
    }

    if (existingDuel.opponent_id) {
      return { success: false, error: 'Game is already full' };
    }

    if (existingDuel.creator_id === user.id) {
      return { success: false, error: 'Cannot join your own game' };
    }

    // Update duel with opponent and start it
    const { data: duel, error } = await supabase
      .from('duels')
      .update({
        opponent_id: user.id,
        status: 'active',
        started_at: new Date().toISOString(),
      })
      .eq('id', gameId)
      .eq('status', 'waiting')
      .is('opponent_id', null)
      .select()
      .single();

    if (error) {
      console.error('Join game error:', error);
      return { success: false, error: 'Failed to join game or game no longer available' };
    }

    console.log('✅ Successfully joined game:', duel.id);
    return { success: true, duelId: duel.id };
  } catch (error) {
    console.error('Join game exception:', error);
    return { success: false, error: 'Failed to join game' };
  }
}

/**
 * Cancel/delete a game (only by host)
 */
export async function cancelGame(gameId: string): Promise<boolean> {
  console.log('❌ Cancelling game:', gameId);
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return false;
  }

  const { error } = await supabase
    .from('duels')
    .delete()
    .eq('id', gameId)
    .eq('creator_id', user.id)
    .eq('status', 'waiting');

  if (error) {
    console.error('Failed to cancel game:', error);
    return false;
  }

  console.log('✅ Game cancelled successfully');
  return true;
}

/**
 * Get game statistics
 */
export async function getGameStats(): Promise<{
  totalGames: number;
  activeGames: number;
  waitingGames: number;
  playersOnline: number;
}> {
  const [totalResult, activeResult, waitingResult] = await Promise.all([
    supabase.from('duels').select('id', { count: 'exact', head: true }),
    supabase.from('duels').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('duels').select('id', { count: 'exact', head: true }).eq('status', 'waiting'),
  ]);

  // Estimate players online (simplified)
  const playersOnline = (activeResult.count || 0) * 2 + (waitingResult.count || 0);

  return {
    totalGames: totalResult.count || 0,
    activeGames: activeResult.count || 0,
    waitingGames: waitingResult.count || 0,
    playersOnline,
  };
}