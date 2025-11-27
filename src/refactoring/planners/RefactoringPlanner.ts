import {
  RefactoringSuggestion,
  RefactoringPlan,
  Dependency,
  Location,
} from '../types';

/**
 * Plans refactoring execution order based on dependencies and priorities
 * Requirements: 1.5
 */
export class RefactoringPlanner {
  /**
   * Create a complete refactoring plan with ordered refactorings and dependencies
   * Requirements: 1.5
   */
  planRefactorings(suggestions: RefactoringSuggestion[]): RefactoringPlan {
    // Identify dependencies between refactorings
    const dependencies = this.identifyDependencies(suggestions);

    // Order refactorings by priority and dependencies
    const orderedRefactorings = this.orderRefactorings(suggestions);

    // Estimate total duration based on effort levels
    const estimatedDuration = this.estimateDuration(orderedRefactorings);

    return {
      refactorings: orderedRefactorings,
      dependencies,
      estimatedDuration,
    };
  }

  /**
   * Identify dependencies between refactorings
   * Requirements: 1.5
   * 
   * Dependencies exist when:
   * 1. Refactorings affect overlapping code locations
   * 2. One refactoring creates code that another refactoring needs
   * 3. Rename refactorings should happen before structural changes
   * 4. Extract method should happen before duplication removal
   */
  identifyDependencies(suggestions: RefactoringSuggestion[]): Dependency[] {
    const dependencyMap = new Map<string, { dependsOn: Set<string>; reasons: Map<string, string> }>();

    // Initialize dependency map
    for (const suggestion of suggestions) {
      dependencyMap.set(suggestion.id, {
        dependsOn: new Set(),
        reasons: new Map(),
      });
    }

    // Check all pairs for dependencies
    for (let i = 0; i < suggestions.length; i++) {
      const current = suggestions[i];

      for (let j = 0; j < suggestions.length; j++) {
        if (i === j) continue;

        const other = suggestions[j];
        const reason = this.checkDependency(current, other);

        if (reason) {
          const depInfo = dependencyMap.get(current.id)!;
          depInfo.dependsOn.add(other.id);
          depInfo.reasons.set(other.id, reason);
        }
      }
    }

    // Convert to Dependency array
    const dependencies: Dependency[] = [];
    for (const [refactoringId, depInfo] of dependencyMap.entries()) {
      if (depInfo.dependsOn.size > 0) {
        dependencies.push({
          refactoringId,
          dependsOn: Array.from(depInfo.dependsOn),
          reason: Array.from(depInfo.reasons.values()).join('; '),
        });
      }
    }

    return dependencies;
  }

  /**
   * Order refactorings by priority and dependencies
   * Requirements: 1.5
   * 
   * Ordering strategy:
   * 1. Sort by priority (impact and safety)
   * 2. Respect dependencies (topological sort)
   * 3. Group by type for efficiency
   */
  orderRefactorings(suggestions: RefactoringSuggestion[]): RefactoringSuggestion[] {
    if (suggestions.length === 0) return [];

    // First, sort by priority
    const sortedByPriority = [...suggestions].sort((a, b) => {
      // Higher priority first
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }

      // Then by risk level (lower risk first)
      const riskOrder = { low: 0, medium: 1, high: 2 };
      if (riskOrder[a.riskLevel] !== riskOrder[b.riskLevel]) {
        return riskOrder[a.riskLevel] - riskOrder[b.riskLevel];
      }

      // Then by effort (lower effort first)
      const effortOrder = { low: 0, medium: 1, high: 2 };
      return effortOrder[a.estimatedEffort] - effortOrder[b.estimatedEffort];
    });

    // Apply dependency-based ordering (topological sort)
    const dependencies = this.identifyDependencies(suggestions);
    const ordered = this.topologicalSort(sortedByPriority, dependencies);

