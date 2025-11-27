import { getCacheClient } from '../clients/CacheClient';
import { Dependency, DependencyAnalysis } from '../types';

/**
 * Manages incremental analysis by tracking dependency changes
 * and caching analysis results
 */
export class IncrementalAnalysisManager {
  private cache = getCacheClient();
  private readonly CACHE_PREFIX = 'incremental:analysis:';
  private readonly HASH_PREFIX = 'incremental:hash:';

  /**
   * Generate a hash for a set of dependencies
   * Used to detect if dependencies have changed
   */
  private generateDependencyHash(dependencies: Dependency[]): string {
    // Sort dependencies by name for consistent hashing
    const sorted = [...dependencies].sort((a, b) => a.name.localeCompare(b.name));
    
    // Create a string representation
    const depString = sorted
      .map(dep => `${dep.name}@${dep.version}:${dep.ecosystem}`)
      .join('|');
    
    // Simple hash function (in production, use a proper hash like SHA-256)
    let hash = 0;
    for (let i = 0; i < depString.length; i++) {
      const char = depString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return hash.toString(36);
  }

  /**
   * Get cached analysis results for a project
   */
  async getCachedAnalysis(projectId: string): Promise<DependencyAnalysis[] | null> {
    const cacheKey = `${this.CACHE_PREFIX}${projectId}`;
    return await this.cache.get<DependencyAnalysis[]>(cacheKey);
  }

  /**
   * Save analysis results to cache
   */
  async saveAnalysis(
    projectId: string,
    dependencies: Dependency[],
    analyses: DependencyAnalysis[],
    ttlSeconds: number = 86400 // 24 hours default
  ): Promise<void> {
    const cacheKey = `${this.CACHE_PREFIX}${projectId}`;
    const hashKey = `${this.HASH_PREFIX}${projectId}`;
    const hash = this.generateDependencyHash(dependencies);

    // Save both the analysis and the hash
    await this.cache.mset([
      { key: cacheKey, value: analyses, ttl: ttlSeconds },
      { key: hashKey, value: hash, ttl: ttlSeconds },
    ]);
  }

  /**
   * Check if dependencies have changed since last analysis
   */
  async haveDependenciesChanged(
    projectId: string,
    currentDependencies: Dependency[]
  ): Promise<boolean> {
    const hashKey = `${this.HASH_PREFIX}${projectId}`;
    const cachedHash = await this.cache.get<string>(hashKey);
    
    if (!cachedHash) {
      return true; // No cached hash means first analysis
    }

    const currentHash = this.generateDependencyHash(currentDependencies);
    return cachedHash !== currentHash;
  }

  /**
   * Get changed dependencies by comparing with cached analysis
   */
  async getChangedDependencies(
    projectId: string,
    currentDependencies: Dependency[]
  ): Promise<{
    added: Dependency[];
    removed: string[];
    updated: Dependency[];
    unchanged: Dependency[];
  }> {
    const cachedAnalyses = await this.getCachedAnalysis(projectId);
    
    if (!cachedAnalyses) {
      // No cache, all dependencies are new
      return {
        added: currentDependencies,
        removed: [],
        updated: [],
        unchanged: [],
      };
    }

    // Create maps for efficient lookup
    const cachedMap = new Map<string, DependencyAnalysis>();
    for (const analysis of cachedAnalyses) {
      cachedMap.set(analysis.dependency.name, analysis);
    }

    const currentMap = new Map<string, Dependency>();
    for (const dep of currentDependencies) {
      currentMap.set(dep.name, dep);
    }

    // Categorize dependencies
    const added: Dependency[] = [];
    const updated: Dependency[] = [];
    const unchanged: Dependency[] = [];

    for (const dep of currentDependencies) {
      const cached = cachedMap.get(dep.name);
      
      if (!cached) {
        added.push(dep);
      } else if (cached.dependency.version !== dep.version) {
        updated.push(dep);
      } else {
        unchanged.push(dep);
      }
    }

    // Find removed dependencies
    const removed: string[] = [];
    for (const [name] of cachedMap) {
      if (!currentMap.has(name)) {
        removed.push(name);
      }
    }

    return { added, removed, updated, unchanged };
  }

  /**
   * Invalidate cached analysis for a project
   */
  async invalidateAnalysis(projectId: string): Promise<void> {
    const cacheKey = `${this.CACHE_PREFIX}${projectId}`;
    const hashKey = `${this.HASH_PREFIX}${projectId}`;
    await this.cache.deleteBatch([cacheKey, hashKey]);
  }

  /**
   * Get analysis for unchanged dependencies from cache
   */
  async getUnchangedAnalyses(
    projectId: string,
    unchangedDependencies: Dependency[]
  ): Promise<DependencyAnalysis[]> {
    const cachedAnalyses = await this.getCachedAnalysis(projectId);
    
    if (!cachedAnalyses) {
      return [];
    }

    const unchangedNames = new Set(unchangedDependencies.map(d => d.name));
    return cachedAnalyses.filter(analysis => 
      unchangedNames.has(analysis.dependency.name)
    );
  }
}
