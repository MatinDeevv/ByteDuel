/**
 * Simple Matchmaking Service - Client interface for the new simple system
 */
import { supabase } from '../lib/supabaseClient';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface MatchmakingOptions {
  mode: 'ranked' | 'casual';
}

export interface QueueStatus {
  in_queue: boolean;
  mode?: string;
  position?: number;
  queue_size?: number;
  queued_at?: string;
  estimated_wait_seconds?: number;
}

export interface MatchFoundPayload {
  type: 'match_found';
  duel_id: string;
  opponent_id: string;
  opponent_name: string;
  opponent_rating: number;
  rating_difference: number;
  prompt: string;
  test_cases: any[];
  time_limit: number;
  mode: string;
}

class SimpleMatchmakingService {
  private channel: RealtimeChannel | null = null;
  private userId: string | null = null;
  private matchFoundCallback: ((payload: MatchFoundPayload) => void) | null = null;
  private statusUpdateCallback: ((status: QueueStatus) => void) | null = null;
  private statusPollInterval: NodeJS.Timeout | null = null;

  /**
   * Join the matchmaking queue
   */
  async enqueue(userId: string, options: MatchmakingOptions): Promise<QueueStatus> {
    console.log('🎯 Enqueuing player:', { userId, mode: options.mode });

    try {
      const { data, error } = await supabase.rpc('enqueue_player', {
        p_user_id: userId,
        p_mode: options.mode,
      });

      if (error) {
        console.error('❌ Enqueue error:', error);
        throw error;
      }

      console.log('✅ Successfully enqueued player:', data);

      // Set up real-time subscription for this user
      this.setupRealtimeSubscription(userId);

      // Start status polling
      this.startStatusPolling(userId);

      // Immediately try to trigger matching after joining
      setTimeout(() => {
        this.triggerMatching();
      }, 1000);

      return {
        in_queue: true,
        mode: options.mode,
        position: data.position,
        queue_size: data.queue_size,
        estimated_wait_seconds: data.estimated_wait_seconds,
      };
    } catch (error) {
      console.error('❌ Failed to enqueue player:', error);
      throw error;
    }
  }

  /**
   * Leave the matchmaking queue
   */
  async dequeue(userId: string): Promise<{ success: boolean }> {
    console.log('🚪 Dequeuing player:', userId);

    try {
      const { data, error } = await supabase.rpc('dequeue_player', {
        p_user_id: userId,
      });

      if (error) {
        throw error;
      }

      // Clean up subscriptions
      this.cleanup();

      console.log('✅ Successfully dequeued player:', data);
      return { success: data.removed };
    } catch (error) {
      console.error('❌ Failed to dequeue player:', error);
      throw error;
    }
  }

  /**
   * Get current queue status for a user
   */
  async getQueueStatus(userId: string): Promise<QueueStatus> {
    try {
      const { data, error } = await supabase.rpc('get_queue_status', {
        p_user_id: userId,
      });

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('❌ Failed to get queue status:', error);
      throw error;
    }
  }

  /**
   * Manually trigger matching (for immediate checking)
   */
  async triggerMatching() {
    console.log('🔄 Manually triggering match check...');
    
    try {
      // Try both ranked and casual modes
      const [rankedResult, casualResult] = await Promise.all([
        supabase.rpc('run_match', { p_mode: 'ranked' }),
        supabase.rpc('run_match', { p_mode: 'casual' }),
      ]);

      if (rankedResult.data?.matched) {
        console.log('🎉 Found ranked match:', rankedResult.data);
        await this.handleMatchResult(rankedResult.data, 'ranked');
      }

      if (casualResult.data?.matched) {
        console.log('🎉 Found casual match:', casualResult.data);
        await this.handleMatchResult(casualResult.data, 'casual');
      }
    } catch (error) {
      console.error('❌ Error triggering matching:', error);
    }
  }

  /**
   * Handle a match result by creating duel and notifying players
   */
  private async handleMatchResult(matchData: any, mode: string) {
    try {
      console.log('🎮 Creating duel for match:', matchData);

      // Create duel
      const { data: duel, error: duelError } = await supabase
        .from('duels')
        .insert({
          creator_id: matchData.player1_id,
          opponent_id: matchData.player2_id,
          mode,
          prompt: 'Two Sum Challenge: Find two numbers in an array that add up to a target sum. Return their indices.',
          test_cases: [
            {"input": "[2, 7, 11, 15], 9", "expected": "[0, 1]"},
            {"input": "[3, 2, 4], 6", "expected": "[1, 2]"},
            {"input": "[3, 3], 6", "expected": "[0, 1]"}
          ],
          time_limit: 900,
          status: 'active',
          started_at: new Date().toISOString(),
          average_rating: Math.round((matchData.player1_rating + matchData.player2_rating) / 2),
          rating_difference: matchData.rating_difference,
        })
        .select()
        .single();

      if (duelError) {
        console.error('❌ Failed to create duel:', duelError);
        return;
      }

      console.log('✅ Created duel:', duel.id);

      // Create match payload
      const basePayload = {
        type: 'match_found' as const,
        duel_id: duel.id,
        rating_difference: matchData.rating_difference,
        prompt: duel.prompt,
        test_cases: duel.test_cases,
        time_limit: duel.time_limit,
        mode,
      };

      // Notify player 1
      await this.notifyPlayer(matchData.player1_id, {
        ...basePayload,
        opponent_id: matchData.player2_id,
        opponent_name: matchData.player2_name,
        opponent_rating: matchData.player2_rating,
      });

      // Notify player 2
      await this.notifyPlayer(matchData.player2_id, {
        ...basePayload,
        opponent_id: matchData.player1_id,
        opponent_name: matchData.player1_name,
        opponent_rating: matchData.player1_rating,
      });

      console.log('📡 Notified both players about match:', duel.id);
    } catch (error) {
      console.error('💥 Error handling match result:', error);
    }
  }

