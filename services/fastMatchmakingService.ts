/**
 * Fast Matchmaking Service - ELO-based matching with instant connections
 * Prioritizes speed and fair matches based on skill rating
 */
import { supabase } from '../lib/supabaseClient';

export interface MatchmakingOptions {
  mode: 'ranked' | 'casual';
  maxEloDifference?: number;
  timeout?: number;
}

export interface MatchmakingResult {
  success: boolean;
  matched: boolean;
  duelId?: string;
  opponentId?: string;
  opponentName?: string;
  opponentElo?: number;
  eloDifference?: number;
  queuePosition?: number;
  queueSize?: number;
  estimatedWaitSeconds?: number;
  error?: string;
}

export interface QueueStatus {
  inQueue: boolean;
  mode?: string;
  position?: number;
  queueSize?: number;
  queuedAt?: string;
  estimatedWaitSeconds?: number;
  userElo?: number;
}

class FastMatchmakingService {
  private matchmakingInterval: NodeJS.Timeout | null = null;
  private statusCheckInterval: NodeJS.Timeout | null = null;
  private callbacks: Map<string, (result: MatchmakingResult) => void> = new Map();

  /**
   * Join matchmaking queue with immediate matching attempt
   */
  async joinQueue(
    userId: string,
    options: MatchmakingOptions = { mode: 'ranked' }
  ): Promise<MatchmakingResult> {
    console.log('🎯 Joining fast matchmaking queue:', { userId, options });

    try {
      const { data, error } = await supabase.rpc('join_matchmaking_queue', {
        p_user_id: userId,
        p_mode: options.mode,
        p_max_elo_diff: options.maxEloDifference || 200,
      });

      if (error) {
        console.error('❌ Matchmaking error:', error);
        return {
          success: false,
          matched: false,
          error: error.message,
        };
      }

      const result = data as MatchmakingResult;
      console.log('✅ Matchmaking result:', result);

      // If matched immediately, return the match
      if (result.matched && result.duelId) {
        console.log('🎉 Instant match found!');
        return result;
      }

      // If not matched, start periodic checking
      if (result.success && !result.matched) {
        console.log('⏳ Added to queue, starting periodic match checking');
        this.startPeriodicMatching(userId);
      }

      return result;
    } catch (error) {
      console.error('💥 Matchmaking exception:', error);
      return {
        success: false,
        matched: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Leave matchmaking queue
   */
  async leaveQueue(userId: string): Promise<boolean> {
    console.log('🚪 Leaving matchmaking queue:', userId);

    try {
      this.stopPeriodicMatching();

      const { data, error } = await supabase.rpc('leave_matchmaking_queue', {
        p_user_id: userId,
      });

      if (error) {
        console.error('❌ Leave queue error:', error);
        return false;
      }

      console.log('✅ Left queue successfully');
      return data.success;
    } catch (error) {
      console.error('💥 Leave queue exception:', error);
      return false;
    }
  }

  /**
   * Get current queue status
   */
  async getQueueStatus(userId: string): Promise<QueueStatus> {
    try {
      const { data, error } = await supabase.rpc('get_queue_status', {
        p_user_id: userId,
      });

      if (error) {
        console.error('❌ Queue status error:', error);
        return { inQueue: false };
      }

      return data as QueueStatus;
    } catch (error) {
      console.error('💥 Queue status exception:', error);
      return { inQueue: false };
    }
  }

  /**
   * Start periodic matching for queued players
   */
  private startPeriodicMatching(userId: string) {
    // Clear any existing intervals
    this.stopPeriodicMatching();

    // Check for matches every 3 seconds (fast!)
    this.matchmakingInterval = setInterval(async () => {
      try {
        const { data, error } = await supabase.rpc('find_best_match_for_user', {
          p_user_id: userId,
        });

        if (error) {
          console.error('❌ Periodic matching error:', error);
          return;
        }

        const result = data as MatchmakingResult;

        // If match found, notify callback and stop checking
        if (result.matched && result.duelId) {
          console.log('🎉 Periodic match found!');
          
          const callback = this.callbacks.get(userId);
          if (callback) {
            callback(result);
            this.callbacks.delete(userId);
          }

          this.stopPeriodicMatching();
        }
      } catch (error) {
        console.error('💥 Periodic matching exception:', error);
      }
    }, 3000); // Check every 3 seconds

    // Also start status checking for UI updates
    this.statusCheckInterval = setInterval(async () => {
      try {
        const status = await this.getQueueStatus(userId);
        // Could emit status updates here for real-time UI
        console.log('📊 Queue status update:', status);
      } catch (error) {
        console.error('Status check error:', error);
      }
    }, 5000); // Update status every 5 seconds
  }

  /**
   * Stop periodic matching
   */
  private stopPeriodicMatching() {
    if (this.matchmakingInterval) {
      clearInterval(this.matchmakingInterval);
      this.matchmakingInterval = null;
    }

    if (this.statusCheckInterval) {
      clearInterval(this.statusCheckInterval);
      this.statusCheckInterval = null;
    }
  }

  /**
   * Set callback for when match is found
   */
  onMatchFound(userId: string, callback: (result: MatchmakingResult) => void) {
    this.callbacks.set(userId, callback);
  }

  /**
   * Force process entire queue (admin function)
   */
  async processQueue(): Promise<{ matchesCreated: number; processedUsers: number }> {
    try {
      const { data, error } = await supabase.rpc('process_matchmaking_queue');

      if (error) {
        throw error;
      }

      return {
        matchesCreated: data.matches_created,
        processedUsers: data.processed_users,
      };
    } catch (error) {
      console.error('❌ Process queue error:', error);
      return { matchesCreated: 0, processedUsers: 0 };
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats() {
    try {
      const { data, error } = await supabase.rpc('get_queue_stats');

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('❌ Queue stats error:', error);
      return null;
    }
  }

  /**
   * Cleanup - call when component unmounts
   */
  cleanup() {
    this.stopPeriodicMatching();
    this.callbacks.clear();
  }
}

// Export singleton instance
export const fastMatchmakingService = new FastMatchmakingService();

// Export types
export type { MatchmakingOptions, MatchmakingResult, QueueStatus };