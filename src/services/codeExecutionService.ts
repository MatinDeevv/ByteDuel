/**
 * Code Execution Service - High-level interface for running code
 * Provides caching, rate limiting, and result optimization
 */
import { runCodeSandbox, validateCode, benchmarkCode, type ExecutionResult, type TestCase } from '../lib/sandboxRunner';

interface CachedResult {
  result: ExecutionResult;
  timestamp: number;
  codeHash: string;
}

interface ExecutionOptions {
  language?: string;
  timeout?: number;
  enableCaching?: boolean;
  enableBenchmarking?: boolean;
  maxAttempts?: number;
}

class CodeExecutionService {
  private cache = new Map<string, CachedResult>();
  private rateLimitMap = new Map<string, number[]>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
  private readonly RATE_LIMIT_MAX = 20; // 20 executions per minute per user

  /**
   * Execute code with comprehensive features
   */
  async executeCode(
    code: string,
    testCases: TestCase[],
    userId?: string,
    options: ExecutionOptions = {}
  ): Promise<ExecutionResult & { cached?: boolean; benchmark?: any }> {
    const {
      language = 'javascript',
      timeout = 5000,
      enableCaching = true,
      enableBenchmarking = false,
      maxAttempts = 3,
    } = options;

    // Rate limiting
    if (userId && !this.checkRateLimit(userId)) {
      throw new Error('Rate limit exceeded. Please wait before submitting again.');
    }

    // Generate cache key
    const codeHash = this.generateHash(code + JSON.stringify(testCases));
    const cacheKey = `${language}-${codeHash}`;

    // Check cache
    if (enableCaching) {
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        console.log('📦 Returning cached result');
        return { ...cached.result, cached: true };
      }
    }

    // Validate code first
    const validation = await validateCode(code, language);
    if (!validation.isValid) {
      const errorResult: ExecutionResult = {
        passed: false,
        passedTests: 0,
        totalTests: testCases.length,
        runtimeMs: 0,
        wrongAttempts: 1,
        testResults: [],
        error: `Validation failed: ${validation.errors.concat(validation.securityIssues).join(', ')}`,
      };
      return errorResult;
    }

    // Execute with retry logic
    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`🚀 Executing code (attempt ${attempt}/${maxAttempts})`);
        
        const result = await runCodeSandbox(code, testCases, language, timeout);
        
        // Add benchmark if requested and code passed
        let benchmark;
        if (enableBenchmarking && result.passed) {
          try {
            benchmark = await benchmarkCode(code, testCases.slice(0, 3), 10); // Limited benchmark
          } catch (error) {
            console.warn('Benchmarking failed:', error);
          }
        }

        // Cache successful results
        if (enableCaching && result.passed) {
          this.setCache(cacheKey, result);
        }

        // Update rate limit
        if (userId) {
          this.updateRateLimit(userId);
        }

        return { ...result, benchmark };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown execution error');
        console.warn(`Attempt ${attempt} failed:`, lastError.message);
        
        if (attempt < maxAttempts) {
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 100 * attempt));
        }
      }
    }

    // All attempts failed
    const errorResult: ExecutionResult = {
      passed: false,
      passedTests: 0,
      totalTests: testCases.length,
      runtimeMs: 0,
      wrongAttempts: maxAttempts,
      testResults: [],
      error: `Execution failed after ${maxAttempts} attempts: ${lastError?.message || 'Unknown error'}`,
    };

    return errorResult;
  }

  /**
   * Quick validation without execution
   */
  async validateCodeOnly(code: string, language: string = 'javascript') {
    return validateCode(code, language);
  }

  /**
   * Get execution statistics
   */
  getStats() {
    return {
      cacheSize: this.cache.size,
      cacheHitRate: this.calculateCacheHitRate(),
      activeUsers: this.rateLimitMap.size,
    };
  }

  /**
   * Clear cache and reset rate limits
   */
  reset() {
    this.cache.clear();
    this.rateLimitMap.clear();
    console.log('🧹 Code execution service reset');
  }

  // Private methods

  private generateHash(input: string): string {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private getFromCache(key: string): CachedResult | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    // Check if expired
    if (Date.now() - cached.timestamp > this.CACHE_TTL) {
      this.cache.delete(key);
      return null;
    }

    return cached;
  }

  private setCache(key: string, result: ExecutionResult) {
    this.cache.set(key, {
      result,
      timestamp: Date.now(),
      codeHash: key,
    });

    // Clean up old entries periodically
    if (this.cache.size > 1000) {
      this.cleanupCache();
    }
  }

  private cleanupCache() {
    const now = Date.now();
    for (const [key, cached] of this.cache.entries()) {
      if (now - cached.timestamp > this.CACHE_TTL) {
        this.cache.delete(key);
      }
    }
  }

  private checkRateLimit(userId: string): boolean {
    const now = Date.now();
    const userRequests = this.rateLimitMap.get(userId) || [];
    
    // Remove old requests outside the window
    const recentRequests = userRequests.filter(
      timestamp => now - timestamp < this.RATE_LIMIT_WINDOW
    );
    
    return recentRequests.length < this.RATE_LIMIT_MAX;
  }

  private updateRateLimit(userId: string) {
    const now = Date.now();
    const userRequests = this.rateLimitMap.get(userId) || [];
    
    // Add current request
    userRequests.push(now);
    
    // Keep only recent requests
    const recentRequests = userRequests.filter(
      timestamp => now - timestamp < this.RATE_LIMIT_WINDOW
    );
    
    this.rateLimitMap.set(userId, recentRequests);
  }

  private calculateCacheHitRate(): number {
    // This would need to be tracked over time in a real implementation
    return 0.75; // Mock 75% hit rate
  }
}

// Export singleton instance
export const codeExecutionService = new CodeExecutionService();

// Export types
export type { ExecutionResult, TestCase, ExecutionOptions };