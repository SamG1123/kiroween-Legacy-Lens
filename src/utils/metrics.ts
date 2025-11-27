/**
 * Performance Metrics Collector
 * Tracks and aggregates performance metrics for monitoring
 */

export interface MetricData {
  name: string;
  value: number;
  timestamp: Date;
  tags?: Record<string, string>;
}

export interface AggregatedMetrics {
  analysisCount: number;
  analysisSuccessCount: number;
  analysisFailureCount: number;
  averageAnalysisDuration: number;
  totalFilesProcessed: number;
  totalLinesProcessed: number;
  averageComplexity: number;
  codeSmellsDetected: number;
  uptime: number;
}

class MetricsCollector {
  private metrics: MetricData[] = [];
  private startTime: Date = new Date();
  
  // Counters
  private analysisCount = 0;
  private analysisSuccessCount = 0;
  private analysisFailureCount = 0;
  private totalFilesProcessed = 0;
  private totalLinesProcessed = 0;
  private totalComplexity = 0;
  private complexityCount = 0;
  private codeSmellsDetected = 0;
  
  // Duration tracking
  private analysisDurations: number[] = [];
  
  private readonly MAX_METRICS_HISTORY = 1000;

  /**
   * Record a metric
   */
  record(name: string, value: number, tags?: Record<string, string>): void {
    const metric: MetricData = {
      name,
      value,
      timestamp: new Date(),
      tags,
    };

    this.metrics.push(metric);

    // Trim old metrics to prevent memory growth
    if (this.metrics.length > this.MAX_METRICS_HISTORY) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS_HISTORY);
    }
  }

  /**
   * Record analysis start
   */
  recordAnalysisStart(projectId: string): void {
    this.analysisCount++;
    this.record('analysis.started', 1, { projectId });
  }

  /**
   * Record analysis completion
   */
  recordAnalysisComplete(projectId: string, duration: number, filesProcessed: number, linesProcessed: number): void {
    this.analysisSuccessCount++;
    this.analysisDurations.push(duration);
    this.totalFilesProcessed += filesProcessed;
    this.totalLinesProcessed += linesProcessed;
    
    this.record('analysis.completed', 1, { projectId });
    this.record('analysis.duration', duration, { projectId });
    this.record('analysis.files_processed', filesProcessed, { projectId });
    this.record('analysis.lines_processed', linesProcessed, { projectId });
  }

  /**
   * Record analysis failure
   */
  recordAnalysisFailure(projectId: string, stage: string, error: string): void {
    this.analysisFailureCount++;
    this.record('analysis.failed', 1, { projectId, stage, error });
  }

  /**
   * Record complexity metrics
   */
  recordComplexity(projectId: string, averageComplexity: number): void {
    this.totalComplexity += averageComplexity;
    this.complexityCount++;
    this.record('analysis.complexity', averageComplexity, { projectId });
  }

  /**
   * Record code smells detected
   */
  recordCodeSmells(projectId: string, count: number): void {
    this.codeSmellsDetected += count;
    this.record('analysis.code_smells', count, { projectId });
  }

  /**
   * Get aggregated metrics
   */
  getAggregatedMetrics(): AggregatedMetrics {
    const averageAnalysisDuration = this.analysisDurations.length > 0
      ? this.analysisDurations.reduce((sum, d) => sum + d, 0) / this.analysisDurations.length
      : 0;

    const averageComplexity = this.complexityCount > 0
      ? this.totalComplexity / this.complexityCount
      : 0;

    const uptime = Date.now() - this.startTime.getTime();

    return {
      analysisCount: this.analysisCount,
      analysisSuccessCount: this.analysisSuccessCount,
      analysisFailureCount: this.analysisFailureCount,
      averageAnalysisDuration,
      totalFilesProcessed: this.totalFilesProcessed,
      totalLinesProcessed: this.totalLinesProcessed,
      averageComplexity,
      codeSmellsDetected: this.codeSmellsDetected,
      uptime,
    };
  }

  /**
   * Get recent metrics
   */
  getRecentMetrics(limit: number = 100): MetricData[] {
    return this.metrics.slice(-limit);
  }

  /**
   * Reset all metrics (useful for testing)
   */
  reset(): void {
    this.metrics = [];
    this.analysisCount = 0;
    this.analysisSuccessCount = 0;
    this.analysisFailureCount = 0;
    this.totalFilesProcessed = 0;
    this.totalLinesProcessed = 0;
    this.totalComplexity = 0;
    this.complexityCount = 0;
    this.codeSmellsDetected = 0;
    this.analysisDurations = [];
    this.startTime = new Date();
  }
}

// Export singleton instance
export const metricsCollector = new MetricsCollector();
