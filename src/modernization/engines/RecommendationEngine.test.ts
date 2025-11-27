import { RecommendationEngine } from './RecommendationEngine';
import {
  DependencyAnalysis,
  FrameworkAnalysis,
  PatternAnalysis,
  Dependency,
  Framework,
  PatternMatch,
} from '../types';

describe('RecommendationEngine', () => {
  let engine: RecommendationEngine;

  beforeEach(() => {
    engine = new RecommendationEngine();
  });

  describe('createDependencyRecommendation', () => {
    it('should create recommendation for outdated dependency', () => {
      const analysis: DependencyAnalysis = {
        dependency: {
          name: 'lodash',
          version: '4.17.15',
          type: 'production',
          ecosystem: 'npm',
        },
        currentVersion: '4.17.15',
        latestVersion: '4.17.21',
        updateCategory: 'patch',
        isDeprecated: false,
        vulnerabilities: [],
      };

      const recommendation = engine.createDependencyRecommendation(analysis);

      expect(recommendation).toBeDefined();
      expect(recommendation?.type).toBe('dependency');
      expect(recommendation?.title).toContain('lodash');
      expect(recommendation?.currentState).toBe('lodash@4.17.15');
      expect(recommendation?.suggestedState).toBe('lodash@4.17.21');
      expect(recommendation?.benefits).toBeDefined();
      expect(recommendation?.benefits.length).toBeGreaterThan(0);
      expect(recommendation?.migrationSteps).toBeDefined();
      expect(recommendation?.migrationSteps.length).toBeGreaterThan(0);
      expect(recommendation?.resources).toBeDefined();
      expect(recommendation?.automatedTools).toBeDefined();
    });

    it('should return null for dependency already on latest version', () => {
      const analysis: DependencyAnalysis = {
        dependency: {
          name: 'lodash',
          version: '4.17.21',
          type: 'production',
          ecosystem: 'npm',
        },
        currentVersion: '4.17.21',
        latestVersion: '4.17.21',
        updateCategory: 'patch',
        isDeprecated: false,
        vulnerabilities: [],
      };

      const recommendation = engine.createDependencyRecommendation(analysis);

      expect(recommendation).toBeNull();
    });

    it('should assign critical priority for critical vulnerabilities', () => {
      const analysis: DependencyAnalysis = {
        dependency: {
          name: 'express',
          version: '4.17.0',
          type: 'production',
          ecosystem: 'npm',
        },
        currentVersion: '4.17.0',
        latestVersion: '4.18.2',
        updateCategory: 'minor',
        isDeprecated: false,
        vulnerabilities: [
          {
            id: 'CVE-2022-24999',
            severity: 'critical',
            description: 'Critical security vulnerability',
            fixedIn: '4.18.0',
          },
        ],
      };

      const recommendation = engine.createDependencyRecommendation(analysis);

      expect(recommendation?.priority).toBe('critical');
      expect(recommendation?.benefits.some(b => b.includes('security'))).toBe(true);
    });

    it('should assign high priority for deprecated packages', () => {
      const analysis: DependencyAnalysis = {
        dependency: {
          name: 'request',
          version: '2.88.0',
          type: 'production',
          ecosystem: 'npm',
        },
        currentVersion: '2.88.0',
        latestVersion: '2.88.2',
        updateCategory: 'patch',
        isDeprecated: true,
        deprecationInfo: {
          isDeprecated: true,
          reason: 'Package is deprecated',
          alternatives: ['axios', 'node-fetch'],
        },
        vulnerabilities: [],
        alternatives: ['axios', 'node-fetch'],
      };

      const recommendation = engine.createDependencyRecommendation(analysis);

      expect(recommendation?.priority).toBe('high');
      expect(recommendation?.description).toContain('deprecated');
    });
  });

  describe('createFrameworkRecommendation', () => {
    it('should create recommendation for outdated framework', () => {
      const analysis: FrameworkAnalysis = {
        framework: {
          name: 'react',
          version: '17.0.2',
          type: 'frontend',
        },
        currentVersion: '17.0.2',
        latestVersion: '18.2.0',
        breakingChanges: [
          {
            description: 'Automatic batching',
            affectedAPIs: ['setState'],
            migrationPath: 'Review state updates',
          },
        ],
        migrationGuide: {
          url: 'https://react.dev/blog',
          steps: ['Update package.json', 'Run tests'],
          automatedTools: ['react-codemod'],
        },
        effortEstimate: 'medium',
      };

      const recommendation = engine.createFrameworkRecommendation(analysis);

      expect(recommendation).toBeDefined();
      expect(recommendation?.type).toBe('framework');
      expect(recommendation?.title).toContain('react');
      expect(recommendation?.effort).toBe('medium');
      expect(recommendation?.priority).toBe('high');
      expect(recommendation?.benefits).toBeDefined();
      expect(recommendation?.benefits.length).toBeGreaterThan(0);
      expect(recommendation?.migrationSteps).toBeDefined();
      expect(recommendation?.automatedTools).toContain('react-codemod');
    });

    it('should return null for framework already on latest version', () => {
      const analysis: FrameworkAnalysis = {
        framework: {
          name: 'react',
          version: '18.2.0',
          type: 'frontend',
        },
        currentVersion: '18.2.0',
        latestVersion: '18.2.0',
        breakingChanges: [],
        migrationGuide: {
          url: '',
          steps: [],
          automatedTools: [],
        },
        effortEstimate: 'low',
      };

      const recommendation = engine.createFrameworkRecommendation(analysis);

      expect(recommendation).toBeNull();
    });

    it('should assign high priority when breaking changes exist', () => {
      const analysis: FrameworkAnalysis = {
        framework: {
          name: 'vue',
          version: '2.7.0',
          type: 'frontend',
        },
        currentVersion: '2.7.0',
        latestVersion: '3.3.0',
        breakingChanges: [
          {
            description: 'Composition API changes',
            affectedAPIs: ['setup'],
            migrationPath: 'Update to new API',
          },
        ],
        migrationGuide: {
          url: 'https://v3-migration.vuejs.org/',
          steps: [],
          automatedTools: [],
        },
        effortEstimate: 'high',
      };

      const recommendation = engine.createFrameworkRecommendation(analysis);

      expect(recommendation?.priority).toBe('high');
    });
  });

  describe('createPatternRecommendation', () => {
    it('should create recommendation for callback patterns', () => {
      const matches: PatternMatch[] = [
        {
          file: 'src/utils.js',
          line: 10,
          code: 'fs.readFile(path, callback)',
          patternType: 'callback-pattern',
        },
        {
          file: 'src/helpers.js',
          line: 25,
          code: 'fs.writeFile(path, data, callback)',
          patternType: 'callback-pattern',
        },
      ];

      const analysis: PatternAnalysis = {
        pattern: 'callback-pattern',
        occurrences: matches,
        modernAlternative: 'async/await',
        benefits: ['Better readability', 'Easier error handling'],
        migrationComplexity: 'medium',
      };

      const recommendation = engine.createPatternRecommendation(analysis);

      expect(recommendation).toBeDefined();
      expect(recommendation?.type).toBe('pattern');
      expect(recommendation?.title).toContain('callback-based async code');
      expect(recommendation?.title).toContain('2 occurrences');
      expect(recommendation?.effort).toBe('medium');
      expect(recommendation?.priority).toBe('medium');
      expect(recommendation?.codeExamples).toBeDefined();
      expect(recommendation?.codeExamples?.before).toContain('readFile');
      expect(recommendation?.codeExamples?.after).toContain('await');
    });

    it('should return null for patterns with no occurrences', () => {
      const analysis: PatternAnalysis = {
        pattern: 'var-declaration',
        occurrences: [],
        modernAlternative: 'let/const',
        benefits: ['Block scoping'],
        migrationComplexity: 'low',
      };

      const recommendation = engine.createPatternRecommendation(analysis);

      expect(recommendation).toBeNull();
    });

    it('should handle singular occurrence correctly', () => {
      const matches: PatternMatch[] = [
        {
          file: 'src/old.js',
          line: 5,
          code: 'var x = 10;',
          patternType: 'var-declaration',
        },
      ];

      const analysis: PatternAnalysis = {
        pattern: 'var-declaration',
        occurrences: matches,
        modernAlternative: 'let/const',
        benefits: ['Block scoping'],
        migrationComplexity: 'low',
      };

      const recommendation = engine.createPatternRecommendation(analysis);

      expect(recommendation?.title).toContain('1 occurrence');
      expect(recommendation?.title).not.toContain('occurrences');
    });
  });

  describe('generateRecommendations', () => {
    it('should generate all types of recommendations', () => {
      const dependencyAnalyses: DependencyAnalysis[] = [
        {
          dependency: {
            name: 'lodash',
            version: '4.17.15',
            type: 'production',
            ecosystem: 'npm',
          },
          currentVersion: '4.17.15',
          latestVersion: '4.17.21',
          updateCategory: 'patch',
          isDeprecated: false,
          vulnerabilities: [],
        },
      ];

      const frameworkAnalyses: FrameworkAnalysis[] = [
        {
          framework: {
            name: 'react',
            version: '17.0.2',
            type: 'frontend',
          },
          currentVersion: '17.0.2',
          latestVersion: '18.2.0',
          breakingChanges: [],
          migrationGuide: {
            url: '',
            steps: [],
            automatedTools: [],
          },
          effortEstimate: 'medium',
        },
      ];

      const patternAnalyses: PatternAnalysis[] = [
        {
          pattern: 'var-declaration',
          occurrences: [
            {
              file: 'src/old.js',
              line: 5,
              code: 'var x = 10;',
              patternType: 'var-declaration',
            },
          ],
          modernAlternative: 'let/const',
          benefits: ['Block scoping'],
          migrationComplexity: 'low',
        },
      ];

      const recommendations = engine.generateRecommendations(
        dependencyAnalyses,
        frameworkAnalyses,
        patternAnalyses
      );

      expect(recommendations).toHaveLength(3);
      expect(recommendations.filter(r => r.type === 'dependency')).toHaveLength(1);
      expect(recommendations.filter(r => r.type === 'framework')).toHaveLength(1);
      expect(recommendations.filter(r => r.type === 'pattern')).toHaveLength(1);
    });

    it('should skip items that do not need recommendations', () => {
      const dependencyAnalyses: DependencyAnalysis[] = [
        {
          dependency: {
            name: 'lodash',
            version: '4.17.21',
            type: 'production',
            ecosystem: 'npm',
          },
          currentVersion: '4.17.21',
          latestVersion: '4.17.21',
          updateCategory: 'patch',
          isDeprecated: false,
          vulnerabilities: [],
        },
      ];

      const frameworkAnalyses: FrameworkAnalysis[] = [
        {
          framework: {
            name: 'react',
            version: '18.2.0',
            type: 'frontend',
          },
          currentVersion: '18.2.0',
          latestVersion: '18.2.0',
          breakingChanges: [],
          migrationGuide: {
            url: '',
            steps: [],
            automatedTools: [],
          },
          effortEstimate: 'low',
        },
      ];

      const patternAnalyses: PatternAnalysis[] = [
        {
          pattern: 'var-declaration',
          occurrences: [],
          modernAlternative: 'let/const',
          benefits: ['Block scoping'],
          migrationComplexity: 'low',
        },
      ];

      const recommendations = engine.generateRecommendations(
        dependencyAnalyses,
        frameworkAnalyses,
        patternAnalyses
      );

      expect(recommendations).toHaveLength(0);
    });
  });
});
