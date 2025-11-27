import {
  Recommendation,
  MigrationRoadmap,
  Phase,
  RecommendationDependency,
  TimeEstimate,
} from '../types';

/**
 * RoadmapGenerator creates phased migration roadmaps from recommendations
 * Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5
 */
export class RoadmapGenerator {
  /**
   * Generate a complete migration roadmap from recommendations
   * Validates: Requirements 6.1
   * @param recommendations - Array of recommendations to organize into a roadmap
   * @returns Complete migration roadmap with phases
   */
  generateRoadmap(recommendations: Recommendation[]): MigrationRoadmap {
    // Identify dependencies between recommendations
    const dependencies = this.identifyDependencies(recommendations);

    // Create phases from recommendations
    const phases = this.createPhases(recommendations, dependencies);

    // Calculate total estimate
    const totalEstimate = this.calculateTotalEstimate(phases);

    // Identify critical path (longest sequence of dependent recommendations)
    const criticalPath = this.identifyCriticalPath(recommendations, dependencies);

    // Identify quick wins (low effort, high benefit, no dependencies)
    const quickWins = this.identifyQuickWins(recommendations, dependencies);

    return {
      phases,
      totalEstimate,
      criticalPath,
      quickWins,
    };
  }

  /**
   * Identify dependencies between recommendations
   * Validates: Requirements 6.5
   * @param recommendations - Array of recommendations
   * @returns Array of recommendation dependencies
   */
  identifyDependencies(recommendations: Recommendation[]): RecommendationDependency[] {
    const dependencies: RecommendationDependency[] = [];

    for (const rec of recommendations) {
      const deps: string[] = [];
      const reasons: string[] = [];

      // Check for framework dependencies
      if (rec.type === 'dependency' || rec.type === 'pattern') {
        // Dependencies and patterns may depend on framework upgrades
        const frameworkRecs = recommendations.filter(r => r.type === 'framework');
        for (const frameworkRec of frameworkRecs) {
          // If this recommendation mentions the framework, it depends on it
          const recText = `${rec.title} ${rec.description}`.toLowerCase();
          const frameworkName = frameworkRec.currentState.split('@')[0].toLowerCase();
          
          if (recText.includes(frameworkName)) {
            deps.push(frameworkRec.id);
            reasons.push(`Requires ${frameworkName} to be upgraded first`);
          }
        }
      }

      // Check for dependency chain dependencies
      if (rec.type === 'dependency') {
        const depName = rec.currentState.split('@')[0];
        
        // Check if other dependencies depend on this one
        for (const otherRec of recommendations) {
          if (otherRec.id === rec.id || otherRec.type !== 'dependency') continue;
          
          const otherDepName = otherRec.currentState.split('@')[0];
          
          // Check if this is a peer dependency or related package
          if (this.areDependenciesRelated(depName, otherDepName)) {
            // The one with higher priority should be done first
            if (this.getPriorityValue(otherRec.priority) > this.getPriorityValue(rec.priority)) {
              deps.push(otherRec.id);
              reasons.push(`${otherDepName} should be upgraded before ${depName}`);
            }
          }
        }
      }

      // Check for pattern dependencies on dependency updates
      if (rec.type === 'pattern') {
        // Some patterns may require specific dependency versions
        const depRecs = recommendations.filter(r => r.type === 'dependency');
        for (const depRec of depRecs) {
          const depName = depRec.currentState.split('@')[0].toLowerCase();
          const recText = `${rec.title} ${rec.description} ${rec.migrationSteps.join(' ')}`.toLowerCase();
          
          // If the pattern mentions needing a specific dependency version
          if (recText.includes(`requires ${depName}`) || recText.includes(`needs ${depName}`)) {
            deps.push(depRec.id);
            reasons.push(`Requires ${depName} to be updated first`);
          }
        }
      }

      // Only add if there are dependencies
      if (deps.length > 0) {
        dependencies.push({
          recommendationId: rec.id,
          dependsOn: deps,
          reason: reasons.join('; '),
        });
      }
    }

    return dependencies;
  }

