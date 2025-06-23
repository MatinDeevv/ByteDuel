import { create } from 'zustand';
import { 
  simpleMatchmakingService, 
  type MatchmakingOptions, 
  type QueueStatus, 
  type MatchFoundPayload 
} from '../services/simpleMatchmakingService';

interface SimpleMatchmakingState {
  // Queue state
  isInQueue: boolean;
  isSearching: boolean;
  queueStatus: QueueStatus | null;
  
  // Match state
  currentMatch: MatchFoundPayload | null;
  showMatchModal: boolean;
  
  // UI state
  error: string | null;
  
  // Stats
  queueStats: any;
}

interface SimpleMatchmakingActions {
  // Queue actions
  joinQueue: (userId: string, options: MatchmakingOptions) => Promise<void>;
  leaveQueue: (userId: string) => Promise<void>;
  updateQueueStatus: (userId: string) => Promise<void>;
  
  // Match actions
  acceptMatch: () => void;
  clearMatch: () => void;
  
  // UI actions
  setShowMatchModal: (show: boolean) => void;
  clearError: () => void;
  
  // Stats actions
  loadQueueStats: () => Promise<void>;
  
  // Cleanup
  reset: () => void;
}

type SimpleMatchmakingStore = SimpleMatchmakingState & SimpleMatchmakingActions;

export const useSimpleMatchmakingStore = create<SimpleMatchmakingStore>((set, get) => ({
  // Initial state
  isInQueue: false,
  isSearching: false,
  queueStatus: null,
  currentMatch: null,
  showMatchModal: false,
  error: null,
  queueStats: null,

  // Queue actions
  joinQueue: async (userId: string, options: MatchmakingOptions) => {
    console.log('🎯 Store: Joining simple queue for user:', userId);
    
    set({ 
      isSearching: true, 
      error: null,
      isInQueue: false,
    });

    try {
      // Set up match found callback
      simpleMatchmakingService.onMatchFound((payload: MatchFoundPayload) => {
        console.log('🎉 Store: Match found callback triggered!', payload);
        set({
          currentMatch: payload,
          isInQueue: false,
          isSearching: false,
          showMatchModal: true,
        });
      });

      // Set up status update callback
      simpleMatchmakingService.onStatusUpdate((status: QueueStatus) => {
        console.log('📊 Store: Queue status update:', status);
        set({ 
          queueStatus: status,
          isInQueue: status.in_queue,
        });
      });

      const status = await simpleMatchmakingService.enqueue(userId, options);

      set({
        isInQueue: true,
        isSearching: false,
        queueStatus: status,
      });

      console.log('✅ Store: Successfully joined queue');
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
    console.log('🚪 Store: Leaving simple queue for user:', userId);
    
    try {
      const result = await simpleMatchmakingService.dequeue(userId);
      
      if (result.success) {
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
      const status = await simpleMatchmakingService.getQueueStatus(userId);
      
      set({
        queueStatus: status,
        isInQueue: status.in_queue,
      });
    } catch (error) {
      console.error('💥 Store: Update status error:', error);
    }
  },

  // Match actions
  acceptMatch: () => {
    console.log('✅ Store: Accepting match');
    const { currentMatch } = get();
    
    if (currentMatch?.duel_id) {
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

  // UI actions
  setShowMatchModal: (show: boolean) => {
    set({ showMatchModal: show });
  },

  clearError: () => {
    set({ error: null });
  },

  // Stats actions
  loadQueueStats: async () => {
    try {
      const stats = await simpleMatchmakingService.getQueueStats();
      set({ queueStats: stats });
    } catch (error) {
      console.error('Failed to load queue stats:', error);
    }
  },

  // Cleanup
  reset: () => {
    simpleMatchmakingService.cleanup();
    set({
      isInQueue: false,
      isSearching: false,
      queueStatus: null,
      currentMatch: null,
      showMatchModal: false,
      error: null,
      queueStats: null,
    });
  },
}));

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    simpleMatchmakingService.cleanup();
  });
}