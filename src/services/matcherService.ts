/**
 * Simple Matcher Service - Handles automatic matchmaking
 * Periodically checks queue and creates matches between compatible players
 */
import { supabase } from '../lib/supabaseClient';
import { generatePuzzle } from '../lib/puzzleGenerator';

export interface MatchResult {
  success: boolean;
  matched: boolean;
  player1_id?: string;
  player2_id?: string;
  player1_name?: string;
  player2_name?: string;
  player1_rating?: number;
  player2_rating?: number;
  rating_difference?: number;
  message?: string;
}

export interface DuelCreationResult {
  duel_id: string;
  player1_id: string;
  player2_id: string;
  prompt: string;
  test_cases: any[];
  time_limit: number;
}

class MatcherService {
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;
  private readonly CHECK_INTERVAL = 3000; // 3 seconds

  /**
   * Start the matcher service
   */
  start() {
    if (this.isRunning) {
      console.log('🎯 Matcher service already running');
      return;
    }

    console.log('🚀 Starting matcher service...');
    this.isRunning = true;

    this.intervalId = setInterval(async () => {
      try {
        await this.processQueue();
      } catch (error) {
        console.error('💥 Matcher service error:', error);
      }
    }, this.CHECK_INTERVAL);

    console.log('✅ Matcher service started');
  }

  /**
   * Stop the matcher service
   */
  stop() {
    if (!this.isRunning) {
      return;
    }

    console.log('🛑 Stopping matcher service...');
    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    console.log('✅ Matcher service stopped');
  }

  /**
   * Process the matchmaking queue
   */
  private async processQueue() {
    try {
      // Check for matches in ranked mode
      const rankedResult = await this.runMatch('ranked');
      if (rankedResult.matched && rankedResult.player1_id && rankedResult.player2_id) {
        await this.createAndNotifyMatch(rankedResult, 'ranked');
      }

      // Check for matches in casual mode
      const casualResult = await this.runMatch('casual');
      if (casualResult.matched && casualResult.player1_id && casualResult.player2_id) {
        await this.createAndNotifyMatch(casualResult, 'casual');
      }
    } catch (error) {
      console.error('❌ Error processing queue:', error);
    }
  }

  /**
   * Run the atomic match function for a specific mode
   */
  private async runMatch(mode: string): Promise<MatchResult> {
    const { data, error } = await supabase.rpc('run_match', { p_mode: mode });

    if (error) {
      console.error(`❌ Error running match for ${mode}:`, error);
      return { success: false, matched: false, message: error.message };
    }

    if (data?.matched) {
      console.log(`🎉 Match found in ${mode}:`, {
        player1: data.player1_name,
        player2: data.player2_name,
        ratingDiff: data.rating_difference,
      });
    }

    return data;
  }

  /**
   * Create duel and notify both players
   */
  private async createAndNotifyMatch(matchResult: MatchResult, mode: string) {
    try {
      // Create the duel
      const duel = await this.createDuel(matchResult, mode);
      
      console.log(`✅ Created duel ${duel.duel_id} for ${matchResult.player1_name} vs ${matchResult.player2_name}`);

      // Notify both players through Supabase realtime
      const matchPayload = {
        type: 'match_found',
        duel_id: duel.duel_id,
        opponent_id: '',
        opponent_name: '',
        opponent_rating: 0,
        rating_difference: matchResult.rating_difference,
        prompt: duel.prompt,
        test_cases: duel.test_cases,
        time_limit: duel.time_limit,
        mode,
      };

      // Send notification to player 1
      await supabase
        .channel(`user_${matchResult.player1_id}`)
        .send({
          type: 'broadcast',
          event: 'match_found',
          payload: {
            ...matchPayload,
            opponent_id: matchResult.player2_id,
            opponent_name: matchResult.player2_name,
            opponent_rating: matchResult.player2_rating,
          },
        });

      // Send notification to player 2
      await supabase
        .channel(`user_${matchResult.player2_id}`)
        .send({
          type: 'broadcast',
          event: 'match_found',
          payload: {
            ...matchPayload,
            opponent_id: matchResult.player1_id,
            opponent_name: matchResult.player1_name,
            opponent_rating: matchResult.player1_rating,
          },
        });

      console.log(`📡 Notified both players about match ${duel.duel_id}`);
    } catch (error) {
      console.error('💥 Error creating duel or notifying players:', error);
      
      // Try to re-queue the players if duel creation failed
      try {
        await this.requeuePlayers(matchResult);
      } catch (requeueError) {
        console.error('💥 Error re-queueing players:', requeueError);
      }
    }
  }

  /**
   * Create a duel between two matched players
   */
  private async createDuel(matchResult: MatchResult, mode: string): Promise<DuelCreationResult> {
    // Generate puzzle for the duel
    const puzzle = await generatePuzzle('', '', 'ranked-duel', {
      topic: 'algorithms',
      difficulty: 'medium',
      mode: 'drills',
    });

    // Create duel in database
    const { data: duel, error } = await supabase
      .from('duels')
      .insert({
        creator_id: matchResult.player1_id,
        opponent_id: matchResult.player2_id,
        mode,
        prompt: puzzle.prompt,
        test_cases: puzzle.tests,
        time_limit: 900, // 15 minutes
        status: 'active',
        started_at: new Date().toISOString(),
        average_rating: Math.round(((matchResult.player1_rating || 1200) + (matchResult.player2_rating || 1200)) / 2),
        rating_difference: matchResult.rating_difference || 0,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create duel: ${error.message}`);
    }

    return {
      duel_id: duel.id,
      player1_id: matchResult.player1_id!,
      player2_id: matchResult.player2_id!,
      prompt: puzzle.prompt,
      test_cases: puzzle.tests,
      time_limit: 900,
    };
  }

  /**
   * Re-queue players if duel creation failed
   */
  private async requeuePlayers(matchResult: MatchResult) {
    if (matchResult.player1_id) {
      await supabase.rpc('enqueue_player', { 
        p_user_id: matchResult.player1_id, 
        p_mode: 'ranked' 
      });
    }
    
    if (matchResult.player2_id) {
      await supabase.rpc('enqueue_player', { 
        p_user_id: matchResult.player2_id, 
        p_mode: 'ranked' 
      });
    }
    
    console.log('🔄 Re-queued players after duel creation failure');
  }

  /**
   * Get queue statistics
   */
  async getQueueStats() {
    const { data, error } = await supabase.rpc('get_queue_stats');
    
    if (error) {
      console.error('❌ Error getting queue stats:', error);
      return null;
    }
    
    return data;
  }
}

// Export singleton instance
export const matcherService = new MatcherService();

// Auto-start the service in browser environments
if (typeof window !== 'undefined') {
  // Start the service when the module loads
  matcherService.start();
  
  // Stop the service when the page unloads
  window.addEventListener('beforeunload', () => {
    matcherService.stop();
  });
}