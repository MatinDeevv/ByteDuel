/**
 * Matchmaking Store - Manage matchmaking state and queue status
 */
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { enqueueUser, dequeueUser, getQueueStatus, subscribeToMatches, MatchFound } from '../services/matchmaking';

interface MatchmakingState {
  // Queue state
  isSearching: boolean;
  queuedAt: Date | null;
  estimatedWaitTime: number; // in seconds
  
  // Match state
  currentMatch: MatchFound | null;
  
  // User state
  userId: string | null;
  userRating: number;
  
  // Actions
  setUserId: (userId: string) => void;
  setUserRating: (rating: number) => void;
  startSearch: (mode?: string) => Promise<void>;
  cancelSearch: () => Promise<void>;
  acceptMatch: () => void;
  clearMatch: () => void;
  
  // Internal
  _subscription: (() => void) | null;
}

export const useMatchmakingStore = create<MatchmakingState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    isSearching: false,
    queuedAt: null,
    estimatedWaitTime: 30,
    currentMatch: null,
    userId: null,
    userRating: 1200,
    _subscription: null,

    // Actions
    setUserId: (userId: string) => {
      set({ userId });
    },

    setUserRating: (rating: number) => {
      set({ userRating: rating });
    },

    startSearch: async (mode: string = 'ranked') => {
      const { userId } = get();
      if (!userId) {
        throw new Error('User ID not set');
      }

      try {
        // Add to queue
        await enqueueUser(userId, mode);
        
        // Update state
        set({ 
          isSearching: true, 
          queuedAt: new Date(),
          currentMatch: null 
        });

        // Subscribe to match events
        const unsubscribe = subscribeToMatches(
          userId,
          (match: MatchFound) => {
            set({ 
              currentMatch: match,
              isSearching: false,
              queuedAt: null 
            });
          },
          (error: Error) => {
            console.error('Matchmaking subscription error:', error);
            set({ 
              isSearching: false,
              queuedAt: null 
            });
          }
        );

        set({ _subscription: unsubscribe });

      } catch (error) {
        console.error('Failed to start search:', error);
        set({ 
          isSearching: false,
          queuedAt: null 
        });
        throw error;
      }
    },

    cancelSearch: async () => {
      const { userId, _subscription } = get();
      if (!userId) return;

      try {
        // Remove from queue
        await dequeueUser(userId);
        
        // Unsubscribe from events
        if (_subscription) {
          _subscription();
        }

        // Update state
        set({ 
          isSearching: false,
          queuedAt: null,
          _subscription: null 
        });

      } catch (error) {
        console.error('Failed to cancel search:', error);
        throw error;
      }
    },

    acceptMatch: () => {
      const { currentMatch } = get();
      if (!currentMatch) return;

      // Navigate to duel will be handled by the component
      // Just clear the match state here
      set({ currentMatch: null });
    },

    clearMatch: () => {
      set({ currentMatch: null });
    },
  }))
);

// Auto-cleanup subscription on unmount
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    const { _subscription } = useMatchmakingStore.getState();
    if (_subscription) {
      _subscription();
    }
  });
}