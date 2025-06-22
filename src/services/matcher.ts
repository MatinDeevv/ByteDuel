/**
 * Background Matcher Service - Processes matchmaking queue
 * This runs as a background service to pair players automatically
 */
import { processMatchmaking } from './matchmaking';

export class MatchmakerService {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor(private intervalMs: number = 3000) {}

  /**
   * Start the matchmaking service
   */
  start(): void {
    if (this.isRunning) {
      console.warn('Matchmaker service is already running');
      return;
    }

    this.isRunning = true;
    console.log(`Starting matchmaker service (interval: ${this.intervalMs}ms)`);

    this.intervalId = setInterval(async () => {
      try {
        await processMatchmaking();
      } catch (error) {
        console.error('Matchmaking error:', error);
      }
    }, this.intervalMs);
  }

  /**
   * Stop the matchmaking service
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    console.log('Matchmaker service stopped');
  }

  /**
   * Get service status
   */
  getStatus(): { isRunning: boolean; intervalMs: number } {
    return {
      isRunning: this.isRunning,
      intervalMs: this.intervalMs,
    };
  }
}

// Export singleton instance
export const matchmaker = new MatchmakerService(
  parseInt(import.meta.env.VITE_MATCHMAKER_INTERVAL || '3000')
);

// Auto-start in development
if (import.meta.env.DEV) {
  matchmaker.start();
}