  /**
   * Notify a specific player about a match
   */
  private async notifyPlayer(userId: string, payload: MatchFoundPayload) {
    try {
      const channel = supabase.channel(`user_${userId}_notifications`);
      
      await channel
        .send({
          type: 'broadcast',
          event: 'match_found',
          payload,
        })
        .then(() => {
          console.log(`📤 Sent notification to user ${userId}`);
        });

      // Also try alternative notification method
      await supabase
        .from('user_notifications')
        .insert({
          user_id: userId,
          type: 'match_found',
          data: payload,
          created_at: new Date().toISOString(),
        })
        .then(() => {
          console.log(`📝 Stored notification for user ${userId}`);
        })
        .catch((error) => {
          console.log('📝 No user_notifications table, skipping storage');
        });

    } catch (error) {
      console.error(`❌ Failed to notify user ${userId}:`, error);
    }
  }

  /**
   * Set up real-time subscription for match notifications
   */
  private setupRealtimeSubscription(userId: string) {
    this.userId = userId;
    
    // Clean up existing subscription
    if (this.channel) {
      this.channel.unsubscribe();
    }

    console.log(`📡 Setting up realtime subscription for user ${userId}`);

    // Create new channel for this user
    this.channel = supabase.channel(`user_${userId}_notifications`);

    // Listen for match found events
    this.channel.on('broadcast', { event: 'match_found' }, (payload) => {
      console.log('🎉 Match found notification received:', payload);
      
      if (this.matchFoundCallback) {
        this.matchFoundCallback(payload.payload as MatchFoundPayload);
      }
    });

    // Subscribe to the channel
    this.channel.subscribe((status) => {
      console.log(`📡 Realtime subscription status for ${userId}:`, status);
    });

    // Also listen for database changes (alternative method)
    const dbChannel = supabase.channel(`user_${userId}_db_notifications`);
    
    dbChannel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'user_notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        console.log('📬 Database notification received:', payload);
        if (payload.new?.type === 'match_found' && this.matchFoundCallback) {
          this.matchFoundCallback(payload.new.data as MatchFoundPayload);
        }
      }
    );

    dbChannel.subscribe();
  }

  /**
   * Start polling for queue status updates
   */
  private startStatusPolling(userId: string) {
    // Clear existing interval
    if (this.statusPollInterval) {
      clearInterval(this.statusPollInterval);
    }

    this.statusPollInterval = setInterval(async () => {
      try {
        const status = await this.getQueueStatus(userId);
        
        if (this.statusUpdateCallback) {
          this.statusUpdateCallback(status);
        }

        // Stop polling if no longer in queue
        if (!status.in_queue) {
          if (this.statusPollInterval) {
            clearInterval(this.statusPollInterval);
            this.statusPollInterval = null;
          }
        } else {
          // Trigger matching check while in queue
          this.triggerMatching();
        }
      } catch (error) {
        console.error('❌ Status polling error:', error);
        if (this.statusPollInterval) {
          clearInterval(this.statusPollInterval);
          this.statusPollInterval = null;
        }
      }
    }, 3000); // Poll every 3 seconds and trigger matching
  }

  /**
   * Set callback for when a match is found
   */
  onMatchFound(callback: (payload: MatchFoundPayload) => void) {
    this.matchFoundCallback = callback;
  }

  /**
   * Set callback for status updates
   */
  onStatusUpdate(callback: (status: QueueStatus) => void) {
    this.statusUpdateCallback = callback;
  }

  /**
   * Get overall queue statistics
   */
  async getQueueStats() {
    try {
      const { data, error } = await supabase.rpc('get_queue_stats');

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('❌ Failed to get queue stats:', error);
      return null;
    }
  }

  /**
   * Clean up subscriptions and callbacks
   */
  cleanup() {
    if (this.channel) {
      this.channel.unsubscribe();
      this.channel = null;
    }
    
    if (this.statusPollInterval) {
      clearInterval(this.statusPollInterval);
      this.statusPollInterval = null;
    }
    
    this.userId = null;
    this.matchFoundCallback = null;
    this.statusUpdateCallback = null;
  }
}

// Export singleton instance
export const simpleMatchmakingService = new SimpleMatchmakingService();

// Clean up on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    simpleMatchmakingService.cleanup();
  });
}