import { PriorityRanker } from './PriorityRanker';
import { Recommendation, Priority } from '../types';

describe('PriorityRanker', () => {
  let ranker: PriorityRanker;

  beforeEach(() => {
    ranker = new PriorityRanker();
  });

  describe('calculatePriority', () => {
    it('should assign critical priority to recommendations with critical security vulnerabilities', () => {
      const recommendation: Recommendation = {
        id: '1',
        type: 'dependency',
        title: 'Update package',
        description: 'Contains critical security vulnerability CVE-2023-1234',
        currentState: 'package@1.0.0',
        suggestedState: 'package@2.0.0',
        benefits: ['Fixes critical security vulnerability'],
        effort: 'low',
        priority: 'low', // Will be recalculated
        migrationSteps: ['Update package'],
        resources: [],
        automatedTools: [],
      };

      const priority = ranker.calculatePriority(recommendation);
      expect(priority).toBe('critical');
    });

    it('should assign critical priority to recommendations with high severity vulnerabilities', () => {
      const recommendation: Recommendation = {
        id: '2',
        type: 'dependency',
        title: 'Update package',
        description: 'Contains high severity security vulnerability',
        currentState: 'package@1.0.0',
        suggestedState: 'package@2.0.0',
        benefits: ['Improves security'],
        effort: 'low',
        priority: 'low',
        migrationSteps: ['Update package'],
        resources: [],
        automatedTools: [],
      };

      const priority = ranker.calculatePriority(recommendation);
      expect(priority).toBe('critical');
    });

    it('should assign high priority to deprecated packages', () => {
      const recommendation: Recommendation = {
        id: '3',
        type: 'dependency',
        title: 'Replace deprecated package',
        description: 'This package is deprecated and no longer maintained',
        currentState: 'old-package@1.0.0',
        suggestedState: 'new-package@1.0.0',
        benefits: ['Use maintained alternative'],
        effort: 'medium',
        priority: 'low',
        migrationSteps: ['Replace package'],
        resources: [],
        automatedTools: [],
      };

      const priority = ranker.calculatePriority(recommendation);
      expect(priority).toBe('high');
    });

    it('should assign high priority to recommendations with breaking changes', () => {
      const recommendation: Recommendation = {
        id: '4',
        type: 'framework',
        title: 'Upgrade framework',
        description: 'This upgrade includes breaking changes that require code modifications',
        currentState: 'framework@1.0.0',
        suggestedState: 'framework@2.0.0',
        benefits: ['New features'],
        effort: 'high',
        priority: 'low',
        migrationSteps: ['Update code'],
        resources: [],
        automatedTools: [],
      };

      const priority = ranker.calculatePriority(recommendation);
      expect(priority).toBe('high');
    });

    it('should assign appropriate priority based on effort-benefit ratio', () => {
      const recommendation: Recommendation = {
        id: '5',
        type: 'framework',
        title: 'Update to major version',
        description: 'A major version update is available',
        currentState: 'package@1.0.0',
        suggestedState: 'package@2.0.0',
        benefits: [
          'New features',
          'Better performance',
          'Improved stability',
          'Enhanced compatibility',
        ],
        effort: 'low',
        priority: 'low',
        migrationSteps: [
          'Update package',
          'Test',
          'Review changes',
          'Update documentation',
        ],
        resources: [],
        automatedTools: [],
      };

      const priority = ranker.calculatePriority(recommendation);
      // Framework with multiple benefits and low effort should get medium priority
      expect(['medium', 'low']).toContain(priority);
    });

    it('should assign low priority to minor/patch updates', () => {
      const recommendation: Recommendation = {
        id: '6',
        type: 'dependency',
        title: 'Update to patch version',
        description: 'A patch version update is available',
        currentState: 'package@1.0.0',
        suggestedState: 'package@1.0.1',
        benefits: ['Bug fixes'],
        effort: 'low',
        priority: 'low',
        migrationSteps: ['Update package'],
        resources: [],
        automatedTools: [],
      };

      const priority = ranker.calculatePriority(recommendation);
      expect(priority).toBe('low');
    });
  });

  describe('scoreRecommendation', () => {
    it('should give higher scores to security vulnerabilities', () => {
      const securityRec: Recommendation = {
        id: '1',
        type: 'dependency',
        title: 'Security update',
        description: 'Contains critical vulnerability',
        currentState: 'package@1.0.0',
        suggestedState: 'package@2.0.0',
        benefits: ['Fixes security vulnerability'],
        effort: 'low',
        priority: 'critical',
        migrationSteps: ['Update'],
        resources: [],
        automatedTools: [],
      };

      const normalRec: Recommendation = {
        id: '2',
        type: 'dependency',
        title: 'Normal update',
        description: 'Regular update',
        currentState: 'package@1.0.0',
        suggestedState: 'package@1.1.0',
        benefits: ['New features'],
        effort: 'low',
        priority: 'low',
        migrationSteps: ['Update'],
        resources: [],
        automatedTools: [],
      };

      const securityScore = ranker.scoreRecommendation(securityRec);
      const normalScore = ranker.scoreRecommendation(normalRec);

      expect(securityScore).toBeGreaterThan(normalScore);
      expect(securityScore).toBeGreaterThanOrEqual(100);
    });

    it('should consider effort-to-benefit ratio', () => {
      const highBenefitLowEffort: Recommendation = {
        id: '1',
        type: 'dependency',
        title: 'Easy win',
        description: 'Simple update with many benefits',
        currentState: 'package@1.0.0',
        suggestedState: 'package@2.0.0',
        benefits: [
          'Better performance',
          'New features',
          'Improved stability',
          'Better compatibility',
        ],
        effort: 'low',
        priority: 'medium',
        migrationSteps: ['Update'],
        resources: [],
        automatedTools: [],
      };

      const lowBenefitHighEffort: Recommendation = {
        id: '2',
        type: 'dependency',
        title: 'Hard work',
        description: 'Complex update with few benefits',
        currentState: 'package@1.0.0',
        suggestedState: 'package@2.0.0',
        benefits: ['Minor improvement'],
        effort: 'high',
        priority: 'low',
        migrationSteps: ['Update', 'Refactor', 'Test extensively'],
        resources: [],
        automatedTools: [],
      };

      const easyWinScore = ranker.scoreRecommendation(highBenefitLowEffort);
      const hardWorkScore = ranker.scoreRecommendation(lowBenefitHighEffort);

      expect(easyWinScore).toBeGreaterThan(hardWorkScore);
    });

    it('should give higher scores to framework updates', () => {
      const frameworkRec: Recommendation = {
        id: '1',
        type: 'framework',
        title: 'Framework update',
        description: 'Update framework',
        currentState: 'framework@1.0.0',
        suggestedState: 'framework@2.0.0',
        benefits: ['New features'],
        effort: 'medium',
        priority: 'medium',
        migrationSteps: ['Update', 'Test'],
        resources: [],
        automatedTools: [],
      };

      const patternRec: Recommendation = {
        id: '2',
        type: 'pattern',
        title: 'Pattern update',
        description: 'Modernize pattern',
        currentState: 'old pattern',
        suggestedState: 'new pattern',
        benefits: ['New features'],
        effort: 'medium',
        priority: 'medium',
        migrationSteps: ['Update', 'Test'],
        resources: [],
        automatedTools: [],
      };

      const frameworkScore = ranker.scoreRecommendation(frameworkRec);
      const patternScore = ranker.scoreRecommendation(patternRec);

      expect(frameworkScore).toBeGreaterThan(patternScore);
    });
  });

  describe('rankRecommendations', () => {
    it('should sort recommendations by priority score', () => {
      const recommendations: Recommendation[] = [
        {
          id: '1',
          type: 'pattern',
          title: 'Low priority',
          description: 'Minor improvement',
          currentState: 'old',
          suggestedState: 'new',
          benefits: ['Small improvement'],
          effort: 'high',
          priority: 'low',
          migrationSteps: ['Update'],
          resources: [],
          automatedTools: [],
        },
        {
          id: '2',
          type: 'dependency',
          title: 'Critical security',
          description: 'Critical security vulnerability',
          currentState: 'package@1.0.0',
          suggestedState: 'package@2.0.0',
          benefits: ['Fixes critical vulnerability'],
          effort: 'low',
          priority: 'critical',
          migrationSteps: ['Update'],
          resources: [],
          automatedTools: [],
        },
        {
          id: '3',
          type: 'dependency',
          title: 'Deprecated package',
          description: 'Package is deprecated',
          currentState: 'old@1.0.0',
          suggestedState: 'new@1.0.0',
          benefits: ['Use maintained package'],
          effort: 'medium',
          priority: 'high',
          migrationSteps: ['Replace'],
          resources: [],
          automatedTools: [],
        },
      ];

      const ranked = ranker.rankRecommendations(recommendations);

      // Should be sorted: critical, high, low
      expect(ranked[0].id).toBe('2'); // Critical security
      expect(ranked[1].id).toBe('3'); // Deprecated
      expect(ranked[2].id).toBe('1'); // Low priority
    });

    it('should not mutate the original array', () => {
      const recommendations: Recommendation[] = [
        {
          id: '1',
          type: 'pattern',
          title: 'First',
          description: 'First',
          currentState: 'old',
          suggestedState: 'new',
          benefits: ['Benefit'],
          effort: 'low',
          priority: 'low',
          migrationSteps: ['Update'],
          resources: [],
          automatedTools: [],
        },
        {
          id: '2',
          type: 'dependency',
          title: 'Second',
          description: 'Critical vulnerability',
          currentState: 'package@1.0.0',
          suggestedState: 'package@2.0.0',
          benefits: ['Security'],
          effort: 'low',
          priority: 'critical',
          migrationSteps: ['Update'],
          resources: [],
          automatedTools: [],
        },
      ];

      const originalOrder = recommendations.map(r => r.id);
      ranker.rankRecommendations(recommendations);
      const afterOrder = recommendations.map(r => r.id);

      expect(afterOrder).toEqual(originalOrder);
    });

    it('should handle empty array', () => {
      const ranked = ranker.rankRecommendations([]);
      expect(ranked).toEqual([]);
    });

    it('should handle single recommendation', () => {
      const recommendations: Recommendation[] = [
        {
          id: '1',
          type: 'dependency',
          title: 'Update',
          description: 'Update package',
          currentState: 'package@1.0.0',
          suggestedState: 'package@2.0.0',
          benefits: ['Improvements'],
          effort: 'low',
          priority: 'medium',
          migrationSteps: ['Update'],
          resources: [],
          automatedTools: [],
        },
      ];

      const ranked = ranker.rankRecommendations(recommendations);
      expect(ranked).toHaveLength(1);
      expect(ranked[0].id).toBe('1');
    });
  });
});
