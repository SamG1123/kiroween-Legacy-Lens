import { ErrorHandler } from './ErrorHandler';

describe('ErrorHandler', () => {
  let handler: ErrorHandler;

  beforeEach(() => {
    handler = new ErrorHandler(3, 10); // 3 retries, 10ms delay for fast tests
  });

  describe('executeWithIsolation', () => {
    it('should return success result when operation succeeds', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      const context = { filePath: 'test.ts', stage: 'parsing' };

      const result = await handler.executeWithIsolation(operation, context);

      expect(result.success).toBe(true);
      expect(result.data).toBe('success');
      expect(result.error).toBeUndefined();
      expect(handler.hasErrors()).toBe(false);
    });

    it('should return error result when operation fails', async () => {
      const error = new Error('Test error');
      const operation = jest.fn().mockRejectedValue(error);
      const context = { filePath: 'test.ts', stage: 'parsing' };

      const result = await handler.executeWithIsolation(operation, context);

      expect(result.success).toBe(false);
      expect(result.data).toBeUndefined();
      expect(result.error).toBeDefined();
      expect(result.error?.error.message).toBe('Test error');
      expect(handler.hasErrors()).toBe(true);
    });

    it('should record error details correctly', async () => {
      const error = new Error('Parse error');
      const operation = jest.fn().mockRejectedValue(error);
      const context = { filePath: 'file.ts', stage: 'parsing' };

      await handler.executeWithIsolation(operation, context);

      const errors = handler.getErrors();
      expect(errors.length).toBe(1);
      expect(errors[0].filePath).toBe('file.ts');
      expect(errors[0].stage).toBe('parsing');
      expect(errors[0].error.message).toBe('Parse error');
    });
  });

  describe('executeWithRetry', () => {
    it('should succeed on first attempt', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      const context = { stage: 'generation' };

      const result = await handler.executeWithRetry(operation, context);

      expect(result.success).toBe(true);
      expect(result.data).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValue('success');
      
      const context = { stage: 'generation' };

      const result = await handler.executeWithRetry(operation, context);

      expect(result.success).toBe(true);
      expect(result.data).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should fail after max retries', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Persistent error'));
      const context = { stage: 'generation' };

      const result = await handler.executeWithRetry(operation, context);

      expect(result.success).toBe(false);
      expect(result.error?.error.message).toBe('Persistent error');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should identify recoverable errors', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Rate limit exceeded'));
      const context = { stage: 'ai-generation' };

      const result = await handler.executeWithRetry(operation, context);

      expect(result.success).toBe(false);
      expect(result.error?.recoverable).toBe(true);
    });

    it('should identify non-recoverable errors', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Invalid syntax'));
      const context = { stage: 'parsing' };

      const result = await handler.executeWithRetry(operation, context);

      expect(result.success).toBe(false);
      expect(result.error?.recoverable).toBe(false);
    });
  });

  describe('executeAllWithIsolation', () => {
    it('should execute all operations and isolate failures', async () => {
      const operations = [
        {
          operation: jest.fn().mockResolvedValue('success1'),
          context: { filePath: 'file1.ts', stage: 'parsing' }
        },
        {
          operation: jest.fn().mockRejectedValue(new Error('error2')),
          context: { filePath: 'file2.ts', stage: 'parsing' }
        },
        {
          operation: jest.fn().mockResolvedValue('success3'),
          context: { filePath: 'file3.ts', stage: 'parsing' }
        }
      ];

      const results = await handler.executeAllWithIsolation(operations);

      expect(results.length).toBe(3);
      expect(results[0].success).toBe(true);
      expect(results[0].data).toBe('success1');
      expect(results[1].success).toBe(false);
      expect(results[2].success).toBe(true);
      expect(results[2].data).toBe('success3');
    });
  });

  describe('error tracking', () => {
    it('should get errors for specific file', async () => {
      await handler.executeWithIsolation(
        () => Promise.reject(new Error('Error 1')),
        { filePath: 'file1.ts', stage: 'parsing' }
      );
      await handler.executeWithIsolation(
        () => Promise.reject(new Error('Error 2')),
        { filePath: 'file2.ts', stage: 'parsing' }
      );
      await handler.executeWithIsolation(
        () => Promise.reject(new Error('Error 3')),
        { filePath: 'file1.ts', stage: 'generation' }
      );

      const file1Errors = handler.getErrorsForFile('file1.ts');
      expect(file1Errors.length).toBe(2);
    });

    it('should count errors by stage', async () => {
      await handler.executeWithIsolation(
        () => Promise.reject(new Error('Error 1')),
        { stage: 'parsing' }
      );
      await handler.executeWithIsolation(
        () => Promise.reject(new Error('Error 2')),
        { stage: 'parsing' }
      );
      await handler.executeWithIsolation(
        () => Promise.reject(new Error('Error 3')),
        { stage: 'generation' }
      );

      const counts = handler.getErrorCountByStage();
      expect(counts['parsing']).toBe(2);
      expect(counts['generation']).toBe(1);
    });

    it('should generate error summary', async () => {
      await handler.executeWithIsolation(
        () => Promise.reject(new Error('Error 1')),
        { stage: 'parsing' }
      );
      await handler.executeWithIsolation(
        () => Promise.reject(new Error('Error 2')),
        { stage: 'generation' }
      );

      const summary = handler.getErrorSummary();
      expect(summary).toContain('2 error(s)');
      expect(summary).toContain('parsing');
      expect(summary).toContain('generation');
    });

    it('should clear errors', async () => {
      await handler.executeWithIsolation(
        () => Promise.reject(new Error('Error')),
        { stage: 'parsing' }
      );

      expect(handler.hasErrors()).toBe(true);
      handler.clearErrors();
      expect(handler.hasErrors()).toBe(false);
    });
  });
});
