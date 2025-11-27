// Retry Strategy Tests

import { RetryStrategy } from './RetryStrategy';

describe('RetryStrategy', () => {
  let retryStrategy: RetryStrategy;

  beforeEach(() => {
    retryStrategy = new RetryStrategy();
  });

  describe('executeWithRetry', () => {
    it('should succeed on first attempt', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      const result = await retryStrategy.executeWithRetry(operation);

      expect(result.success).toBe(true);
      expect(result.result).toBe('success');
      expect(result.attempts).toBe(1);
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValueOnce('success');

      const result = await retryStrategy.executeWithRetry(operation, {
        maxAttempts: 3,
        initialDelayMs: 10,
      });

      expect(result.success).toBe(true);
      expect(result.result).toBe('success');
      expect(result.attempts).toBe(2);
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should fail after max attempts', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Network timeout'));

      const result = await retryStrategy.executeWithRetry(operation, {
        maxAttempts: 3,
        initialDelayMs: 10,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.attempts).toBe(3);
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should not retry non-retryable errors', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Invalid configuration'));

      const result = await retryStrategy.executeWithRetry(operation, {
        maxAttempts: 3,
        initialDelayMs: 10,
      });

      expect(result.success).toBe(false);
      expect(result.attempts).toBe(1);
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry rate limit errors', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('Rate limit exceeded'))
        .mockResolvedValueOnce('success');

      const result = await retryStrategy.executeWithRetry(operation, {
        maxAttempts: 3,
        initialDelayMs: 10,
      });

      expect(result.success).toBe(true);
      expect(result.attempts).toBe(2);
    });

    it('should retry timeout errors', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('Request timeout'))
        .mockResolvedValueOnce('success');

      const result = await retryStrategy.executeWithRetry(operation, {
        maxAttempts: 3,
        initialDelayMs: 10,
      });

      expect(result.success).toBe(true);
      expect(result.attempts).toBe(2);
    });

    it('should use custom retryable errors', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('Custom retryable error'))
        .mockResolvedValueOnce('success');

      const result = await retryStrategy.executeWithRetry(operation, {
        maxAttempts: 3,
        initialDelayMs: 10,
        retryableErrors: ['custom retryable'],
      });

      expect(result.success).toBe(true);
      expect(result.attempts).toBe(2);
    });
  });

  describe('executeMultipleWithRetry', () => {
    it('should execute multiple operations successfully', async () => {
      const operations = [
        jest.fn().mockResolvedValue('result1'),
        jest.fn().mockResolvedValue('result2'),
        jest.fn().mockResolvedValue('result3'),
      ];

      const result = await retryStrategy.executeMultipleWithRetry(operations, {
        maxAttempts: 2,
        initialDelayMs: 10,
      });

      expect(result.successCount).toBe(3);
      expect(result.failureCount).toBe(0);
      expect(result.results).toEqual(['result1', 'result2', 'result3']);
    });

    it('should handle partial failures', async () => {
      const operations = [
        jest.fn().mockResolvedValue('result1'),
        jest.fn().mockRejectedValue(new Error('Failure')),
        jest.fn().mockResolvedValue('result3'),
      ];

      const result = await retryStrategy.executeMultipleWithRetry(operations, {
        maxAttempts: 2,
        initialDelayMs: 10,
      });

      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(1);
      expect(result.results).toEqual(['result1', 'result3']);
      expect(result.errors.length).toBe(1);
    });

    it('should retry failed operations', async () => {
      const operations = [
        jest.fn().mockResolvedValue('result1'),
        jest.fn()
          .mockRejectedValueOnce(new Error('Timeout'))
          .mockResolvedValueOnce('result2'),
      ];

      const result = await retryStrategy.executeMultipleWithRetry(operations, {
        maxAttempts: 3,
        initialDelayMs: 10,
      });

      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(0);
    });
  });
});
