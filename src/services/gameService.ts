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
    console.error('Failed to fetch games:', error);
    return [];
  }

  return (duels || []).map((duel: any) => ({
    id: duel.id,
    host_id: duel.creator_id,
    host_name: duel.creator?.display_name || 'Unknown',
    host_rating: duel.creator?.elo_rating || 1200,
    host_avatar: duel.creator?.avatar_url,
    mode: duel.mode,
    difficulty: 'medium', // Default, could be stored in duel
    topic: 'algorithms', // Default, could be extracted from prompt
    max_players: 2,
    current_players: 1,
    status: duel.status,
    created_at: duel.created_at,
    time_limit: duel.time_limit,
    description: duel.prompt?.slice(0, 100) + '...',
  }));
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
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('users')
    .select('display_name, elo_rating, avatar_url')
    .eq('id', user.id)
    .single();

  // Generate puzzle
  const puzzle = await generatePuzzle('', '', 'ranked-duel', {
    topic: options.topic,
    difficulty: options.difficulty,
    mode: 'drills',
  });

  // Create duel
  const { data: duel, error } = await supabase
    .from('duels')
    .insert({
      creator_id: user.id,
      mode: options.mode,
      prompt: puzzle.prompt,
      test_cases: puzzle.tests,
      time_limit: options.timeLimit || 900,
      status: 'waiting',
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create game: ${error.message}`);
  }

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
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'User not authenticated' };
  }

  try {
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
      return { success: false, error: 'Failed to join game or game no longer available' };
    }

    return { success: true, duelId: duel.id };
  } catch (error) {
    return { success: false, error: 'Failed to join game' };
  }
}

/**
 * Cancel/delete a game (only by host)
 */
export async function cancelGame(gameId: string): Promise<boolean> {
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

  return !error;
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