  /**
   * Create phases from recommendations using topological sort
   * Validates: Requirements 6.1, 6.2, 6.3
   * @param recommendations - Array of recommendations
   * @param dependencies - Array of recommendation dependencies
   * @returns Array of phases
   */
  createPhases(
    recommendations: Recommendation[],
    dependencies: RecommendationDependency[]
  ): Phase[] {
    // Build dependency graph
    const graph = this.buildDependencyGraph(recommendations, dependencies);
    
    // Perform topological sort to determine phase assignment
    const sorted = this.topologicalSort(graph);
    
    // Group recommendations into phases
    const phaseGroups = this.groupIntoPhases(sorted, recommendations, dependencies);
    
    // Create phase objects with estimates
    const phases: Phase[] = [];
    for (let i = 0; i < phaseGroups.length; i++) {
      const phaseRecs = phaseGroups[i];
      const phase = this.createPhase(i + 1, phaseRecs, phases);
      phases.push(phase);
    }

    return phases;
  }

  /**
   * Estimate timeline for a phase
   * Validates: Requirements 6.4
   * @param phase - Phase to estimate
   * @returns Time estimate for the phase
   */
  estimateTimeline(phase: Phase): TimeEstimate {
    let minDays = 0;
    let maxDays = 0;

    // Sum up effort estimates for all recommendations in the phase
    for (const rec of phase.recommendations) {
      const estimate = this.estimateRecommendationTime(rec);
      minDays += estimate.min;
      maxDays += estimate.max;
    }

    // Determine confidence based on phase complexity
    let confidence: 'low' | 'medium' | 'high' = 'medium';
    
    if (phase.recommendations.length > 10) {
      confidence = 'low'; // Many recommendations = less predictable
    } else if (phase.recommendations.length <= 3) {
      confidence = 'high'; // Few recommendations = more predictable
    }

    // Check if phase has high-effort items
    const hasHighEffort = phase.recommendations.some(r => r.effort === 'high');
    if (hasHighEffort) {
      confidence = confidence === 'high' ? 'medium' : 'low';
    }

    return {
      min: minDays,
      max: maxDays,
      confidence,
    };
  }

  // Private helper methods

  /**
   * Build a dependency graph from recommendations and dependencies
   */
  private buildDependencyGraph(
    recommendations: Recommendation[],
    dependencies: RecommendationDependency[]
  ): Map<string, Set<string>> {
    const graph = new Map<string, Set<string>>();

    // Initialize graph with all recommendations
    for (const rec of recommendations) {
      graph.set(rec.id, new Set<string>());
    }

    // Add edges for dependencies
    for (const dep of dependencies) {
      const edges = graph.get(dep.recommendationId);
      if (edges) {
        for (const depId of dep.dependsOn) {
          edges.add(depId);
        }
      }
    }

    return graph;
  }

