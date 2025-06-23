import { create } from 'zustand';

interface MatchData {
  duelId: string;
  opponentId: string;
  opponentName: string;
  opponentRating: number;
}

interface MatchmakingState {
  isSearching: boolean;
  queuedAt: Date | null;
  queuePosition: number | null;
  estimatedWaitTime: number | null;
  currentMatch: MatchData | null;
  userRating: number;
}

interface MatchmakingActions {
  startSearch: (mode: string) => Promise<void>;
  cancelSearch: () => Promise<void>;
  acceptMatch: () => void;
  clearMatch: () => void;
  setUserRating: (rating: number) => void;
}

type MatchmakingStore = MatchmakingState & MatchmakingActions;

export const useMatchmakingStore = create<MatchmakingStore>((set, get) => ({
  // State
  isSearching: false,
  queuedAt: null,
  queuePosition: null,
  estimatedWaitTime: null,
  currentMatch: null,
  userRating: 1200,

  // Actions
  startSearch: async (mode: string) => {
    console.log('🔍 Starting matchmaking search for mode:', mode);
    set({
      isSearching: true,
      queuedAt: new Date(),
      queuePosition: 1,
      estimatedWaitTime: 60000, // 1 minute estimate
    });

    // Mock matchmaking - in a real app this would connect to a matchmaking service
    setTimeout(() => {
      const { isSearching } = get();
      if (isSearching) {
        // Simulate finding a match
        set({
          currentMatch: {
            duelId: 'mock-duel-' + Date.now(),
            opponentId: 'mock-opponent',
            opponentName: 'Test Opponent',
            opponentRating: 1250,
          },
          isSearching: false,
        });
      }
    }, 3000); // Find match after 3 seconds
  },

  cancelSearch: async () => {
    console.log('❌ Cancelling matchmaking search');
    set({
      isSearching: false,
      queuedAt: null,
      queuePosition: null,
      estimatedWaitTime: null,
    });
  },

  acceptMatch: () => {
    console.log('✅ Accepting match');
    const { currentMatch } = get();
    if (currentMatch) {
      // Clear the match data after accepting
      set({
        currentMatch: null,
        queuedAt: null,
        queuePosition: null,
        estimatedWaitTime: null,
      });
    }
  },

  clearMatch: () => {
    console.log('🧹 Clearing match data');
    set({
      currentMatch: null,
      isSearching: false,
      queuedAt: null,
      queuePosition: null,
      estimatedWaitTime: null,
    });
  },

  setUserRating: (rating: number) => {
    set({ userRating: rating });
  },
}));