# Caching and Performance Optimizations

This document describes the caching and performance optimization features implemented in the Modernization Advisor.

## Overview

The Modernization Advisor includes several performance optimizations:

1. **Redis Caching** - Caches package metadata and security data
2. **Parallel API Calls** - Processes multiple dependencies concurrently
3. **Batch Request Support** - Fetches multiple packages in a single operation
4. **Incremental Analysis** - Only re-analyzes changed dependencies
5. **Performance Monitoring** - Tracks and reports performance metrics

## Redis Caching

### Cache Client

The `CacheClient` provides a Redis-based caching layer with the following features:

- **Basic Operations**: get, set, delete, exists
- **Batch Operations**: mget, mset, deleteBatch
- **Pattern Operations**: getKeysByPattern, invalidatePattern
- **Statistics**: getStats

### Cache TTL Configuration

Cache TTLs are configured in `src/modernization/config/api-config.ts`:

```typescript
cache: {
  ttl: {
    packageMetadata: 24 * 60 * 60,    // 24 hours
    securityData: 6 * 60 * 60,        // 6 hours
    migrationGuides: 7 * 24 * 60 * 60 // 7 days
  }
}
```

### Usage Example

```typescript
import { getCacheClient } from './clients/CacheClient';

const cache = getCacheClient();
await cache.connect();

// Single operations
await cache.set('key', { data: 'value' }, 3600);
const value = await cache.get('key');

// Batch operations
const entries = [
  { key: 'key1', value: { data: 'value1' }, ttl: 3600 },
  { key: 'key2', value: { data: 'value2' }, ttl: 3600 }
];
await cache.mset(entries);

const results = await cache.mget(['key1', 'key2']);

// Pattern operations
const keys = await cache.getKeysByPattern('npm:*');
await cache.invalidatePattern('npm:*');

// Statistics
const stats = await cache.getStats();
console.log(`Cache has ${stats.keys} keys using ${stats.memory}`);
```

## Parallel API Calls

### DependencyAnalyzer

The `DependencyAnalyzer` now processes dependencies in parallel using `Promise.all`:

```typescript
import { DependencyAnalyzer } from './analyzers/DependencyAnalyzer';

const analyzer = new DependencyAnalyzer();

const dependencies = [
  { name: 'react', version: '17.0.0', ecosystem: 'npm', type: 'production' },
  { name: 'vue', version: '2.6.0', ecosystem: 'npm', type: 'production' },
  { name: 'angular', version: '11.0.0', ecosystem: 'npm', type: 'production' }
];

// All dependencies are analyzed in parallel
const analyses = await analyzer.analyzeDependencies(dependencies);
```

### FrameworkAnalyzer

Similarly, the `FrameworkAnalyzer` processes frameworks in parallel:

```typescript
import { FrameworkAnalyzer } from './analyzers/FrameworkAnalyzer';

const analyzer = new FrameworkAnalyzer();

const frameworks = [
  { name: 'react', version: '17.0.0', type: 'frontend' },
  { name: 'express', version: '4.17.0', type: 'backend' }
];

// All frameworks are analyzed in parallel
const analyses = await analyzer.analyzeFrameworks(frameworks);
```

## Batch Request Support

### NPM Registry Client

```typescript
import { NpmRegistryClient } from './clients/NpmRegistryClient';

const client = new NpmRegistryClient();

// Batch fetch package information
const packages = ['react', 'vue', 'angular'];
const packageInfos = await client.getPackageInfoBatch(packages);

// Batch fetch latest versions
const versions = await client.getLatestVersionBatch(packages);
```

### PyPI Client

```typescript
import { PyPIClient } from './clients/PyPIClient';

const client = new PyPIClient();

const packages = ['django', 'flask', 'fastapi'];
const packageInfos = await client.getPackageInfoBatch(packages);
const versions = await client.getLatestVersionBatch(packages);
```

### Maven Client

