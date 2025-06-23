/**
 * Duel Join Service - Handles joining duels and fetching duel specifications
 */
import { supabase } from '../lib/supabaseClient';

export interface DuelJoinResponse {
  success: boolean;
  duel?: {
    id: string;
    prompt: string;
    test_cases: any[];
    time_limit: number;
    mode: string;
    status: string;
    creator_id: string;
    opponent_id: string | null;
  };
  error?: string;
}

export interface JoinDuelRequest {
  duelId: string;
  userId?: string;
}

/**
 * Join a duel and get the duel specification
 */
export async function joinDuel(request: JoinDuelRequest): Promise<DuelJoinResponse> {
  console.log('🎮 Joining duel:', request);
  
  try {
    const { duelId, userId } = request;
    
    // Fetch duel data
    const { data: duel, error } = await supabase
      .from('duels')
      .select('*')
      .eq('id', duelId)
      .single();

    if (error) {
      console.error('❌ Failed to fetch duel:', error);
      return {
        success: false,
        error: `Failed to fetch duel: ${error.message}`,
      };
    }

    if (!duel) {
      console.error('❌ Duel not found:', duelId);
      return {
        success: false,
        error: 'Duel not found',
      };
    }

    console.log('✅ Successfully fetched duel data:', {
      id: duel.id,
      prompt: duel.prompt.slice(0, 100) + '...',
      testCount: Array.isArray(duel.test_cases) ? duel.test_cases.length : 0,
      timeLimit: duel.time_limit,
      status: duel.status,
    });

    // Validate user can join this duel
    if (userId && duel.status === 'active') {
      const canJoin = duel.creator_id === userId || duel.opponent_id === userId;
      if (!canJoin) {
        console.error('❌ User not authorized to join this duel');
        return {
          success: false,
          error: 'You are not authorized to join this duel',
        };
      }
    }

    return {
      success: true,
      duel,
    };
  } catch (error) {
    console.error('💥 Exception in joinDuel:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get duel status and basic info without joining
 */
export async function getDuelInfo(duelId: string) {
  console.log('📋 Getting duel info:', duelId);
  
  try {
    const { data: duel, error } = await supabase
      .from('duels')
      .select(`
        id,
        status,
        mode,
        time_limit,
        created_at,
        started_at,
        creator:creator_id (
          display_name,
          rating
        ),
        opponent:opponent_id (
          display_name,
          rating
        )
      `)
      .eq('id', duelId)
      .single();

    if (error) {
      throw error;
    }

    return {
      success: true,
      duel,
    };
  } catch (error) {
    console.error('❌ Failed to get duel info:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}