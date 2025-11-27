// Retry Strategy
// Implements intelligent retry logic with exponential backoff

export interface RetryOptions {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableErrors?: string[];
}

export interface RetryResult<T> {
  success: boolean;
  result?: T;
  error?: Error;
  attempts: number;
  totalDuration: number;
}

export class RetryStrategy {
  private defaultOptions: RetryOptions = {
    maxAttempts: 3,
    initialDelayMs: 1000,
    maxDelayMs: 10000,
    backoffMultiplier: 2,
  };

  /**
   * Executes an operation with retry logic
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    options?: Partial<RetryOptions>
  ): Promise<RetryResult<T>> {
    const opts = { ...this.defaultOptions, ...options };
    const startTime = Date.now();
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
      try {
        const result = await operation();
        
        return {
          success: true,
          result,
          attempts: attempt,
          totalDuration: Date.now() - startTime,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Check if error is retryable
        if (!this.isRetryable(lastError, opts.retryableErrors)) {
          return {
            success: false,
            error: lastError,
            attempts: attempt,
            totalDuration: Date.now() - startTime,
          };
        }

        // Don't delay after the last attempt
        if (attempt < opts.maxAttempts) {
          const delay = this.calculateDelay(attempt, opts);
          await this.sleep(delay);
        }
      }
    }

    return {
      success: false,
      error: lastError,
      attempts: opts.maxAttempts,
      totalDuration: Date.now() - startTime,
    };
  }

  /**
   * Executes multiple operations with retry logic
   * Returns partial results if some operations fail
   */
  async executeMultipleWithRetry<T>(
    operations: Array<() => Promise<T>>,
    options?: Partial<RetryOptions>
  ): Promise<{
    results: T[];
    errors: Error[];
    successCount: number;
    failureCount: number;
  }> {
    const results: T[] = [];
    const errors: Error[] = [];

    for (const operation of operations) {
      const result = await this.executeWithRetry(operation, options);
      
      if (result.success && result.result !== undefined) {
        results.push(result.result);
      } else if (result.error) {
        errors.push(result.error);
      }
    }

    return {
      results,
      errors,
      successCount: results.length,
      failureCount: errors.length,
    };
  }

  /**
   * Calculates the delay for the next retry attempt
   */
  private calculateDelay(attempt: number, options: RetryOptions): number {
    const delay = options.initialDelayMs * Math.pow(options.backoffMultiplier, attempt - 1);
    return Math.min(delay, options.maxDelayMs);
  }

  /**
   * Checks if an error is retryable
   */
  private isRetryable(error: Error, retryableErrors?: string[]): boolean {
    const message = error.message.toLowerCase();

    // Default retryable error patterns
    const defaultRetryablePatterns = [
      'timeout',
      'rate limit',
      'too many requests',
      'network',
      'econnreset',
      'econnrefused',
      'etimedout',
      'socket hang up',
      'temporary',
      'unavailable',
      '429',
      '500',
      '502',
      '503',
      '504',
    ];

    // Check custom retryable errors first
    if (retryableErrors && retryableErrors.length > 0) {
      return retryableErrors.some(pattern => 
        message.includes(pattern.toLowerCase())
      );
    }

    // Check default patterns
    return defaultRetryablePatterns.some(pattern => message.includes(pattern));
  }

  /**
   * Sleeps for the specified duration
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
