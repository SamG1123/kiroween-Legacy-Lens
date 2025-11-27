import { RefactoringPlanner } from './RefactoringPlanner';
import { RefactoringSuggestion } from '../types';

describe('RefactoringPlanner', () => {
  let planner: RefactoringPlanner;

  beforeEach(() => {
    planner = new RefactoringPlanner();
  });

  describe('planRefactorings', () => {
    it('should create a complete refactoring plan', () => {
      const suggestions: RefactoringSuggestion[] = [
        createSuggestion('1', 'extract_method', 10, 'low', 'low'),
        createSuggestion('2', 'rename', 15, 'low', 'low'),
      ];

      const plan = planner.planRefactorings(suggestions);

      expect(plan.refactorings).toHaveLength(2);
      expect(plan.dependencies).toBeDefined();
      expect(plan.estimatedDuration).toBeGreaterThan(0);
    });

    it('should estimate duration based on effort levels', () => {
      const suggestions: RefactoringSuggestion[] = [
        createSuggestion('1', 'extract_method', 10, 'low', 'low'),
        createSuggestion('2', 'split_class', 5, 'high', 'high'),
      ];

      const plan = planner.planRefactorings(suggestions);

      // low effort = 5 min, high effort = 30 min
      expect(plan.estimatedDuration).toBe(35);
    });
  });

  describe('identifyDependencies', () => {
    it('should identify rename before structural changes', () => {
      const suggestions: RefactoringSuggestion[] = [
        createSuggestion('1', 'extract_method', 10, 'low', 'low'),
        createSuggestion('2', 'rename', 15, 'low', 'low'),
      ];

      const dependencies = planner.identifyDependencies(suggestions);

      const extractDep = dependencies.find(d => d.refactoringId === '1');
      expect(extractDep).toBeDefined();
      expect(extractDep?.dependsOn).toContain('2');
      expect(extractDep?.reason).toContain('Rename');
    });

    it('should identify extract method before duplication removal', () => {
      const suggestions: RefactoringSuggestion[] = [
        createSuggestion('1', 'remove_duplication', 10, 'low', 'low'),
        createSuggestion('2', 'extract_method', 15, 'low', 'low'),
      ];

      const dependencies = planner.identifyDependencies(suggestions);

      const dupDep = dependencies.find(d => d.refactoringId === '1');
      expect(dupDep).toBeDefined();
      expect(dupDep?.dependsOn).toContain('2');
    });

    it('should identify simplify conditional before extract method', () => {
      const suggestions: RefactoringSuggestion[] = [
        createSuggestion('1', 'extract_method', 10, 'low', 'low'),
        createSuggestion('2', 'simplify_conditional', 15, 'low', 'low'),
      ];

      const dependencies = planner.identifyDependencies(suggestions);

      const extractDep = dependencies.find(d => d.refactoringId === '1');
      expect(extractDep).toBeDefined();
      expect(extractDep?.dependsOn).toContain('2');
    });

    it('should identify SOLID refactorings should happen last', () => {
      const suggestions: RefactoringSuggestion[] = [
        createSuggestion('1', 'split_class', 5, 'high', 'high'),
        createSuggestion('2', 'extract_method', 15, 'low', 'low'),
      ];

      const dependencies = planner.identifyDependencies(suggestions);

      const solidDep = dependencies.find(d => d.refactoringId === '1');
      expect(solidDep).toBeDefined();
      expect(solidDep?.dependsOn).toContain('2');
    });

    it('should return empty array for no dependencies', () => {
      const suggestions: RefactoringSuggestion[] = [
        createSuggestion('1', 'extract_method', 10, 'low', 'low', 'function foo() {}'),
        createSuggestion('2', 'extract_method', 15, 'low', 'low', 'function bar() {}'),
      ];

      const dependencies = planner.identifyDependencies(suggestions);

      // Should have no dependencies since they don't overlap
      expect(dependencies).toHaveLength(0);
    });
  });

  describe('orderRefactorings', () => {
    it('should order by priority (highest first)', () => {
      const suggestions: RefactoringSuggestion[] = [
        createSuggestion('1', 'extract_method', 5, 'low', 'low'),
        createSuggestion('2', 'rename', 15, 'low', 'low'),
        createSuggestion('3', 'simplify_conditional', 10, 'low', 'low'),
      ];

      const ordered = planner.orderRefactorings(suggestions);

      expect(ordered[0].id).toBe('2'); // priority 15
      expect(ordered[1].id).toBe('3'); // priority 10
      expect(ordered[2].id).toBe('1'); // priority 5
    });

    it('should order by risk level when priority is equal', () => {
      const suggestions: RefactoringSuggestion[] = [
        createSuggestion('1', 'extract_method', 10, 'high', 'low'),
        createSuggestion('2', 'rename', 10, 'low', 'low'),
      ];

      const ordered = planner.orderRefactorings(suggestions);

      expect(ordered[0].id).toBe('2'); // low risk first
      expect(ordered[1].id).toBe('1'); // high risk second
    });

    it('should order by effort when priority and risk are equal', () => {
      const suggestions: RefactoringSuggestion[] = [
        createSuggestion('1', 'extract_method', 10, 'low', 'high'),
        createSuggestion('2', 'rename', 10, 'low', 'low'),
      ];

      const ordered = planner.orderRefactorings(suggestions);

      expect(ordered[0].id).toBe('2'); // low effort first
      expect(ordered[1].id).toBe('1'); // high effort second
    });

    it('should respect dependencies in ordering', () => {
      const sharedCode = 'function test() { const data = getData(); processData(data); }';
      const suggestions: RefactoringSuggestion[] = [
        createSuggestion('1', 'extract_method', 20, 'low', 'low', sharedCode), // Higher priority
        createSuggestion('2', 'rename', 10, 'low', 'low', sharedCode), // Lower priority but should come first
      ];

      const ordered = planner.orderRefactorings(suggestions);

      // Rename should come first despite lower priority due to dependency
      expect(ordered[0].id).toBe('2');
      expect(ordered[1].id).toBe('1');
    });

    it('should handle empty array', () => {
      const ordered = planner.orderRefactorings([]);
      expect(ordered).toEqual([]);
    });

    it('should handle single suggestion', () => {
      const suggestions: RefactoringSuggestion[] = [
        createSuggestion('1', 'extract_method', 10, 'low', 'low'),
      ];

      const ordered = planner.orderRefactorings(suggestions);

      expect(ordered).toHaveLength(1);
      expect(ordered[0].id).toBe('1');
    });

    it('should order complex dependency chain correctly', () => {
      const sharedCode = 'class MyClass { method() { const data = getData(); if (data) { processData(data); } } }';
      const suggestions: RefactoringSuggestion[] = [
        createSuggestion('1', 'split_class', 10, 'high', 'high', sharedCode), // Should be last
        createSuggestion('2', 'extract_method', 15, 'low', 'low', sharedCode), // Should be after simplify
        createSuggestion('3', 'simplify_conditional', 12, 'low', 'low', sharedCode), // Should be after rename
        createSuggestion('4', 'rename', 8, 'low', 'low', sharedCode), // Should be first
      ];

      const ordered = planner.orderRefactorings(suggestions);

      // Verify dependencies are respected
      const renameIndex = ordered.findIndex(s => s.id === '4');
      const simplifyIndex = ordered.findIndex(s => s.id === '3');
      const extractIndex = ordered.findIndex(s => s.id === '2');
      const splitIndex = ordered.findIndex(s => s.id === '1');

      // Rename should come before extract (structural change)
      expect(renameIndex).toBeLessThan(extractIndex);
      // Simplify should come before extract
      expect(simplifyIndex).toBeLessThan(extractIndex);
      // All simple refactorings should come before split (SOLID)
      expect(renameIndex).toBeLessThan(splitIndex);
      expect(simplifyIndex).toBeLessThan(splitIndex);
      expect(extractIndex).toBeLessThan(splitIndex);
    });
  });
});

// Helper function to create test suggestions
function createSuggestion(
  id: string,
  type: RefactoringSuggestion['type'],
  priority: number,
  riskLevel: 'low' | 'medium' | 'high',
  estimatedEffort: 'low' | 'medium' | 'high',
  beforeCode: string = 'function test() { console.log("test"); }'
): RefactoringSuggestion {
  return {
    id,
    type,
    title: `Test ${type}`,
    description: `Test description for ${type}`,
    beforeCode,
    afterCode: beforeCode + '\n// refactored',
    diff: '+ // refactored',
    benefits: ['Test benefit'],
    riskLevel,
    estimatedEffort,
    priority,
  };
}
