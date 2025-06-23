import { create } from 'zustand';
import { 
  advancedMatchmakingService, 
  type AdvancedMatchmakingResult, 
  type AdvancedQueueStatus,
  type AdvancedMatchmakingOptions,
  type MatchmakingStats
} from '../services/advancedMatchmakingService';

interface AdvancedMatchmakingState {
  // Queue state
  isInQueue: boolean;
  queueStatus: AdvancedQueueStatus | null;
  
  // Match state
  currentMatch: AdvancedMatchmakingResult | null;
  isSearching: boolean;
  
  // User preferences
  userRating: number;
  preferredTimeControl: string;
  preferredColor: 'white' | 'black' | 'random';
  
  // UI state
  showMatchModal: boolean;
  showOptionsModal: boolean;
  error: string | null;
  
  // Statistics
  matchmakingStats: MatchmakingStats | null;
}

interface AdvancedMatchmakingActions {
  // Queue actions
  joinQueue: (userId: string, options: AdvancedMatchmakingOptions) => Promise<void>;
  leaveQueue: (userId: string) => Promise<void>;
  updateQueueStatus: (userId: string) => Promise<void>;
  
  // Match actions
  acceptMatch: () => void;
  clearMatch: () => void;
  
  // Preference actions
  setUserRating: (rating: number) => void;
  setPreferredTimeControl: (timeControl: string) => void;
  setPreferredColor: (color: 'white' | 'black' | 'random') => void;
  
  // UI actions
  setShowMatchModal: (show: boolean) => void;
  setShowOptionsModal: (show: boolean) => void;
  clearError: () => void;
  
  // Stats actions
  loadMatchmakingStats: () => Promise<void>;
  
  // General actions
  reset: () => void;
}

type AdvancedMatchmakingStore = AdvancedMatchmakingState & AdvancedMatchmakingActions;

export const useAdvancedMatchmakingStore = create<AdvancedMatchmakingStore>((set, get) => ({
  // Initial state
  isInQueue: false,
  queueStatus: null,
  currentMatch: null,
  isSearching: false,
  userRating: 1200,
  preferredTimeControl: '15+0',
  preferredColor: 'random',
  showMatchModal: false,
  showOptionsModal: false,
  error: null,
  matchmakingStats: null,

  // Queue actions
  joinQueue: async (userId: string, options: AdvancedMatchmakingOptions) => {
    console.log('🎯 Store: Joining advanced queue for user:', userId);
    
    set({ 
      isSearching: true, 
      error: null,
      isInQueue: false,
      preferredTimeControl: options.timeControl,
      preferredColor: options.preferredColor,
    });

    try {
      // Set up match found callback
      advancedMatchmakingService.onMatchFound(userId, (result: AdvancedMatchmakingResult) => {
        console.log('🎉 Store: Advanced match found callback triggered!', result);
        set({
          currentMatch: result,
          isInQueue: false,
          isSearching: false,
          showMatchModal: true,
        });
      });

      // Set up status update callback
      advancedMatchmakingService.onStatusUpdate(userId, (status: AdvancedQueueStatus) => {
        console.log('📊 Store: Queue status update:', status);
        set({ queueStatus: status });
      });

      const result = await advancedMatchmakingService.joinQueue(userId, options);

      if (!result.success) {
        set({
          error: result.error || 'Failed to join advanced queue',
          isSearching: false,
        });
        return;
      }

      // If immediately matched
      if (result.matched && result.duelId) {
        console.log('🎉 Store: Immediate advanced match found!');
        set({
          currentMatch: result,
          isInQueue: false,
          isSearching: false,
          showMatchModal: true,
        });
        return;
      }

      // If added to queue
      if (result.success && !result.matched) {
        console.log('⏳ Store: Added to advanced queue successfully');
        set({
          isInQueue: true,
          isSearching: false,
          queueStatus: {
            inQueue: true,
            mode: options.mode,
            timeControl: options.timeControl,
            preferredColor: options.preferredColor,
            position: result.queuePosition,
            estimatedWaitSeconds: result.estimatedWaitSeconds,
            fairPlayPool: result.fairPlayPool,
            queuedAt: new Date().toISOString(),
          },
        });
      }
    } catch (error) {
      console.error('💥 Store: Join advanced queue error:', error);
      set({
        error: error instanceof Error ? error.message : 'Unknown error',
        isSearching: false,
        isInQueue: false,
      });
    }
  },

  leaveQueue: async (userId: string) => {
    console.log('🚪 Store: Leaving advanced queue for user:', userId);
    
    try {
      const success = await advancedMatchmakingService.leaveQueue(userId);
      
      if (success) {
        set({
          isInQueue: false,
          queueStatus: null,
          isSearching: false,
          error: null,
        });
        console.log('✅ Store: Left advanced queue successfully');
      } else {
        set({
          error: 'Failed to leave advanced queue',
        });
      }
    } catch (error) {
      console.error('💥 Store: Leave advanced queue error:', error);
      set({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  },

  updateQueueStatus: async (userId: string) => {
    try {
      const status = await advancedMatchmakingService.getQueueStatus(userId);
      
      set({
        queueStatus: status,
        isInQueue: status.inQueue,
      });
    } catch (error) {
      console.error('💥 Store: Update advanced status error:', error);
    }
  },

  // Match actions
  acceptMatch: () => {
    console.log('✅ Store: Accepting advanced match');
    const { currentMatch } = get();
    
    if (currentMatch?.duelId) {
      // Navigation will be handled by the component
      set({
        showMatchModal: false,
        currentMatch: null,
        isInQueue: false,
        queueStatus: null,
      });
    }
  },

  clearMatch: () => {
    console.log('🧹 Store: Clearing advanced match');
    set({
      currentMatch: null,
      showMatchModal: false,
      isInQueue: false,
      queueStatus: null,
      isSearching: false,
    });
  },

  // Preference actions
  setUserRating: (rating: number) => {
    set({ userRating: rating });
  },

  setPreferredTimeControl: (timeControl: string) => {
    set({ preferredTimeControl: timeControl });
  },

  setPreferredColor: (color: 'white' | 'black' | 'random') => {
    set({ preferredColor: color });
  },

  // UI actions
  setShowMatchModal: (show: boolean) => {
    set({ showMatchModal: show });
  },

  setShowOptionsModal: (show: boolean) => {
    set({ showOptionsModal: show });
  },

  clearError: () => {
    set({ error: null });
  },

  // Stats actions
  loadMatchmakingStats: async () => {
    try {
      const stats = await advancedMatchmakingService.getMatchmakingStats();
      set({ matchmakingStats: stats });
    } catch (error) {
      console.error('Failed to load matchmaking stats:', error);
    }
  },

  // General actions
  reset: () => {
    advancedMatchmakingService.cleanup();
    set({
      isInQueue: false,
      queueStatus: null,
      currentMatch: null,
      isSearching: false,
      showMatchModal: false,
      showOptionsModal: false,
      error: null,
      matchmakingStats: null,
    });
  },
}));

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    advancedMatchmakingService.cleanup();
  });
}