/**
 * Advanced Chess.com-style Matchmaking Service
 * Features dynamic rating expansion, fair play pools, and intelligent matching
 */
import { supabase } from '../src/lib/supabaseClient';

export interface AdvancedMatchmakingOptions {
  mode: 'ranked' | 'casual';
  timeControl: string; // e.g., "15+0", "10+0", "5+0", "30+0"
  preferredColor: 'white' | 'black' | 'random';
  maxWaitSeconds?: number;
}

export interface AdvancedMatchmakingResult {
  success: boolean;
  matched: boolean;
  duelId?: string;
  opponentId?: string;
  opponentName?: string;
  opponentRating?: number;
  ratingDifference?: number;
  assignedColor?: 'white' | 'black';
  timeControl?: string;
  matchQuality?: 'excellent' | 'very_good' | 'good' | 'fair';
  queuePosition?: number;
  queueSize?: number;
  estimatedWaitSeconds?: number;
  initialRatingRange?: number;
  fairPlayPool?: string;
  error?: string;
}

export interface AdvancedQueueStatus {
  inQueue: boolean;
  mode?: string;
  timeControl?: string;
  preferredColor?: string;
  position?: number;
  similarRatingAhead?: number;
  currentRatingRange?: number;
  expansionCount?: number;
  queuedAt?: string;
  estimatedWaitSeconds?: number;
  fairPlayPool?: string;
  userRating?: number;
}

export interface MatchmakingStats {
  totalInQueue: number;
  rankedPlayers: number;
  casualPlayers: number;
  activeTimeControls: number;
  standardPool: number;
  restrictedPool: number;
  averageWaitSeconds: number;
  maxWaitSeconds: number;
  averageRatingRange: number;
}

class AdvancedMatchmakingService {
  private matchmakingInterval: NodeJS.Timeout | null = null;
  private queueProcessingInterval: NodeJS.Timeout | null = null;
  private callbacks: Map<string, (result: AdvancedMatchmakingResult) => void> = new Map();
  private statusCallbacks: Map<string, (status: AdvancedQueueStatus) => void> = new Map();

