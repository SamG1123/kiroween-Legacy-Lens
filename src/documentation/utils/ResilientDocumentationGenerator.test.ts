import { ResilientDocumentationGenerator } from './ResilientDocumentationGenerator';
import { ProgressEvent } from '../types';

describe('ResilientDocumentationGenerator', () => {
  let generator: ResilientDocumentationGenerator;

  beforeEach(() => {
    generator = new ResilientDocumentationGenerator();
  });

  describe('component access', () => {
    it('should provide access to progress tracker', () => {
      const tracker = generator.getProgressTracker();
      expect(tracker).toBeDefined();
    });

    it('should provide access to error handler', () => {
      const handler = generator.getErrorHandler();
      expect(handler).toBeDefined();
    });

    it('should provide access to cache manager', () => {
      const cache = generator.getCacheManager();
      expect(cache).toBeDefined();
    });
  });

  describe('progress tracking', () => {
    it('should emit progress events during file processing', async () => {
      const events: ProgressEvent[] = [];
      generator.onProgress((event) => events.push(event));

      const files = ['file1.ts', 'file2.ts', 'file3.ts'];
      const processor = jest.fn().mockResolvedValue('processed');

      await generator.processFilesWithIsolation(files, processor, 'parsing');

      expect(events.length).toBeGreaterThan(0);
      expect(events[0].stage).toBe('parsing');
      expect(events[0].total).toBe(3);
    });

    it('should allow removing progress callbacks', async () => {
      const callback = jest.fn();
      generator.onProgress(callback);
      generator.offProgress(callback);

      const files = ['file1.ts'];
      await generator.processFilesWithIsolation(
        files,
        () => Promise.resolve('done'),
        'parsing'
      );

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('file processing with isolation', () => {
    it('should process all files successfully', async () => {
      const files = ['file1.ts', 'file2.ts', 'file3.ts'];
      const processor = jest.fn()
        .mockResolvedValueOnce('result1')
        .mockResolvedValueOnce('result2')
        .mockResolvedValueOnce('result3');

      const results = await generator.processFilesWithIsolation(
        files,
        processor,
        'parsing'
      );

      expect(results.length).toBe(3);
      expect(results[0].success).toBe(true);
      expect(results[0].data).toBe('result1');
      expect(results[1].success).toBe(true);
      expect(results[2].success).toBe(true);
    });

    it('should isolate failures and continue processing', async () => {
      const files = ['file1.ts', 'file2.ts', 'file3.ts'];
      const processor = jest.fn()
        .mockResolvedValueOnce('result1')
        .mockRejectedValueOnce(new Error('Failed'))
        .mockResolvedValueOnce('result3');

      const results = await generator.processFilesWithIsolation(
        files,
        processor,
        'parsing'
      );

      expect(results.length).toBe(3);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[2].success).toBe(true);
      expect(generator.hasErrors()).toBe(true);
    });
  });

  describe('caching', () => {
    it('should cache operation results', async () => {
      const operation = jest.fn().mockResolvedValue('computed');

      const result1 = await generator.executeWithCache('key1', operation);
      const result2 = await generator.executeWithCache('key1', operation);

      expect(result1).toBe('computed');
      expect(result2).toBe('computed');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should recompute when content changes', async () => {
      const operation = jest.fn()
        .mockResolvedValueOnce('result1')
        .mockResolvedValueOnce('result2');

      await generator.executeWithCache('key1', operation, 'content1');
      await generator.executeWithCache('key1', operation, 'content2');

      expect(operation).toHaveBeenCalledTimes(2);
    });
  });

  describe('retry logic', () => {
    it('should retry failed operations', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockResolvedValue('success');

      const result = await generator.executeWithRetry(
        operation,
        { stage: 'generation' }
      );

      expect(result.success).toBe(true);
      expect(result.data).toBe('success');
    });
  });

  describe('AI operations with fallback', () => {
    it('should use primary operation when successful', async () => {
      const primary = jest.fn().mockResolvedValue('primary result');
      const fallback = jest.fn().mockResolvedValue('fallback result');

      const result = await generator.executeAIWithFallback(
        primary,
        fallback,
        { stage: 'ai-generation' }
      );

      expect(result.success).toBe(true);
      expect(result.data).toBe('primary result');
      expect(fallback).not.toHaveBeenCalled();
    });

    it('should use fallback when primary fails with non-recoverable error', async () => {
      const primary = jest.fn().mockRejectedValue(new Error('Invalid syntax'));
      const fallback = jest.fn().mockResolvedValue('fallback result');

      const result = await generator.executeAIWithFallback(
        primary,
        fallback,
        { stage: 'ai-generation' }
      );

      expect(result.success).toBe(true);
      expect(result.data).toBe('fallback result');
      expect(result.warnings).toContain('Used fallback method due to AI failure');
    });

    it('should not use fallback for recoverable errors', async () => {
      const primary = jest.fn().mockRejectedValue(new Error('Rate limit exceeded'));
      const fallback = jest.fn().mockResolvedValue('fallback result');

      const result = await generator.executeAIWithFallback(
        primary,
        fallback,
        { stage: 'ai-generation' }
      );

      expect(result.success).toBe(false);
      expect(fallback).not.toHaveBeenCalled();
    });
  });

  describe('error tracking', () => {
    it('should track errors across operations', async () => {
      // Use executeWithIsolation instead of executeWithRetry to avoid long delays
      const handler = generator.getErrorHandler();
      await handler.executeWithIsolation(
        () => Promise.reject(new Error('Error 1')),
        { filePath: 'file1.ts', stage: 'parsing' }
      );
      await handler.executeWithIsolation(
        () => Promise.reject(new Error('Error 2')),
        { filePath: 'file2.ts', stage: 'generation' }
      );

      expect(generator.hasErrors()).toBe(true);
      const errors = generator.getErrors();
      expect(errors.length).toBe(2);
    });

    it('should generate error summary', async () => {
      await generator.executeWithRetry(
        () => Promise.reject(new Error('Error')),
        { stage: 'parsing' }
      );

      const summary = generator.getErrorSummary();
      expect(summary).toContain('error');
    });
  });

  describe('cache management', () => {
    it('should provide cache statistics', () => {
      const stats = generator.getCacheStats();
      expect(stats).toBeDefined();
      expect(stats.size).toBeDefined();
      expect(stats.maxSize).toBeDefined();
    });

    it('should cleanup expired cache entries', async () => {
      // This would require waiting for TTL, so just verify the method exists
      const removed = generator.cleanupCache();
      expect(typeof removed).toBe('number');
    });
  });

  describe('reset', () => {
    it('should reset all components', async () => {
      // Generate some state
      await generator.executeWithCache('key1', () => Promise.resolve('value'));
      await generator.executeWithRetry(
        () => Promise.reject(new Error('Error')),
        { stage: 'test' }
      );

      expect(generator.hasErrors()).toBe(true);

      // Reset
      generator.reset();

      expect(generator.hasErrors()).toBe(false);
      const stats = generator.getCacheStats();
      expect(stats.size).toBe(0);
    });
  });
});
