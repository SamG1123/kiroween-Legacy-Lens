import { withRetry, tryWithRetry, batchWithRetry } from './RetryHandler';

describe('RetryHandler', () => {
  describe('withRetry', () => {
    it('should return result on first success', async () => {
      const fn = jest.fn().mockResolvedValue('success');
      const result = await withRetry(fn);
      
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new Error('ETIMEDOUT'))
        .mockRejectedValueOnce(new Error('ETIMEDOUT'))
        .mockResolvedValue('success');

      const result = await withRetry(fn, { maxRetries: 3, initialDelayMs: 10 });
      
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should throw after max retries', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('ETIMEDOUT'));

      await expect(
        withRetry(fn, { maxRetries: 2, initialDelayMs: 10 })
      ).rejects.toThrow('ETIMEDOUT');
      
      expect(fn).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should not retry non-retryable errors', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('Invalid input'));

      await expect(
        withRetry(fn, { maxRetries: 3, initialDelayMs: 10 })
      ).rejects.toThrow('Invalid input');
      
      expect(fn).toHaveBeenCalledTimes(1); // No retries
    });

    it('should call onRetry callback', async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new Error('ETIMEDOUT'))
        .mockResolvedValue('success');
      
      const onRetry = jest.fn();

      await withRetry(fn, { maxRetries: 2, initialDelayMs: 10, onRetry });
      
      expect(onRetry).toHaveBeenCalledTimes(1);
      expect(onRetry).toHaveBeenCalledWith(expect.any(Error), 1);
    });
  });

  describe('tryWithRetry', () => {
    it('should return success result', async () => {
      const fn = jest.fn().mockResolvedValue('data');
      const result = await tryWithRetry(fn);
      
      expect(result.success).toBe(true);
      expect(result.data).toBe('data');
      expect(result.error).toBeUndefined();
    });

    it('should return error result on failure', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('Failed'));
      const result = await tryWithRetry(fn, { maxRetries: 1, initialDelayMs: 10 });
      
      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.data).toBeUndefined();
    });
  });

  describe('batchWithRetry', () => {
    it('should handle multiple operations', async () => {
      const ops = [
        jest.fn().mockResolvedValue('result1'),
        jest.fn().mockResolvedValue('result2'),
        jest.fn().mockRejectedValue(new Error('Failed')),
      ];

      const results = await batchWithRetry(ops, { maxRetries: 1, initialDelayMs: 10 });
      
      expect(results).toHaveLength(3);
      expect(results[0].success).toBe(true);
      expect(results[0].data).toBe('result1');
      expect(results[1].success).toBe(true);
      expect(results[1].data).toBe('result2');
      expect(results[2].success).toBe(false);
    });
  });
});
