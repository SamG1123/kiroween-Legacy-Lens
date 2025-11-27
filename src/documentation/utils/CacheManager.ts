import * as crypto from 'crypto';
import { CacheEntry, CacheOptions } from '../types';

/**
 * CacheManager provides a caching layer for analysis results to avoid
 * redundant processing and improve performance on repeated documentation
 * generation.
 * 
 * Requirements: 7.5 - Caching analysis results to avoid redundant processing
 */
export class CacheManager<T> {
  private cache: Map<string, CacheEntry<T>>;
  private readonly ttl: number;
  private readonly maxSize: number;
  private accessOrder: string[]; // For LRU eviction

  constructor(options: CacheOptions = {}) {
    this.cache = new Map();
    this.ttl = options.ttl || 3600000; // Default 1 hour
    this.maxSize = options.maxSize || 1000; // Default 1000 entries
    this.accessOrder = [];
  }

  /**
   * Store a value in the cache with a key and content hash
   */
  set(key: string, value: T, content?: string): void {
    const hash = content ? this.computeHash(content) : this.computeHash(JSON.stringify(value));
    
    const entry: CacheEntry<T> = {
      data: value,
      timestamp: new Date(),
      hash
    };

    // If cache is at max size, evict least recently used
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    this.cache.set(key, entry);
    this.updateAccessOrder(key);
  }

  /**
   * Retrieve a value from the cache if it exists and is not expired
   */
  get(key: string, contentHash?: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if entry has expired
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.removeFromAccessOrder(key);
      return null;
    }

    // If content hash is provided, verify it matches
    if (contentHash && entry.hash !== contentHash) {
      this.cache.delete(key);
      this.removeFromAccessOrder(key);
      return null;
    }

    this.updateAccessOrder(key);
    return entry.data;
  }

  /**
   * Check if a key exists in the cache and is valid
   */
  has(key: string, contentHash?: string): boolean {
    return this.get(key, contentHash) !== null;
  }

  /**
   * Get a value from cache or compute it if not present
   */
  async getOrCompute(
    key: string,
    compute: () => Promise<T>,
    content?: string
  ): Promise<T> {
    const contentHash = content ? this.computeHash(content) : undefined;
    const cached = this.get(key, contentHash);

    if (cached !== null) {
      return cached;
    }

    const value = await compute();
    this.set(key, value, content);
    return value;
  }

  /**
   * Invalidate a specific cache entry
   */
  invalidate(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.removeFromAccessOrder(key);
    }
    return deleted;
  }

  /**
   * Invalidate all cache entries matching a pattern
   */
  invalidatePattern(pattern: RegExp): number {
    let count = 0;
    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        this.invalidate(key);
        count++;
      }
    }
    return count;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    oldestEntry: Date | null;
  } {
    let oldestTimestamp: Date | null = null;

    for (const entry of this.cache.values()) {
      if (!oldestTimestamp || entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
      }
    }

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: 0, // Would need to track hits/misses for accurate rate
      oldestEntry: oldestTimestamp
    };
  }

  /**
   * Remove expired entries from the cache
   */
  cleanup(): number {
    let removed = 0;
    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        this.cache.delete(key);
        this.removeFromAccessOrder(key);
        removed++;
      }
    }
    return removed;
  }

  /**
   * Compute SHA-256 hash of content
   */
  private computeHash(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Check if a cache entry has expired
   */
  private isExpired(entry: CacheEntry<T>): boolean {
    const now = Date.now();
    const entryTime = entry.timestamp.getTime();
    return (now - entryTime) > this.ttl;
  }

  /**
   * Evict the least recently used entry
   */
  private evictLRU(): void {
    if (this.accessOrder.length === 0) return;

    const lruKey = this.accessOrder[0];
    this.cache.delete(lruKey);
    this.accessOrder.shift();
  }

  /**
   * Update access order for LRU tracking
   */
  private updateAccessOrder(key: string): void {
    // Remove key from current position
    this.removeFromAccessOrder(key);
    // Add to end (most recently used)
    this.accessOrder.push(key);
  }

  /**
   * Remove key from access order tracking
   */
  private removeFromAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index !== -1) {
      this.accessOrder.splice(index, 1);
    }
  }
}
