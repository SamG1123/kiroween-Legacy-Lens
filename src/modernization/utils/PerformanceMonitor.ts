/**
 * Performance monitoring utility for tracking analysis performance
 */
export class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();
  private startTimes: Map<string, number> = new Map();

  /**
   * Start timing an operation
   */
  start(operationName: string): void {
    this.startTimes.set(operationName, Date.now());
  }

  /**
   * End timing an operation and record the duration
   */
  end(operationName: string): number {
    const startTime = this.startTimes.get(operationName);
    if (!startTime) {
      console.warn(`No start time found for operation: ${operationName}`);
      return 0;
    }

    const duration = Date.now() - startTime;
    this.startTimes.delete(operationName);

    // Record the metric
    if (!this.metrics.has(operationName)) {
      this.metrics.set(operationName, []);
    }
    this.metrics.get(operationName)!.push(duration);

    return duration;
  }

  /**
   * Get statistics for an operation
   */
  getStats(operationName: string): {
    count: number;
    total: number;
    average: number;
    min: number;
    max: number;
  } | null {
    const durations = this.metrics.get(operationName);
    if (!durations || durations.length === 0) {
      return null;
    }

    const total = durations.reduce((sum, d) => sum + d, 0);
    const average = total / durations.length;
    const min = Math.min(...durations);
    const max = Math.max(...durations);

    return {
      count: durations.length,
      total,
      average,
      min,
      max,
    };
  }

  /**
   * Get all recorded metrics
   */
  getAllStats(): Record<string, ReturnType<typeof this.getStats>> {
    const stats: Record<string, ReturnType<typeof this.getStats>> = {};
    
    for (const [operation] of this.metrics) {
      stats[operation] = this.getStats(operation);
    }

    return stats;
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics.clear();
    this.startTimes.clear();
  }

  /**
   * Log performance summary
   */
  logSummary(): void {
    const stats = this.getAllStats();
    
    console.log('\n=== Performance Summary ===');
    for (const [operation, stat] of Object.entries(stats)) {
      if (stat) {
        console.log(`\n${operation}:`);
        console.log(`  Count: ${stat.count}`);
        console.log(`  Total: ${stat.total}ms`);
        console.log(`  Average: ${stat.average.toFixed(2)}ms`);
        console.log(`  Min: ${stat.min}ms`);
        console.log(`  Max: ${stat.max}ms`);
      }
    }
    console.log('\n========================\n');
  }

  /**
   * Measure an async operation
   */
  async measure<T>(operationName: string, fn: () => Promise<T>): Promise<T> {
    this.start(operationName);
    try {
      const result = await fn();
      const duration = this.end(operationName);
      console.log(`${operationName} completed in ${duration}ms`);
      return result;
    } catch (error) {
      this.end(operationName);
      throw error;
    }
  }
}

// Singleton instance
let performanceMonitorInstance: PerformanceMonitor | null = null;

export function getPerformanceMonitor(): PerformanceMonitor {
  if (!performanceMonitorInstance) {
    performanceMonitorInstance = new PerformanceMonitor();
  }
  return performanceMonitorInstance;
}
