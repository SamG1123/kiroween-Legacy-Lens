import { Pool } from 'pg';
import { AnalysisModel } from './Analysis';
import { AnalysisReport } from '../../types';

// Mock pool for testing
const mockPool = {
  query: jest.fn(),
} as unknown as Pool;

describe('AnalysisModel', () => {
  let analysisModel: AnalysisModel;

  beforeEach(() => {
    analysisModel = new AnalysisModel(mockPool);
    jest.clearAllMocks();
  });

  const mockAnalysisReport: AnalysisReport = {
    projectId: 'project-uuid',
    status: 'completed',
    startTime: new Date(),
    endTime: new Date(),
    languages: { languages: [] },
    frameworks: [],
    dependencies: [],
    metrics: {
      totalFiles: 10,
      totalLines: 1000,
      codeLines: 800,
      commentLines: 100,
      blankLines: 100,
      averageComplexity: 5,
      maintainabilityIndex: 75,
    },
    issues: [],
  };

  describe('create', () => {
    it('should create a new analysis with JSONB result', async () => {
      const mockAnalysis = {
        id: 'analysis-uuid',
        project_id: 'project-uuid',
        agent_type: 'analyzer',
        result: JSON.stringify(mockAnalysisReport),
        created_at: new Date(),
      };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [mockAnalysis],
      });

      const result = await analysisModel.create({
        projectId: 'project-uuid',
        agentType: 'analyzer',
        result: mockAnalysisReport,
      });

      expect(result.projectId).toBe('project-uuid');
      expect(result.agentType).toBe('analyzer');
      expect(result.result.status).toBe('completed');
      expect(mockPool.query).toHaveBeenCalledTimes(1);
    });
  });

  describe('findById', () => {
    it('should return an analysis when found', async () => {
      const mockAnalysis = {
        id: 'analysis-uuid',
        project_id: 'project-uuid',
        agent_type: 'analyzer',
        result: JSON.stringify(mockAnalysisReport),
        created_at: new Date(),
      };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [mockAnalysis],
      });

      const result = await analysisModel.findById('analysis-uuid');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('analysis-uuid');
      expect(result?.result.status).toBe('completed');
    });

    it('should return null when analysis not found', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [],
      });

      const result = await analysisModel.findById('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('findByProjectId', () => {
    it('should return all analyses for a project', async () => {
      const mockAnalyses = [
        {
          id: 'analysis-1',
          project_id: 'project-uuid',
          agent_type: 'analyzer',
          result: JSON.stringify(mockAnalysisReport),
          created_at: new Date(),
        },
        {
          id: 'analysis-2',
          project_id: 'project-uuid',
          agent_type: 'documentation',
          result: JSON.stringify(mockAnalysisReport),
          created_at: new Date(),
        },
      ];

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: mockAnalyses,
      });

      const result = await analysisModel.findByProjectId('project-uuid');

      expect(result).toHaveLength(2);
      expect(result[0].projectId).toBe('project-uuid');
      expect(result[1].projectId).toBe('project-uuid');
    });
  });

  describe('findLatestByProjectId', () => {
    it('should return the most recent analysis for a project', async () => {
      const mockAnalysis = {
        id: 'latest-analysis',
        project_id: 'project-uuid',
        agent_type: 'analyzer',
        result: JSON.stringify(mockAnalysisReport),
        created_at: new Date(),
      };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [mockAnalysis],
      });

      const result = await analysisModel.findLatestByProjectId('project-uuid');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('latest-analysis');
    });

    it('should return null when no analyses exist', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [],
      });

      const result = await analysisModel.findLatestByProjectId('project-uuid');

      expect(result).toBeNull();
    });
  });

  describe('updateResult', () => {
    it('should update analysis result', async () => {
      const updatedReport = { ...mockAnalysisReport, status: 'failed' as const };
      const mockAnalysis = {
        id: 'analysis-uuid',
        project_id: 'project-uuid',
        agent_type: 'analyzer',
        result: JSON.stringify(updatedReport),
        created_at: new Date(),
      };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [mockAnalysis],
      });

      const result = await analysisModel.updateResult('analysis-uuid', updatedReport);

      expect(result).not.toBeNull();
      expect(result?.result.status).toBe('failed');
    });
  });

  describe('deleteByProjectId', () => {
    it('should return count of deleted analyses', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rowCount: 3,
      });

      const result = await analysisModel.deleteByProjectId('project-uuid');

      expect(result).toBe(3);
    });

    it('should return 0 when no analyses exist', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rowCount: 0,
      });

      const result = await analysisModel.deleteByProjectId('project-uuid');

      expect(result).toBe(0);
    });
  });
});
