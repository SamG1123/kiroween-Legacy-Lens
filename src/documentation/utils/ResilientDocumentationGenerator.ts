import { ProgressTracker } from './ProgressTracker';
import { ErrorHandler } from './ErrorHandler';
import { CacheManager } from './CacheManager';
import {
  DocumentationError,
  GenerationResult,
  ProgressCallback,
  ProjectContext,
  DocumentationOptions
} from '../types';

/**
 * ResilientDocumentationGenerator orchestrates documentation generation
 * with built-in error handling, progress tracking, and caching.
 * 
 * This class provides:
 * - File-level error isolation (Requirement 7.3)
 * - Progress event emission (Requirement 7.4)
 * - Caching layer for analysis results (Requirement 7.5)
 * - Graceful degradation for AI failures
 */
export class ResilientDocumentationGenerator {
  private progressTracker: ProgressTracker;
  private errorHandler: ErrorHandler;
  private cacheManager: CacheManager<any>;

  constructor() {
    this.progressTracker = new ProgressTracker();
    this.errorHandler = new ErrorHandler();
    this.cacheManager = new CacheManager({
      ttl: 3600000, // 1 hour
      maxSize: 1000
    });
  }

  /**
   * Register a progress callback
   */
  onProgress(callback: ProgressCallback): void {
    this.progressTracker.onProgress(callback);
  }

  /**
   * Remove a progress callback
   */
  offProgress(callback: ProgressCallback): void {
    this.progressTracker.offProgress(callback);
  }

  /**
   * Get the progress tracker instance
   */
  getProgressTracker(): ProgressTracker {
    return this.progressTracker;
  }

  /**
   * Get the error handler instance
   */
  getErrorHandler(): ErrorHandler {
    return this.errorHandler;
  }

  /**
   * Get the cache manager instance
   */
  getCacheManager(): CacheManager<any> {
    return this.cacheManager;
  }

  /**
   * Process multiple files with error isolation
   */
  async processFilesWithIsolation<T>(
    files: string[],
    processor: (file: string) => Promise<T>,
    stage: string
  ): Promise<Array<GenerationResult<T>>> {
    this.progressTracker.startStage(
      stage as any,
      files.length,
      `Starting ${stage} for ${files.length} files`
    );

    const operations = files.map(file => ({
      operation: async () => {
        const result = await processor(file);
        this.progressTracker.incrementProgress(`Processed ${file}`);
        return result;
      },
      context: { filePath: file, stage }
    }));

    const results = await this.errorHandler.executeAllWithIsolation(operations);

    this.progressTracker.completeStage(`Completed ${stage}`);

    return results;
  }

  /**
   * Execute an operation with caching
   */
  async executeWithCache<T>(
    cacheKey: string,
    operation: () => Promise<T>,
    content?: string
  ): Promise<T> {
    return this.cacheManager.getOrCompute(cacheKey, operation, content);
  }

  /**
   * Execute an operation with retry logic and error handling
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    context: { filePath?: string; stage: string }
  ): Promise<GenerationResult<T>> {
    return this.errorHandler.executeWithRetry(operation, context);
  }

  /**
   * Execute an AI operation with graceful degradation
   */
  async executeAIWithFallback<T>(
    primaryOperation: () => Promise<T>,
    fallbackOperation: () => Promise<T>,
    context: { filePath?: string; stage: string }
  ): Promise<GenerationResult<T>> {
    // Try primary AI operation with retry
    const result = await this.errorHandler.executeWithRetry(
      primaryOperation,
      context
    );

    // If primary failed and error is not recoverable, try fallback
    if (!result.success && result.error && !result.error.recoverable) {
      const fallbackResult = await this.errorHandler.executeWithIsolation(
        fallbackOperation,
        { ...context, stage: `${context.stage} (fallback)` }
      );

      if (fallbackResult.success) {
        return {
          ...fallbackResult,
          warnings: ['Used fallback method due to AI failure']
        };
      }
    }

    return result;
  }

  /**
   * Get all errors that occurred during generation
   */
  getErrors(): DocumentationError[] {
    return this.errorHandler.getErrors();
  }

  /**
   * Check if any errors occurred
   */
  hasErrors(): boolean {
    return this.errorHandler.hasErrors();
  }

  /**
   * Get a summary of errors
   */
  getErrorSummary(): string {
    return this.errorHandler.getErrorSummary();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.cacheManager.getStats();
  }

  /**
   * Clear all caches and errors
   */
  reset(): void {
    this.progressTracker.reset();
    this.errorHandler.clearErrors();
    this.cacheManager.clear();
  }

  /**
   * Cleanup expired cache entries
   */
  cleanupCache(): number {
    return this.cacheManager.cleanup();
  }
}
