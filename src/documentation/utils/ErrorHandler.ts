import { DocumentationError, GenerationResult } from '../types';

/**
 * ErrorHandler provides file-level error isolation and graceful degradation
 * for documentation generation. It ensures that failures in processing one
 * file don't prevent the rest of the documentation from being generated.
 * 
 * Requirements: 7.3 - File-level error isolation
 */
export class ErrorHandler {
  private errors: DocumentationError[] = [];
  private readonly maxRetries: number;
  private readonly retryDelay: number;

  constructor(maxRetries: number = 3, retryDelay: number = 1000) {
    this.maxRetries = maxRetries;
    this.retryDelay = retryDelay;
  }

  /**
   * Execute an operation with error handling and retry logic
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    context: { filePath?: string; stage: string }
  ): Promise<GenerationResult<T>> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const data = await operation();
        return {
          success: true,
          data
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // If this is not the last attempt, wait before retrying
        if (attempt < this.maxRetries - 1) {
          await this.delay(this.retryDelay * Math.pow(2, attempt)); // Exponential backoff
        }
      }
    }

    // All retries failed
    const docError: DocumentationError = {
      filePath: context.filePath,
      stage: context.stage,
      error: lastError!,
      timestamp: new Date(),
      recoverable: this.isRecoverableError(lastError!)
    };

    this.errors.push(docError);

    return {
      success: false,
      error: docError
    };
  }

  /**
   * Execute an operation with error isolation (no retries)
   */
  async executeWithIsolation<T>(
    operation: () => Promise<T>,
    context: { filePath?: string; stage: string }
  ): Promise<GenerationResult<T>> {
    try {
      const data = await operation();
      return {
        success: true,
        data
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      const docError: DocumentationError = {
        filePath: context.filePath,
        stage: context.stage,
        error: err,
        timestamp: new Date(),
        recoverable: this.isRecoverableError(err)
      };

      this.errors.push(docError);

      return {
        success: false,
        error: docError
      };
    }
  }

  /**
   * Execute multiple operations in parallel with error isolation
   */
  async executeAllWithIsolation<T>(
    operations: Array<{
      operation: () => Promise<T>;
      context: { filePath?: string; stage: string };
    }>
  ): Promise<GenerationResult<T>[]> {
    return Promise.all(
      operations.map(({ operation, context }) =>
        this.executeWithIsolation(operation, context)
      )
    );
  }

  /**
   * Get all errors that have occurred
   */
  getErrors(): DocumentationError[] {
    return [...this.errors];
  }

  /**
   * Get errors for a specific file
   */
  getErrorsForFile(filePath: string): DocumentationError[] {
    return this.errors.filter(e => e.filePath === filePath);
  }

  /**
   * Check if there are any errors
   */
  hasErrors(): boolean {
    return this.errors.length > 0;
  }

  /**
   * Get count of errors by stage
   */
  getErrorCountByStage(): Record<string, number> {
    return this.errors.reduce((acc, error) => {
      acc[error.stage] = (acc[error.stage] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  /**
   * Clear all recorded errors
   */
  clearErrors(): void {
    this.errors = [];
  }

  /**
   * Determine if an error is recoverable
   */
  private isRecoverableError(error: Error): boolean {
    const recoverablePatterns = [
      /rate limit/i,
      /timeout/i,
      /ECONNRESET/i,
      /ETIMEDOUT/i,
      /network/i,
      /temporary/i
    ];

    return recoverablePatterns.some(pattern => pattern.test(error.message));
  }

  /**
   * Delay helper for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Create a summary of all errors
   */
  getErrorSummary(): string {
    if (this.errors.length === 0) {
      return 'No errors occurred';
    }

    const byStage = this.getErrorCountByStage();
    const summary = Object.entries(byStage)
      .map(([stage, count]) => `${stage}: ${count}`)
      .join(', ');

    return `${this.errors.length} error(s) occurred - ${summary}`;
  }
}
