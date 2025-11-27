import { DependencyAnalyzer } from './DependencyAnalyzer';
import { Dependency } from '../types';

describe('DependencyAnalyzer', () => {
  let analyzer: DependencyAnalyzer;

  beforeEach(() => {
    analyzer = new DependencyAnalyzer();
  });

  describe('categorizeUpdate', () => {
    it('should categorize major version updates', () => {
      const category = analyzer.categorizeUpdate('1.0.0', '2.0.0');
      expect(category).toBe('major');
    });

    it('should categorize minor version updates', () => {
      const category = analyzer.categorizeUpdate('1.0.0', '1.1.0');
      expect(category).toBe('minor');
    });

    it('should categorize patch version updates', () => {
      const category = analyzer.categorizeUpdate('1.0.0', '1.0.1');
      expect(category).toBe('patch');
    });

    it('should handle versions with v prefix', () => {
      const category = analyzer.categorizeUpdate('v1.0.0', 'v2.0.0');
      expect(category).toBe('major');
    });

    it('should handle same versions', () => {
      const category = analyzer.categorizeUpdate('1.0.0', '1.0.0');
      expect(category).toBe('patch');
    });

    it('should default to major for invalid versions', () => {
      const category = analyzer.categorizeUpdate('invalid', 'also-invalid');
      expect(category).toBe('major');
    });
  });

  describe('checkLatestVersion', () => {
    it('should throw error for unsupported ecosystem', async () => {
      const dependency: Dependency = {
        name: 'test-package',
        version: '1.0.0',
        type: 'production',
        ecosystem: 'rubygems',
      };

      await expect(analyzer.checkLatestVersion(dependency)).rejects.toThrow(
        'RubyGems ecosystem not yet implemented'
      );
    });

    it('should throw error for invalid Maven dependency format', async () => {
      const dependency: Dependency = {
        name: 'invalid-format',
        version: '1.0.0',
        type: 'production',
        ecosystem: 'maven',
      };

      await expect(analyzer.checkLatestVersion(dependency)).rejects.toThrow(
        'Invalid Maven dependency format'
      );
    });
  });

  describe('checkDeprecationStatus', () => {
    it('should return not deprecated for unknown packages', async () => {
      const dependency: Dependency = {
        name: 'unknown-package',
        version: '1.0.0',
        type: 'production',
        ecosystem: 'npm',
      };

      const result = await analyzer.checkDeprecationStatus(dependency);
      expect(result.isDeprecated).toBe(false);
    });
  });
});
