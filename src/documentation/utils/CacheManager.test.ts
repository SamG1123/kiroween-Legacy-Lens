import { CacheManager } from './CacheManager';

describe('CacheManager', () => {
  let cache: CacheManager<string>;

  beforeEach(() => {
    cache = new CacheManager<string>({
      ttl: 1000, // 1 second for testing
      maxSize: 3
    });
  });

  describe('basic operations', () => {
    it('should store and retrieve values', () => {
      cache.set('key1', 'value1');
      const result = cache.get('key1');

      expect(result).toBe('value1');
    });

    it('should return null for non-existent keys', () => {
      const result = cache.get('nonexistent');
      expect(result).toBeNull();
    });

    it('should check if key exists', () => {
      cache.set('key1', 'value1');

      expect(cache.has('key1')).toBe(true);
      expect(cache.has('key2')).toBe(false);
    });

    it('should invalidate specific keys', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      expect(cache.invalidate('key1')).toBe(true);
      expect(cache.has('key1')).toBe(false);
      expect(cache.has('key2')).toBe(true);
    });

    it('should clear all entries', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      cache.clear();

      expect(cache.has('key1')).toBe(false);
      expect(cache.has('key2')).toBe(false);
    });
  });

  describe('content hashing', () => {
    it('should validate content hash when provided', () => {
      const content = 'test content';
      cache.set('key1', 'value1', content);

      // Same content should retrieve value
      const result1 = cache.get('key1', cache['computeHash'](content));
      expect(result1).toBe('value1');

      // Different content should return null
      const result2 = cache.get('key1', cache['computeHash']('different content'));
      expect(result2).toBeNull();
    });

    it('should invalidate entry when content hash does not match', () => {
      const content = 'test content';
      cache.set('key1', 'value1', content);

      // Try to get with wrong hash
      cache.get('key1', 'wrong-hash');

      // Entry should be removed
      expect(cache.has('key1')).toBe(false);
    });
  });

  describe('TTL and expiration', () => {
    it('should expire entries after TTL', async () => {
      cache.set('key1', 'value1');

      // Should exist immediately
      expect(cache.get('key1')).toBe('value1');

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Should be expired
      expect(cache.get('key1')).toBeNull();
    });

    it('should cleanup expired entries', async () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      await new Promise(resolve => setTimeout(resolve, 1100));

      const removed = cache.cleanup();
      expect(removed).toBe(2);
    });
  });

  describe('LRU eviction', () => {
    it('should evict least recently used entry when max size reached', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');

      // Cache is now full (maxSize = 3)
      // Adding a new entry should evict key1 (least recently used)
      cache.set('key4', 'value4');

      expect(cache.has('key1')).toBe(false);
      expect(cache.has('key2')).toBe(true);
      expect(cache.has('key3')).toBe(true);
      expect(cache.has('key4')).toBe(true);
    });

    it('should update access order on get', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');

      // Access key1 to make it most recently used
      cache.get('key1');

      // Add new entry, should evict key2 (now least recently used)
      cache.set('key4', 'value4');

      expect(cache.has('key1')).toBe(true);
      expect(cache.has('key2')).toBe(false);
      expect(cache.has('key3')).toBe(true);
      expect(cache.has('key4')).toBe(true);
    });
  });

  describe('getOrCompute', () => {
    it('should compute value if not in cache', async () => {
      const compute = jest.fn().mockResolvedValue('computed');

      const result = await cache.getOrCompute('key1', compute);

      expect(result).toBe('computed');
      expect(compute).toHaveBeenCalledTimes(1);
    });

    it('should return cached value without computing', async () => {
      const compute = jest.fn().mockResolvedValue('computed');

      cache.set('key1', 'cached');
      const result = await cache.getOrCompute('key1', compute);

      expect(result).toBe('cached');
      expect(compute).not.toHaveBeenCalled();
    });

    it('should recompute if content hash changes', async () => {
      const compute = jest.fn()
        .mockResolvedValueOnce('computed1')
        .mockResolvedValueOnce('computed2');

      await cache.getOrCompute('key1', compute, 'content1');
      const result = await cache.getOrCompute('key1', compute, 'content2');

      expect(result).toBe('computed2');
      expect(compute).toHaveBeenCalledTimes(2);
    });
  });

  describe('pattern invalidation', () => {
    it('should invalidate entries matching pattern', () => {
      cache.set('file:test1.ts', 'value1');
      cache.set('file:test2.ts', 'value2');
      cache.set('api:endpoint1', 'value3');

      const count = cache.invalidatePattern(/^file:/);

      expect(count).toBe(2);
      expect(cache.has('file:test1.ts')).toBe(false);
      expect(cache.has('file:test2.ts')).toBe(false);
      expect(cache.has('api:endpoint1')).toBe(true);
    });
  });

  describe('statistics', () => {
    it('should provide cache statistics', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      const stats = cache.getStats();

      expect(stats.size).toBe(2);
      expect(stats.maxSize).toBe(3);
      expect(stats.oldestEntry).toBeInstanceOf(Date);
    });

    it('should track oldest entry correctly', () => {
      const now = Date.now();
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      const stats = cache.getStats();
      const oldestTime = stats.oldestEntry?.getTime() || 0;

      expect(oldestTime).toBeGreaterThanOrEqual(now);
    });
  });
});
