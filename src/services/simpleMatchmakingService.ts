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
        throw error;
      }

      // Set up real-time subscription for this user
      this.setupRealtimeSubscription(userId);

      // Start status polling
      this.startStatusPolling(userId);

      console.log('✅ Successfully enqueued player:', data);
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
   * Set up real-time subscription for match notifications
   */
  private setupRealtimeSubscription(userId: string) {
    this.userId = userId;
    
    // Clean up existing subscription
    if (this.channel) {
      this.channel.unsubscribe();
    }

    // Create new channel for this user
    this.channel = supabase.channel(`user_${userId}`);

    // Listen for match found events
    this.channel.on('broadcast', { event: 'match_found' }, (payload) => {
      console.log('🎉 Match found notification received:', payload);
      
      if (this.matchFoundCallback) {
        this.matchFoundCallback(payload.payload as MatchFoundPayload);
      }
    });

    // Subscribe to the channel
    this.channel.subscribe((status) => {
      console.log('📡 Realtime subscription status:', status);
    });
  }

  /**
   * Start polling for queue status updates
   */
  private startStatusPolling(userId: string) {
    const pollInterval = setInterval(async () => {
      try {
        const status = await this.getQueueStatus(userId);
        
        if (this.statusUpdateCallback) {
          this.statusUpdateCallback(status);
        }

        // Stop polling if no longer in queue
        if (!status.in_queue) {
          clearInterval(pollInterval);
        }
      } catch (error) {
        console.error('❌ Status polling error:', error);
        clearInterval(pollInterval);
      }
    }, 5000); // Poll every 5 seconds
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