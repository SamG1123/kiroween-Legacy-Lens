import { IReportGenerator } from '../interfaces/ReportGenerator';
import { AnalysisReport, AnalysisData } from '../types';
import { AnalysisModel } from '../database/models/Analysis';
import { Pool } from 'pg';

/**
 * ReportGenerator Implementation
 * Responsibility: Aggregate analysis results into a structured report
 */
export class ReportGenerator implements IReportGenerator {
  private analysisModel: AnalysisModel;

  constructor(pool?: Pool) {
    this.analysisModel = new AnalysisModel(pool);
  }

  /**
   * Generate complete analysis report
   * Aggregates all analysis data and adds timestamps
   */
  generateReport(analysisData: AnalysisData): AnalysisReport {
    const endTime = new Date();
    
    // Create complete report with all sections
    const report: AnalysisReport = {
      projectId: '', // Will be set by orchestrator
      status: 'completed',
      startTime: new Date(), // Will be set by orchestrator
      endTime,
      languages: analysisData.languages,
      frameworks: analysisData.frameworks,
      dependencies: analysisData.dependencies,
      metrics: analysisData.metrics,
      issues: analysisData.issues,
    };

    return report;
  }

  /**
   * Save report to database
   * Stores the analysis report associated with a project
   */
  async saveReport(projectId: string, report: AnalysisReport): Promise<void> {
    // Ensure projectId is set in the report
    const reportToSave: AnalysisReport = {
      ...report,
      projectId,
    };

    // Save to database using the Analysis model
    await this.analysisModel.create({
      projectId,
      agentType: 'analyzer',
      result: reportToSave,
    });
  }

  /**
   * Generate partial report when analysis fails
   * Includes error information and any completed sections
   */
  generatePartialReport(analysisData: Partial<AnalysisData>, error: Error): AnalysisReport {
    const endTime = new Date();
    
    // Create partial report with available data
    const report: AnalysisReport = {
      projectId: '', // Will be set by orchestrator
      status: 'partial',
      startTime: new Date(), // Will be set by orchestrator
      endTime,
      languages: analysisData.languages || { languages: [] },
      frameworks: analysisData.frameworks || [],
      dependencies: analysisData.dependencies || [],
      metrics: analysisData.metrics || {
        totalFiles: 0,
        totalLines: 0,
        codeLines: 0,
        commentLines: 0,
        blankLines: 0,
        averageComplexity: 0,
        maintainabilityIndex: 0,
      },
      issues: analysisData.issues || [],
      error: error.message,
    };

    return report;
  }
}
