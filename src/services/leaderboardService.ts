/**
 * Leaderboard Service - Rankings and statistics
 * Handles global leaderboards, user rankings, and performance metrics
 */
import { supabase, type LeaderboardEntry, type Profile } from '../lib/supabaseClient';

export interface LeaderboardFilters {
  timeframe?: 'all' | 'month' | 'week';
  skillLevel?: 'beginner' | 'intermediate' | 'advanced';
  minMatches?: number;
}

export interface UserRanking {
  user: Profile;
  rank: number;
  percentile: number;
  ratingChange24h: number;
  ratingChange7d: number;
}

/**
 * Get global leaderboard
 */
export async function getGlobalLeaderboard(
  limit = 100,
  offset = 0,
  filters: LeaderboardFilters = {}
): Promise<LeaderboardEntry[]> {
  // Use materialized view for performance
  let query = supabase
    .from('leaderboards')
    .select('*');

  // Apply filters
  if (filters.skillLevel) {
    // Need to join with profiles for skill level filter
    query = supabase
      .from('profiles')
      .select(`
        id,
        display_name,
        avatar_url,
        github_username,
        elo_rating,
        wins,
        losses,
        total_matches,
        current_streak,
        best_streak
      `)
      .eq('skill_level', filters.skillLevel)
      .eq('is_active', true)
      .gte('total_matches', filters.minMatches || 5)
      .order('elo_rating', { ascending: false });
  }

  if (filters.minMatches && !filters.skillLevel) {
    query = query.gte('total_matches', filters.minMatches);
  }

  query = query
    .order('rank', { ascending: true })
    .range(offset, offset + limit - 1);

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  // Transform data to match LeaderboardEntry interface
  return (data || []).map((entry, index) => ({
    ...entry,
    win_rate: entry.total_matches > 0 
      ? Math.round((entry.wins / entry.total_matches) * 100 * 10) / 10 
      : 0,
    rank: offset + index + 1,
    average_solve_time: null,
    fastest_solve_time: null,
  }));
}

/**
 * Get user's ranking and position
 */
export async function getUserRanking(userId: string): Promise<UserRanking | null> {
  // Get user profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (profileError || !profile) {
    return null;
  }

  // Get user's rank using database function
  const { data: rankData, error: rankError } = await supabase
    .rpc('get_user_leaderboard_position', { user_profile_id: userId });

  if (rankError) {
    throw rankError;
  }

  const rank = rankData || 0;

  // Calculate percentile
  const { count: totalUsers } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true)
    .gte('total_matches', 5);

  const percentile = totalUsers ? Math.round(((totalUsers - rank + 1) / totalUsers) * 100) : 0;

  // Get rating history for trends (mock data for now)
  const ratingChange24h = 0; // TODO: Implement rating history tracking
  const ratingChange7d = 0;

  return {
    user: profile,
    rank,
    percentile,
    ratingChange24h,
    ratingChange7d,
  };
}

/**
 * Get leaderboard around user's position
 */
export async function getLeaderboardAroundUser(
  userId: string,
  range = 5
): Promise<LeaderboardEntry[]> {
  const userRanking = await getUserRanking(userId);
  
  if (!userRanking) {
    return [];
  }

  const startRank = Math.max(1, userRanking.rank - range);
  const endRank = userRanking.rank + range;

  return getGlobalLeaderboard(endRank - startRank + 1, startRank - 1);
}

/**
 * Get top performers by category
 */
