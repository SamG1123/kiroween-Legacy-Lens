import { CodeMetrics, LOCCount, ComplexityMetrics } from '../types';

/**
 * Metrics Calculator Interface
 * Responsibility: Calculate code metrics including LOC, complexity, and maintainability
 */
export interface IMetricsCalculator {
  /**
   * Calculate all metrics for the codebase
   * @param files - Array of file paths
   * @returns Complete code metrics
   */
  calculateMetrics(files: string[]): Promise<CodeMetrics>;

  /**
   * Count lines of code in a file
   * @param file - File path
   * @returns LOC breakdown
   */
  countLOC(file: string): Promise<LOCCount>;

  /**
   * Calculate cyclomatic complexity for a file
   * @param file - File path
   * @returns Complexity metrics
   */
  calculateComplexity(file: string): Promise<ComplexityMetrics>;

  /**
   * Calculate maintainability index
   * @param metrics - Complexity metrics
   * @returns Maintainability index (0-100)
   */
  calculateMaintainability(metrics: ComplexityMetrics): number;
}