```typescript
import { MavenClient } from './clients/MavenClient';

const client = new MavenClient();

const artifacts = [
  { groupId: 'org.springframework.boot', artifactId: 'spring-boot-starter' },
  { groupId: 'junit', artifactId: 'junit' }
];

const artifactInfos = await client.searchArtifactBatch(artifacts);
const versions = await client.getLatestVersionBatch(artifacts);
```

### Security Database Client

```typescript
import { SecurityDatabaseClient } from './clients/SecurityDatabaseClient';

const client = new SecurityDatabaseClient();

const packages = [
  { name: 'react', version: '17.0.0', ecosystem: 'npm' as const },
  { name: 'vue', version: '2.6.0', ecosystem: 'npm' as const }
];

const vulnerabilities = await client.checkVulnerabilitiesBatch(packages);
```

## Incremental Analysis

### IncrementalAnalysisManager

The `IncrementalAnalysisManager` tracks dependency changes and only re-analyzes what's changed:

```typescript
import { DependencyAnalyzer } from './analyzers/DependencyAnalyzer';

const analyzer = new DependencyAnalyzer();
const projectId = 'my-project';

const dependencies = [
  { name: 'react', version: '18.0.0', ecosystem: 'npm', type: 'production' },
  { name: 'vue', version: '3.0.0', ecosystem: 'npm', type: 'production' }
];

// First analysis - analyzes all dependencies
const analyses1 = await analyzer.analyzeDependenciesWithCache(projectId, dependencies);

// Second analysis with same dependencies - uses cache
const analyses2 = await analyzer.analyzeDependenciesWithCache(projectId, dependencies);

// Third analysis with updated dependencies - only analyzes changed ones
const updatedDependencies = [
  { name: 'react', version: '18.2.0', ecosystem: 'npm', type: 'production' }, // Changed
  { name: 'vue', version: '3.0.0', ecosystem: 'npm', type: 'production' },    // Unchanged
  { name: 'svelte', version: '3.0.0', ecosystem: 'npm', type: 'production' }  // New
];

const analyses3 = await analyzer.analyzeDependenciesWithCache(projectId, updatedDependencies);
// Only analyzes 'react' (updated) and 'svelte' (new)
// Reuses cached analysis for 'vue' (unchanged)
```

### Manual Incremental Analysis

You can also manually control incremental analysis:

```typescript
import { IncrementalAnalysisManager } from './utils/IncrementalAnalysisManager';

const manager = new IncrementalAnalysisManager();
const projectId = 'my-project';

// Check if dependencies have changed
const hasChanged = await manager.haveDependenciesChanged(projectId, dependencies);

if (hasChanged) {
  // Get detailed change information
  const changes = await manager.getChangedDependencies(projectId, dependencies);
  
  console.log(`Added: ${changes.added.length}`);
  console.log(`Updated: ${changes.updated.length}`);
  console.log(`Unchanged: ${changes.unchanged.length}`);
  console.log(`Removed: ${changes.removed.length}`);
  
  // Analyze only changed dependencies
  const toAnalyze = [...changes.added, ...changes.updated];
  const newAnalyses = await analyzer.analyzeDependencies(toAnalyze);
  
  // Get cached analyses for unchanged dependencies
  const unchangedAnalyses = await manager.getUnchangedAnalyses(projectId, changes.unchanged);
  
  // Combine results
  const allAnalyses = [...unchangedAnalyses, ...newAnalyses];
  
  // Save to cache
  await manager.saveAnalysis(projectId, dependencies, allAnalyses);
}
```

## Performance Monitoring

### PerformanceMonitor

Track and measure operation performance:

```typescript
import { getPerformanceMonitor } from './utils/PerformanceMonitor';

const monitor = getPerformanceMonitor();

// Manual timing
monitor.start('dependency-analysis');
await analyzer.analyzeDependencies(dependencies);
const duration = monitor.end('dependency-analysis');
console.log(`Analysis took ${duration}ms`);

// Automatic timing with measure
const result = await monitor.measure('security-check', async () => {
  return await securityClient.checkVulnerabilities(name, version, ecosystem);
});

// Get statistics
const stats = monitor.getStats('dependency-analysis');
console.log(`Average: ${stats.average}ms`);
console.log(`Min: ${stats.min}ms`);
console.log(`Max: ${stats.max}ms`);

// Get all statistics
const allStats = monitor.getAllStats();

// Log summary
monitor.logSummary();

// Clear metrics
monitor.clear();
```

