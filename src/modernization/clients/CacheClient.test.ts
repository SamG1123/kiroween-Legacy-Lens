import { CacheClient, getCacheClient } from './CacheClient';
import { createClient } from 'redis';

// Mock redis
jest.mock('redis', () => ({
  createClient: jest.fn(),
}));

describe('CacheClient', () => {
  let cacheClient: CacheClient;
  let mockRedisClient: any;

  beforeEach(() => {
    mockRedisClient = {
      connect: jest.fn().mockResolvedValue(undefined),
      quit: jest.fn().mockResolvedValue(undefined),
      get: jest.fn(),
      set: jest.fn(),
      setEx: jest.fn(),
      del: jest.fn(),
      exists: jest.fn(),
      mGet: jest.fn(),
      mSet: jest.fn(),
      multi: jest.fn(),
      dbSize: jest.fn(),
      info: jest.fn(),
      scanIterator: jest.fn(),
      on: jest.fn(),
    };

    (createClient as jest.Mock).mockReturnValue(mockRedisClient);
    cacheClient = new CacheClient();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('connect', () => {
    it('should connect to Redis', async () => {
      await cacheClient.connect();

      expect(mockRedisClient.connect).toHaveBeenCalled();
      expect(cacheClient.isConnected()).toBe(true);
    });

    it('should not reconnect if already connected', async () => {
      await cacheClient.connect();
      await cacheClient.connect();

      expect(mockRedisClient.connect).toHaveBeenCalledTimes(1);
    });
  });

  describe('disconnect', () => {
    it('should disconnect from Redis', async () => {
      await cacheClient.connect();
      await cacheClient.disconnect();

      expect(mockRedisClient.quit).toHaveBeenCalled();
      expect(cacheClient.isConnected()).toBe(false);
    });
  });

  describe('get and set', () => {
    beforeEach(async () => {
      await cacheClient.connect();
    });

    it('should get a value from cache', async () => {
      const testData = { foo: 'bar' };
      mockRedisClient.get.mockResolvedValue(JSON.stringify(testData));

      const result = await cacheClient.get('test-key');

      expect(result).toEqual(testData);
      expect(mockRedisClient.get).toHaveBeenCalledWith('test-key');
    });

    it('should return null if key does not exist', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const result = await cacheClient.get('non-existent-key');

      expect(result).toBeNull();
    });

    it('should set a value in cache without TTL', async () => {
      const testData = { foo: 'bar' };

      await cacheClient.set('test-key', testData);

      expect(mockRedisClient.set).toHaveBeenCalledWith('test-key', JSON.stringify(testData));
    });

    it('should set a value in cache with TTL', async () => {
      const testData = { foo: 'bar' };
      const ttl = 3600;

      await cacheClient.set('test-key', testData, ttl);

      expect(mockRedisClient.setEx).toHaveBeenCalledWith('test-key', ttl, JSON.stringify(testData));
    });
  });

  describe('mget', () => {
    beforeEach(async () => {
      await cacheClient.connect();
    });

    it('should get multiple values from cache', async () => {
      const data1 = { foo: 'bar' };
      const data2 = { baz: 'qux' };
      
      mockRedisClient.mGet.mockResolvedValue([
        JSON.stringify(data1),
        JSON.stringify(data2),
        null,
      ]);

      const result = await cacheClient.mget(['key1', 'key2', 'key3']);

      expect(result.size).toBe(2);
      expect(result.get('key1')).toEqual(data1);
      expect(result.get('key2')).toEqual(data2);
      expect(result.has('key3')).toBe(false);
    });

    it('should return empty map if not connected', async () => {
      await cacheClient.disconnect();

      const result = await cacheClient.mget(['key1', 'key2']);

      expect(result.size).toBe(0);
    });
  });

  describe('mset', () => {
    beforeEach(async () => {
      await cacheClient.connect();
    });

    it('should set multiple values without TTL', async () => {
      const entries = [
        { key: 'key1', value: { foo: 'bar' } },
        { key: 'key2', value: { baz: 'qux' } },
      ];

      await cacheClient.mset(entries);

      expect(mockRedisClient.mSet).toHaveBeenCalledWith([
        ['key1', JSON.stringify({ foo: 'bar' })],
        ['key2', JSON.stringify({ baz: 'qux' })],
      ]);
    });

    it('should set multiple values with TTL', async () => {
      const mockPipeline = {
        setEx: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      };
      mockRedisClient.multi.mockReturnValue(mockPipeline);

      const entries = [
        { key: 'key1', value: { foo: 'bar' }, ttl: 3600 },
        { key: 'key2', value: { baz: 'qux' }, ttl: 3600 },
      ];

      await cacheClient.mset(entries);

      expect(mockPipeline.setEx).toHaveBeenCalledTimes(2);
      expect(mockPipeline.exec).toHaveBeenCalled();
    });
  });

  describe('deleteBatch', () => {
    beforeEach(async () => {
      await cacheClient.connect();
    });

    it('should delete multiple keys', async () => {
      const keys = ['key1', 'key2', 'key3'];

      await cacheClient.deleteBatch(keys);

      expect(mockRedisClient.del).toHaveBeenCalledWith(keys);
    });
  });

  describe('getKeysByPattern', () => {
    beforeEach(async () => {
      await cacheClient.connect();
    });

    it('should return keys matching pattern', async () => {
      const mockIterator = {
        [Symbol.asyncIterator]: async function* () {
          yield 'test:key1';
          yield 'test:key2';
        },
      };

      mockRedisClient.scanIterator.mockReturnValue(mockIterator);

      const keys = await cacheClient.getKeysByPattern('test:*');

      expect(keys).toEqual(['test:key1', 'test:key2']);
    });
  });

  describe('invalidatePattern', () => {
    beforeEach(async () => {
      await cacheClient.connect();
    });

    it('should invalidate keys matching pattern', async () => {
      const mockIterator = {
        [Symbol.asyncIterator]: async function* () {
          yield 'test:key1';
          yield 'test:key2';
        },
      };

      mockRedisClient.scanIterator.mockReturnValue(mockIterator);

      const count = await cacheClient.invalidatePattern('test:*');

      expect(count).toBe(2);
      expect(mockRedisClient.del).toHaveBeenCalledWith(['test:key1', 'test:key2']);
    });
  });

  describe('getStats', () => {
    beforeEach(async () => {
      await cacheClient.connect();
    });

    it('should return cache statistics', async () => {
      mockRedisClient.dbSize.mockResolvedValue(100);
      mockRedisClient.info.mockResolvedValue('used_memory_human:10.5M\nother_info:value');

      const stats = await cacheClient.getStats();

      expect(stats.keys).toBe(100);
      expect(stats.memory).toBe('10.5M');
    });
  });

  describe('getCacheClient', () => {
    it('should return singleton instance', () => {
      const instance1 = getCacheClient();
      const instance2 = getCacheClient();

      expect(instance1).toBe(instance2);
    });
  });
});
