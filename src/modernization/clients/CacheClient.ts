import { createClient, RedisClientType } from 'redis';
import { getAPIConfig } from '../config';

export class CacheClient {
  private client: RedisClientType | null = null;
  private connected: boolean = false;

  async connect(): Promise<void> {
    if (this.connected) {
      return;
    }

    const config = getAPIConfig();
    const redisConfig = config.cache.redis;

    this.client = createClient({
      socket: {
        host: redisConfig.host,
        port: redisConfig.port,
      },
      password: redisConfig.password,
      database: redisConfig.db,
    });

    this.client.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    await this.client.connect();
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    if (this.client && this.connected) {
      await this.client.quit();
      this.connected = false;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.client || !this.connected) {
      return null;
    }

    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`Error getting cache key ${key}:`, error);
      return null;
    }
  }

  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    if (!this.client || !this.connected) {
      return;
    }

    try {
      const serialized = JSON.stringify(value);
      if (ttlSeconds) {
        await this.client.setEx(key, ttlSeconds, serialized);
      } else {
        await this.client.set(key, serialized);
      }
    } catch (error) {
      console.error(`Error setting cache key ${key}:`, error);
    }
  }

  async delete(key: string): Promise<void> {
    if (!this.client || !this.connected) {
      return;
    }

    try {
      await this.client.del(key);
    } catch (error) {
      console.error(`Error deleting cache key ${key}:`, error);
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!this.client || !this.connected) {
      return false;
    }

    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      console.error(`Error checking cache key ${key}:`, error);
      return false;
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Get multiple keys at once
   * More efficient than multiple individual get calls
   */
  async mget<T>(keys: string[]): Promise<Map<string, T>> {
    if (!this.client || !this.connected || keys.length === 0) {
      return new Map();
    }

    try {
      const values = await this.client.mGet(keys);
      const results = new Map<string, T>();

      for (let i = 0; i < keys.length; i++) {
        const value = values[i];
        if (value) {
          try {
            results.set(keys[i], JSON.parse(value));
          } catch (error) {
            console.error(`Error parsing cached value for key ${keys[i]}:`, error);
          }
        }
      }

      return results;
    } catch (error) {
      console.error('Error getting multiple cache keys:', error);
      return new Map();
    }
  }

  /**
   * Set multiple key-value pairs at once
   * More efficient than multiple individual set calls
   */
  async mset(entries: Array<{ key: string; value: any; ttl?: number }>): Promise<void> {
    if (!this.client || !this.connected || entries.length === 0) {
      return;
    }

    try {
      // Group entries by TTL for efficient batch operations
      const noTtlEntries: Array<[string, string]> = [];
      const ttlGroups = new Map<number, Array<{ key: string; value: string }>>();

      for (const entry of entries) {
        const serialized = JSON.stringify(entry.value);
        
        if (entry.ttl) {
          if (!ttlGroups.has(entry.ttl)) {
            ttlGroups.set(entry.ttl, []);
          }
          ttlGroups.get(entry.ttl)!.push({ key: entry.key, value: serialized });
        } else {
          noTtlEntries.push([entry.key, serialized]);
        }
      }

      // Set entries without TTL
      if (noTtlEntries.length > 0) {
        await this.client.mSet(noTtlEntries);
      }

      // Set entries with TTL (must be done individually or in pipeline)
      const pipeline = this.client.multi();
      for (const [ttl, items] of ttlGroups.entries()) {
        for (const item of items) {
          pipeline.setEx(item.key, ttl, item.value);
        }
      }
      
      if (ttlGroups.size > 0) {
        await pipeline.exec();
      }
    } catch (error) {
      console.error('Error setting multiple cache keys:', error);
    }
  }

  /**
   * Delete multiple keys at once
   */
  async deleteBatch(keys: string[]): Promise<void> {
    if (!this.client || !this.connected || keys.length === 0) {
      return;
    }

    try {
      await this.client.del(keys);
    } catch (error) {
      console.error('Error deleting multiple cache keys:', error);
    }
  }

  /**
   * Get keys matching a pattern
   * Useful for cache invalidation
   */
  async getKeysByPattern(pattern: string): Promise<string[]> {
    if (!this.client || !this.connected) {
      return [];
    }

    try {
      const keys: string[] = [];
      for await (const key of this.client.scanIterator({ MATCH: pattern, COUNT: 100 })) {
        keys.push(key);
      }
      return keys;
    } catch (error) {
      console.error(`Error scanning keys with pattern ${pattern}:`, error);
      return [];
    }
  }

  /**
   * Invalidate cache entries matching a pattern
   * Useful for clearing related cache entries
   */
  async invalidatePattern(pattern: string): Promise<number> {
    const keys = await this.getKeysByPattern(pattern);
    if (keys.length > 0) {
      await this.deleteBatch(keys);
    }
    return keys.length;
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{ keys: number; memory: string }> {
    if (!this.client || !this.connected) {
      return { keys: 0, memory: '0' };
    }

    try {
      const dbSize = await this.client.dbSize();
      const info = await this.client.info('memory');
      
      // Parse memory usage from info string
      const memoryMatch = info.match(/used_memory_human:([^\r\n]+)/);
      const memory = memoryMatch ? memoryMatch[1] : '0';

      return { keys: dbSize, memory };
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return { keys: 0, memory: '0' };
    }
  }
}

// Singleton instance
let cacheClientInstance: CacheClient | null = null;

export function getCacheClient(): CacheClient {
  if (!cacheClientInstance) {
    cacheClientInstance = new CacheClient();
  }
  return cacheClientInstance;
}
