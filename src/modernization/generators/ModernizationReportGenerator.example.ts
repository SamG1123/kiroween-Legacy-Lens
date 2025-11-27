/**
 * Example usage of ModernizationReportGenerator
 * 
 * This example demonstrates how to use the complete modernization advisor pipeline
 * to analyze a codebase and generate a comprehensive modernization report.
 */

import { ModernizationReportGenerator } from './ModernizationReportGenerator';
import { RoadmapGenerator } from './RoadmapGenerator';
import { RecommendationEngine } from '../engines/RecommendationEngine';
import { PriorityRanker } from '../engines/PriorityRanker';
import { CompatibilityChecker } from '../engines/CompatibilityChecker';
import { DependencyAnalyzer } from '../analyzers/DependencyAnalyzer';
import { FrameworkAnalyzer } from '../analyzers/FrameworkAnalyzer';
import { PatternAnalyzer } from '../analyzers/PatternAnalyzer';

/**
 * Complete modernization analysis workflow
 */
async function analyzeCodebase() {
  // Step 1: Initialize all components
  const dependencyAnalyzer = new DependencyAnalyzer();
  const frameworkAnalyzer = new FrameworkAnalyzer();
  const patternAnalyzer = new PatternAnalyzer();
  const recommendationEngine = new RecommendationEngine();
  const priorityRanker = new PriorityRanker();
  const compatibilityChecker = new CompatibilityChecker();
  const roadmapGenerator = new RoadmapGenerator();
  const reportGenerator = new ModernizationReportGenerator();

  // Step 2: Analyze dependencies
  const dependencies = [
    {
      name: 'lodash',
      version: '4.17.15',
      type: 'production' as const,
      ecosystem: 'npm' as const,
    },
    {
      name: 'react',
      version: '16.14.0',
      type: 'production' as const,
      ecosystem: 'npm' as const,
    },
  ];

  const dependencyAnalysis = await dependencyAnalyzer.analyzeDependencies(dependencies);

  // Step 3: Analyze frameworks
  const frameworks = [
    {
      name: 'react',
      version: '16.14.0',
      type: 'frontend' as const,
    },
  ];

  const frameworkAnalysis = await frameworkAnalyzer.analyzeFrameworks(frameworks);

  // Step 4: Analyze code patterns
  const codebase = new Map<string, string>([
    ['src/utils.js', `
      var count = 0;
      function getData(callback) {
        setTimeout(() => callback(null, 'data'), 100);
      }
    `],
  ]);

  const patternAnalysis = await patternAnalyzer.analyzePatterns(codebase);

  // Step 5: Generate recommendations
  const recommendations = recommendationEngine.generateRecommendations(
    dependencyAnalysis,
    frameworkAnalysis,
    patternAnalysis
  );

  console.log(`Generated ${recommendations.length} recommendations`);

  // Step 6: Rank recommendations by priority
  const rankedRecommendations = priorityRanker.rankRecommendations(recommendations);

  console.log('Recommendations ranked by priority:');
  rankedRecommendations.forEach((rec, index) => {
    console.log(`${index + 1}. [${rec.priority.toUpperCase()}] ${rec.title}`);
  });

  // Step 7: Generate migration roadmap
  const roadmap = roadmapGenerator.generateRoadmap(rankedRecommendations);

  console.log(`\nGenerated roadmap with ${roadmap.phases.length} phases`);
  roadmap.phases.forEach(phase => {
    console.log(`  ${phase.name}: ${phase.recommendations.length} items (${phase.estimate.min}-${phase.estimate.max} days)`);
  });

  // Step 8: Check compatibility
  const compatibilityReport = await compatibilityChecker.checkCompatibility(
    rankedRecommendations
  );

  console.log(`\nCompatibility: ${compatibilityReport.compatible ? 'OK' : 'Issues found'}`);
  if (compatibilityReport.issues.length > 0) {
    console.log(`  ${compatibilityReport.issues.length} compatibility issues detected`);
  }

  // Step 9: Generate final report
  const report = reportGenerator.generateReport(
    roadmap,
    rankedRecommendations,
    compatibilityReport
  );

  console.log('\n=== MODERNIZATION REPORT ===');
  console.log(`Generated at: ${report.generatedAt.toISOString()}`);
  console.log(`\nSummary:\n${report.summary}`);
  console.log(`\nStatistics:`);
  console.log(`  Total Recommendations: ${report.statistics.totalRecommendations}`);
  console.log(`  By Priority:`);
  console.log(`    Critical: ${report.statistics.byPriority.critical}`);
  console.log(`    High: ${report.statistics.byPriority.high}`);
  console.log(`    Medium: ${report.statistics.byPriority.medium}`);
  console.log(`    Low: ${report.statistics.byPriority.low}`);
  console.log(`  By Type:`);
  console.log(`    Dependencies: ${report.statistics.byType.dependency}`);
  console.log(`    Frameworks: ${report.statistics.byType.framework}`);
  console.log(`    Patterns: ${report.statistics.byType.pattern}`);
  console.log(`  Estimated Effort: ${report.statistics.estimatedEffort.min}-${report.statistics.estimatedEffort.max} days`);

  return report;
}

/**
 * Simple example with minimal setup
 */
async function simpleExample() {
  const reportGenerator = new ModernizationReportGenerator();

  // Mock data for demonstration
  const recommendations = [
    {
      id: '1',
      type: 'dependency' as const,
      title: 'Update lodash from 4.17.15 to 4.17.21',
      description: 'Contains 2 security vulnerabilities.',
      currentState: 'lodash@4.17.15',
      suggestedState: 'lodash@4.17.21',
      benefits: [
        'Fixes 2 security vulnerabilities',
        'Improves application security posture',
      ],
      effort: 'low' as const,
      priority: 'critical' as const,
      migrationSteps: ['Update package.json', 'Run npm install'],
      resources: ['https://www.npmjs.com/package/lodash'],
      automatedTools: ['npm update'],
    },
  ];

  const roadmap = {
    phases: [
      {
        number: 1,
        name: 'Phase 1: Critical Security Updates',
        description: 'Address critical security vulnerabilities',
        recommendations,
        estimate: { min: 0.5, max: 1, confidence: 'high' as const },
        prerequisites: [],
      },
    ],
    totalEstimate: { min: 0.5, max: 1, confidence: 'high' as const },
    criticalPath: ['Update lodash from 4.17.15 to 4.17.21'],
    quickWins: recommendations,
  };

  const compatibilityReport = {
    compatible: true,
    issues: [],
    resolutions: [],
  };

  const report = reportGenerator.generateReport(
    roadmap,
    recommendations,
    compatibilityReport
  );

  console.log('Simple Report Summary:');
  console.log(report.summary);

  return report;
}

// Run examples if this file is executed directly
if (require.main === module) {
  console.log('Running complete example...\n');
  analyzeCodebase()
    .then(() => {
      console.log('\n\nRunning simple example...\n');
      return simpleExample();
    })
    .then(() => {
      console.log('\n\nExamples completed successfully!');
    })
    .catch(error => {
      console.error('Error running examples:', error);
      process.exit(1);
    });
}

export { analyzeCodebase, simpleExample };
