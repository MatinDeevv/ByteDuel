/**
 * Background Matchmaker - Runs matchmaking process automatically
 * This service runs in the background to match players in the queue
 */
import { processMatchmaking, addDemoUsersToQueue } from './matchmakingService';

class BackgroundMatchmaker {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;
  private intervalMs: number;
  private hasAddedDemoUsers = false;

  constructor(intervalMs: number = 5000) {
    this.intervalMs = intervalMs;
  }

  start(): void {
    if (this.isRunning) {
      console.warn('🔄 Background matchmaker is already running');
      return;
    }

    this.isRunning = true;
    console.log(`🚀 Starting background matchmaker (interval: ${this.intervalMs}ms)`);

    // Add demo users once on startup
    if (!this.hasAddedDemoUsers) {
      setTimeout(async () => {
        try {
          await addDemoUsersToQueue();
          this.hasAddedDemoUsers = true;
        } catch (error) {
          console.log('Demo users already exist or error:', error);
        }
      }, 2000);
    }

    // Run immediately
    this.runMatchmaking();

    // Then run on interval
    this.intervalId = setInterval(() => {
      this.runMatchmaking();
    }, this.intervalMs);
  }

  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    console.log('⏹️ Background matchmaker stopped');
  }

  private async runMatchmaking(): Promise<void> {
    try {
      const matchesCreated = await processMatchmaking();
      if (matchesCreated > 0) {
        console.log(`🎉 Background matchmaker created ${matchesCreated} matches`);
      }
    } catch (error) {
      console.error('💥 Background matchmaker error:', error);
    }
  }

  getStatus(): { isRunning: boolean; intervalMs: number } {
    return {
      isRunning: this.isRunning,
      intervalMs: this.intervalMs,
    };
  }
}

// Create singleton instance
export const backgroundMatchmaker = new BackgroundMatchmaker(
  parseInt(import.meta.env.VITE_MATCHMAKER_INTERVAL || '5000')
);

// Auto-start in development and production
if (typeof window !== 'undefined') {
  // Start when the module loads
  backgroundMatchmaker.start();
  
  // Clean up on page unload
  window.addEventListener('beforeunload', () => {
    backgroundMatchmaker.stop();
  });
}

export default backgroundMatchmaker;