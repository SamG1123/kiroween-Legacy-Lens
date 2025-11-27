import { FrameworkAnalyzer } from './FrameworkAnalyzer';
import { Framework, BreakingChange, EffortEstimate } from '../types';
import { NpmRegistryClient } from '../clients/NpmRegistryClient';
import { getCacheClient } from '../clients/CacheClient';

// Mock the dependencies
jest.mock('../clients/NpmRegistryClient');
jest.mock('../clients/CacheClient');

describe('FrameworkAnalyzer', () => {
  let analyzer: FrameworkAnalyzer;
  let mockNpmClient: jest.Mocked<NpmRegistryClient>;
  let mockCache: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup cache mock
    mockCache = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
    };
    (getCacheClient as jest.Mock).mockReturnValue(mockCache);

    // Setup npm client mock
    mockNpmClient = {
      getLatestVersion: jest.fn(),
      getPackageInfo: jest.fn(),
      getVersionInfo: jest.fn(),
      getDeprecationInfo: jest.fn(),
    } as any;
    (NpmRegistryClient as jest.Mock).mockImplementation(() => mockNpmClient);

    analyzer = new FrameworkAnalyzer();
  });

  describe('getLatestVersion', () => {
    it('should return latest version for known npm framework', async () => {
      const framework: Framework = {
        name: 'react',
        version: '17.0.0',
        type: 'frontend',
      };

      mockNpmClient.getLatestVersion.mockResolvedValue('18.2.0');

      const result = await analyzer.getLatestVersion(framework);

      expect(result).toBe('18.2.0');
      expect(mockNpmClient.getLatestVersion).toHaveBeenCalledWith('react');
    });

    it('should use cached version if available', async () => {
      const framework: Framework = {
        name: 'react',
        version: '17.0.0',
        type: 'frontend',
      };

      mockCache.get.mockResolvedValue('18.2.0');

      const result = await analyzer.getLatestVersion(framework);

      expect(result).toBe('18.2.0');
      expect(mockNpmClient.getLatestVersion).not.toHaveBeenCalled();
    });

    it('should throw error for unknown framework', async () => {
      const framework: Framework = {
        name: 'unknown-framework',
        version: '1.0.0',
        type: 'frontend',
      };

      await expect(analyzer.getLatestVersion(framework)).rejects.toThrow(
        'Unknown framework: unknown-framework'
      );
    });
  });

  describe('getBreakingChanges', () => {
    it('should return empty array when versions are the same', async () => {
      const framework: Framework = {
        name: 'react',
        version: '18.0.0',
        type: 'frontend',
      };

      const result = await analyzer.getBreakingChanges(framework, '18.0.0', '18.0.0');

      expect(result).toEqual([]);
    });

    it('should return breaking changes for major version upgrade', async () => {
      const framework: Framework = {
        name: 'react',
        version: '17.0.0',
        type: 'frontend',
      };

      const result = await analyzer.getBreakingChanges(framework, '17.0.0', '18.0.0');

      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('description');
      expect(result[0]).toHaveProperty('affectedAPIs');
      expect(result[0]).toHaveProperty('migrationPath');
    });

    it('should use cached breaking changes if available', async () => {
      const framework: Framework = {
        name: 'react',
        version: '17.0.0',
        type: 'frontend',
      };

      const cachedChanges: BreakingChange[] = [
        {
          description: 'Cached change',
          affectedAPIs: ['API1'],
          migrationPath: 'Do this',
        },
      ];

      mockCache.get.mockResolvedValue(cachedChanges);

      const result = await analyzer.getBreakingChanges(framework, '17.0.0', '18.0.0');

      expect(result).toEqual(cachedChanges);
    });
  });

  describe('getMigrationGuide', () => {
    it('should return migration guide with URL and steps', async () => {
      const framework: Framework = {
        name: 'react',
        version: '17.0.0',
        type: 'frontend',
      };

      const result = await analyzer.getMigrationGuide(framework, '17.0.0', '18.0.0');

      expect(result).toHaveProperty('url');
      expect(result).toHaveProperty('steps');
      expect(result).toHaveProperty('automatedTools');
      expect(result.url).toBeTruthy();
      expect(result.steps.length).toBeGreaterThan(0);
    });

    it('should include framework-specific automated tools', async () => {
      const framework: Framework = {
        name: 'react',
        version: '17.0.0',
        type: 'frontend',
      };

      const result = await analyzer.getMigrationGuide(framework, '17.0.0', '18.0.0');

      expect(result.automatedTools).toContain('react-codemod');
    });
  });

  describe('estimateUpgradeEffort', () => {
    it('should return low effort for no breaking changes', () => {
      const framework: Framework = {
        name: 'react',
        version: '18.0.0',
        type: 'frontend',
      };

      const result = analyzer.estimateUpgradeEffort(framework, []);

      expect(result).toBe('low');
    });

    it('should return medium effort for few breaking changes', () => {
      const framework: Framework = {
        name: 'react',
        version: '17.0.0',
        type: 'frontend',
      };

      const breakingChanges: BreakingChange[] = [
        {
          description: 'Change 1',
          affectedAPIs: ['API1'],
          migrationPath: 'Path 1',
        },
        {
          description: 'Change 2',
          affectedAPIs: ['API2'],
          migrationPath: 'Path 2',
        },
      ];

      const result = analyzer.estimateUpgradeEffort(framework, breakingChanges);

      expect(result).toBe('medium');
    });

    it('should return high effort for many breaking changes', () => {
      const framework: Framework = {
        name: 'react',
        version: '16.0.0',
        type: 'frontend',
      };

      const breakingChanges: BreakingChange[] = Array(6).fill({
        description: 'Change',
        affectedAPIs: ['API'],
        migrationPath: 'Path',
      });

      const result = analyzer.estimateUpgradeEffort(framework, breakingChanges);

      expect(result).toBe('high');
    });

    it('should increase effort for complex frameworks', () => {
      const framework: Framework = {
        name: 'angular',
        version: '12.0.0',
        type: 'frontend',
      };

      const breakingChanges: BreakingChange[] = [
        {
          description: 'Change 1',
          affectedAPIs: ['API1'],
          migrationPath: 'Path 1',
        },
      ];

      const result = analyzer.estimateUpgradeEffort(framework, breakingChanges);

      // Angular is complex, so even with few changes, effort should be at least medium
      expect(['medium', 'high']).toContain(result);
    });
  });

  describe('analyzeFrameworks', () => {
    it('should analyze multiple frameworks', async () => {
      const frameworks: Framework[] = [
        { name: 'react', version: '17.0.0', type: 'frontend' },
        { name: 'express', version: '4.17.0', type: 'backend' },
      ];

      mockNpmClient.getLatestVersion
        .mockResolvedValueOnce('18.2.0')
        .mockResolvedValueOnce('4.18.2');

      const results = await analyzer.analyzeFrameworks(frameworks);

      expect(results).toHaveLength(2);
      expect(results[0].framework.name).toBe('react');
      expect(results[0].latestVersion).toBe('18.2.0');
      expect(results[1].framework.name).toBe('express');
      expect(results[1].latestVersion).toBe('4.18.2');
    });

    it('should continue analyzing even if one framework fails', async () => {
      const frameworks: Framework[] = [
        { name: 'unknown', version: '1.0.0', type: 'frontend' },
        { name: 'react', version: '17.0.0', type: 'frontend' },
      ];

      mockNpmClient.getLatestVersion.mockResolvedValue('18.2.0');

      const results = await analyzer.analyzeFrameworks(frameworks);

      // Should only have result for react, unknown framework should be skipped
      expect(results).toHaveLength(1);
      expect(results[0].framework.name).toBe('react');
    });
  });
});