### Example Output

```
=== Performance Summary ===

dependency-analysis:
  Count: 10
  Total: 5234ms
  Average: 523.40ms
  Min: 412ms
  Max: 789ms

security-check:
  Count: 25
  Total: 3421ms
  Average: 136.84ms
  Min: 98ms
  Max: 234ms

========================
```

## Performance Best Practices

### 1. Use Incremental Analysis for Repeated Analyses

```typescript
// Good - uses incremental analysis
const analyses = await analyzer.analyzeDependenciesWithCache(projectId, dependencies);

// Less efficient - always analyzes everything
const analyses = await analyzer.analyzeDependencies(dependencies);
```

### 2. Batch Operations When Possible

```typescript
// Good - single batch request
const versions = await npmClient.getLatestVersionBatch(['react', 'vue', 'angular']);

// Less efficient - multiple individual requests
const reactVersion = await npmClient.getLatestVersion('react');
const vueVersion = await npmClient.getLatestVersion('vue');
const angularVersion = await npmClient.getLatestVersion('angular');
```

### 3. Connect to Redis Once

```typescript
// Good - connect once at startup
const cache = getCacheClient();
await cache.connect();

// Use cache throughout application lifecycle

// Disconnect on shutdown
await cache.disconnect();
```

### 4. Monitor Performance in Production

```typescript
const monitor = getPerformanceMonitor();

// Measure critical operations
const analyses = await monitor.measure('full-analysis', async () => {
  return await analyzer.analyzeDependenciesWithCache(projectId, dependencies);
});

// Periodically log performance metrics
setInterval(() => {
  monitor.logSummary();
}, 60000); // Every minute
```

### 5. Invalidate Cache When Needed

```typescript
// Invalidate specific project cache
await manager.invalidateAnalysis(projectId);

// Invalidate all npm package cache
await cache.invalidatePattern('npm:*');

// Invalidate all security data
await cache.invalidatePattern('security:*');
```

## Configuration

### Environment Variables

Configure Redis and caching behavior via environment variables:

```bash
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-password
REDIS_DB=0

# API Timeouts (milliseconds)
NPM_TIMEOUT=10000
PYPI_TIMEOUT=10000
MAVEN_TIMEOUT=10000
SECURITY_TIMEOUT=15000
```

### Programmatic Configuration

```typescript
import { getAPIConfig } from './config/api-config';

const config = getAPIConfig();

// Adjust cache TTLs
config.cache.ttl.packageMetadata = 12 * 60 * 60; // 12 hours
config.cache.ttl.securityData = 3 * 60 * 60;     // 3 hours
```

## Troubleshooting

### Redis Connection Issues

If Redis is not available, the cache client will gracefully degrade:

```typescript
const cache = getCacheClient();

try {
  await cache.connect();
} catch (error) {
  console.error('Redis connection failed:', error);
  // Application continues without caching
}

// Cache operations return null/empty when not connected
const value = await cache.get('key'); // Returns null if not connected
```

### Performance Degradation

If you notice performance issues:

1. Check Redis connection and memory usage
2. Review cache hit rates
3. Monitor API timeout settings
4. Check for network latency to external APIs
5. Review batch sizes (too large can cause timeouts)

```typescript
// Check cache statistics
const stats = await cache.getStats();
console.log(`Cache keys: ${stats.keys}, Memory: ${stats.memory}`);

// Monitor operation performance
monitor.logSummary();
```

### Cache Invalidation

If you need to force fresh data:

```typescript
// Invalidate specific project
await manager.invalidateAnalysis(projectId);

// Invalidate all package metadata
await cache.invalidatePattern('npm:*');
await cache.invalidatePattern('pypi:*');
await cache.invalidatePattern('maven:*');

// Invalidate all security data
await cache.invalidatePattern('security:*');
```
