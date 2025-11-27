import { IAnalysisOrchestrator } from '../interfaces/AnalysisOrchestrator';
import { ProjectStatus, AnalysisData } from '../types';
import { ProjectModel } from '../database/models/Project';
import { SourceProcessor } from './SourceProcessor';
import { LanguageDetector } from './LanguageDetector';
import { DependencyAnalyzer } from './DependencyAnalyzer';
import { MetricsCalculator } from './MetricsCalculator';
import { CodeSmellDetector } from './CodeSmellDetector';
import { ReportGenerator } from './ReportGenerator';
import { Pool } from 'pg';
import * as fs from 'fs/promises';
import { existsSync } from 'fs';
import { logger } from '../utils/logger';
import { metricsCollector } from '../utils/metrics';

/**
 * AnalysisOrchestrator Implementation
 * Responsibility: Coordinate the analysis pipeline and manage state transitions
 */
export class AnalysisOrchestrator implements IAnalysisOrchestrator {
  private projectModel: ProjectModel;
  private sourceProcessor: SourceProcessor;
  private languageDetector: LanguageDetector;
  private dependencyAnalyzer: DependencyAnalyzer;
  private metricsCalculator: MetricsCalculator;
  private codeSmellDetector: CodeSmellDetector;
  private reportGenerator: ReportGenerator;
  
  private readonly ANALYSIS_TIMEOUT = 10 * 60 * 1000; // 10 minutes in milliseconds

  constructor(pool?: Pool) {
    this.projectModel = new ProjectModel(pool);
    this.sourceProcessor = new SourceProcessor();
    this.languageDetector = new LanguageDetector();
    this.dependencyAnalyzer = new DependencyAnalyzer();
    this.metricsCalculator = new MetricsCalculator();
    this.codeSmellDetector = new CodeSmellDetector();
    this.reportGenerator = new ReportGenerator(pool);
  }