export async function getTopPerformers(): Promise<{
  topRated: LeaderboardEntry[];
  mostWins: LeaderboardEntry[];
  bestWinRate: LeaderboardEntry[];
  longestStreak: LeaderboardEntry[];
}> {
  const [topRated, mostWins, bestWinRate, longestStreak] = await Promise.all([
    // Top rated players
    supabase
      .from('profiles')
      .select('*')
      .eq('is_active', true)
      .gte('total_matches', 10)
      .order('elo_rating', { ascending: false })
      .limit(5),
    
    // Most wins
    supabase
      .from('profiles')
      .select('*')
      .eq('is_active', true)
      .gte('total_matches', 10)
      .order('wins', { ascending: false })
      .limit(5),
    
    // Best win rate (minimum 20 matches)
    supabase
      .from('profiles')
      .select('*')
      .eq('is_active', true)
      .gte('total_matches', 20)
      .order('wins', { ascending: false }) // Will need to calculate win rate in app
      .limit(20), // Get more to calculate win rate
    
    // Longest current streak
    supabase
      .from('profiles')
      .select('*')
      .eq('is_active', true)
      .gte('total_matches', 5)
      .order('current_streak', { ascending: false })
      .limit(5),
  ]);

  // Calculate win rates and sort
  const winRateData = (bestWinRate.data || [])
    .map(profile => ({
      ...profile,
      win_rate: profile.total_matches > 0 ? (profile.wins / profile.total_matches) * 100 : 0,
    }))
    .sort((a, b) => b.win_rate - a.win_rate)
    .slice(0, 5);

  const transformToLeaderboardEntry = (profiles: any[]): LeaderboardEntry[] => {
    return profiles.map((profile, index) => ({
      id: profile.id,
      display_name: profile.display_name,
      avatar_url: profile.avatar_url,
      github_username: profile.github_username,
      elo_rating: profile.elo_rating,
      wins: profile.wins,
      losses: profile.losses,
      total_matches: profile.total_matches,
      win_rate: profile.total_matches > 0 
        ? Math.round((profile.wins / profile.total_matches) * 100 * 10) / 10 
        : 0,
      current_streak: profile.current_streak,
      best_streak: profile.best_streak,
      average_solve_time: null,
      fastest_solve_time: null,
      rank: index + 1,
    }));
  };

  return {
    topRated: transformToLeaderboardEntry(topRated.data || []),
    mostWins: transformToLeaderboardEntry(mostWins.data || []),
    bestWinRate: transformToLeaderboardEntry(winRateData),
    longestStreak: transformToLeaderboardEntry(longestStreak.data || []),
  };
}

/**
 * Get leaderboard statistics
 */
export async function getLeaderboardStats(): Promise<{
  totalPlayers: number;
  activePlayers: number;
  averageRating: number;
  topRating: number;
  totalMatches: number;
  matchesToday: number;
}> {
  const [
    totalPlayersResult,
    activePlayersResult,
    ratingsResult,
    totalMatchesResult,
    todayMatchesResult,
  ] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('profiles').select('id', { count: 'exact', head: true })
      .eq('is_active', true)
      .gte('total_matches', 1),
    supabase.from('profiles').select('elo_rating')
      .eq('is_active', true)
      .gte('total_matches', 5),
    supabase.from('duels').select('id', { count: 'exact', head: true })
      .eq('status', 'completed'),
    supabase.from('duels').select('id', { count: 'exact', head: true })
      .eq('status', 'completed')
      .gte('ended_at', new Date().toISOString().split('T')[0]),
  ]);

  const ratings = ratingsResult.data || [];
  const averageRating = ratings.length > 0 
    ? Math.round(ratings.reduce((sum, p) => sum + p.elo_rating, 0) / ratings.length)
    : 1200;
  
  const topRating = ratings.length > 0 
    ? Math.max(...ratings.map(p => p.elo_rating))
    : 1200;

  return {
    totalPlayers: totalPlayersResult.count || 0,
    activePlayers: activePlayersResult.count || 0,
    averageRating,
    topRating,
    totalMatches: totalMatchesResult.count || 0,
    matchesToday: todayMatchesResult.count || 0,
  };
}

/**
 * Search leaderboard by username
 */
export async function searchLeaderboard(query: string, limit = 10): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .or(`display_name.ilike.%${query}%,github_username.ilike.%${query}%`)
    .eq('is_active', true)
    .gte('total_matches', 1)
    .order('elo_rating', { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return (data || []).map((profile, index) => ({
    id: profile.id,
    display_name: profile.display_name,
    avatar_url: profile.avatar_url,
    github_username: profile.github_username,
    elo_rating: profile.elo_rating,
    wins: profile.wins,
    losses: profile.losses,
    total_matches: profile.total_matches,
    win_rate: profile.total_matches > 0 
      ? Math.round((profile.wins / profile.total_matches) * 100 * 10) / 10 
      : 0,
    current_streak: profile.current_streak,
    best_streak: profile.best_streak,
    average_solve_time: null,
    fastest_solve_time: null,
    rank: index + 1, // This won't be accurate for search results
  }));
}

/**
 * Refresh leaderboards (admin function)
 */
export async function refreshLeaderboards(): Promise<void> {
  const { error } = await supabase.rpc('refresh_leaderboards');
  
  if (error) {
    throw error;
  }
}