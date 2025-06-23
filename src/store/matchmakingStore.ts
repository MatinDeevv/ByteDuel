import { create } from 'zustand';
import { supabase } from '../lib/supabaseClient';
import { 
  joinMatchmakingQueue, 
  leaveMatchmakingQueue, 
  getQueueStatus 
} from '../services/matchmakingService';

interface MatchData {
  duelId: string;
  opponentId: string;
  opponentName: string;
  opponentRating: number;
}

interface MatchmakingState {
  isSearching: boolean;
  queuedAt: Date | null;
  currentMatch: MatchData | null;
  userRating: number;
  searchMode: 'ranked' | 'casual';
  error: string | null;
  queuePosition?: number;
  estimatedWaitTime?: number;
}

interface MatchmakingActions {
  startSearch: (mode: 'ranked' | 'casual') => Promise<void>;
  cancelSearch: () => Promise<void>;
  acceptMatch: () => void;
  clearMatch: () => void;
  setUserRating: (rating: number) => void;
  setError: (error: string | null) => void;
  updateQueueStatus: () => Promise<void>;
}

type MatchmakingStore = MatchmakingState & MatchmakingActions;

export const useMatchmakingStore = create<MatchmakingStore>((set, get) => ({
  // State
  isSearching: false,
  queuedAt: null,
  currentMatch: null,
  userRating: 1200,
  searchMode: 'ranked',
  error: null,
  queuePosition: undefined,
  estimatedWaitTime: undefined,

  // Actions
  startSearch: async (mode: 'ranked' | 'casual') => {
    try {
      set({ 
        isSearching: true, 
        queuedAt: new Date(), 
        searchMode: mode,
        error: null,
        queuePosition: undefined,
        estimatedWaitTime: undefined,
      });

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Join the real matchmaking queue
      await joinMatchmakingQueue(user.id, mode);

      // Force immediate matchmaking check for instant connections
      const { backgroundMatchmaker } = await import('../services/backgroundMatchmaker');
      backgroundMatchmaker.forceMatch();
      // Start polling for matches and queue status
      const pollInterval = setInterval(async () => {
        try {
          // Update queue status
          await get().updateQueueStatus();

          // Check if user has been matched (removed from queue)
          const status = await getQueueStatus(user.id);
          
          if (!status.inQueue) {
            // User was matched! Check for active duel
            const { data: activeDuel, error: duelError } = await supabase
              .from('duels')
              .select(`
                id,
                creator_id,
                opponent_id,
                creator:creator_id(display_name, elo_rating),
                opponent:opponent_id(display_name, elo_rating)
              `)
              .or(`creator_id.eq.${user.id},opponent_id.eq.${user.id}`)
              .eq('status', 'active')
              .order('created_at', { ascending: false })
              .limit(1)
              .single();

            if (!duelError && activeDuel) {
              // Found a match!
              clearInterval(pollInterval);
              
              const isCreator = activeDuel.creator_id === user.id;
              const opponent = isCreator ? activeDuel.opponent : activeDuel.creator;
              
              set({
                currentMatch: {
                  duelId: activeDuel.id,
                  opponentId: isCreator ? activeDuel.opponent_id : activeDuel.creator_id,
                  opponentName: (opponent as any)?.display_name || 'Unknown',
                  opponentRating: (opponent as any)?.elo_rating || 1200,
                },
                isSearching: false,
                queuePosition: undefined,
                estimatedWaitTime: undefined,
              });
            }
          }
        } catch (error) {
          console.error('Polling error:', error);
        }
      }, 1000); // Poll every 1 second for faster response

      // Clean up after 120 seconds if no match found
      setTimeout(() => {
        clearInterval(pollInterval);
        const state = get();
        if (state.isSearching && !state.currentMatch) {
          get().cancelSearch();
        }
      }, 120000); // 2 minutes timeout

    } catch (error) {
      console.error('Failed to start search:', error);
      set({ 
        isSearching: false, 
        queuedAt: null,
        queuePosition: undefined,
        estimatedWaitTime: undefined,
        error: error instanceof Error ? error.message : 'Failed to start search'
      });
    }
  },

  updateQueueStatus: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const status = await getQueueStatus(user.id);
      
      if (status.inQueue) {
        set({
          queuePosition: status.position,
          estimatedWaitTime: status.estimatedWaitTime,
        });
      }
    } catch (error) {
      console.error('Failed to update queue status:', error);
    }
  },

  cancelSearch: async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Remove from real matchmaking queue
        await leaveMatchmakingQueue(user.id);
      }

      set({ 
        isSearching: false, 
        queuedAt: null,
        queuePosition: undefined,
        estimatedWaitTime: undefined,
        error: null 
      });
    } catch (error) {
      console.error('Failed to cancel search:', error);
      set({ 
        isSearching: false, 
        queuedAt: null,
        queuePosition: undefined,
        estimatedWaitTime: undefined,
        error: error instanceof Error ? error.message : 'Failed to cancel search'
      });
    }
  },

  acceptMatch: () => {
    set({ currentMatch: null });
  },

  clearMatch: () => {
    set({ currentMatch: null });
  },

  setUserRating: (rating: number) => {
    set({ userRating: rating });
  },

  setError: (error: string | null) => {
    set({ error });
  },
}));