import request from 'supertest';
import app from './server';
import { ProjectModel } from '../database/models/Project';
import { AnalysisModel } from '../database/models/Analysis';
import { UploadHandler } from '../services/UploadHandler';
import { AnalysisOrchestrator } from '../services/AnalysisOrchestrator';
import { READMEGenerator } from '../documentation/generators/READMEGenerator';
import { APIDocGenerator } from '../documentation/generators/APIDocGenerator';
import { ArchitectureGenerator } from '../documentation/generators/ArchitectureGenerator';
import { DocumentationPackager } from '../documentation/packagers/DocumentationPackager';
import { RefactoringOrchestrator } from '../refactoring/orchestrators/RefactoringOrchestrator';

// Mock the dependencies
jest.mock('../database/models/Project');
jest.mock('../database/models/Analysis');
jest.mock('../services/UploadHandler');
jest.mock('../services/AnalysisOrchestrator');
jest.mock('../documentation/generators/READMEGenerator');
jest.mock('../documentation/generators/APIDocGenerator');
jest.mock('../documentation/generators/ArchitectureGenerator');
jest.mock('../documentation/packagers/DocumentationPackager');
jest.mock('../refactoring/orchestrators/RefactoringOrchestrator');

describe('API Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/analyze', () => {
    it('should reject invalid source type', async () => {
      const response = await request(app)
        .post('/api/analyze')
        .send({ sourceType: 'invalid' });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_SOURCE_TYPE');
    });

    it('should reject GitHub upload without source URL', async () => {
      const response = await request(app)
        .post('/api/analyze')
        .send({ sourceType: 'github' });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('MISSING_SOURCE_URL');
    });

    it('should handle GitHub upload successfully', async () => {
      const mockProject = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Project',
        sourceType: 'github',
        sourceUrl: 'https://github.com/test/repo',
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (UploadHandler.prototype.handleGitHubUpload as jest.Mock).mockResolvedValue({
        projectId: mockProject.id,
        workingDirectory: '/tmp/test',
        sourceType: 'github',
        status: 'success',
      });

      (ProjectModel.prototype.create as jest.Mock).mockResolvedValue(mockProject);
      (AnalysisOrchestrator.prototype.startAnalysis as jest.Mock).mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/analyze')
        .send({
          sourceType: 'github',
          sourceUrl: 'https://github.com/test/repo',
          name: 'Test Project',
        });

      expect(response.status).toBe(202);
      expect(response.body.projectId).toBe(mockProject.id);
      expect(response.body.status).toBe('pending');
    });

    it('should handle upload failure', async () => {
      (UploadHandler.prototype.handleGitHubUpload as jest.Mock).mockResolvedValue({
        projectId: '123',
        workingDirectory: '/tmp/test',
        sourceType: 'github',
        status: 'error',
        error: 'Invalid GitHub URL',
      });

      const response = await request(app)
        .post('/api/analyze')
        .send({
          sourceType: 'github',
          sourceUrl: 'invalid-url',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('UPLOAD_FAILED');
    });
  });

  describe('GET /api/analysis/:id', () => {
    it('should reject invalid UUID format', async () => {
      const response = await request(app).get('/api/analysis/invalid-id');

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_ID');
    });

    it('should return 404 for non-existent project', async () => {
      (ProjectModel.prototype.findById as jest.Mock).mockResolvedValue(null);

      const response = await request(app).get(
        '/api/analysis/123e4567-e89b-12d3-a456-426614174000'
      );

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('PROJECT_NOT_FOUND');
    });

    it('should return project status without analysis', async () => {
      const mockProject = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Project',
        sourceType: 'github',
        sourceUrl: 'https://github.com/test/repo',
        status: 'analyzing',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (ProjectModel.prototype.findById as jest.Mock).mockResolvedValue(mockProject);
      (AnalysisModel.prototype.findLatestByProjectId as jest.Mock).mockResolvedValue(null);

      const response = await request(app).get(
        '/api/analysis/123e4567-e89b-12d3-a456-426614174000'
      );

      expect(response.status).toBe(200);
      expect(response.body.projectId).toBe(mockProject.id);
      expect(response.body.status).toBe('analyzing');
      expect(response.body.analysis).toBeNull();
    });

    it('should return project with analysis info', async () => {
      const mockProject = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Project',
        sourceType: 'github',
        sourceUrl: 'https://github.com/test/repo',
        status: 'completed',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockAnalysis = {
        id: '456e7890-e89b-12d3-a456-426614174000',
        projectId: mockProject.id,
        agentType: 'analyzer',
        result: { status: 'completed' },
        createdAt: new Date(),
      };

      (ProjectModel.prototype.findById as jest.Mock).mockResolvedValue(mockProject);
      (AnalysisModel.prototype.findLatestByProjectId as jest.Mock).mockResolvedValue(
        mockAnalysis
      );

      const response = await request(app).get(
        '/api/analysis/123e4567-e89b-12d3-a456-426614174000'
      );

      expect(response.status).toBe(200);
      expect(response.body.projectId).toBe(mockProject.id);
      expect(response.body.analysis).toBeDefined();
      expect(response.body.analysis.id).toBe(mockAnalysis.id);
    });
  });

  describe('GET /api/report/:id', () => {
    it('should reject invalid UUID format', async () => {
      const response = await request(app).get('/api/report/invalid-id');

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_ID');
    });

    it('should return 404 for non-existent project', async () => {
      (ProjectModel.prototype.findById as jest.Mock).mockResolvedValue(null);

      const response = await request(app).get(
        '/api/report/123e4567-e89b-12d3-a456-426614174000'
      );

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('PROJECT_NOT_FOUND');
    });

    it('should return 202 for pending analysis', async () => {
      const mockProject = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Project',
        sourceType: 'github',
        sourceUrl: 'https://github.com/test/repo',
        status: 'analyzing',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (ProjectModel.prototype.findById as jest.Mock).mockResolvedValue(mockProject);

      const response = await request(app).get(
        '/api/report/123e4567-e89b-12d3-a456-426614174000'
      );

      expect(response.status).toBe(202);
      expect(response.body.status).toBe('analyzing');
      expect(response.body.message).toBe('Analysis is still in progress');
    });

    it('should return 404 when no report exists', async () => {
      const mockProject = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Project',
        sourceType: 'github',
        sourceUrl: 'https://github.com/test/repo',
        status: 'completed',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (ProjectModel.prototype.findById as jest.Mock).mockResolvedValue(mockProject);
      (AnalysisModel.prototype.findLatestByProjectId as jest.Mock).mockResolvedValue(null);

      const response = await request(app).get(
        '/api/report/123e4567-e89b-12d3-a456-426614174000'
      );

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('REPORT_NOT_FOUND');
    });

    it('should return full report for completed analysis', async () => {
      const mockProject = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Project',
        sourceType: 'github',
        sourceUrl: 'https://github.com/test/repo',
        status: 'completed',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockReport = {
        projectId: mockProject.id,
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

      const mockAnalysis = {
        id: '456e7890-e89b-12d3-a456-426614174000',
        projectId: mockProject.id,
        agentType: 'analyzer',
        result: mockReport,
        createdAt: new Date(),
      };

      (ProjectModel.prototype.findById as jest.Mock).mockResolvedValue(mockProject);
      (AnalysisModel.prototype.findLatestByProjectId as jest.Mock).mockResolvedValue(
        mockAnalysis
      );

      const response = await request(app).get(
        '/api/report/123e4567-e89b-12d3-a456-426614174000'
      );

      expect(response.status).toBe(200);
      expect(response.body.projectId).toBe(mockProject.id);
      expect(response.body.report).toBeDefined();
      expect(response.body.report.status).toBe('completed');
      expect(response.body.report.metrics.totalFiles).toBe(10);
    });
  });

  describe('POST /api/generate-docs/:projectId', () => {
    it('should reject invalid UUID format', async () => {
      const response = await request(app).post('/api/generate-docs/invalid-id');

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_ID');
    });

    it('should return 404 for non-existent project', async () => {
      (ProjectModel.prototype.findById as jest.Mock).mockResolvedValue(null);

      const response = await request(app).post(
        '/api/generate-docs/123e4567-e89b-12d3-a456-426614174000'
      );

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('PROJECT_NOT_FOUND');
    });

    it('should reject if analysis is not complete', async () => {
      const mockProject = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Project',
        sourceType: 'github',
        status: 'analyzing',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (ProjectModel.prototype.findById as jest.Mock).mockResolvedValue(mockProject);

      const response = await request(app).post(
        '/api/generate-docs/123e4567-e89b-12d3-a456-426614174000'
      );

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('ANALYSIS_NOT_COMPLETE');
    });

    it('should generate documentation successfully', async () => {
      const mockProject = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Project',
        sourceType: 'github',
        status: 'completed',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockAnalysis = {
        id: '456e7890-e89b-12d3-a456-426614174000',
        projectId: mockProject.id,
        agentType: 'analyzer',
        result: {
          status: 'completed',
          languages: { languages: [{ name: 'JavaScript' }] },
          frameworks: ['Express'],
          dependencies: [{ name: 'express', version: '4.18.0', type: 'production' }],
          structure: { name: 'test', type: 'directory', path: '/', children: [] },
          metrics: { totalLines: 1000, codeLines: 800, commentLines: 100, averageComplexity: 5 },
          entryPoints: ['index.js'],
        },
        createdAt: new Date(),
      };

      (ProjectModel.prototype.findById as jest.Mock).mockResolvedValue(mockProject);
      (AnalysisModel.prototype.findLatestByProjectId as jest.Mock).mockResolvedValue(mockAnalysis);
      (AnalysisModel.prototype.updateResult as jest.Mock).mockResolvedValue(undefined);
      (READMEGenerator.prototype.generate as jest.Mock).mockResolvedValue('# Test README');
      (APIDocGenerator.prototype.generate as jest.Mock).mockResolvedValue('# API Docs');
      (ArchitectureGenerator.prototype.generate as jest.Mock).mockResolvedValue({
        overview: 'Test overview',
        components: [],
        diagrams: { component: 'diagram', dataFlow: 'flow' },
        patterns: ['MVC'],
      });

      const response = await request(app)
        .post('/api/generate-docs/123e4567-e89b-12d3-a456-426614174000')
        .send({
          options: {
            types: ['readme', 'api', 'architecture'],
            depth: 'standard',
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('completed');
      expect(response.body.projectId).toBe(mockProject.id);
    });

    it('should reject invalid options', async () => {
      const mockProject = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Project',
        sourceType: 'github',
        status: 'completed',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (ProjectModel.prototype.findById as jest.Mock).mockResolvedValue(mockProject);

      const response = await request(app)
        .post('/api/generate-docs/123e4567-e89b-12d3-a456-426614174000')
        .send({
          options: {
            types: ['invalid-type'],
            depth: 'invalid-depth',
          },
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_OPTIONS');
    });
  });

  describe('GET /api/docs/:projectId', () => {
    it('should reject invalid UUID format', async () => {
      const response = await request(app).get('/api/docs/invalid-id');

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_ID');
    });

    it('should return 404 for non-existent project', async () => {
      (ProjectModel.prototype.findById as jest.Mock).mockResolvedValue(null);

      const response = await request(app).get(
        '/api/docs/123e4567-e89b-12d3-a456-426614174000'
      );

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('PROJECT_NOT_FOUND');
    });

    it('should return 404 if documentation not generated', async () => {
      const mockProject = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Project',
        sourceType: 'github',
        status: 'completed',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockAnalysis = {
        id: '456e7890-e89b-12d3-a456-426614174000',
        projectId: mockProject.id,
        agentType: 'analyzer',
        result: { status: 'completed' },
        createdAt: new Date(),
      };

      (ProjectModel.prototype.findById as jest.Mock).mockResolvedValue(mockProject);
      (AnalysisModel.prototype.findLatestByProjectId as jest.Mock).mockResolvedValue(mockAnalysis);

      const response = await request(app).get(
        '/api/docs/123e4567-e89b-12d3-a456-426614174000'
      );

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('DOCUMENTATION_NOT_FOUND');
    });

    it('should return documentation successfully', async () => {
      const mockProject = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Project',
        sourceType: 'github',
        status: 'completed',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockAnalysis = {
        id: '456e7890-e89b-12d3-a456-426614174000',
        projectId: mockProject.id,
        agentType: 'analyzer',
        result: {
          status: 'completed',
          documentation: {
            readme: '# Test README',
            api: '# API Docs',
            architecture: '# Architecture',
            metadata: {
              projectId: mockProject.id,
              generatedAt: new Date().toISOString(),
              generator: 'test',
              version: '1.0.0',
              options: { types: ['readme'], depth: 'standard', excludePaths: [], mergeExisting: false },
              statistics: {
                filesDocumented: 10,
                functionsDocumented: 50,
                classesDocumented: 20,
                apiEndpointsDocumented: 5,
              },
            },
          },
        },
        createdAt: new Date(),
      };

      (ProjectModel.prototype.findById as jest.Mock).mockResolvedValue(mockProject);
      (AnalysisModel.prototype.findLatestByProjectId as jest.Mock).mockResolvedValue(mockAnalysis);

      const response = await request(app).get(
        '/api/docs/123e4567-e89b-12d3-a456-426614174000'
      );

      expect(response.status).toBe(200);
      expect(response.body.projectId).toBe(mockProject.id);
      expect(response.body.documentation).toBeDefined();
      expect(response.body.documentation.readme).toBe('# Test README');
    });
  });

  describe('POST /api/modernize/:projectId', () => {
    it('should reject invalid UUID format', async () => {
      const response = await request(app).post('/api/modernize/invalid-id');

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_ID');
    });

    it('should return 404 for non-existent project', async () => {
      (ProjectModel.prototype.findById as jest.Mock).mockResolvedValue(null);

      const response = await request(app).post(
        '/api/modernize/123e4567-e89b-12d3-a456-426614174000'
      );

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('PROJECT_NOT_FOUND');
    });

    it('should reject if analysis is not complete', async () => {
      const mockProject = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Project',
        sourceType: 'github',
        status: 'analyzing',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (ProjectModel.prototype.findById as jest.Mock).mockResolvedValue(mockProject);

      const response = await request(app).post(
        '/api/modernize/123e4567-e89b-12d3-a456-426614174000'
      );

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('ANALYSIS_NOT_COMPLETE');
    });

    it('should reject if no analysis report exists', async () => {
      const mockProject = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Project',
        sourceType: 'github',
        status: 'completed',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (ProjectModel.prototype.findById as jest.Mock).mockResolvedValue(mockProject);
      (AnalysisModel.prototype.findLatestByProjectId as jest.Mock).mockResolvedValue(null);

      const response = await request(app).post(
        '/api/modernize/123e4567-e89b-12d3-a456-426614174000'
      );

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('ANALYSIS_NOT_FOUND');
    });

    it('should reject if no dependencies or frameworks to analyze', async () => {
      const mockProject = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Project',
        sourceType: 'github',
        status: 'completed',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockAnalysis = {
        id: '456e7890-e89b-12d3-a456-426614174000',
        projectId: mockProject.id,
        agentType: 'analyzer',
        result: { status: 'completed' },
        createdAt: new Date(),
      };

      (ProjectModel.prototype.findById as jest.Mock).mockResolvedValue(mockProject);
      (AnalysisModel.prototype.findLatestByProjectId as jest.Mock).mockResolvedValue(mockAnalysis);

      const response = await request(app).post(
        '/api/modernize/123e4567-e89b-12d3-a456-426614174000'
      );

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('NO_DATA_TO_ANALYZE');
    });

    it('should generate modernization report successfully', async () => {
      const mockProject = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Project',
        sourceType: 'github',
        status: 'completed',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockAnalysis = {
        id: '456e7890-e89b-12d3-a456-426614174000',
        projectId: mockProject.id,
        agentType: 'analyzer',
        result: {
          status: 'completed',
          dependencies: [
            { name: 'express', version: '4.17.0', type: 'production', ecosystem: 'npm' },
          ],
          frameworks: [
            { name: 'express', version: '4.17.0', type: 'backend' },
          ],
        },
        createdAt: new Date(),
      };

      const mockModernizationAnalysis = {
        id: '789e0123-e89b-12d3-a456-426614174000',
        projectId: mockProject.id,
        agentType: 'modernization',
        result: {
          summary: 'Test summary',
          statistics: {
            totalRecommendations: 1,
            byPriority: { critical: 0, high: 1, medium: 0, low: 0 },
            byType: { dependency: 1, framework: 0, pattern: 0 },
            estimatedEffort: { min: 1, max: 2, confidence: 'medium' },
          },
          recommendations: [],
          roadmap: { phases: [], totalEstimate: { min: 1, max: 2, confidence: 'medium' }, criticalPath: [], quickWins: [] },
          compatibilityReport: { compatible: true, issues: [], resolutions: [] },
          generatedAt: new Date(),
        },
        createdAt: new Date(),
      };

      (ProjectModel.prototype.findById as jest.Mock).mockResolvedValue(mockProject);
      (AnalysisModel.prototype.findLatestByProjectId as jest.Mock).mockResolvedValue(mockAnalysis);
      (AnalysisModel.prototype.create as jest.Mock).mockResolvedValue(mockModernizationAnalysis);

      const response = await request(app).post(
        '/api/modernize/123e4567-e89b-12d3-a456-426614174000'
      );

      expect(response.status).toBe(200);
      expect(response.body.projectId).toBe(mockProject.id);
      expect(response.body.status).toBe('completed');
      expect(response.body.summary).toBeDefined();
      expect(response.body.statistics).toBeDefined();
    });
  });

  describe('GET /api/modernization/:projectId', () => {
    it('should reject invalid UUID format', async () => {
      const response = await request(app).get('/api/modernization/invalid-id');

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_ID');
    });

    it('should return 404 for non-existent project', async () => {
      (ProjectModel.prototype.findById as jest.Mock).mockResolvedValue(null);

      const response = await request(app).get(
        '/api/modernization/123e4567-e89b-12d3-a456-426614174000'
      );

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('PROJECT_NOT_FOUND');
    });

    it('should return 404 if no modernization analysis exists', async () => {
      const mockProject = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Project',
        sourceType: 'github',
        status: 'completed',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (ProjectModel.prototype.findById as jest.Mock).mockResolvedValue(mockProject);
      (AnalysisModel.prototype.findByProjectId as jest.Mock).mockResolvedValue([]);

      const response = await request(app).get(
        '/api/modernization/123e4567-e89b-12d3-a456-426614174000'
      );

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('MODERNIZATION_NOT_FOUND');
    });

    it('should return modernization report successfully', async () => {
      const mockProject = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Project',
        sourceType: 'github',
        status: 'completed',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockModernizationAnalysis = {
        id: '789e0123-e89b-12d3-a456-426614174000',
        projectId: mockProject.id,
        agentType: 'modernization',
        result: {
          summary: 'Test summary',
          statistics: {
            totalRecommendations: 1,
            byPriority: { critical: 0, high: 1, medium: 0, low: 0 },
            byType: { dependency: 1, framework: 0, pattern: 0 },
            estimatedEffort: { min: 1, max: 2, confidence: 'medium' },
          },
          recommendations: [],
          roadmap: { phases: [], totalEstimate: { min: 1, max: 2, confidence: 'medium' }, criticalPath: [], quickWins: [] },
          compatibilityReport: { compatible: true, issues: [], resolutions: [] },
          generatedAt: new Date(),
        },
        createdAt: new Date(),
      };

      (ProjectModel.prototype.findById as jest.Mock).mockResolvedValue(mockProject);
      (AnalysisModel.prototype.findByProjectId as jest.Mock).mockResolvedValue([mockModernizationAnalysis]);

      const response = await request(app).get(
        '/api/modernization/123e4567-e89b-12d3-a456-426614174000'
      );

      expect(response.status).toBe(200);
      expect(response.body.projectId).toBe(mockProject.id);
      expect(response.body.analysisId).toBe(mockModernizationAnalysis.id);
      expect(response.body.report).toBeDefined();
      expect(response.body.report.summary).toBe('Test summary');
    });
  });

  describe('GET /api/docs/:projectId/download', () => {
    it('should reject invalid UUID format', async () => {
      const response = await request(app).get('/api/docs/invalid-id/download');

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_ID');
    });

    it('should return 404 for non-existent project', async () => {
      (ProjectModel.prototype.findById as jest.Mock).mockResolvedValue(null);

      const response = await request(app).get(
        '/api/docs/123e4567-e89b-12d3-a456-426614174000/download'
      );

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('PROJECT_NOT_FOUND');
    });

    it('should return 404 if documentation not generated', async () => {
      const mockProject = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Project',
        sourceType: 'github',
        status: 'completed',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockAnalysis = {
        id: '456e7890-e89b-12d3-a456-426614174000',
        projectId: mockProject.id,
        agentType: 'analyzer',
        result: { status: 'completed' },
        createdAt: new Date(),
      };

      (ProjectModel.prototype.findById as jest.Mock).mockResolvedValue(mockProject);
      (AnalysisModel.prototype.findLatestByProjectId as jest.Mock).mockResolvedValue(mockAnalysis);

      const response = await request(app).get(
        '/api/docs/123e4567-e89b-12d3-a456-426614174000/download'
      );

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('DOCUMENTATION_NOT_FOUND');
    });

    it('should download documentation archive successfully', async () => {
      const mockProject = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Project',
        sourceType: 'github',
        status: 'completed',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockAnalysis = {
        id: '456e7890-e89b-12d3-a456-426614174000',
        projectId: mockProject.id,
        agentType: 'analyzer',
        result: {
          status: 'completed',
          documentation: {
            readme: '# Test README',
            api: '# API Docs',
            architecture: '# Architecture',
            metadata: {
              projectId: mockProject.id,
              generatedAt: new Date().toISOString(),
              generator: 'test',
              version: '1.0.0',
              options: { types: ['readme'], depth: 'standard', excludePaths: [], mergeExisting: false },
              statistics: {
                filesDocumented: 10,
                functionsDocumented: 50,
                classesDocumented: 20,
                apiEndpointsDocumented: 5,
              },
            },
          },
        },
        createdAt: new Date(),
      };

      const mockArchive = Buffer.from('mock-zip-content');

      (ProjectModel.prototype.findById as jest.Mock).mockResolvedValue(mockProject);
      (AnalysisModel.prototype.findLatestByProjectId as jest.Mock).mockResolvedValue(mockAnalysis);
      (DocumentationPackager.prototype.package as jest.Mock).mockResolvedValue({
        archive: mockArchive,
        manifest: { files: [], generatedAt: new Date(), projectId: mockProject.id, version: '1.0.0' },
        htmlVersion: { files: new Map() },
      });

      const response = await request(app).get(
        '/api/docs/123e4567-e89b-12d3-a456-426614174000/download'
      );

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe('application/zip');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.headers['content-disposition']).toContain('Test-Project-documentation.zip');
    });
  });

  describe('POST /api/refactor/:projectId', () => {
    it('should reject invalid UUID format', async () => {
      const response = await request(app).post('/api/refactor/invalid-id');

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_ID');
    });

    it('should reject missing code', async () => {
      const response = await request(app)
        .post('/api/refactor/123e4567-e89b-12d3-a456-426614174000')
        .send({ filename: 'test.js' });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('MISSING_CODE');
    });

    it('should reject missing filename', async () => {
      const response = await request(app)
        .post('/api/refactor/123e4567-e89b-12d3-a456-426614174000')
        .send({ code: 'function test() {}' });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('MISSING_FILENAME');
    });

    it('should return 404 for non-existent project', async () => {
      (ProjectModel.prototype.findById as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .post('/api/refactor/123e4567-e89b-12d3-a456-426614174000')
        .send({
          code: 'function test() {}',
          filename: 'test.js',
        });

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('PROJECT_NOT_FOUND');
    });

    it('should generate refactoring suggestions successfully', async () => {
      const mockProject = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Project',
        sourceType: 'github',
        status: 'completed',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockSuggestions = [
        {
          id: 'ref-1',
          type: 'extract_method',
          title: 'Extract long method',
          description: 'Extract method to improve readability',
          beforeCode: 'function test() { /* long code */ }',
          afterCode: 'function test() { helper(); }',
          diff: '- long code\n+ helper();',
          benefits: ['Improved readability'],
          riskLevel: 'low',
          estimatedEffort: 'low',
          priority: 1,
        },
        {
          id: 'ref-2',
          type: 'rename',
          title: 'Rename variable',
          description: 'Rename variable for clarity',
          beforeCode: 'let x = 5;',
          afterCode: 'let count = 5;',
          diff: '- let x = 5;\n+ let count = 5;',
          benefits: ['Better naming'],
          riskLevel: 'low',
          estimatedEffort: 'low',
          priority: 2,
        },
      ];

      (ProjectModel.prototype.findById as jest.Mock).mockResolvedValue(mockProject);
      (RefactoringOrchestrator.prototype.analyzeAndSuggest as jest.Mock).mockResolvedValue(
        mockSuggestions
      );

      const response = await request(app)
        .post('/api/refactor/123e4567-e89b-12d3-a456-426614174000')
        .send({
          code: 'function test() { /* long code */ }',
          filename: 'test.js',
        });

      expect(response.status).toBe(200);
      expect(response.body.projectId).toBe(mockProject.id);
      expect(response.body.status).toBe('completed');
      expect(response.body.suggestions).toHaveLength(2);
      expect(response.body.statistics.totalSuggestions).toBe(2);
      expect(response.body.statistics.lowRisk).toBe(2);
      expect(response.body.statistics.byType.extract_method).toBe(1);
      expect(response.body.statistics.byType.rename).toBe(1);
    });
  });

  describe('POST /api/refactor/:projectId/apply', () => {
    it('should reject invalid UUID format', async () => {
      const response = await request(app).post('/api/refactor/invalid-id/apply');

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_ID');
    });

    it('should reject missing code', async () => {
      const response = await request(app)
        .post('/api/refactor/123e4567-e89b-12d3-a456-426614174000/apply')
        .send({
          suggestions: [],
          codebasePath: '/tmp/test',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('MISSING_CODE');
    });

    it('should reject missing suggestions', async () => {
      const response = await request(app)
        .post('/api/refactor/123e4567-e89b-12d3-a456-426614174000/apply')
        .send({
          code: 'function test() {}',
          codebasePath: '/tmp/test',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('MISSING_SUGGESTIONS');
    });

    it('should reject empty suggestions array', async () => {
      const response = await request(app)
        .post('/api/refactor/123e4567-e89b-12d3-a456-426614174000/apply')
        .send({
          code: 'function test() {}',
          suggestions: [],
          codebasePath: '/tmp/test',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('MISSING_SUGGESTIONS');
    });

    it('should reject missing codebase path', async () => {
      const response = await request(app)
        .post('/api/refactor/123e4567-e89b-12d3-a456-426614174000/apply')
        .send({
          code: 'function test() {}',
          suggestions: [{ id: 'ref-1', type: 'rename' }],
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('MISSING_CODEBASE_PATH');
    });

    it('should return 404 for non-existent project', async () => {
      (ProjectModel.prototype.findById as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .post('/api/refactor/123e4567-e89b-12d3-a456-426614174000/apply')
        .send({
          code: 'function test() {}',
          suggestions: [{ id: 'ref-1', type: 'rename' }],
          codebasePath: '/tmp/test',
        });

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('PROJECT_NOT_FOUND');
    });

    it('should apply refactorings successfully', async () => {
      const mockProject = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Project',
        sourceType: 'github',
        status: 'completed',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockSuggestions = [
        {
          id: 'ref-1',
          type: 'rename',
          title: 'Rename variable',
          description: 'Rename variable for clarity',
          beforeCode: 'let x = 5;',
          afterCode: 'let count = 5;',
          diff: '- let x = 5;\n+ let count = 5;',
          benefits: ['Better naming'],
          riskLevel: 'low',
          estimatedEffort: 'low',
          priority: 1,
        },
      ];

      const mockResult = {
        success: true,
        appliedRefactorings: [
          {
            id: 'ref-1',
            projectId: mockProject.id,
            type: 'rename',
            status: 'applied',
            beforeCode: 'let x = 5;',
            afterCode: 'let count = 5;',
            diff: '- let x = 5;\n+ let count = 5;',
            testsPassed: true,
            appliedAt: new Date(),
          },
        ],
        failedRefactorings: [],
        skippedRefactorings: [],
        errors: [],
        warnings: [],
      };

      (ProjectModel.prototype.findById as jest.Mock).mockResolvedValue(mockProject);
      (RefactoringOrchestrator.prototype.applyRefactorings as jest.Mock).mockResolvedValue(
        mockResult
      );

      const response = await request(app)
        .post('/api/refactor/123e4567-e89b-12d3-a456-426614174000/apply')
        .send({
          code: 'let x = 5;',
          suggestions: mockSuggestions,
          codebasePath: '/tmp/test',
        });

      expect(response.status).toBe(200);
      expect(response.body.projectId).toBe(mockProject.id);
      expect(response.body.status).toBe('completed');
      expect(response.body.result.success).toBe(true);
      expect(response.body.result.appliedRefactorings).toHaveLength(1);
      expect(response.body.statistics.applied).toBe(1);
      expect(response.body.statistics.failed).toBe(0);
    });

    it('should handle partial success with 207 status', async () => {
      const mockProject = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Project',
        sourceType: 'github',
        status: 'completed',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockSuggestions = [
        {
          id: 'ref-1',
          type: 'rename',
          title: 'Rename variable',
          description: 'Rename variable for clarity',
          beforeCode: 'let x = 5;',
          afterCode: 'let count = 5;',
          diff: '- let x = 5;\n+ let count = 5;',
          benefits: ['Better naming'],
          riskLevel: 'low',
          estimatedEffort: 'low',
          priority: 1,
        },
        {
          id: 'ref-2',
          type: 'extract_method',
          title: 'Extract method',
          description: 'Extract method',
          beforeCode: 'function test() {}',
          afterCode: 'function test() { helper(); }',
          diff: 'diff',
          benefits: [],
          riskLevel: 'medium',
          estimatedEffort: 'medium',
          priority: 2,
        },
      ];

      const mockResult = {
        success: false,
        appliedRefactorings: [
          {
            id: 'ref-1',
            projectId: mockProject.id,
            type: 'rename',
            status: 'applied',
            beforeCode: 'let x = 5;',
            afterCode: 'let count = 5;',
            diff: '- let x = 5;\n+ let count = 5;',
            testsPassed: true,
            appliedAt: new Date(),
          },
        ],
        failedRefactorings: [
          {
            id: 'ref-2',
            projectId: mockProject.id,
            type: 'extract_method',
            status: 'failed',
            beforeCode: 'function test() {}',
            afterCode: 'function test() { helper(); }',
            diff: 'diff',
            testsPassed: false,
          },
        ],
        skippedRefactorings: [],
        errors: ['Tests failed after refactoring'],
        warnings: [],
      };

      (ProjectModel.prototype.findById as jest.Mock).mockResolvedValue(mockProject);
      (RefactoringOrchestrator.prototype.applyRefactorings as jest.Mock).mockResolvedValue(
        mockResult
      );

      const response = await request(app)
        .post('/api/refactor/123e4567-e89b-12d3-a456-426614174000/apply')
        .send({
          code: 'let x = 5;',
          suggestions: mockSuggestions,
          codebasePath: '/tmp/test',
        });

      expect(response.status).toBe(207); // Multi-Status
      expect(response.body.status).toBe('partial');
      expect(response.body.result.success).toBe(false);
      expect(response.body.result.appliedRefactorings).toHaveLength(1);
      expect(response.body.result.failedRefactorings).toHaveLength(1);
      expect(response.body.statistics.applied).toBe(1);
      expect(response.body.statistics.failed).toBe(1);
    });
  });

  describe('POST /api/refactor/:projectId/undo', () => {
    it('should reject invalid UUID format', async () => {
      const response = await request(app).post('/api/refactor/invalid-id/undo');

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_ID');
    });

    it('should reject invalid action', async () => {
      const response = await request(app)
        .post('/api/refactor/123e4567-e89b-12d3-a456-426614174000/undo')
        .send({ action: 'invalid' });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_ACTION');
    });

    it('should return 404 for non-existent project', async () => {
      (ProjectModel.prototype.findById as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .post('/api/refactor/123e4567-e89b-12d3-a456-426614174000/undo')
        .send({ action: 'last' });

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('PROJECT_NOT_FOUND');
    });

    it('should return 404 when nothing to undo', async () => {
      const mockProject = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Project',
        sourceType: 'github',
        status: 'completed',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (ProjectModel.prototype.findById as jest.Mock).mockResolvedValue(mockProject);
      (RefactoringOrchestrator.prototype.undoLastRefactoring as jest.Mock).mockResolvedValue({
        success: false,
        error: 'No refactorings to undo',
      });

      const response = await request(app)
        .post('/api/refactor/123e4567-e89b-12d3-a456-426614174000/undo')
        .send({ action: 'last' });

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('NOTHING_TO_UNDO');
    });

    it('should undo last refactoring successfully', async () => {
      const mockProject = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Project',
        sourceType: 'github',
        status: 'completed',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockRefactoring = {
        id: 'ref-1',
        projectId: mockProject.id,
        type: 'rename',
        status: 'reverted',
        beforeCode: 'let x = 5;',
        afterCode: 'let count = 5;',
        diff: '- let x = 5;\n+ let count = 5;',
        testsPassed: true,
        appliedAt: new Date(),
        revertedAt: new Date(),
      };

      (ProjectModel.prototype.findById as jest.Mock).mockResolvedValue(mockProject);
      (RefactoringOrchestrator.prototype.undoLastRefactoring as jest.Mock).mockResolvedValue({
        success: true,
        refactoring: mockRefactoring,
      });

      const response = await request(app)
        .post('/api/refactor/123e4567-e89b-12d3-a456-426614174000/undo')
        .send({ action: 'last' });

      expect(response.status).toBe(200);
      expect(response.body.projectId).toBe(mockProject.id);
      expect(response.body.status).toBe('completed');
      expect(response.body.undoneRefactoring).toBeDefined();
      expect(response.body.undoneRefactoring.id).toBe('ref-1');
    });

    it('should undo all refactorings successfully', async () => {
      const mockProject = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Project',
        sourceType: 'github',
        status: 'completed',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (ProjectModel.prototype.findById as jest.Mock).mockResolvedValue(mockProject);
      (RefactoringOrchestrator.prototype.undoAllRefactorings as jest.Mock).mockResolvedValue({
        success: true,
        count: 3,
      });

      const response = await request(app)
        .post('/api/refactor/123e4567-e89b-12d3-a456-426614174000/undo')
        .send({ action: 'all' });

      expect(response.status).toBe(200);
      expect(response.body.projectId).toBe(mockProject.id);
      expect(response.body.status).toBe('completed');
      expect(response.body.undoneCount).toBe(3);
      expect(response.body.message).toContain('3 refactorings undone');
    });

    it('should default to "last" action when not specified', async () => {
      const mockProject = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Project',
        sourceType: 'github',
        status: 'completed',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockRefactoring = {
        id: 'ref-1',
        projectId: mockProject.id,
        type: 'rename',
        status: 'reverted',
        beforeCode: 'let x = 5;',
        afterCode: 'let count = 5;',
        diff: '- let x = 5;\n+ let count = 5;',
        testsPassed: true,
        appliedAt: new Date(),
        revertedAt: new Date(),
      };

      (ProjectModel.prototype.findById as jest.Mock).mockResolvedValue(mockProject);
      (RefactoringOrchestrator.prototype.undoLastRefactoring as jest.Mock).mockResolvedValue({
        success: true,
        refactoring: mockRefactoring,
      });

      const response = await request(app)
        .post('/api/refactor/123e4567-e89b-12d3-a456-426614174000/undo')
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.undoneRefactoring).toBeDefined();
    });
  });

  describe('GET /api/refactor/:projectId/history', () => {
    it('should reject invalid UUID format', async () => {
      const response = await request(app).get('/api/refactor/invalid-id/history');

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_ID');
    });

    it('should return 404 for non-existent project', async () => {
      (ProjectModel.prototype.findById as jest.Mock).mockResolvedValue(null);

      const response = await request(app).get(
        '/api/refactor/123e4567-e89b-12d3-a456-426614174000/history'
      );

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('PROJECT_NOT_FOUND');
    });

    it('should return empty history', async () => {
      const mockProject = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Project',
        sourceType: 'github',
        status: 'completed',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (ProjectModel.prototype.findById as jest.Mock).mockResolvedValue(mockProject);
      (RefactoringOrchestrator.prototype.getRefactoringHistory as jest.Mock).mockReturnValue([]);

      const response = await request(app).get(
        '/api/refactor/123e4567-e89b-12d3-a456-426614174000/history'
      );

      expect(response.status).toBe(200);
      expect(response.body.projectId).toBe(mockProject.id);
      expect(response.body.history).toEqual([]);
      expect(response.body.statistics.total).toBe(0);
    });

    it('should return refactoring history with statistics', async () => {
      const mockProject = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Project',
        sourceType: 'github',
        status: 'completed',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockHistory = [
        {
          id: 'ref-1',
          projectId: mockProject.id,
          type: 'rename',
          status: 'applied',
          beforeCode: 'let x = 5;',
          afterCode: 'let count = 5;',
          diff: '- let x = 5;\n+ let count = 5;',
          testsPassed: true,
          appliedAt: new Date(),
        },
        {
          id: 'ref-2',
          projectId: mockProject.id,
          type: 'extract_method',
          status: 'reverted',
          beforeCode: 'function test() {}',
          afterCode: 'function test() { helper(); }',
          diff: 'diff',
          testsPassed: false,
          appliedAt: new Date(),
          revertedAt: new Date(),
        },
        {
          id: 'ref-3',
          projectId: mockProject.id,
          type: 'rename',
          status: 'failed',
          beforeCode: 'let y = 10;',
          afterCode: 'let total = 10;',
          diff: 'diff',
          testsPassed: false,
        },
      ];

      (ProjectModel.prototype.findById as jest.Mock).mockResolvedValue(mockProject);
      (RefactoringOrchestrator.prototype.getRefactoringHistory as jest.Mock).mockReturnValue(
        mockHistory
      );

      const response = await request(app).get(
        '/api/refactor/123e4567-e89b-12d3-a456-426614174000/history'
      );

      expect(response.status).toBe(200);
      expect(response.body.projectId).toBe(mockProject.id);
      expect(response.body.history).toHaveLength(3);
      expect(response.body.statistics.total).toBe(3);
      expect(response.body.statistics.applied).toBe(1);
      expect(response.body.statistics.reverted).toBe(1);
      expect(response.body.statistics.failed).toBe(1);
      expect(response.body.statistics.byType.rename).toBe(2);
      expect(response.body.statistics.byType.extract_method).toBe(1);
    });
  });
});
