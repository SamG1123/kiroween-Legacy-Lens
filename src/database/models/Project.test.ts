import { Pool } from 'pg';
import { ProjectModel } from './Project';
import { ProjectStatus, SourceType } from '../../types';

// Mock pool for testing
const mockPool = {
  query: jest.fn(),
} as unknown as Pool;

describe('ProjectModel', () => {
  let projectModel: ProjectModel;

  beforeEach(() => {
    projectModel = new ProjectModel(mockPool);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new project with generated UUID', async () => {
      const mockProject = {
        id: 'test-uuid',
        name: 'Test Project',
        source_type: 'github',
        source_url: 'https://github.com/test/repo',
        status: 'pending',
        created_at: new Date(),
        updated_at: new Date(),
      };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [mockProject],
      });

      const result = await projectModel.create({
        name: 'Test Project',
        sourceType: 'github',
        sourceUrl: 'https://github.com/test/repo',
      });

      expect(result.name).toBe('Test Project');
      expect(result.sourceType).toBe('github');
      expect(result.status).toBe('pending');
      expect(mockPool.query).toHaveBeenCalledTimes(1);
    });

    it('should create a project with custom status', async () => {
      const mockProject = {
        id: 'test-uuid',
        name: 'Test Project',
        source_type: 'zip',
        source_url: null,
        status: 'analyzing',
        created_at: new Date(),
        updated_at: new Date(),
      };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [mockProject],
      });

      const result = await projectModel.create({
        name: 'Test Project',
        sourceType: 'zip',
        status: 'analyzing',
      });

      expect(result.status).toBe('analyzing');
      expect(result.sourceUrl).toBeNull();
    });
  });

  describe('findById', () => {
    it('should return a project when found', async () => {
      const mockProject = {
        id: 'test-uuid',
        name: 'Test Project',
        source_type: 'github',
        source_url: 'https://github.com/test/repo',
        status: 'completed',
        created_at: new Date(),
        updated_at: new Date(),
      };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [mockProject],
      });

      const result = await projectModel.findById('test-uuid');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('test-uuid');
      expect(result?.name).toBe('Test Project');
    });

    it('should return null when project not found', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [],
      });

      const result = await projectModel.findById('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('updateStatus', () => {
    it('should update project status', async () => {
      const mockProject = {
        id: 'test-uuid',
        name: 'Test Project',
        source_type: 'github',
        source_url: 'https://github.com/test/repo',
        status: 'completed',
        created_at: new Date(),
        updated_at: new Date(),
      };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [mockProject],
      });

      const result = await projectModel.updateStatus('test-uuid', 'completed');

      expect(result).not.toBeNull();
      expect(result?.status).toBe('completed');
    });
  });

  describe('findByStatus', () => {
    it('should return projects with matching status', async () => {
      const mockProjects = [
        {
          id: 'uuid-1',
          name: 'Project 1',
          source_type: 'github',
          source_url: 'https://github.com/test/repo1',
          status: 'pending',
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: 'uuid-2',
          name: 'Project 2',
          source_type: 'zip',
          source_url: null,
          status: 'pending',
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: mockProjects,
      });

      const result = await projectModel.findByStatus('pending');

      expect(result).toHaveLength(2);
      expect(result[0].status).toBe('pending');
      expect(result[1].status).toBe('pending');
    });
  });

  describe('delete', () => {
    it('should return true when project is deleted', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rowCount: 1,
      });

      const result = await projectModel.delete('test-uuid');

      expect(result).toBe(true);
    });

    it('should return false when project does not exist', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rowCount: 0,
      });

      const result = await projectModel.delete('non-existent-id');

      expect(result).toBe(false);
    });
  });
});