    return ordered;
  }

  /**
   * Check if current refactoring depends on another refactoring
   * Returns the reason for dependency, or null if no dependency
   */
  private checkDependency(
    current: RefactoringSuggestion,
    other: RefactoringSuggestion
  ): string | null {
    // Rule 1: Rename should happen before structural changes
    if (
      other.type === 'rename' &&
      (current.type === 'extract_method' ||
        current.type === 'remove_duplication' ||
        current.type === 'split_class')
    ) {
      // Only create dependency if they affect overlapping code
      if (this.hasLocationOverlap(current, other)) {
        return 'Rename should be applied before structural changes to avoid confusion';
      }
    }

    // Rule 2: Extract method should happen before duplication removal
    // (duplication removal might benefit from extracted methods)
    if (
      other.type === 'extract_method' &&
      current.type === 'remove_duplication'
    ) {
      if (this.hasLocationOverlap(current, other)) {
        return 'Extract method first to potentially reduce duplication';
      }
    }

    // Rule 3: Simplify conditionals before extract method
    // (simpler conditionals are easier to extract)
    if (
      other.type === 'simplify_conditional' &&
      current.type === 'extract_method'
    ) {
      if (this.hasLocationOverlap(current, other)) {
        return 'Simplify conditionals first to make extraction cleaner';
      }
    }

    // Rule 4: SOLID refactorings (split class, introduce interface) should happen last
    // as they are high-risk and benefit from other refactorings being done first
    if (
      (current.type === 'split_class' || current.type === 'introduce_interface') &&
      (other.type === 'extract_method' ||
        other.type === 'remove_duplication' ||
        other.type === 'simplify_conditional' ||
        other.type === 'rename')
    ) {
      if (this.hasLocationOverlap(current, other)) {
        return 'Apply simpler refactorings before major structural changes';
      }
    }

    return null;
  }

  /**
   * Check if two refactorings affect overlapping code locations
   */
  private hasLocationOverlap(
    a: RefactoringSuggestion,
    b: RefactoringSuggestion
  ): boolean {
    // Extract location information from before/after code
    // In a real implementation, this would parse the actual locations
    // For now, we use a simple heuristic based on code content
    
    // Check if the refactorings mention the same identifiers
    const aIdentifiers = this.extractIdentifiers(a.beforeCode);
    const bIdentifiers = this.extractIdentifiers(b.beforeCode);

    // If they share significant identifiers, they might overlap
    const sharedIdentifiers = aIdentifiers.filter(id => bIdentifiers.includes(id));
    return sharedIdentifiers.length > 0;
  }

  /**
   * Extract identifiers from code (simple heuristic)
   */
  private extractIdentifiers(code: string): string[] {
    // Match JavaScript/TypeScript identifiers
    const identifierRegex = /\b[a-zA-Z_$][a-zA-Z0-9_$]*\b/g;
    const matches = code.match(identifierRegex) || [];
    
    // Filter out common keywords
    const keywords = new Set([
      'const', 'let', 'var', 'function', 'class', 'if', 'else', 'for', 'while',
      'return', 'import', 'export', 'from', 'as', 'new', 'this', 'super',
      'private', 'public', 'protected', 'static', 'async', 'await', 'void',
      'any', 'string', 'number', 'boolean', 'TODO', 'Code', 'from'
    ]);

    return [...new Set(matches)].filter(id => !keywords.has(id));
  }

  /**
   * Perform topological sort to respect dependencies
   */
  private topologicalSort(
    suggestions: RefactoringSuggestion[],
    dependencies: Dependency[]
  ): RefactoringSuggestion[] {
    // Build adjacency list and in-degree map
    const adjacencyList = new Map<string, string[]>();
    const inDegree = new Map<string, number>();
    const suggestionMap = new Map<string, RefactoringSuggestion>();

    // Initialize
    for (const suggestion of suggestions) {
      adjacencyList.set(suggestion.id, []);
      inDegree.set(suggestion.id, 0);
      suggestionMap.set(suggestion.id, suggestion);
    }

    // Build graph - if A depends on B, then B must come before A
    // So we add an edge from B to A
    for (const dep of dependencies) {
      for (const dependsOnId of dep.dependsOn) {
        if (adjacencyList.has(dependsOnId) && suggestionMap.has(dep.refactoringId)) {
          adjacencyList.get(dependsOnId)!.push(dep.refactoringId);
          inDegree.set(dep.refactoringId, (inDegree.get(dep.refactoringId) || 0) + 1);
        }
      }
    }

    // Kahn's algorithm for topological sort
    const queue: string[] = [];
    const result: RefactoringSuggestion[] = [];

    // Find all nodes with in-degree 0
    for (const [id, degree] of inDegree.entries()) {
      if (degree === 0) {
        queue.push(id);
      }
    }

    // Process queue
    while (queue.length > 0) {
      // Sort queue by priority to maintain priority ordering when possible
      queue.sort((a, b) => {
        const aSuggestion = suggestionMap.get(a)!;
        const bSuggestion = suggestionMap.get(b)!;
        return bSuggestion.priority - aSuggestion.priority;
      });

      const currentId = queue.shift()!;
      const currentSuggestion = suggestionMap.get(currentId)!;
      result.push(currentSuggestion);

      // Reduce in-degree for neighbors
      const neighbors = adjacencyList.get(currentId) || [];
      for (const neighborId of neighbors) {
        const newDegree = (inDegree.get(neighborId) || 0) - 1;
        inDegree.set(neighborId, newDegree);

        if (newDegree === 0) {
          queue.push(neighborId);
        }
      }
    }

    // If result doesn't contain all suggestions, there's a cycle
    // In that case, return the original priority-sorted list
    if (result.length !== suggestions.length) {
      console.warn('Circular dependency detected in refactorings, using priority order');
      return suggestions;
    }

    return result;
  }

  /**
   * Estimate total duration in minutes based on effort levels
   */
  private estimateDuration(suggestions: RefactoringSuggestion[]): number {
    const effortMinutes = {
      low: 5,
      medium: 15,
      high: 30,
    };

    return suggestions.reduce((total, suggestion) => {
      return total + effortMinutes[suggestion.estimatedEffort];
    }, 0);
  }
}
