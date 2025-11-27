import { ModernizationReportGenerator } from './ModernizationReportGenerator';
import { RoadmapGenerator } from './RoadmapGenerator';
import { RecommendationEngine } from '../engines/RecommendationEngine';
import { PriorityRanker } from '../engines/PriorityRanker';
import { CompatibilityChecker } from '../engines/CompatibilityChecker';
import {
  DependencyAnalysis,
  FrameworkAnalysis,
  PatternAnalysis,
  Recommendation,
} from '../types';

describe('ModernizationReportGenerator Integration', () => {
  let reportGenerator: ModernizationReportGenerator;
  let roadmapGenerator: RoadmapGenerator;
  let recommendationEngine: RecommendationEngine;
  let priorityRanker: PriorityRanker;
  let compatibilityChecker: CompatibilityChecker;

  beforeEach(() => {
    reportGenerator = new ModernizationReportGenerator();
    roadmapGenerator = new RoadmapGenerator();
    recommendationEngine = new RecommendationEngine();
    priorityRanker = new PriorityRanker();
    compatibilityChecker = new CompatibilityChecker();
  });

  it('should generate a complete report from analysis results', async () => {
    // Create mock analysis results
    const dependencyAnalysis: DependencyAnalysis[] = [
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
        vulnerabilities: [
          {
            id: 'CVE-2021-23337',
            severity: 'high',
            description: 'Command injection vulnerability',
            fixedIn: '4.17.21',
          },
        ],
        alternatives: [],
      },
    ];

    const frameworkAnalysis: FrameworkAnalysis[] = [
      {
        framework: {
          name: 'react',
          version: '16.14.0',
          type: 'frontend',
        },
        currentVersion: '16.14.0',
        latestVersion: '18.2.0',
        breakingChanges: [
          {
            description: 'Automatic batching changes',
            affectedAPIs: ['setState', 'useState'],
            migrationPath: 'Update state management to handle automatic batching',
          },
        ],
        migrationGuide: {
          url: 'https://react.dev/blog/2022/03/08/react-18-upgrade-guide',
          steps: ['Update React and ReactDOM', 'Replace render with createRoot'],
          automatedTools: ['react-codemod'],
        },
        effortEstimate: 'high',
      },
    ];

    const patternAnalysis: PatternAnalysis[] = [
      {
        pattern: 'var-declaration',
        occurrences: [
          {
            file: 'src/utils.js',
            line: 10,
            code: 'var count = 0;',
            patternType: 'var-declaration',
          },
        ],
        modernAlternative: 'const/let declarations',
        benefits: ['Block scoping', 'Prevents hoisting issues'],
        migrationComplexity: 'low',
      },
    ];

    // Generate recommendations
    const recommendations = recommendationEngine.generateRecommendations(
      dependencyAnalysis,
      frameworkAnalysis,
      patternAnalysis
    );

    expect(recommendations.length).toBeGreaterThan(0);

    // Rank recommendations
    const rankedRecommendations = priorityRanker.rankRecommendations(recommendations);

    // Generate roadmap
    const roadmap = roadmapGenerator.generateRoadmap(rankedRecommendations);

    expect(roadmap.phases.length).toBeGreaterThan(0);

    // Check compatibility
    const compatibilityReport = await compatibilityChecker.checkCompatibility(
      rankedRecommendations
    );

    // Generate final report
    const report = reportGenerator.generateReport(
      roadmap,
      rankedRecommendations,
      compatibilityReport
    );

    // Verify report structure
    expect(report).toBeDefined();
    expect(report.summary).toBeDefined();
    expect(report.summary.length).toBeGreaterThan(0);
    expect(report.statistics.totalRecommendations).toBe(rankedRecommendations.length);
    expect(report.recommendations).toEqual(rankedRecommendations);
    expect(report.roadmap).toEqual(roadmap);
    expect(report.compatibilityReport).toEqual(compatibilityReport);
    expect(report.generatedAt).toBeInstanceOf(Date);

    // Verify statistics
    expect(report.statistics.byPriority).toBeDefined();
    expect(report.statistics.byType).toBeDefined();
    expect(report.statistics.estimatedEffort).toBeDefined();

    // Verify summary mentions key information
    expect(report.summary).toContain('modernization');
    expect(report.summary).toContain('recommendation');
  });

  it('should handle empty analysis results', async () => {
    const dependencyAnalysis: DependencyAnalysis[] = [];
    const frameworkAnalysis: FrameworkAnalysis[] = [];
    const patternAnalysis: PatternAnalysis[] = [];

    const recommendations = recommendationEngine.generateRecommendations(
      dependencyAnalysis,
      frameworkAnalysis,
      patternAnalysis
    );

    const roadmap = roadmapGenerator.generateRoadmap(recommendations);
    const compatibilityReport = await compatibilityChecker.checkCompatibility(recommendations);

    const report = reportGenerator.generateReport(
      roadmap,
      recommendations,
      compatibilityReport
    );

    expect(report.statistics.totalRecommendations).toBe(0);
    expect(report.summary).toContain('No modernization opportunities');
    expect(report.roadmap.phases.length).toBe(0);
  });

  it('should properly categorize recommendations by priority and type', async () => {
    const dependencyAnalysis: DependencyAnalysis[] = [
      {
        dependency: {
          name: 'package-a',
          version: '1.0.0',
          type: 'production',
          ecosystem: 'npm',
        },
        currentVersion: '1.0.0',
        latestVersion: '2.0.0',
        updateCategory: 'major',
        isDeprecated: false,
        vulnerabilities: [
          {
            id: 'CVE-2023-0001',
            severity: 'critical',
            description: 'Critical vulnerability',
            fixedIn: '2.0.0',
          },
        ],
        alternatives: [],
      },
      {
        dependency: {
          name: 'package-b',
          version: '3.0.0',
          type: 'production',
          ecosystem: 'npm',
        },
        currentVersion: '3.0.0',
        latestVersion: '3.1.0',
        updateCategory: 'minor',
        isDeprecated: false,
        vulnerabilities: [],
        alternatives: [],
      },
    ];

    const recommendations = recommendationEngine.generateRecommendations(
      dependencyAnalysis,
      [],
      []
    );

    const rankedRecommendations = priorityRanker.rankRecommendations(recommendations);
    const roadmap = roadmapGenerator.generateRoadmap(rankedRecommendations);
    const compatibilityReport = await compatibilityChecker.checkCompatibility(
      rankedRecommendations
    );

    const report = reportGenerator.generateReport(
      roadmap,
      rankedRecommendations,
      compatibilityReport
    );

    // Should have 2 recommendations
    expect(report.statistics.totalRecommendations).toBe(2);

    // Should have 1 critical (security vulnerability)
    expect(report.statistics.byPriority.critical).toBeGreaterThan(0);

    // All should be dependency type
    expect(report.statistics.byType.dependency).toBe(2);
    expect(report.statistics.byType.framework).toBe(0);
    expect(report.statistics.byType.pattern).toBe(0);

    // Summary should mention critical issues
    expect(report.summary).toContain('critical');
  });
});
