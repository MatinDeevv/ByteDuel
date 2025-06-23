import { create } from 'zustand';
import { fastMatchmakingService, type MatchmakingResult, type QueueStatus } from '../services/fastMatchmakingService';

interface FastMatchmakingState {
  // Queue state
  isInQueue: boolean;
  queueStatus: QueueStatus | null;
  
  // Match state
  currentMatch: MatchmakingResult | null;
  isSearching: boolean;
  
  // User info
  userRating: number;
  
  // UI state
  showMatchModal: boolean;
  error: string | null;
}

interface FastMatchmakingActions {
  // Queue actions
  joinQueue: (userId: string, mode: 'ranked' | 'casual') => Promise<void>;
  leaveQueue: (userId: string) => Promise<void>;
  updateQueueStatus: (userId: string) => Promise<void>;
  
  // Match actions
  acceptMatch: () => void;
  clearMatch: () => void;
  
  // State actions
  setUserRating: (rating: number) => void;
  setShowMatchModal: (show: boolean) => void;
  clearError: () => void;
  reset: () => void;
}

type FastMatchmakingStore = FastMatchmakingState & FastMatchmakingActions;

export const useFastMatchmakingStore = create<FastMatchmakingStore>((set, get) => ({
  // Initial state
  isInQueue: false,
  queueStatus: null,
  currentMatch: null,
  isSearching: false,
  userRating: 1200,
  showMatchModal: false,
  error: null,

  // Queue actions
  joinQueue: async (userId: string, mode: 'ranked' | 'casual' = 'ranked') => {
    console.log('🎯 Store: Joining queue for user:', userId);
    
    set({ 
      isSearching: true, 
      error: null,
      isInQueue: false 
    });

    try {
      // Set up match found callback
      fastMatchmakingService.onMatchFound(userId, (result: MatchmakingResult) => {
        console.log('🎉 Store: Match found callback triggered!', result);
        set({
          currentMatch: result,
          isInQueue: false,
          isSearching: false,
          showMatchModal: true,
        });
      });

      const result = await fastMatchmakingService.joinQueue(userId, { mode });

      if (!result.success) {
        set({
          error: result.error || 'Failed to join queue',
          isSearching: false,
        });
        return;
      }

      // If immediately matched
      if (result.matched && result.duelId) {
        console.log('🎉 Store: Immediate match found!');
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
        console.log('⏳ Store: Added to queue successfully');
        set({
          isInQueue: true,
          isSearching: false,
          queueStatus: {
            inQueue: true,
            mode,
            position: result.queuePosition,
            queueSize: result.queueSize,
            estimatedWaitSeconds: result.estimatedWaitSeconds,
            queuedAt: new Date().toISOString(),
          },
        });

        // Start periodic status updates
        get().startStatusUpdates(userId);
      }
    } catch (error) {
      console.error('💥 Store: Join queue error:', error);
      set({
        error: error instanceof Error ? error.message : 'Unknown error',
        isSearching: false,
        isInQueue: false,
      });
    }
  },

  leaveQueue: async (userId: string) => {
    console.log('🚪 Store: Leaving queue for user:', userId);
    
    try {
      const success = await fastMatchmakingService.leaveQueue(userId);
      
      if (success) {
        set({
          isInQueue: false,
          queueStatus: null,
          isSearching: false,
          error: null,
        });
        console.log('✅ Store: Left queue successfully');
      } else {
        set({
          error: 'Failed to leave queue',
        });
      }
    } catch (error) {
      console.error('💥 Store: Leave queue error:', error);
      set({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  },

  updateQueueStatus: async (userId: string) => {
    try {
      const status = await fastMatchmakingService.getQueueStatus(userId);
      
      set({
        queueStatus: status,
        isInQueue: status.inQueue,
      });
    } catch (error) {
      console.error('💥 Store: Update status error:', error);
    }
  },

  // Match actions
  acceptMatch: () => {
    console.log('✅ Store: Accepting match');
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
    console.log('🧹 Store: Clearing match');
    set({
      currentMatch: null,
      showMatchModal: false,
      isInQueue: false,
      queueStatus: null,
      isSearching: false,
    });
  },

  // State actions
  setUserRating: (rating: number) => {
    set({ userRating: rating });
  },

  setShowMatchModal: (show: boolean) => {
    set({ showMatchModal: show });
  },

  clearError: () => {
    set({ error: null });
  },

  reset: () => {
    fastMatchmakingService.cleanup();
    set({
      isInQueue: false,
      queueStatus: null,
      currentMatch: null,
      isSearching: false,
      showMatchModal: false,
      error: null,
    });
  },

  // Private helper to start status updates
  startStatusUpdates: (userId: string) => {
    const interval = setInterval(async () => {
      const { isInQueue } = get();
      
      if (!isInQueue) {
        clearInterval(interval);
        return;
      }
      
      try {
        await get().updateQueueStatus(userId);
      } catch (error) {
        console.error('Status update error:', error);
      }
    }, 5000); // Update every 5 seconds

    // Store interval for cleanup
    (get() as any).statusInterval = interval;
  },
}));

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    fastMatchmakingService.cleanup();
  });
}