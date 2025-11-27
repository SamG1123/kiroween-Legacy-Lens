import { ProjectStatus } from '../types';

/**
 * Analysis Orchestrator Interface
 * Responsibility: Coordinate the analysis pipeline and manage state transitions
 */
export interface IAnalysisOrchestrator {
  /**
   * Start analysis for a project
   * @param projectId - Project identifier
   * @param workingDir - Working directory containing source code
   */
  startAnalysis(projectId: string, workingDir: string): Promise<void>;

  /**
   * Update project status
   * @param projectId - Project identifier
   * @param status - New status
   */
  updateStatus(projectId: string, status: ProjectStatus): Promise<void>;

  /**
   * Handle errors during analysis
   * @param projectId - Project identifier
   * @param error - Error that occurred
   * @param stage - Stage where error occurred
   */
  handleError(projectId: string, error: Error, stage: string): Promise<void>;

  /**
   * Clean up temporary workspace
   * @param workingDir - Working directory to clean up
   */
  cleanupWorkspace(workingDir: string): Promise<void>;
}