  /**
   * Perform topological sort on dependency graph
   * Returns recommendations in order where dependencies come before dependents
   */
  private topologicalSort(graph: Map<string, Set<string>>): string[] {
    const sorted: string[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (id: string): void => {
      if (visited.has(id)) return;
      if (visiting.has(id)) {
        // Circular dependency detected - skip this edge
        return;
      }

      visiting.add(id);

      const deps = graph.get(id);
      if (deps) {
        for (const depId of deps) {
          visit(depId);
        }
      }

      visiting.delete(id);
      visited.add(id);
      sorted.push(id);
    };

    // Visit all nodes
    for (const id of graph.keys()) {
      visit(id);
    }

    return sorted;
  }

  /**
   * Group sorted recommendations into phases
   * Validates: Requirements 6.2, 6.3
   */
  private groupIntoPhases(
    sortedIds: string[],
    recommendations: Recommendation[],
    dependencies: RecommendationDependency[]
  ): Recommendation[][] {
    const recMap = new Map(recommendations.map(r => [r.id, r]));
    const phases: Recommendation[][] = [];

    // Calculate depth for each recommendation (how many dependencies it has in chain)
    const depths = this.calculateDepths(sortedIds, dependencies);

    // Group by depth first
    const depthGroups = new Map<number, Recommendation[]>();
    for (const id of sortedIds) {
      const rec = recMap.get(id);
      if (!rec) continue;

      const depth = depths.get(id) || 0;
      if (!depthGroups.has(depth)) {
        depthGroups.set(depth, []);
      }
      depthGroups.get(depth)!.push(rec);
    }

    // Convert depth groups to phases, applying grouping and ordering logic
    const sortedDepths = Array.from(depthGroups.keys()).sort((a, b) => a - b);
    
    for (const depth of sortedDepths) {
      const recs = depthGroups.get(depth)!;
      
      // Group related recommendations within this depth level
      const grouped = this.groupRelatedRecommendations(recs);
      
      // Sort groups by priority and effort (quick wins first)
      const sorted = this.sortByQuickWins(grouped);
      
      phases.push(sorted);
    }

    return phases;
  }

  /**
   * Calculate depth (dependency chain length) for each recommendation
   */
  private calculateDepths(
    sortedIds: string[],
    dependencies: RecommendationDependency[]
  ): Map<string, number> {
    const depths = new Map<string, number>();
    const depMap = new Map(dependencies.map(d => [d.recommendationId, d.dependsOn]));

    // Process in topologically sorted order
    for (const id of sortedIds) {
      const deps = depMap.get(id) || [];
      
      if (deps.length === 0) {
        depths.set(id, 0);
      } else {
        // Depth is 1 + max depth of dependencies
        const maxDepDepth = Math.max(...deps.map(depId => depths.get(depId) || 0));
        depths.set(id, maxDepDepth + 1);
      }
    }

    return depths;
  }

  /**
   * Group related recommendations together
   * Validates: Requirements 6.2
   */
  private groupRelatedRecommendations(recommendations: Recommendation[]): Recommendation[] {
    // Group by type first (dependencies together, frameworks together, patterns together)
    const byType = new Map<string, Recommendation[]>();
    
    for (const rec of recommendations) {
      if (!byType.has(rec.type)) {
        byType.set(rec.type, []);
      }
      byType.get(rec.type)!.push(rec);
    }

    // Flatten back, maintaining type grouping
    const grouped: Recommendation[] = [];
    
    // Order: frameworks first, then dependencies, then patterns
    const typeOrder = ['framework', 'dependency', 'pattern'];
    for (const type of typeOrder) {
      const recs = byType.get(type);
      if (recs) {
        grouped.push(...recs);
      }
    }

    return grouped;
  }

  /**
   * Sort recommendations to prioritize quick wins
   * Validates: Requirements 6.3
   */
  private sortByQuickWins(recommendations: Recommendation[]): Recommendation[] {
    return [...recommendations].sort((a, b) => {
      // Calculate quick win score (higher is better)
      const scoreA = this.calculateQuickWinScore(a);
      const scoreB = this.calculateQuickWinScore(b);
      
      return scoreB - scoreA;
    });
  }

  /**
   * Calculate quick win score for a recommendation
   * Higher score = better quick win (low effort, high benefit, high priority)
   */
  private calculateQuickWinScore(rec: Recommendation): number {
    let score = 0;

    // Priority contribution (higher priority = higher score)
    const priorityScores = { critical: 40, high: 30, medium: 20, low: 10 };
    score += priorityScores[rec.priority];

    // Effort contribution (lower effort = higher score)
    const effortScores = { low: 30, medium: 15, high: 5 };
    score += effortScores[rec.effort];

    // Benefits contribution
    score += Math.min(rec.benefits.length * 2, 20);

    // Security vulnerabilities get extra boost
    const hasSecurityBenefit = rec.benefits.some(b => 
      b.toLowerCase().includes('security') || b.toLowerCase().includes('vulnerability')
    );
    if (hasSecurityBenefit) {
      score += 20;
    }

    return score;
  }

  /**
   * Create a phase object
   */
  private createPhase(
    number: number,
    recommendations: Recommendation[],
    previousPhases: Phase[]
  ): Phase {
    const estimate = this.estimatePhaseTime(recommendations);
    const name = this.generatePhaseName(number, recommendations);
    const description = this.generatePhaseDescription(recommendations);
    const prerequisites = previousPhases.length > 0 ? [previousPhases.length] : [];

    return {
      number,
      name,
      description,
      recommendations,
      estimate,
      prerequisites,
    };
  }

  /**
   * Generate a descriptive name for a phase
   */
  private generatePhaseName(number: number, recommendations: Recommendation[]): string {
    // Analyze the phase content to generate a meaningful name
    const hasCritical = recommendations.some(r => r.priority === 'critical');
    const hasFramework = recommendations.some(r => r.type === 'framework');
    const hasSecurity = recommendations.some(r => 
      r.benefits.some(b => b.toLowerCase().includes('security'))
    );

    if (hasCritical || hasSecurity) {
      return `Phase ${number}: Critical Security Updates`;
    } else if (hasFramework) {
      return `Phase ${number}: Framework Modernization`;
    } else if (recommendations.every(r => r.type === 'dependency')) {
      return `Phase ${number}: Dependency Updates`;
    } else if (recommendations.every(r => r.type === 'pattern')) {
      return `Phase ${number}: Code Pattern Modernization`;
    } else {
      return `Phase ${number}: Mixed Modernization Tasks`;
    }
  }

  /**
   * Generate a description for a phase
   */
  private generatePhaseDescription(recommendations: Recommendation[]): string {
    const types = new Set(recommendations.map(r => r.type));
    const priorities = new Set(recommendations.map(r => r.priority));
    
    const parts: string[] = [];
    
    // Describe what's in the phase
    if (types.has('framework')) {
      const count = recommendations.filter(r => r.type === 'framework').length;
      parts.push(`${count} framework upgrade${count > 1 ? 's' : ''}`);
    }
    if (types.has('dependency')) {
      const count = recommendations.filter(r => r.type === 'dependency').length;
      parts.push(`${count} dependency update${count > 1 ? 's' : ''}`);
    }
    if (types.has('pattern')) {
      const count = recommendations.filter(r => r.type === 'pattern').length;
      parts.push(`${count} code pattern modernization${count > 1 ? 's' : ''}`);
    }

    let description = `This phase includes ${parts.join(', ')}.`;

    // Add priority information
    if (priorities.has('critical')) {
      description += ' Contains critical priority items that should be addressed immediately.';
    } else if (priorities.has('high')) {
      description += ' Contains high priority items that should be addressed soon.';
    }

    return description;
  }

  /**
   * Estimate time for a phase
   */
  private estimatePhaseTime(recommendations: Recommendation[]): TimeEstimate {
    let minDays = 0;
    let maxDays = 0;

    for (const rec of recommendations) {
      const estimate = this.estimateRecommendationTime(rec);
      minDays += estimate.min;
      maxDays += estimate.max;
    }

    // Determine confidence
    let confidence: 'low' | 'medium' | 'high' = 'medium';
    
    if (recommendations.length > 10) {
      confidence = 'low';
    } else if (recommendations.length <= 3) {
      confidence = 'high';
    }

    const hasHighEffort = recommendations.some(r => r.effort === 'high');
    if (hasHighEffort) {
      confidence = confidence === 'high' ? 'medium' : 'low';
    }

    return { min: minDays, max: maxDays, confidence };
  }

  /**
   * Estimate time for a single recommendation
   */
  private estimateRecommendationTime(rec: Recommendation): TimeEstimate {
    // Base estimates by effort level
    const baseEstimates = {
      low: { min: 0.5, max: 1 },
      medium: { min: 1, max: 3 },
      high: { min: 3, max: 7 },
    };

    const base = baseEstimates[rec.effort];

    // Adjust based on type
    let multiplier = 1;
    if (rec.type === 'framework') {
      multiplier = 1.5; // Frameworks take longer
    } else if (rec.type === 'pattern') {
      // Patterns depend on number of occurrences
      const occurrenceMatch = rec.title.match(/(\d+) occurrence/);
      if (occurrenceMatch) {
        const count = parseInt(occurrenceMatch[1], 10);
        multiplier = Math.min(1 + (count / 10), 3); // Cap at 3x
      }
    }

    return {
      min: base.min * multiplier,
      max: base.max * multiplier,
      confidence: 'medium',
    };
  }

  /**
   * Calculate total estimate from all phases
   */
  private calculateTotalEstimate(phases: Phase[]): TimeEstimate {
    let minDays = 0;
    let maxDays = 0;

    for (const phase of phases) {
      minDays += phase.estimate.min;
      maxDays += phase.estimate.max;
    }

    // Overall confidence is lower for longer roadmaps
    let confidence: 'low' | 'medium' | 'high' = 'medium';
    if (phases.length > 5) {
      confidence = 'low';
    } else if (phases.length <= 2) {
      confidence = 'high';
    }

    return { min: minDays, max: maxDays, confidence };
  }

  /**
   * Identify the critical path (longest dependency chain)
   */
  private identifyCriticalPath(
    recommendations: Recommendation[],
    dependencies: RecommendationDependency[]
  ): string[] {
    const recMap = new Map(recommendations.map(r => [r.id, r]));
    const depMap = new Map(dependencies.map(d => [d.recommendationId, d.dependsOn]));

    // Find the longest path using DFS
    let longestPath: string[] = [];

    const findPath = (id: string, currentPath: string[]): void => {
      const newPath = [...currentPath, id];
      
      const deps = depMap.get(id) || [];
      if (deps.length === 0) {
        // Leaf node - check if this is the longest path
        if (newPath.length > longestPath.length) {
          longestPath = newPath;
        }
      } else {
        // Continue exploring dependencies
        for (const depId of deps) {
          if (!currentPath.includes(depId)) { // Avoid cycles
            findPath(depId, newPath);
          }
        }
      }
    };

    // Start from all recommendations
    for (const rec of recommendations) {
      findPath(rec.id, []);
    }

    // Convert IDs to titles for readability
    return longestPath.map(id => {
      const rec = recMap.get(id);
      return rec ? rec.title : id;
    });
  }

  /**
   * Identify quick wins (low effort, high benefit, no dependencies)
   */
  private identifyQuickWins(
    recommendations: Recommendation[],
    dependencies: RecommendationDependency[]
  ): Recommendation[] {
    const dependentIds = new Set(dependencies.map(d => d.recommendationId));

    return recommendations
      .filter(rec => {
        // Must be low effort
        if (rec.effort !== 'low') return false;

        // Must not have dependencies
        if (dependentIds.has(rec.id)) return false;

        // Must have high or critical priority, or good benefits
        if (rec.priority === 'critical' || rec.priority === 'high') return true;
        if (rec.benefits.length >= 3) return true;

        return false;
      })
      .sort((a, b) => {
        // Sort by priority
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      })
      .slice(0, 5); // Return top 5 quick wins
  }

  /**
   * Check if two dependencies are related (e.g., peer dependencies)
   */
  private areDependenciesRelated(dep1: string, dep2: string): boolean {
    // Common related package patterns
    const relatedPatterns = [
      ['react', 'react-dom'],
      ['@angular/core', '@angular/common'],
      ['vue', 'vue-router'],
      ['express', 'body-parser'],
      ['webpack', 'webpack-cli'],
    ];

    for (const pattern of relatedPatterns) {
      if (
        (pattern.includes(dep1.toLowerCase()) && pattern.includes(dep2.toLowerCase())) ||
        (dep1.toLowerCase().includes(dep2.toLowerCase()) || dep2.toLowerCase().includes(dep1.toLowerCase()))
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get numeric value for priority (for comparison)
   */
  private getPriorityValue(priority: string): number {
    const values = { critical: 4, high: 3, medium: 2, low: 1 };
    return values[priority as keyof typeof values] || 0;
  }
}
