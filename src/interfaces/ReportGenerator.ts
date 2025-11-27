import { AnalysisReport, AnalysisData } from '../types';

/**
 * Report Generator Interface
 * Responsibility: Aggregate analysis results into a structured report
 */
export interface IReportGenerator {
  /**
   * Generate complete analysis report
   * @param analysisData - Aggregated analysis data
   * @returns Complete analysis report
   */
  generateReport(analysisData: AnalysisData): AnalysisReport;

  /**
   * Save report to database
   * @param projectId - Project identifier
   * @param report - Analysis report to save
   */
  saveReport(projectId: string, report: AnalysisReport): Promise<void>;

  /**
   * Generate partial report when analysis fails
   * @param analysisData - Partial analysis data
   * @param error - Error that occurred
   * @returns Partial analysis report
   */
  generatePartialReport(analysisData: Partial<AnalysisData>, error: Error): AnalysisReport;
}
