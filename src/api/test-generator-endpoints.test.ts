// Test Generator API Endpoints Tests

import request from 'supertest';
import { ProjectModel } from '../database/models/Project';
import { AnalysisModel } from '../database/models/Analysis';

// Mock the database models and AI client before importing server
jest.mock('../database/models/Project');
jest.mock('../database/models/Analysis');
jest.mock('../test-generator/ai/AITestGenerationClient', () => {
  return {
    AITestGenerationClient: jest.fn().mockImplementation(() => ({
      generateTestLogic: jest.fn().mockResolvedValue('test code'),
      generateMockCode: jest.fn().mockResolvedValue('mock code'),
      suggestTestCases: jest.fn().mockResolvedValue('test cases'),
    })),
  };
});

// Import server after mocks are set up
import app from './server';

describe('Test Generator API Endpoints', () => {
  const mockProjectId = '123e4567-e89b-12d3-a456-426614174000';
  const mockProject = {
    id: mockProjectId,
    name: 'Test Project',
    sourceType: 'github',
    status: 'completed',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/generate-tests/:projectId', () => {
    it('should return 400 for invalid project ID', async () => {
      const response = await request(app)
        .post('/api/generate-tests/invalid-id')
        .send({
          targetType: 'function',
          targetCode: {},
          framework: 'jest',
          language: 'typescript',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_ID');
    });

    it('should return 400 for invalid target type', async () => {
      const response = await request(app)
        .post(`/api/generate-tests/${mockProjectId}`)
        .send({
          targetType: 'invalid',
          targetCode: {},
          framework: 'jest',
          language: 'typescript',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_TARGET_TYPE');
    });

    it('should return 400 for missing target code', async () => {
      const response = await request(app)
        .post(`/api/generate-tests/${mockProjectId}`)
        .send({
          targetType: 'function',
          framework: 'jest',
          language: 'typescript',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('MISSING_TARGET_CODE');
    });

    it('should return 400 for invalid framework', async () => {
      const response = await request(app)
        .post(`/api/generate-tests/${mockProjectId}`)
        .send({
          targetType: 'function',
          targetCode: {},
          framework: 'invalid',
          language: 'typescript',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_FRAMEWORK');
    });

    it('should return 400 for missing language', async () => {
      const response = await request(app)
        .post(`/api/generate-tests/${mockProjectId}`)
        .send({
          targetType: 'function',
          targetCode: {},
          framework: 'jest',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('MISSING_LANGUAGE');
    });

    it('should return 404 for non-existent project', async () => {
      (ProjectModel.prototype.findById as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .post(`/api/generate-tests/${mockProjectId}`)
        .send({
          targetType: 'function',
          targetCode: {
            name: 'testFunction',
            parameters: [],
            returnType: 'void',
            body: 'function testFunction() {}',
            location: { file: 'test.ts', line: 1 },
          },
          framework: 'jest',
          language: 'typescript',
        });

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('PROJECT_NOT_FOUND');
    });
  });

  describe('GET /api/tests/:projectId', () => {
    it('should return 400 for invalid project ID', async () => {
      const response = await request(app).get('/api/tests/invalid-id');

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_ID');
    });

    it('should return 404 for non-existent project', async () => {
      (ProjectModel.prototype.findById as jest.Mock).mockResolvedValue(null);

      const response = await request(app).get(`/api/tests/${mockProjectId}`);

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('PROJECT_NOT_FOUND');
    });

    it('should return 404 when no tests are found', async () => {
      (ProjectModel.prototype.findById as jest.Mock).mockResolvedValue(mockProject);
      (AnalysisModel.prototype.findByProjectId as jest.Mock).mockResolvedValue([]);

      const response = await request(app).get(`/api/tests/${mockProjectId}`);

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('TESTS_NOT_FOUND');
    });
  });

  describe('GET /api/coverage/:projectId', () => {
    it('should return 400 for invalid project ID', async () => {
      const response = await request(app).get('/api/coverage/invalid-id');

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_ID');
    });

    it('should return 404 for non-existent project', async () => {
      (ProjectModel.prototype.findById as jest.Mock).mockResolvedValue(null);

      const response = await request(app).get(`/api/coverage/${mockProjectId}`);

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('PROJECT_NOT_FOUND');
    });

    it('should return 404 when no analysis is found', async () => {
      (ProjectModel.prototype.findById as jest.Mock).mockResolvedValue(mockProject);
      (AnalysisModel.prototype.findLatestByProjectId as jest.Mock).mockResolvedValue(null);

      const response = await request(app).get(`/api/coverage/${mockProjectId}`);

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('ANALYSIS_NOT_FOUND');
    });
  });
});
