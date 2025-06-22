/**
 * Matchmaking Service - Handle queue management and opponent pairing
 */
import { supabase } from '../lib/supabaseClient';

export interface QueueEntry {
  user_id: string;
  mode: string;
  queued_at: string;
}

export interface MatchFound {
  duelId: string;
  opponentId: string;
  opponentRating?: number;
}

/**
 * Add user to matchmaking queue
 */
export async function enqueueUser(userId: string, mode: string = 'ranked'): Promise<void> {
  const { error } = await supabase
    .from('matchmaking_queue')
    .upsert({ 
      user_id: userId, 
      mode,
      queued_at: new Date().toISOString()
    });

  if (error) {
    console.error('Failed to enqueue user:', error);
    throw new Error('Failed to join matchmaking queue');
  }
}

/**
 * Remove user from matchmaking queue
 */
export async function dequeueUser(userId: string): Promise<void> {
  const { error } = await supabase
    .from('matchmaking_queue')
    .delete()
    .eq('user_id', userId);

  if (error) {
    console.error('Failed to dequeue user:', error);
    throw new Error('Failed to leave matchmaking queue');
  }
}

/**
 * Get current queue status for user
 */
export async function getQueueStatus(userId: string): Promise<QueueEntry | null> {
  const { data, error } = await supabase
    .from('matchmaking_queue')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Failed to get queue status:', error);
    return null;
  }

  return data;
}

/**
 * Find and create matches from queue (background service)
 */
export async function processMatchmaking(): Promise<void> {
  try {
    // Get oldest two players in ranked queue
    const { data: queueEntries, error } = await supabase
      .from('matchmaking_queue')
      .select('user_id, mode, queued_at')
      .eq('mode', 'ranked')
      .order('queued_at', { ascending: true })
      .limit(2);

    if (error) {
      console.error('Failed to fetch queue:', error);
      return;
    }

    if (!queueEntries || queueEntries.length < 2) {
      // Not enough players in queue
      return;
    }

    const [player1, player2] = queueEntries;

    // Remove both players from queue
    const { error: dequeueError } = await supabase
      .from('matchmaking_queue')
      .delete()
      .in('user_id', [player1.user_id, player2.user_id]);

    if (dequeueError) {
      console.error('Failed to dequeue matched players:', error);
      return;
    }

    // Create duel between the two players
    // This would integrate with your existing duel creation logic
    console.log('Match found:', { player1: player1.user_id, player2: player2.user_id });
    
    // TODO: Integrate with existing createDuel API
    // const duel = await createDuel(player1.user_id, 'ranked-duel', player2.user_id);
    
  } catch (error) {
    console.error('Matchmaking process error:', error);
  }
}

/**
 * Subscribe to matchmaking events for a user
 */
export function subscribeToMatches(
  userId: string, 
  onMatch: (match: MatchFound) => void,
  onError?: (error: Error) => void
): () => void {
  // Subscribe to duels table for new matches involving this user
  const subscription = supabase
    .channel('matchmaking')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'duels',
        filter: `creator_id=eq.${userId},opponent_id=eq.${userId}`,
      },
      (payload) => {
        const duel = payload.new;
        const opponentId = duel.creator_id === userId ? duel.opponent_id : duel.creator_id;
        
        onMatch({
          duelId: duel.id,
          opponentId: opponentId,
        });
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('Subscribed to matchmaking events');
      } else if (status === 'CHANNEL_ERROR') {
        onError?.(new Error('Failed to subscribe to matchmaking events'));
      }
    });

  // Return unsubscribe function
  return () => {
    subscription.unsubscribe();
  };
}