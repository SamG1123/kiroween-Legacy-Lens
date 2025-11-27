import { AnalysisOrchestrator } from './AnalysisOrchestrator';
import { ProjectModel } from '../database/models/Project';
import { AnalysisModel } from '../database/models/Analysis';
import * as fs from 'fs/promises';
import * as path from 'path';
import { existsSync } from 'fs';

// Mock the database models
jest.mock('../database/models/Project');
jest.mock('../database/models/Analysis');

describe('AnalysisOrchestrator', () => {
  let orchestrator: AnalysisOrchestrator;
  let mockProjectModel: jest.Mocked<ProjectModel>;
  let mockAnalysisModel: jest.Mocked<AnalysisModel>;
  let testWorkspace: string;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create orchestrator instance
    orchestrator = new AnalysisOrchestrator();

    // Get mocked instances
    mockProjectModel = (orchestrator as any).projectModel;
    mockAnalysisModel = ((orchestrator as any).reportGenerator as any).analysisModel;

    // Setup test workspace path
    testWorkspace = path.join(process.cwd(), 'test-workspace-orchestrator');
  });

  afterEach(async () => {
    // Clean up test workspace if it exists
    if (existsSync(testWorkspace)) {
      await fs.rm(testWorkspace, { recursive: true, force: true });
    }
  });

  describe('updateStatus', () => {
    it('should update project status successfully', async () => {
      const projectId = 'test-project-id';
      const status = 'analyzing';

      mockProjectModel.updateStatus.mockResolvedValue({
        id: projectId,
        name: 'Test Project',
        sourceType: 'github',
        sourceUrl: 'https://github.com/test/repo',
        status,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await orchestrator.updateStatus(projectId, status);

      expect(mockProjectModel.updateStatus).toHaveBeenCalledWith(projectId, status);
    });

    it('should throw error when status update fails', async () => {
      const projectId = 'test-project-id';
      const status = 'analyzing';

      mockProjectModel.updateStatus.mockRejectedValue(new Error('Database error'));

      await expect(orchestrator.updateStatus(projectId, status)).rejects.toThrow('Status update failed');
    });
  });

  describe('handleError', () => {
    it('should log error and update status to failed', async () => {
      const projectId = 'test-project-id';
      const error = new Error('Test error');
      const stage = 'language-detection';

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      mockProjectModel.updateStatus.mockResolvedValue({
        id: projectId,
        name: 'Test Project',
        sourceType: 'github',
        sourceUrl: 'https://github.com/test/repo',
        status: 'failed',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await orchestrator.handleError(projectId, error, stage);

      // Verify structured logging was called
      expect(consoleErrorSpy).toHaveBeenCalled();
      const logCall = consoleErrorSpy.mock.calls[0][0];
      const logEntry = JSON.parse(logCall);
      expect(logEntry.level).toBe('error');
      expect(logEntry.message).toBe('Analysis error');
      expect(logEntry.context.projectId).toBe(projectId);
      expect(logEntry.context.stage).toBe(stage);
      expect(logEntry.error.message).toBe('Test error');

      expect(mockProjectModel.updateStatus).toHaveBeenCalledWith(projectId, 'failed');

      consoleErrorSpy.mockRestore();
    });

    it('should handle status update failure gracefully', async () => {
      const projectId = 'test-project-id';
      const error = new Error('Test error');
      const stage = 'metrics-calculation';

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      mockProjectModel.updateStatus.mockRejectedValue(new Error('Database error'));

      // Should not throw even if status update fails
      await orchestrator.handleError(projectId, error, stage);

      // Verify structured logging was called multiple times (for both errors)
      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(consoleErrorSpy.mock.calls.length).toBeGreaterThanOrEqual(2);
      
      // Check first error log (Analysis error)
      const firstLogCall = consoleErrorSpy.mock.calls[0][0];
      const firstLogEntry = JSON.parse(firstLogCall);
      expect(firstLogEntry.level).toBe('error');
      expect(firstLogEntry.message).toBe('Analysis error');
      
      // Check second error log (Failed to update status)
      const secondLogCall = consoleErrorSpy.mock.calls[1][0];
      const secondLogEntry = JSON.parse(secondLogCall);
      expect(secondLogEntry.level).toBe('error');
      expect(secondLogEntry.message).toBe('Failed to update project status');

      consoleErrorSpy.mockRestore();
    });
  });

  describe('cleanupWorkspace', () => {
    it('should remove workspace directory', async () => {
      // Create test workspace
      await fs.mkdir(testWorkspace, { recursive: true });
      await fs.writeFile(path.join(testWorkspace, 'test.txt'), 'test content');

      expect(existsSync(testWorkspace)).toBe(true);

      await orchestrator.cleanupWorkspace(testWorkspace);

      expect(existsSync(testWorkspace)).toBe(false);
    });

    it('should not throw error if workspace does not exist', async () => {
      const nonExistentPath = path.join(process.cwd(), 'non-existent-workspace');

      await expect(orchestrator.cleanupWorkspace(nonExistentPath)).resolves.not.toThrow();
    });
  });

  describe('startAnalysis', () => {
    it('should update status to analyzing at start', async () => {
      const projectId = 'test-project-id';
      const workingDir = testWorkspace;

      // Create minimal test workspace
      await fs.mkdir(workingDir, { recursive: true });
      await fs.writeFile(path.join(workingDir, 'test.js'), 'console.log("test");');

      mockProjectModel.updateStatus.mockResolvedValue({
        id: projectId,
        name: 'Test Project',
        sourceType: 'github',
        sourceUrl: 'https://github.com/test/repo',
        status: 'analyzing',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockAnalysisModel.create.mockResolvedValue({
        id: 'analysis-id',
        projectId,
        agentType: 'analyzer',
        result: {} as any,
        createdAt: new Date(),
      });

      await orchestrator.startAnalysis(projectId, workingDir);

      // Should be called at least once with 'analyzing'
      expect(mockProjectModel.updateStatus).toHaveBeenCalledWith(projectId, 'analyzing');
    });

    it('should update status to completed on success', async () => {
      const projectId = 'test-project-id';
      const workingDir = testWorkspace;

      // Create minimal test workspace
      await fs.mkdir(workingDir, { recursive: true });
      await fs.writeFile(path.join(workingDir, 'test.js'), 'console.log("test");');

      mockProjectModel.updateStatus.mockResolvedValue({
        id: projectId,
        name: 'Test Project',
        sourceType: 'github',
        sourceUrl: 'https://github.com/test/repo',
        status: 'completed',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockAnalysisModel.create.mockResolvedValue({
        id: 'analysis-id',
        projectId,
        agentType: 'analyzer',
        result: {} as any,
        createdAt: new Date(),
      });

      await orchestrator.startAnalysis(projectId, workingDir);

      // Should be called with 'completed' at the end
      expect(mockProjectModel.updateStatus).toHaveBeenCalledWith(projectId, 'completed');
    });

    it('should update status to failed on error', async () => {
      const projectId = 'test-project-id';
      const workingDir = path.join(testWorkspace, 'non-existent');

      mockProjectModel.updateStatus.mockResolvedValue({
        id: projectId,
        name: 'Test Project',
        sourceType: 'github',
        sourceUrl: 'https://github.com/test/repo',
        status: 'failed',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await orchestrator.startAnalysis(projectId, workingDir);

      // Should be called with 'failed' due to error
      expect(mockProjectModel.updateStatus).toHaveBeenCalledWith(projectId, 'failed');
    });

    it('should clean up workspace after analysis', async () => {
      const projectId = 'test-project-id';
      const workingDir = testWorkspace;

      // Create test workspace
      await fs.mkdir(workingDir, { recursive: true });
      await fs.writeFile(path.join(workingDir, 'test.js'), 'console.log("test");');

      mockProjectModel.updateStatus.mockResolvedValue({
        id: projectId,
        name: 'Test Project',
        sourceType: 'github',
        sourceUrl: 'https://github.com/test/repo',
        status: 'completed',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockAnalysisModel.create.mockResolvedValue({
        id: 'analysis-id',
        projectId,
        agentType: 'analyzer',
        result: {} as any,
        createdAt: new Date(),
      });

      expect(existsSync(workingDir)).toBe(true);

      await orchestrator.startAnalysis(projectId, workingDir);

      // Workspace should be cleaned up
      expect(existsSync(workingDir)).toBe(false);
    });
  });
});
