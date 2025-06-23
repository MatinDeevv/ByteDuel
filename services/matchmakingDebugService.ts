/**
 * Matchmaking Debug Service - Help diagnose matching issues
 */
import { supabase } from '../src/lib/supabaseClient';

export interface QueueDebugInfo {
  userId: string;
  displayName: string;
  eloRating: number;
  mode: string;
  timeControl: string;
  fairPlayPool: string;
  currentRatingRange: number;
  queuedAt: string;
  expansionCount: number;
}

export interface MatchingDebugResult {
  queueStatus: QueueDebugInfo[];
  matchingResult: {
    matches_created: number;
    processed_users_count: number;
  };
}

class MatchmakingDebugService {
  /**
   * Debug the current queue state and attempt matching
   */
  async debugQueue(): Promise<MatchingDebugResult | null> {
    try {
      console.log('🔍 Running matchmaking debug check...');
      
      const { data, error } = await supabase.rpc('debug_check_queue');
      
      if (error) {
        console.error('❌ Debug check error:', error);
        return null;
      }
      
      console.log('📊 Debug result:', data);
      return data as MatchingDebugResult;
    } catch (error) {
      console.error('💥 Debug check exception:', error);
      return null;
    }
  }

  /**
   * Force process the matchmaking queue
   */
  async forceProcessQueue(): Promise<{ matchesCreated: number; expandedPlayers: number } | null> {
    try {
      console.log('🔧 Force processing matchmaking queue...');
      
      const { data, error } = await supabase.rpc('process_advanced_matchmaking');
      
      if (error) {
        console.error('❌ Force process error:', error);
        return null;
      }
      
      console.log('✅ Force process result:', data);
      return {
        matchesCreated: data.matches_created,
        expandedPlayers: data.expanded_players,
      };
    } catch (error) {
      console.error('💥 Force process exception:', error);
      return null;
    }
  }

  /**
   * Get current queue statistics
   */
  async getQueueStatistics(): Promise<any> {
    try {
      const { data, error } = await supabase.rpc('get_matchmaking_stats');
      
      if (error) {
        console.error('❌ Queue stats error:', error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('💥 Queue stats exception:', error);
      return null;
    }
  }

  /**
   * Manually trigger a match between two specific users (for testing)
   */
  async createTestMatch(user1Id: string, user2Id: string): Promise<any> {
    try {
      console.log('🧪 Creating test match between:', user1Id, user2Id);
      
      const { data, error } = await supabase.rpc('create_match_between_users', {
        p_user1_id: user1Id,
        p_user2_id: user2Id,
      });
      
      if (error) {
        console.error('❌ Test match error:', error);
        return null;
      }
      
      console.log('✅ Test match result:', data);
      return data;
    } catch (error) {
      console.error('💥 Test match exception:', error);
      return null;
    }
  }

  /**
   * Get detailed queue information
   */
  async getDetailedQueueInfo(): Promise<QueueDebugInfo[]> {
    try {
      const { data, error } = await supabase
        .from('advanced_matchmaking_queue')
        .select(`
          user_id,
          mode,
          time_control,
          preferred_color,
          current_rating_range,
          queued_at,
          expansion_count,
          fair_play_pool,
          users:user_id (
            display_name,
            elo_rating
          )
        `)
        .order('queued_at', { ascending: true });

      if (error) {
        console.error('❌ Queue info error:', error);
        return [];
      }

      return (data || []).map((item: any) => ({
        userId: item.user_id,
        displayName: item.users?.display_name || 'Unknown',
        eloRating: item.users?.elo_rating || 0,
        mode: item.mode,
        timeControl: item.time_control,
        fairPlayPool: item.fair_play_pool,
        currentRatingRange: item.current_rating_range,
        queuedAt: item.queued_at,
        expansionCount: item.expansion_count,
      }));
    } catch (error) {
      console.error('💥 Queue info exception:', error);
      return [];
    }
  }

  /**
   * Clear the entire queue (for testing)
   */
  async clearQueue(): Promise<boolean> {
    try {
      console.log('🧹 Clearing matchmaking queue...');
      
      const { error } = await supabase
        .from('advanced_matchmaking_queue')
        .delete()
        .neq('user_id', '00000000-0000-0000-0000-000000000000'); // Delete all
      
      if (error) {
        console.error('❌ Clear queue error:', error);
        return false;
      }
      
      console.log('✅ Queue cleared');
      return true;
    } catch (error) {
      console.error('💥 Clear queue exception:', error);
      return false;
    }
  }
}

// Export singleton instance
export const matchmakingDebugService = new MatchmakingDebugService();

// Export types
export type { QueueDebugInfo, MatchingDebugResult };