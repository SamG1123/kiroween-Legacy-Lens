import { CompatibilityChecker } from './CompatibilityChecker';
import { Recommendation, Dependency, CompatibilityIssue } from '../types';

describe('CompatibilityChecker', () => {
  let checker: CompatibilityChecker;

  beforeEach(() => {
    checker = new CompatibilityChecker();
  });

  describe('checkDependencyCompatibility', () => {
    it('should detect version conflicts when multiple versions of same dependency exist', async () => {
      const dependencies: Dependency[] = [
        { name: 'lodash', version: '4.17.0', type: 'production', ecosystem: 'npm' },
        { name: 'lodash', version: '3.10.0', type: 'production', ecosystem: 'npm' },
      ];

      const issues = await checker.checkDependencyCompatibility(dependencies);

      expect(issues.length).toBeGreaterThan(0);
      const versionConflict = issues.find(i => i.type === 'version_conflict');
      expect(versionConflict).toBeDefined();
      expect(versionConflict?.affectedDependencies).toContain('lodash');
    });

    it('should not report conflicts when same version is used', async () => {
      const dependencies: Dependency[] = [
        { name: 'lodash', version: '4.17.21', type: 'production', ecosystem: 'npm' },
        { name: 'lodash', version: '4.17.21', type: 'production', ecosystem: 'npm' },
      ];

      const issues = await checker.checkDependencyCompatibility(dependencies);

      const versionConflicts = issues.filter(i => i.type === 'version_conflict');
      expect(versionConflicts.length).toBe(0);
    });

    it('should handle empty dependency list', async () => {
      const dependencies: Dependency[] = [];

      const issues = await checker.checkDependencyCompatibility(dependencies);

      expect(issues).toEqual([]);
    });
  });

  describe('checkLanguageCompatibility', () => {
    it('should return true for compatible Node.js versions', () => {
      const dep: Dependency = {
        name: 'express',
        version: '4.18.0',
        type: 'production',
        ecosystem: 'npm',
      };

      const result = checker.checkLanguageCompatibility(dep, '4.18.0', '16.0.0');

      expect(result).toBe(true);
    });

    it('should return false for old Node.js versions', () => {
      const dep: Dependency = {
        name: 'express',
        version: '4.18.0',
        type: 'production',
        ecosystem: 'npm',
      };

      const result = checker.checkLanguageCompatibility(dep, '4.18.0', '12.0.0');

      expect(result).toBe(false);
    });

    it('should default to true for non-npm ecosystems', () => {
      const dep: Dependency = {
        name: 'requests',
        version: '2.28.0',
        type: 'production',
        ecosystem: 'pypi',
      };

      const result = checker.checkLanguageCompatibility(dep, '2.28.0', '3.9.0');

      expect(result).toBe(true);
    });
  });

  describe('checkCompatibility', () => {
    it('should orchestrate all compatibility checks', async () => {
      const recommendations: Recommendation[] = [
        {
          id: '1',
          type: 'dependency',
          title: 'Update lodash',
          description: 'Update lodash to latest version',
          currentState: 'lodash@4.17.0',
          suggestedState: 'lodash@4.17.21',
          benefits: ['Security fixes'],
          effort: 'low',
          priority: 'high',
          migrationSteps: [],
          resources: [],
          automatedTools: [],
        },
      ];

      const report = await checker.checkCompatibility(recommendations);

      expect(report).toBeDefined();
      expect(report.compatible).toBeDefined();
      expect(report.issues).toBeDefined();
      expect(report.resolutions).toBeDefined();
      expect(Array.isArray(report.issues)).toBe(true);
      expect(Array.isArray(report.resolutions)).toBe(true);
    });

    it('should mark as compatible when no error-level issues exist', async () => {
      const recommendations: Recommendation[] = [];

      const report = await checker.checkCompatibility(recommendations);

      expect(report.compatible).toBe(true);
    });
  });

  describe('resolveConflicts', () => {
    it('should provide resolutions for version conflicts', async () => {
      const issues: CompatibilityIssue[] = [
        {
          type: 'version_conflict',
          description: 'Multiple incompatible versions of lodash required: 4.17.0, 3.10.0',
          affectedDependencies: ['lodash'],
          severity: 'error',
        },
      ];

      const resolutions = await checker.resolveConflicts(issues);

      expect(resolutions.length).toBe(1);
      expect(resolutions[0].issue).toBe(issues[0]);
      expect(resolutions[0].solution).toBeDefined();
      expect(typeof resolutions[0].solution).toBe('string');
    });

    it('should provide resolutions for peer dependency issues', async () => {
      const issues: CompatibilityIssue[] = [
        {
          type: 'peer_dependency',
          description: 'react-dom@18.0.0 requires missing peer dependencies: react',
          affectedDependencies: ['react-dom', 'react'],
          severity: 'warning',
        },
      ];

      const resolutions = await checker.resolveConflicts(issues);

      expect(resolutions.length).toBe(1);
      expect(resolutions[0].solution).toContain('Install');
    });

    it('should provide resolutions for language incompatibility', async () => {
      const issues: CompatibilityIssue[] = [
        {
          type: 'language_incompatibility',
          description: 'Package requires Node.js 16+',
          affectedDependencies: ['some-package'],
          severity: 'error',
        },
      ];

      const resolutions = await checker.resolveConflicts(issues);

      expect(resolutions.length).toBe(1);
      expect(resolutions[0].solution).toContain('Upgrade');
    });
  });
});
