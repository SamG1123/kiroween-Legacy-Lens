/**
 * Retry handler with exponential backoff for API calls
 */

export interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  retryableErrors?: string[];
  onRetry?: (error: Error, attempt: number) => void;
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  attempts: number;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  retryableErrors: ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'AbortError'],
  onRetry: () => {},
};

/**
 * Execute a function with retry logic and exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | undefined;
  let attempt = 0;

  while (attempt <= opts.maxRetries) {
    try {
      const result = await fn();
      return result;
    } catch (error) {
      lastError = error as Error;
      attempt++;

      // Check if error is retryable
      if (!isRetryableError(lastError, opts.retryableErrors)) {
        throw lastError;
      }

      // Don't retry if we've exhausted attempts
      if (attempt > opts.maxRetries) {
        throw lastError;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        opts.initialDelayMs * Math.pow(opts.backoffMultiplier, attempt - 1),
        opts.maxDelayMs
      );

      // Call retry callback
      opts.onRetry(lastError, attempt);

      // Wait before retrying
      await sleep(delay);
    }
  }

  throw lastError || new Error('Retry failed with unknown error');
}

/**
 * Execute a function with retry logic, returning a result object instead of throwing
 */
export async function tryWithRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<RetryResult<T>> {
  try {
    const data = await withRetry(fn, options);
    return {
      success: true,
      data,
      attempts: 1, // Simplified - actual attempts tracked internally
    };
  } catch (error) {
    return {
      success: false,
      error: error as Error,
      attempts: (options.maxRetries || DEFAULT_OPTIONS.maxRetries) + 1,
    };
  }
}

/**
 * Check if an error is retryable based on error code or message
 */
function isRetryableError(error: Error, retryableErrors: string[]): boolean {
  const errorCode = (error as any).code;
  const errorName = error.name;
  const errorMessage = error.message;

  // Check error code
  if (errorCode && retryableErrors.includes(errorCode)) {
    return true;
  }

  // Check error name
  if (errorName && retryableErrors.includes(errorName)) {
    return true;
  }

  // Check for common retryable patterns in message
  const retryablePatterns = [
    /timeout/i,
    /ECONNRESET/i,
    /ETIMEDOUT/i,
    /ENOTFOUND/i,
    /network/i,
    /rate limit/i,
    /429/,
    /503/,
    /502/,
    /504/,
  ];

  return retryablePatterns.some((pattern) => pattern.test(errorMessage));
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Batch retry handler for multiple operations
 */
export async function batchWithRetry<T>(
  operations: Array<() => Promise<T>>,
  options: RetryOptions = {}
): Promise<Array<RetryResult<T>>> {
  const promises = operations.map((op) => tryWithRetry(op, options));
  return Promise.all(promises);
}
