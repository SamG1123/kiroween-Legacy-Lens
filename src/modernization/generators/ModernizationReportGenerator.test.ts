import { ModernizationReportGenerator } from './ModernizationReportGenerator';
import {
  Recommendation,
  MigrationRoadmap,
  CompatibilityReport,
  Phase,
  TimeEstimate,
} from '../types';

describe('ModernizationReportGenerator', () => {
  let generator: ModernizationReportGenerator;

  beforeEach(() => {
    generator = new ModernizationReportGenerator();
  });

  describe('generateReport', () => {
    it('should generate a complete report with all components', () => {
      const recommendations: Recommendation[] = [
        createMockRecommendation('1', 'dependency', 'critical', 'low'),
        createMockRecommendation('2', 'framework', 'high', 'medium'),
      ];

      const roadmap: MigrationRoadmap = createMockRoadmap(recommendations);
      const compatibilityReport: CompatibilityReport = {
        compatible: true,
        issues: [],
        resolutions: [],
      };

      const report = generator.generateReport(roadmap, recommendations, compatibilityReport);

      expect(report).toBeDefined();
      expect(report.summary).toBeDefined();
      expect(report.statistics).toBeDefined();
      expect(report.recommendations).toEqual(recommendations);
      expect(report.roadmap).toEqual(roadmap);
      expect(report.compatibilityReport).toEqual(compatibilityReport);
      expect(report.generatedAt).toBeInstanceOf(Date);
    });

    it('should include correct statistics', () => {
      const recommendations: Recommendation[] = [
        createMockRecommendation('1', 'dependency', 'critical', 'low'),
        createMockRecommendation('2', 'dependency', 'high', 'medium'),
        createMockRecommendation('3', 'framework', 'medium', 'high'),
        createMockRecommendation('4', 'pattern', 'low', 'low'),
      ];

      const roadmap: MigrationRoadmap = createMockRoadmap(recommendations);
      const compatibilityReport: CompatibilityReport = {
        compatible: true,
        issues: [],
        resolutions: [],
      };

      const report = generator.generateReport(roadmap, recommendations, compatibilityReport);

      expect(report.statistics.totalRecommendations).toBe(4);
      expect(report.statistics.byPriority.critical).toBe(1);
      expect(report.statistics.byPriority.high).toBe(1);
      expect(report.statistics.byPriority.medium).toBe(1);
      expect(report.statistics.byPriority.low).toBe(1);
      expect(report.statistics.byType.dependency).toBe(2);
      expect(report.statistics.byType.framework).toBe(1);
      expect(report.statistics.byType.pattern).toBe(1);
    });
  });

  describe('generateSummary', () => {
    it('should generate summary for empty recommendations', () => {
      const recommendations: Recommendation[] = [];
      const compatibilityReport: CompatibilityReport = {
        compatible: true,
        issues: [],
        resolutions: [],
      };

      const summary = generator.generateSummary(recommendations, compatibilityReport);

      expect(summary).toContain('No modernization opportunities');
      expect(summary).toContain('up-to-date');
    });

    it('should generate summary with critical issues', () => {
      const recommendations: Recommendation[] = [
        createMockRecommendation('1', 'dependency', 'critical', 'low', [
          'Fixes security vulnerabilities',
        ]),
        createMockRecommendation('2', 'dependency', 'critical', 'low', [
          'Addresses critical security issue',
        ]),
      ];

      const compatibilityReport: CompatibilityReport = {
        compatible: true,
        issues: [],
        resolutions: [],
      };

      const summary = generator.generateSummary(recommendations, compatibilityReport);

      expect(summary).toContain('2 modernization opportunities');
      expect(summary).toContain('2 critical issues');
      expect(summary).toContain('immediate attention');
      expect(summary).toContain('security');
    });

    it('should generate summary with high priority items', () => {
      const recommendations: Recommendation[] = [
        createMockRecommendation('1', 'dependency', 'high', 'low'),
        createMockRecommendation('2', 'framework', 'high', 'medium'),
        createMockRecommendation('3', 'dependency', 'medium', 'low'),
      ];

      const compatibilityReport: CompatibilityReport = {
        compatible: true,
        issues: [],
        resolutions: [],
      };

      const summary = generator.generateSummary(recommendations, compatibilityReport);

      expect(summary).toContain('2 high-priority items');
      expect(summary).toContain('addressed soon');
    });

    it('should include type breakdown in summary', () => {
      const recommendations: Recommendation[] = [
        createMockRecommendation('1', 'dependency', 'high', 'low'),
        createMockRecommendation('2', 'dependency', 'medium', 'low'),
        createMockRecommendation('3', 'framework', 'high', 'medium'),
        createMockRecommendation('4', 'pattern', 'medium', 'low'),
      ];

      const compatibilityReport: CompatibilityReport = {
        compatible: true,
        issues: [],
        resolutions: [],
      };

      const summary = generator.generateSummary(recommendations, compatibilityReport);

      expect(summary).toContain('2 dependency updates');
      expect(summary).toContain('1 framework upgrade');
      expect(summary).toContain('1 code pattern modernization');
    });

    it('should mention compatibility issues when present', () => {
      const recommendations: Recommendation[] = [
        createMockRecommendation('1', 'dependency', 'high', 'low'),
      ];

      const compatibilityReport: CompatibilityReport = {
        compatible: false,
        issues: [
          {
            type: 'version_conflict',
            description: 'Version conflict detected',
            affectedDependencies: ['package-a', 'package-b'],
            severity: 'error',
          },
          {
            type: 'peer_dependency',
            description: 'Peer dependency warning',
            affectedDependencies: ['package-c'],
            severity: 'warning',
          },
        ],
        resolutions: [],
      };

      const summary = generator.generateSummary(recommendations, compatibilityReport);

      expect(summary).toContain('1 critical conflict');
      expect(summary).toContain('1 potential compatibility issue');
    });

    it('should mention when all upgrades are compatible', () => {
      const recommendations: Recommendation[] = [
        createMockRecommendation('1', 'dependency', 'high', 'low'),
        createMockRecommendation('2', 'dependency', 'medium', 'low'),
      ];

      const compatibilityReport: CompatibilityReport = {
        compatible: true,
        issues: [],
        resolutions: [],
      };

      const summary = generator.generateSummary(recommendations, compatibilityReport);

      expect(summary).toContain('compatible with each other');
    });

    it('should identify quick wins', () => {
      const recommendations: Recommendation[] = [
        createMockRecommendation('1', 'dependency', 'critical', 'low'),
        createMockRecommendation('2', 'dependency', 'high', 'low'),
        createMockRecommendation('3', 'dependency', 'medium', 'medium'),
      ];

      const compatibilityReport: CompatibilityReport = {
        compatible: true,
        issues: [],
        resolutions: [],
      };

      const summary = generator.generateSummary(recommendations, compatibilityReport);

      expect(summary).toContain('2 quick wins');
      expect(summary).toContain('low-effort, high-impact');
    });

    it('should include closing recommendation', () => {
      const recommendations: Recommendation[] = [
        createMockRecommendation('1', 'dependency', 'high', 'low'),
      ];

      const compatibilityReport: CompatibilityReport = {
        compatible: true,
        issues: [],
        resolutions: [],
      };

      const summary = generator.generateSummary(recommendations, compatibilityReport);

      expect(summary).toContain('Review the detailed roadmap');
      expect(summary).toContain('phased approach');
    });
  });

  describe('generatePriorityBreakdown', () => {
    it('should count recommendations by priority', () => {
      const recommendations: Recommendation[] = [
        createMockRecommendation('1', 'dependency', 'critical', 'low'),
        createMockRecommendation('2', 'dependency', 'critical', 'low'),
        createMockRecommendation('3', 'dependency', 'high', 'medium'),
        createMockRecommendation('4', 'framework', 'medium', 'high'),
        createMockRecommendation('5', 'pattern', 'low', 'low'),
      ];

      const breakdown = generator.generatePriorityBreakdown(recommendations);

      expect(breakdown.critical).toBe(2);
      expect(breakdown.high).toBe(1);
      expect(breakdown.medium).toBe(1);
      expect(breakdown.low).toBe(1);
    });

    it('should return zeros for empty recommendations', () => {
      const recommendations: Recommendation[] = [];

      const breakdown = generator.generatePriorityBreakdown(recommendations);

      expect(breakdown.critical).toBe(0);
      expect(breakdown.high).toBe(0);
      expect(breakdown.medium).toBe(0);
      expect(breakdown.low).toBe(0);
    });
  });
});

// Helper functions

function createMockRecommendation(
  id: string,
  type: 'dependency' | 'framework' | 'pattern',
  priority: 'critical' | 'high' | 'medium' | 'low',
  effort: 'low' | 'medium' | 'high',
  benefits: string[] = ['Benefit 1', 'Benefit 2']
): Recommendation {
  return {
    id,
    type,
    title: `${type} recommendation ${id}`,
    description: `Description for ${type} ${id}`,
    currentState: `current-state-${id}`,
    suggestedState: `suggested-state-${id}`,
    benefits,
    effort,
    priority,
    migrationSteps: ['Step 1', 'Step 2'],
    resources: ['https://example.com'],
    automatedTools: ['tool1'],
  };
}

function createMockRoadmap(recommendations: Recommendation[]): MigrationRoadmap {
  const phase: Phase = {
    number: 1,
    name: 'Phase 1',
    description: 'First phase',
    recommendations,
    estimate: {
      min: 1,
      max: 3,
      confidence: 'medium',
    },
    prerequisites: [],
  };

  const totalEstimate: TimeEstimate = {
    min: 1,
    max: 3,
    confidence: 'medium',
  };

  return {
    phases: [phase],
    totalEstimate,
    criticalPath: [],
    quickWins: [],
  };
}