  /**
   * Join the advanced matchmaking queue with Chess.com-style features
   */
  async joinQueue(
    userId: string,
    options: AdvancedMatchmakingOptions
  ): Promise<AdvancedMatchmakingResult> {
    console.log('🎯 Joining advanced matchmaking queue:', { userId, options });

    try {
      const { data, error } = await supabase.rpc('join_advanced_matchmaking_queue', {
        p_user_id: userId,
        p_mode: options.mode,
        p_time_control: options.timeControl,
        p_preferred_color: options.preferredColor,
      });

      if (error) {
        console.error('❌ Advanced matchmaking error:', error);
        return {
          success: false,
          matched: false,
          error: error.message,
        };
      }

      const result = data as AdvancedMatchmakingResult;
      console.log('✅ Advanced matchmaking result:', result);

      // If matched immediately, return the match
      if (result.matched && result.duelId) {
        console.log('🎉 Instant match found with advanced matching!');
        return result;
      }

      // If not matched, start advanced queue processing
      if (result.success && !result.matched) {
        console.log('⏳ Added to advanced queue, starting intelligent matching');
        this.startAdvancedMatching(userId);
      }

      return result;
    } catch (error) {
      console.error('💥 Advanced matchmaking exception:', error);
      return {
        success: false,
        matched: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Leave the advanced matchmaking queue
   */
  async leaveQueue(userId: string): Promise<boolean> {
    console.log('🚪 Leaving advanced matchmaking queue:', userId);

    try {
      this.stopAdvancedMatching();

      const { data, error } = await supabase.rpc('leave_advanced_matchmaking_queue', {
        p_user_id: userId,
      });

      if (error) {
        console.error('❌ Leave advanced queue error:', error);
        return false;
      }

      console.log('✅ Left advanced queue successfully');
      return data.success;
    } catch (error) {
      console.error('💥 Leave advanced queue exception:', error);
      return false;
    }
  }

  /**
   * Get current advanced queue status
   */
  async getQueueStatus(userId: string): Promise<AdvancedQueueStatus> {
    try {
      const { data, error } = await supabase.rpc('get_advanced_queue_status', {
        p_user_id: userId,
      });

      if (error) {
        console.error('❌ Advanced queue status error:', error);
        return { inQueue: false };
      }

      return data as AdvancedQueueStatus;
    } catch (error) {
      console.error('💥 Advanced queue status exception:', error);
      return { inQueue: false };
    }
  }

  /**
   * Start advanced matching with Chess.com-style intelligence
   */
  private startAdvancedMatching(userId: string) {
    // Clear any existing intervals
    this.stopAdvancedMatching();

    // Check for matches every 2 seconds (very responsive)
    this.matchmakingInterval = setInterval(async () => {
      try {
        // Try to find match with current expanded ranges
        const { data, error } = await supabase.rpc('join_advanced_matchmaking_queue', {
          p_user_id: userId,
          p_mode: 'ranked', // Will be overridden by existing queue entry
          p_time_control: '15+0', // Will be overridden by existing queue entry
          p_preferred_color: 'random', // Will be overridden by existing queue entry
        });

        if (error) {
          console.error('❌ Advanced periodic matching error:', error);
          return;
        }

        const result = data as AdvancedMatchmakingResult;

        // If match found, notify callback and stop checking
        if (result.matched && result.duelId) {
          console.log('🎉 Advanced periodic match found!');
          
          const callback = this.callbacks.get(userId);
          if (callback) {
            callback(result);
            this.callbacks.delete(userId);
          }

          this.stopAdvancedMatching();
        }
      } catch (error) {
        console.error('💥 Advanced periodic matching exception:', error);
      }
    }, 2000); // Check every 2 seconds for fast response

    // Process entire queue every 5 seconds for global optimization
    this.queueProcessingInterval = setInterval(async () => {
      try {
        await supabase.rpc('process_advanced_matchmaking');
      } catch (error) {
        console.error('💥 Queue processing error:', error);
      }
    }, 5000);

    // Update status for UI every 3 seconds
    const statusInterval = setInterval(async () => {
      try {
        const status = await this.getQueueStatus(userId);
        const statusCallback = this.statusCallbacks.get(userId);
        if (statusCallback) {
          statusCallback(status);
        }
        
        // Stop if no longer in queue
        if (!status.inQueue) {
          clearInterval(statusInterval);
        }
      } catch (error) {
        console.error('Status update error:', error);
      }
    }, 3000);
  }

  /**
   * Stop advanced matching
   */
  private stopAdvancedMatching() {
    if (this.matchmakingInterval) {
      clearInterval(this.matchmakingInterval);
      this.matchmakingInterval = null;
    }

    if (this.queueProcessingInterval) {
      clearInterval(this.queueProcessingInterval);
      this.queueProcessingInterval = null;
    }
  }

  /**
   * Set callback for when match is found
   */
  onMatchFound(userId: string, callback: (result: AdvancedMatchmakingResult) => void) {
    this.callbacks.set(userId, callback);
  }

  /**
   * Set callback for status updates
   */
  onStatusUpdate(userId: string, callback: (status: AdvancedQueueStatus) => void) {
    this.statusCallbacks.set(userId, callback);
  }

  /**
   * Update player behavior after game (for fair play system)
   */
  async updatePlayerBehavior(
    userId: string,
    gameType: 'completed' | 'aborted' | 'timeout' | 'rage_quit',
    color?: 'white' | 'black',
    gameDuration?: number
  ): Promise<void> {
    try {
      await supabase.rpc('update_player_behavior', {
        p_user_id: userId,
        p_game_type: gameType,
        p_color: color,
        p_game_duration: gameDuration,
      });
    } catch (error) {
      console.error('❌ Failed to update player behavior:', error);
    }
  }

  /**
   * Force process entire queue (admin function)
   */
  async processQueue(): Promise<{ matchesCreated: number; totalProcessed: number }> {
    try {
      const { data, error } = await supabase.rpc('process_advanced_matchmaking');

      if (error) {
        throw error;
      }

      return {
        matchesCreated: data.matches_created,
        totalProcessed: data.total_processed,
      };
    } catch (error) {
      console.error('❌ Process advanced queue error:', error);
      return { matchesCreated: 0, totalProcessed: 0 };
    }
  }

  /**
   * Get advanced matchmaking statistics
   */
  async getMatchmakingStats(): Promise<MatchmakingStats | null> {
    try {
      const { data, error } = await supabase.rpc('get_matchmaking_stats');

      if (error) {
        throw error;
      }

      return {
        totalInQueue: data.total_in_queue,
        rankedPlayers: data.ranked_players,
        casualPlayers: data.casual_players,
        activeTimeControls: data.active_time_controls,
        standardPool: data.standard_pool,
        restrictedPool: data.restricted_pool,
        averageWaitSeconds: data.average_wait_seconds,
        maxWaitSeconds: data.max_wait_seconds,
        averageRatingRange: data.average_rating_range,
      };
    } catch (error) {
      console.error('❌ Matchmaking stats error:', error);
      return null;
    }
  }

  /**
   * Get available time controls
   */
  getAvailableTimeControls(): Array<{ value: string; label: string; description: string }> {
    return [
      { value: '5+0', label: '5 min', description: 'Blitz - 5 minutes' },
      { value: '10+0', label: '10 min', description: 'Rapid - 10 minutes' },
      { value: '15+0', label: '15 min', description: 'Standard - 15 minutes' },
      { value: '30+0', label: '30 min', description: 'Classical - 30 minutes' },
      { value: '3+2', label: '3+2', description: 'Blitz with increment' },
      { value: '5+3', label: '5+3', description: 'Rapid with increment' },
    ];
  }

  /**
   * Cleanup - call when component unmounts
   */
  cleanup() {
    this.stopAdvancedMatching();
    this.callbacks.clear();
    this.statusCallbacks.clear();
  }
}

// Export singleton instance
export const advancedMatchmakingService = new AdvancedMatchmakingService();

// Export types
export type { 
  AdvancedMatchmakingOptions, 
  AdvancedMatchmakingResult, 
  AdvancedQueueStatus,
  MatchmakingStats 
};