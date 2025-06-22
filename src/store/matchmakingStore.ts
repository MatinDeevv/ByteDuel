import { create } from 'zustand';
import { supabase } from '../lib/supabaseClient';

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
}

interface MatchmakingActions {
  startSearch: (mode: 'ranked' | 'casual') => Promise<void>;
  cancelSearch: () => Promise<void>;
  acceptMatch: () => void;
  clearMatch: () => void;
  setUserRating: (rating: number) => void;
  setError: (error: string | null) => void;
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

  // Actions
  startSearch: async (mode: 'ranked' | 'casual') => {
    const { userRating } = get();
    
    try {
      set({ 
        isSearching: true, 
        queuedAt: new Date(), 
        searchMode: mode,
        error: null 
      });

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Add user to matchmaking queue
      const { error: queueError } = await supabase
        .from('matchmaking_queue')
        .upsert({
          user_id: user.id,
          mode,
          queued_at: new Date().toISOString(),
        });

      if (queueError) {
        throw queueError;
      }

      // Start polling for matches
      const pollInterval = setInterval(async () => {
        try {
          // Check for available matches
          const { data: matches, error: matchError } = await supabase
            .from('duels')
            .select(`
              id,
              creator_id,
              creator:creator_id(display_name, elo_rating)
            `)
            .eq('status', 'waiting')
            .eq('mode', mode)
            .neq('creator_id', user.id)
            .limit(1);

          if (matchError) {
            console.error('Match polling error:', matchError);
            return;
          }

          if (matches && matches.length > 0) {
            const match = matches[0];
            const creator = match.creator as any;
            
            // Found a match!
            clearInterval(pollInterval);
            
            set({
              currentMatch: {
                duelId: match.id,
                opponentId: match.creator_id,
                opponentName: creator.display_name,
                opponentRating: creator.elo_rating,
              },
              isSearching: false,
            });

            // Remove from queue
            await supabase
              .from('matchmaking_queue')
              .delete()
              .eq('user_id', user.id);
          }
        } catch (error) {
          console.error('Polling error:', error);
        }
      }, 3000); // Poll every 3 seconds

      // Clean up after 60 seconds if no match found
      setTimeout(() => {
        clearInterval(pollInterval);
        const state = get();
        if (state.isSearching && !state.currentMatch) {
          get().cancelSearch();
        }
      }, 60000);

    } catch (error) {
      console.error('Failed to start search:', error);
      set({ 
        isSearching: false, 
        queuedAt: null,
        error: error instanceof Error ? error.message : 'Failed to start search'
      });
    }
  },

  cancelSearch: async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Remove from queue
        await supabase
          .from('matchmaking_queue')
          .delete()
          .eq('user_id', user.id);
      }

      set({ 
        isSearching: false, 
        queuedAt: null,
        error: null 
      });
    } catch (error) {
      console.error('Failed to cancel search:', error);
      set({ 
        isSearching: false, 
        queuedAt: null,
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