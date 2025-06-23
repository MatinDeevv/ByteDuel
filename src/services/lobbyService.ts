/**
 * Lobby Service - Standardized Level 1 Game Management
 * Handles lobby creation, joining, and cleanup with consistent Level 1 system
 */
import { supabase } from '../lib/supabaseClient';
import { generatePuzzle } from '../lib/puzzleGenerator';

export interface GameLobby {
  id: string;
  host_id: string;
  host_name: string;
  host_rating: number;
  host_avatar?: string;
  player_ids: string[];
  current_players: number;
  max_players: number;
  status: 'waiting' | 'starting' | 'active' | 'completed';
  created_at: string;
  expires_at: string;
  settings: {
    level: 1;
    timeLimit: number;
    mode: 'ranked' | 'casual';
  };
  duel_id?: string;
}

export interface JoinLobbyResult {
  success: boolean;
  lobby_id?: string;
  duel_id?: string;
  error?: string;
}

/**
 * Get all available lobbies
 */
export async function getAllLobbies(): Promise<GameLobby[]> {
  try {
    console.log('🔍 Fetching all available lobbies...');
    
    const { data: lobbies, error } = await supabase
      .from('game_lobbies')
      .select(`
        *,
        host:users!host_id (
          display_name,
          elo_rating,
          avatar_url
        )
      `)
      .in('status', ['waiting', 'starting'])
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('❌ Supabase query error:', error);
      return [];
    }

    console.log(`✅ Found ${lobbies?.length || 0} lobbies`);

    return (lobbies || []).map((lobby: any) => ({
      id: lobby.id,
      host_id: lobby.host_id,
      host_name: lobby.host?.display_name || 'Unknown',
      host_rating: lobby.host?.elo_rating || 1200,
      host_avatar: lobby.host?.avatar_url,
      player_ids: lobby.player_ids || [],
      current_players: lobby.current_players,
      max_players: lobby.max_players,
      status: lobby.status,
      created_at: lobby.created_at,
      expires_at: lobby.expires_at,
      settings: lobby.settings || { level: 1, timeLimit: 900, mode: 'ranked' },
      duel_id: lobby.duel_id,
    }));
  } catch (error) {
    console.error('❌ Failed to fetch lobbies:', error);
    return [];
  }
}

/**
 * Create a new Level 1 lobby
 */
export async function createLobby(options: {
  mode: 'ranked' | 'casual';
  timeLimit?: number;
}): Promise<GameLobby> {
  console.log('🎮 Creating Level 1 lobby with options:', options);
  
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
    console.error('❌ Failed to get user profile:', profileError);
    throw new Error('Failed to get user profile');
  }

  // Create lobby with standardized Level 1 settings
  const lobbyData = {
    host_id: user.id,
    player_ids: [],
    current_players: 1,
    max_players: 2,
    status: 'waiting' as const,
    settings: {
      level: 1,
      timeLimit: options.timeLimit || 900,
      mode: options.mode,
    },
    expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes
  };

  console.log('💾 Inserting lobby data:', lobbyData);

  const { data: lobby, error } = await supabase
    .from('game_lobbies')
    .insert(lobbyData)
    .select()
    .single();

  if (error) {
    console.error('❌ Failed to create lobby:', error);
    throw new Error(`Failed to create lobby: ${error.message}`);
  }

  console.log('✅ Lobby created successfully:', lobby.id);

  return {
    id: lobby.id,
    host_id: user.id,
    host_name: profile?.display_name || 'Unknown',
    host_rating: profile?.elo_rating || 1200,
    host_avatar: profile?.avatar_url,
    player_ids: lobby.player_ids,
    current_players: lobby.current_players,
    max_players: lobby.max_players,
    status: lobby.status,
    created_at: lobby.created_at,
    expires_at: lobby.expires_at,
    settings: lobby.settings,
  };
}

/**
 * Join an existing lobby
 */