  /**
   * Start analysis for a project
   * Coordinates the entire analysis pipeline with timeout protection
   */
  async startAnalysis(projectId: string, workingDir: string): Promise<void> {
    const startTime = new Date();
    let timeoutId: NodeJS.Timeout | null = null;
    let analysisCompleted = false;

    logger.info('Starting analysis', { projectId, workingDir });
    metricsCollector.recordAnalysisStart(projectId);

    try {
      // Update status to analyzing
      await this.updateStatus(projectId, 'analyzing');

      // Set up timeout protection
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error(`Analysis timeout exceeded (${this.ANALYSIS_TIMEOUT / 1000}s)`));
        }, this.ANALYSIS_TIMEOUT);
      });

      // Run analysis with timeout
      await Promise.race([
        this.runAnalysisPipeline(projectId, workingDir, startTime),
        timeoutPromise
      ]);

      analysisCompleted = true;

      // Update status to completed
      await this.updateStatus(projectId, 'completed');
      
      const duration = Date.now() - startTime.getTime();
      logger.info('Analysis completed successfully', { projectId, duration });
    } catch (error) {
      // Handle error and update status
      await this.handleError(
        projectId,
        error instanceof Error ? error : new Error(String(error)),
        analysisCompleted ? 'finalization' : 'pipeline'
      );
    } finally {
      // Clear timeout
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      // Clean up workspace
      try {
        await this.cleanupWorkspace(workingDir);
      } catch (cleanupError) {
        logger.error('Failed to cleanup workspace', { projectId, workingDir }, cleanupError as Error);
      }
    }
  }

  /**
   * Run the complete analysis pipeline
   */
  private async runAnalysisPipeline(
    projectId: string,
    workingDir: string,
    startTime: Date
  ): Promise<void> {
    const analysisData: Partial<AnalysisData> = {};

    try {
      // Stage 1: List source files
      logger.debug('Listing source files', { projectId, stage: 'file_listing' });
      const allFiles = await this.sourceProcessor.listSourceFiles(workingDir);
      const sourceFiles = this.sourceProcessor.filterNonCodeFiles(allFiles);

      if (sourceFiles.length === 0) {
        throw new Error('No source files found in the codebase');
      }

      logger.info('Source files listed', { projectId, fileCount: sourceFiles.length });

      // Stage 2: Detect languages
      try {
        logger.debug('Detecting languages', { projectId, stage: 'language_detection' });
        analysisData.languages = await this.languageDetector.detectLanguages(sourceFiles);
        logger.info('Languages detected', { 
          projectId, 
          languageCount: analysisData.languages.languages.length 
        });
      } catch (error) {
        logger.error('Language detection failed', { projectId, stage: 'language_detection' }, error as Error);
        analysisData.languages = { languages: [] };
      }

      // Stage 3: Analyze dependencies
      try {
        logger.debug('Analyzing dependencies', { projectId, stage: 'dependency_analysis' });
        const dependencyReport = await this.dependencyAnalyzer.analyzeDependencies(workingDir);
        analysisData.dependencies = dependencyReport.dependencies;
        analysisData.frameworks = dependencyReport.frameworks;
        logger.info('Dependencies analyzed', { 
          projectId, 
          dependencyCount: dependencyReport.dependencies.length,
          frameworkCount: dependencyReport.frameworks.length
        });
      } catch (error) {
        logger.error('Dependency analysis failed', { projectId, stage: 'dependency_analysis' }, error as Error);
        analysisData.dependencies = [];
        analysisData.frameworks = [];
      }

      // Stage 4: Calculate metrics
      try {
        logger.debug('Calculating metrics', { projectId, stage: 'metrics_calculation' });
        analysisData.metrics = await this.metricsCalculator.calculateMetrics(sourceFiles);
        logger.info('Metrics calculated', { 
          projectId, 
          totalFiles: analysisData.metrics.totalFiles,
          totalLines: analysisData.metrics.totalLines,
          averageComplexity: analysisData.metrics.averageComplexity
        });
        
        // Record metrics
        metricsCollector.recordComplexity(projectId, analysisData.metrics.averageComplexity);
      } catch (error) {
        logger.error('Metrics calculation failed', { projectId, stage: 'metrics_calculation' }, error as Error);
        analysisData.metrics = {
          totalFiles: 0,
          totalLines: 0,
          codeLines: 0,
          commentLines: 0,
          blankLines: 0,
          averageComplexity: 0,
          maintainabilityIndex: 0,
        };
      }

      // Stage 5: Detect code smells
      try {
        logger.debug('Detecting code smells', { projectId, stage: 'code_smell_detection' });
        analysisData.issues = await this.codeSmellDetector.detectSmells(sourceFiles);
        logger.info('Code smells detected', { 
          projectId, 
          issueCount: analysisData.issues.length 
        });
        
        // Record code smells
        metricsCollector.recordCodeSmells(projectId, analysisData.issues.length);
      } catch (error) {
        logger.error('Code smell detection failed', { projectId, stage: 'code_smell_detection' }, error as Error);
        analysisData.issues = [];
      }

      // Stage 6: Generate and save report
      logger.debug('Generating report', { projectId, stage: 'report_generation' });
      const report = this.reportGenerator.generateReport(analysisData as AnalysisData);
      report.projectId = projectId;
      report.startTime = startTime;
      report.endTime = new Date();

      await this.reportGenerator.saveReport(projectId, report);
      
      // Record successful completion
      const duration = Date.now() - startTime.getTime();
      const filesProcessed = analysisData.metrics?.totalFiles || 0;
      const linesProcessed = analysisData.metrics?.totalLines || 0;
      metricsCollector.recordAnalysisComplete(projectId, duration, filesProcessed, linesProcessed);
      
      logger.info('Report generated and saved', { projectId });
    } catch (error) {
      // Generate partial report on failure
      logger.warn('Generating partial report due to error', { projectId }, error as Error);
      const partialReport = this.reportGenerator.generatePartialReport(
        analysisData,
        error instanceof Error ? error : new Error(String(error))
      );
      partialReport.projectId = projectId;
      partialReport.startTime = startTime;
      partialReport.endTime = new Date();

      await this.reportGenerator.saveReport(projectId, partialReport);
      
      throw error;
    }
  }

  /**
   * Update project status
   */
  async updateStatus(projectId: string, status: ProjectStatus): Promise<void> {
    try {
      await this.projectModel.updateStatus(projectId, status);
      logger.debug('Project status updated', { projectId, status });
    } catch (error) {
      logger.error('Failed to update project status', { projectId, status }, error as Error);
      throw new Error(
        `Status update failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Handle errors during analysis
   * Logs error with full context and updates project status
   */
  async handleError(projectId: string, error: Error, stage: string): Promise<void> {
    // Log error with full context (Requirement 8.1)
    logger.error('Analysis error', { projectId, stage }, error);
    
    // Record failure metrics
    metricsCollector.recordAnalysisFailure(projectId, stage, error.message);

    // Update project status to failed
    try {
      await this.updateStatus(projectId, 'failed');
    } catch (statusError) {
      logger.error('Failed to update status to failed', { projectId }, statusError as Error);
    }
  }

  /**
   * Clean up temporary workspace
   * Removes working directory and all its contents
   */
  async cleanupWorkspace(workingDir: string): Promise<void> {
    try {
      // Check if directory exists
      if (!existsSync(workingDir)) {
        return;
      }

      // Remove directory recursively
      await fs.rm(workingDir, { recursive: true, force: true });
    } catch (error) {
      throw new Error(
        `Workspace cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}
