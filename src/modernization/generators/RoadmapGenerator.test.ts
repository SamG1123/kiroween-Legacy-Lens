import { RoadmapGenerator } from './RoadmapGenerator';
import { Recommendation, RecommendationDependency } from '../types';

describe('RoadmapGenerator', () => {
  let generator: RoadmapGenerator;

  beforeEach(() => {
    generator = new RoadmapGenerator();
  });

  describe('identifyDependencies', () => {
    it('should identify framework dependencies for patterns', () => {
      const recommendations: Recommendation[] = [
        {
          id: 'rec-1',
          type: 'framework',
          title: 'Upgrade React from 16.0.0 to 18.0.0',
          description: 'Upgrade React framework',
          currentState: 'react@16.0.0',
          suggestedState: 'react@18.0.0',
          benefits: ['Better performance'],
          effort: 'medium',
          priority: 'high',
          migrationSteps: ['Update package.json'],
          resources: [],
          automatedTools: [],
        },
        {
          id: 'rec-2',
          type: 'pattern',
          title: 'Convert class components to hooks',
          description: 'Modernize React components to use hooks',
          currentState: 'class-component',
          suggestedState: 'functional-component',
          benefits: ['Cleaner code'],
          effort: 'low',
          priority: 'medium',
          migrationSteps: ['Convert components'],
          resources: [],
          automatedTools: [],
        },
      ];

      const dependencies = generator.identifyDependencies(recommendations);

      expect(dependencies).toHaveLength(1);
      expect(dependencies[0].recommendationId).toBe('rec-2');
      expect(dependencies[0].dependsOn).toContain('rec-1');
      expect(dependencies[0].reason).toContain('react');
    });

    it('should identify dependency priority ordering', () => {
      const recommendations: Recommendation[] = [
        {
          id: 'rec-1',
          type: 'dependency',
          title: 'Update react from 16.0.0 to 18.0.0',
          description: 'Update React',
          currentState: 'react@16.0.0',
          suggestedState: 'react@18.0.0',
          benefits: [],
          effort: 'medium',
          priority: 'critical',
          migrationSteps: [],
          resources: [],
          automatedTools: [],
        },
        {
          id: 'rec-2',
          type: 'dependency',
          title: 'Update react-dom from 16.0.0 to 18.0.0',
          description: 'Update React DOM',
          currentState: 'react-dom@16.0.0',
          suggestedState: 'react-dom@18.0.0',
          benefits: [],
          effort: 'low',
          priority: 'high',
          migrationSteps: [],
          resources: [],
          automatedTools: [],
        },
      ];

      const dependencies = generator.identifyDependencies(recommendations);

      // react-dom should depend on react (higher priority)
      const reactDomDep = dependencies.find(d => d.recommendationId === 'rec-2');
      expect(reactDomDep).toBeDefined();
      expect(reactDomDep?.dependsOn).toContain('rec-1');
    });

    it('should return empty array when no dependencies exist', () => {
      const recommendations: Recommendation[] = [
        {
          id: 'rec-1',
          type: 'dependency',
          title: 'Update lodash',
          description: 'Update lodash',
          currentState: 'lodash@4.0.0',
          suggestedState: 'lodash@4.17.0',
          benefits: [],
          effort: 'low',
          priority: 'low',
          migrationSteps: [],
          resources: [],
          automatedTools: [],
        },
      ];

      const dependencies = generator.identifyDependencies(recommendations);

      expect(dependencies).toHaveLength(0);
    });
  });

  describe('createPhases', () => {
    it('should create phases with proper ordering', () => {
      const recommendations: Recommendation[] = [
        {
          id: 'rec-1',
          type: 'dependency',
          title: 'Critical security update',
          description: 'Fix vulnerability',
          currentState: 'pkg@1.0.0',
          suggestedState: 'pkg@2.0.0',
          benefits: ['Fixes security vulnerability'],
          effort: 'low',
          priority: 'critical',
          migrationSteps: [],
          resources: [],
          automatedTools: [],
        },
        {
          id: 'rec-2',
          type: 'pattern',
          title: 'Modernize code patterns',
          description: 'Update patterns',
          currentState: 'old-pattern',
          suggestedState: 'new-pattern',
          benefits: [],
          effort: 'medium',
          priority: 'low',
          migrationSteps: [],
          resources: [],
          automatedTools: [],
        },
      ];

      const dependencies: RecommendationDependency[] = [];

      const phases = generator.createPhases(recommendations, dependencies);

      expect(phases.length).toBeGreaterThan(0);
      expect(phases[0].number).toBe(1);
      expect(phases[0].recommendations).toBeDefined();
      expect(phases[0].estimate).toBeDefined();
    });

    it('should respect dependencies when creating phases', () => {
      const recommendations: Recommendation[] = [
        {
          id: 'rec-1',
          type: 'framework',
          title: 'Upgrade framework',
          description: 'Upgrade',
          currentState: 'framework@1.0.0',
          suggestedState: 'framework@2.0.0',
          benefits: [],
          effort: 'high',
          priority: 'high',
          migrationSteps: [],
          resources: [],
          automatedTools: [],
        },
        {
          id: 'rec-2',
          type: 'pattern',
          title: 'Update patterns',
          description: 'Update',
          currentState: 'pattern',
          suggestedState: 'new-pattern',
          benefits: [],
          effort: 'low',
          priority: 'medium',
          migrationSteps: [],
          resources: [],
          automatedTools: [],
        },
      ];

      const dependencies: RecommendationDependency[] = [
        {
          recommendationId: 'rec-2',
          dependsOn: ['rec-1'],
          reason: 'Requires framework upgrade',
        },
      ];

      const phases = generator.createPhases(recommendations, dependencies);

      // Find which phase each recommendation is in
      let rec1Phase = -1;
      let rec2Phase = -1;

      for (let i = 0; i < phases.length; i++) {
        if (phases[i].recommendations.some(r => r.id === 'rec-1')) {
          rec1Phase = i;
        }
        if (phases[i].recommendations.some(r => r.id === 'rec-2')) {
          rec2Phase = i;
        }
      }

      // rec-1 should come before rec-2
      expect(rec1Phase).toBeLessThanOrEqual(rec2Phase);
    });

    it('should group related recommendations together', () => {
      const recommendations: Recommendation[] = [
        {
          id: 'rec-1',
          type: 'dependency',
          title: 'Update dep 1',
          description: 'Update',
          currentState: 'dep1@1.0.0',
          suggestedState: 'dep1@2.0.0',
          benefits: [],
          effort: 'low',
          priority: 'medium',
          migrationSteps: [],
          resources: [],
          automatedTools: [],
        },
        {
          id: 'rec-2',
          type: 'dependency',
          title: 'Update dep 2',
          description: 'Update',
          currentState: 'dep2@1.0.0',
          suggestedState: 'dep2@2.0.0',
          benefits: [],
          effort: 'low',
          priority: 'medium',
          migrationSteps: [],
          resources: [],
          automatedTools: [],
        },
        {
          id: 'rec-3',
          type: 'pattern',
          title: 'Update pattern',
          description: 'Update',
          currentState: 'pattern',
          suggestedState: 'new-pattern',
          benefits: [],
          effort: 'low',
          priority: 'medium',
          migrationSteps: [],
          resources: [],
          automatedTools: [],
        },
      ];

      const dependencies: RecommendationDependency[] = [];

      const phases = generator.createPhases(recommendations, dependencies);

      // Dependencies should be grouped together
      const phase = phases[0];
      const depCount = phase.recommendations.filter(r => r.type === 'dependency').length;
      const patternCount = phase.recommendations.filter(r => r.type === 'pattern').length;

      // Either all deps together or all patterns together
      expect(depCount === 2 || patternCount === 1).toBe(true);
    });
  });

  describe('estimateTimeline', () => {
    it('should estimate timeline for a phase with low effort items', () => {
      const phase = {
        number: 1,
        name: 'Phase 1',
        description: 'Test phase',
        recommendations: [
          {
            id: 'rec-1',
            type: 'dependency' as const,
            title: 'Update dep',
            description: 'Update',
            currentState: 'dep@1.0.0',
            suggestedState: 'dep@2.0.0',
            benefits: [],
            effort: 'low' as const,
            priority: 'medium' as const,
            migrationSteps: [],
            resources: [],
            automatedTools: [],
          },
        ],
        estimate: { min: 0, max: 0, confidence: 'medium' as const },
        prerequisites: [],
      };

      const estimate = generator.estimateTimeline(phase);

      expect(estimate.min).toBeGreaterThan(0);
      expect(estimate.max).toBeGreaterThanOrEqual(estimate.min);
      expect(estimate.confidence).toBeDefined();
    });

    it('should estimate higher time for high effort items', () => {
      const lowEffortPhase = {
        number: 1,
        name: 'Phase 1',
        description: 'Low effort',
        recommendations: [
          {
            id: 'rec-1',
            type: 'dependency' as const,
            title: 'Update',
            description: 'Update',
            currentState: 'dep@1.0.0',
            suggestedState: 'dep@2.0.0',
            benefits: [],
            effort: 'low' as const,
            priority: 'medium' as const,
            migrationSteps: [],
            resources: [],
            automatedTools: [],
          },
        ],
        estimate: { min: 0, max: 0, confidence: 'medium' as const },
        prerequisites: [],
      };

      const highEffortPhase = {
        number: 2,
        name: 'Phase 2',
        description: 'High effort',
        recommendations: [
          {
            id: 'rec-2',
            type: 'framework' as const,
            title: 'Upgrade framework',
            description: 'Upgrade',
            currentState: 'framework@1.0.0',
            suggestedState: 'framework@2.0.0',
            benefits: [],
            effort: 'high' as const,
            priority: 'high' as const,
            migrationSteps: [],
            resources: [],
            automatedTools: [],
          },
        ],
        estimate: { min: 0, max: 0, confidence: 'medium' as const },
        prerequisites: [],
      };

      const lowEstimate = generator.estimateTimeline(lowEffortPhase);
      const highEstimate = generator.estimateTimeline(highEffortPhase);

      expect(highEstimate.max).toBeGreaterThan(lowEstimate.max);
    });

    it('should have lower confidence for phases with many items', () => {
      const manyItems = Array.from({ length: 15 }, (_, i) => ({
        id: `rec-${i}`,
        type: 'dependency' as const,
        title: `Update ${i}`,
        description: 'Update',
        currentState: `dep${i}@1.0.0`,
        suggestedState: `dep${i}@2.0.0`,
        benefits: [],
        effort: 'low' as const,
        priority: 'medium' as const,
        migrationSteps: [],
        resources: [],
        automatedTools: [],
      }));

      const phase = {
        number: 1,
        name: 'Phase 1',
        description: 'Many items',
        recommendations: manyItems,
        estimate: { min: 0, max: 0, confidence: 'medium' as const },
        prerequisites: [],
      };

      const estimate = generator.estimateTimeline(phase);

      expect(estimate.confidence).toBe('low');
    });
  });

  describe('generateRoadmap', () => {
    it('should generate a complete roadmap', () => {
      const recommendations: Recommendation[] = [
        {
          id: 'rec-1',
          type: 'dependency',
          title: 'Critical security fix',
          description: 'Fix vulnerability',
          currentState: 'pkg@1.0.0',
          suggestedState: 'pkg@2.0.0',
          benefits: ['Fixes security vulnerability'],
          effort: 'low',
          priority: 'critical',
          migrationSteps: [],
          resources: [],
          automatedTools: [],
        },
        {
          id: 'rec-2',
          type: 'dependency',
          title: 'Update dependency',
          description: 'Update',
          currentState: 'dep@1.0.0',
          suggestedState: 'dep@2.0.0',
          benefits: [],
          effort: 'low',
          priority: 'medium',
          migrationSteps: [],
          resources: [],
          automatedTools: [],
        },
      ];

      const roadmap = generator.generateRoadmap(recommendations);

      expect(roadmap.phases).toBeDefined();
      expect(roadmap.phases.length).toBeGreaterThan(0);
      expect(roadmap.totalEstimate).toBeDefined();
      expect(roadmap.totalEstimate.min).toBeGreaterThan(0);
      expect(roadmap.criticalPath).toBeDefined();
      expect(roadmap.quickWins).toBeDefined();
    });

    it('should identify quick wins correctly', () => {
      const recommendations: Recommendation[] = [
        {
          id: 'rec-1',
          type: 'dependency',
          title: 'Quick security fix',
          description: 'Fix',
          currentState: 'pkg@1.0.0',
          suggestedState: 'pkg@2.0.0',
          benefits: ['Security', 'Performance', 'Stability'],
          effort: 'low',
          priority: 'critical',
          migrationSteps: [],
          resources: [],
          automatedTools: [],
        },
        {
          id: 'rec-2',
          type: 'framework',
          title: 'Major framework upgrade',
          description: 'Upgrade',
          currentState: 'framework@1.0.0',
          suggestedState: 'framework@2.0.0',
          benefits: [],
          effort: 'high',
          priority: 'high',
          migrationSteps: [],
          resources: [],
          automatedTools: [],
        },
      ];

      const roadmap = generator.generateRoadmap(recommendations);

      expect(roadmap.quickWins.length).toBeGreaterThan(0);
      expect(roadmap.quickWins[0].effort).toBe('low');
      expect(['critical', 'high']).toContain(roadmap.quickWins[0].priority);
    });

    it('should calculate total estimate from all phases', () => {
      const recommendations: Recommendation[] = [
        {
          id: 'rec-1',
          type: 'dependency',
          title: 'Update 1',
          description: 'Update',
          currentState: 'dep1@1.0.0',
          suggestedState: 'dep1@2.0.0',
          benefits: [],
          effort: 'low',
          priority: 'medium',
          migrationSteps: [],
          resources: [],
          automatedTools: [],
        },
        {
          id: 'rec-2',
          type: 'dependency',
          title: 'Update 2',
          description: 'Update',
          currentState: 'dep2@1.0.0',
          suggestedState: 'dep2@2.0.0',
          benefits: [],
          effort: 'medium',
          priority: 'medium',
          migrationSteps: [],
          resources: [],
          automatedTools: [],
        },
      ];

      const roadmap = generator.generateRoadmap(recommendations);

      // Total should be sum of all phase estimates
      const phaseSum = roadmap.phases.reduce(
        (sum, phase) => sum + phase.estimate.min,
        0
      );

      expect(roadmap.totalEstimate.min).toBeGreaterThanOrEqual(phaseSum * 0.9); // Allow small rounding
    });

    it('should handle empty recommendations', () => {
      const recommendations: Recommendation[] = [];

      const roadmap = generator.generateRoadmap(recommendations);

      expect(roadmap.phases).toHaveLength(0);
      expect(roadmap.totalEstimate.min).toBe(0);
      expect(roadmap.criticalPath).toHaveLength(0);
      expect(roadmap.quickWins).toHaveLength(0);
    });

    it('should prioritize security items in early phases', () => {
      const recommendations: Recommendation[] = [
        {
          id: 'rec-1',
          type: 'pattern',
          title: 'Code pattern update',
          description: 'Update',
          currentState: 'pattern',
          suggestedState: 'new-pattern',
          benefits: [],
          effort: 'low',
          priority: 'low',
          migrationSteps: [],
          resources: [],
          automatedTools: [],
        },
        {
          id: 'rec-2',
          type: 'dependency',
          title: 'Security vulnerability fix',
          description: 'Fix critical vulnerability',
          currentState: 'pkg@1.0.0',
          suggestedState: 'pkg@2.0.0',
          benefits: ['Fixes critical security vulnerability'],
          effort: 'low',
          priority: 'critical',
          migrationSteps: [],
          resources: [],
          automatedTools: [],
        },
      ];

      const roadmap = generator.generateRoadmap(recommendations);

      // Security item should be in first phase
      const firstPhase = roadmap.phases[0];
      const hasSecurityItem = firstPhase.recommendations.some(
        r => r.priority === 'critical'
      );

      expect(hasSecurityItem).toBe(true);
    });
  });
});