export async function joinLobby(lobbyId: string): Promise<JoinLobbyResult> {
  console.log('🚪 Attempting to join lobby:', lobbyId);
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'User not authenticated' };
  }

  try {
    // Use the database function to join lobby
    const { data, error } = await supabase.rpc('join_lobby', {
      lobby_id: lobbyId,
      player_id: user.id,
    });

    if (error) {
      console.error('❌ Join lobby error:', error);
      return { success: false, error: error.message };
    }

    if (!data.success) {
      console.error('❌ Join failed:', data.error);
      return { success: false, error: data.error };
    }

    // Check if lobby is now full and should start a duel
    const { data: lobby } = await supabase
      .from('game_lobbies')
      .select('*')
      .eq('id', lobbyId)
      .single();

    if (lobby && lobby.status === 'starting') {
      // Create a duel for this lobby
      const duelId = await createDuelFromLobby(lobby);
      
      // Update lobby with duel_id and set to active
      await supabase
        .from('game_lobbies')
        .update({ 
          duel_id: duelId, 
          status: 'active' 
        })
        .eq('id', lobbyId);

      console.log('✅ Lobby full, created duel:', duelId);
      return { success: true, lobby_id: lobbyId, duel_id: duelId };
    }

    console.log('✅ Successfully joined lobby');
    return { success: true, lobby_id: lobbyId };
  } catch (error) {
    console.error('❌ Join lobby exception:', error);
    return { success: false, error: 'Failed to join lobby' };
  }
}

/**
 * Leave a lobby
 */
export async function leaveLobby(lobbyId: string): Promise<boolean> {
  console.log('🚪 Leaving lobby:', lobbyId);
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return false;
  }

  try {
    const { data, error } = await supabase.rpc('leave_lobby', {
      lobby_id: lobbyId,
      player_id: user.id,
    });

    if (error) {
      console.error('❌ Leave lobby error:', error);
      return false;
    }

    console.log('✅ Successfully left lobby');
    return data.success;
  } catch (error) {
    console.error('❌ Leave lobby exception:', error);
    return false;
  }
}

/**
 * Create a duel from a full lobby
 */
async function createDuelFromLobby(lobby: any): Promise<string> {
  console.log('🎯 Creating duel from lobby:', lobby.id);
  
  // Generate Level 1 puzzle
  const puzzle = await generatePuzzle('', '', 'ranked-duel', {
    topic: 'algorithms',
    difficulty: 'easy', // Level 1 is always easy
    mode: 'drills',
  });

  // Get all player IDs (host + joined players)
  const allPlayerIds = [lobby.host_id, ...lobby.player_ids];
  const [creatorId, opponentId] = allPlayerIds;

  const duelData = {
    creator_id: creatorId,
    opponent_id: opponentId,
    mode: lobby.settings.mode,
    prompt: puzzle.prompt,
    test_cases: puzzle.tests,
    time_limit: lobby.settings.timeLimit,
    status: 'active' as const,
    started_at: new Date().toISOString(),
  };

  const { data: duel, error } = await supabase
    .from('duels')
    .insert(duelData)
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to create duel: ${error.message}`);
  }

  return duel.id;
}

/**
 * Cleanup expired lobbies
 */
export async function cleanupExpiredLobbies(): Promise<number> {
  console.log('🧹 Running lobby cleanup...');
  
  try {
    const { data, error } = await supabase.rpc('cleanup_expired_lobbies');
    
    if (error) {
      console.error('❌ Cleanup error:', error);
      return 0;
    }
    
    console.log(`✅ Cleaned up ${data} expired lobbies`);
    return data;
  } catch (error) {
    console.error('❌ Cleanup exception:', error);
    return 0;
  }
}

/**
 * Get lobby statistics
 */
export async function getLobbyStats(): Promise<{
  totalLobbies: number;
  waitingLobbies: number;
  activeLobbies: number;
  playersInLobbies: number;
}> {
  const [totalResult, waitingResult, activeResult] = await Promise.all([
    supabase.from('game_lobbies').select('id', { count: 'exact', head: true }),
    supabase.from('game_lobbies').select('id', { count: 'exact', head: true }).eq('status', 'waiting'),
    supabase.from('game_lobbies').select('id', { count: 'exact', head: true }).eq('status', 'active'),
  ]);

  // Get total players in lobbies
  const { data: lobbies } = await supabase
    .from('game_lobbies')
    .select('current_players')
    .in('status', ['waiting', 'starting', 'active']);

  const playersInLobbies = lobbies?.reduce((sum, lobby) => sum + lobby.current_players, 0) || 0;

  return {
    totalLobbies: totalResult.count || 0,
    waitingLobbies: waitingResult.count || 0,
    activeLobbies: activeResult.count || 0,
    playersInLobbies,
  };
}