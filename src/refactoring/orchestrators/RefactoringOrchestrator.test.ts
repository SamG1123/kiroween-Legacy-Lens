import { RefactoringOrchestrator, RefactoringProgress } from './RefactoringOrchestrator';
import { RefactoringSuggestion } from '../types';
import { defaultConfig } from '../config';

describe('RefactoringOrchestrator', () => {
  let orchestrator: RefactoringOrchestrator;

  beforeEach(() => {
    orchestrator = new RefactoringOrchestrator(defaultConfig);
    
    // Mock the test runner to avoid actual test execution
    const testRunner = (orchestrator as any).testRunner;
    testRunner.runTests = jest.fn(async () => ({
      passed: 10,
      failed: 0,
      errors: [],
      duration: 100,
    }));
  });

  describe('analyzeAndSuggest', () => {
    it('should detect smells and generate suggestions', async () => {
      const code = `
        function veryLongMethod() {
          const x = 1;
          const y = 2;
          const z = 3;
          const a = 4;
          const b = 5;
          const c = 6;
          const d = 7;
          const e = 8;
          const f = 9;
          const g = 10;
          const h = 11;
          const i = 12;
          const j = 13;
          const k = 14;
          const l = 15;
          const m = 16;
          const n = 17;
          const o = 18;
          const p = 19;
          const q = 20;
          return x + y + z + a + b + c + d + e + f + g + h + i + j + k + l + m + n + o + p + q;
        }
      `;

      const suggestions = await orchestrator.analyzeAndSuggest(
        code,
        'test.ts',
        'project-1'
      );

      expect(suggestions).toBeDefined();
      expect(Array.isArray(suggestions)).toBe(true);
    });

    it('should call progress callback during analysis', async () => {
      const code = 'function test() { return 1; }';
      const progressUpdates: RefactoringProgress[] = [];

      await orchestrator.analyzeAndSuggest(
        code,
        'test.ts',
        'project-1',
        (progress) => progressUpdates.push(progress)
      );

      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates[0].stage).toBe('detecting');
      expect(progressUpdates[progressUpdates.length - 1].stage).toBe('complete');
    });

    it('should detect multiple types of smells', async () => {
      const code = `
        function x() {
          const data = 1;
          if (data > 0) {
            if (data < 10) {
              if (data !== 5) {
                return true;
              }
            }
          }
          return false;
        }
      `;

      const suggestions = await orchestrator.analyzeAndSuggest(
        code,
        'test.ts',
        'project-1'
      );

      // Should detect poor naming (x, data) and complex conditionals
      expect(suggestions.length).toBeGreaterThan(0);
    });
  });

  describe('applyRefactoring', () => {
    it('should apply a valid refactoring', async () => {
      const code = 'const x = 1;';
      const refactoring: RefactoringSuggestion = {
        id: 'test-1',
        type: 'rename',
        title: 'Rename x to value',
        description: 'Improve variable name',
        beforeCode: code,
        afterCode: 'const value = 1;',
        diff: '- const x = 1;\n+ const value = 1;',
        benefits: ['Better readability'],
        riskLevel: 'low',
        estimatedEffort: 'low',
        priority: 10,
      };

      const result = await orchestrator.applyRefactoring(
        code,
        refactoring,
        'project-1',
        process.cwd()
      );

      expect(result.success).toBe(true);
      expect(result.refactoring).toBeDefined();
      expect(result.refactoring.status).toBe('applied');
    });

    it('should revert refactoring if tests fail', async () => {
      const code = 'const x = 1;';
      const refactoring: RefactoringSuggestion = {
        id: 'test-2',
        type: 'rename',
        title: 'Rename x to value',
        description: 'Improve variable name',
        beforeCode: code,
        afterCode: 'const value = 1;',
        diff: '- const x = 1;\n+ const value = 1;',
        benefits: ['Better readability'],
        riskLevel: 'low',
        estimatedEffort: 'low',
        priority: 10,
      };

      // Mock test runner to simulate test failure
      const testRunner = (orchestrator as any).testRunner;
      const originalRunTests = testRunner.runTests.bind(testRunner);
      let callCount = 0;
      
      testRunner.runTests = jest.fn(async () => {
        callCount++;
        return {
          passed: callCount === 1 ? 10 : 5, // Fewer tests pass after refactoring
          failed: callCount === 1 ? 0 : 5,
          errors: [],
          duration: 100,
        };
      });

      const result = await orchestrator.applyRefactoring(
        code,
        refactoring,
        'project-1',
        process.cwd()
      );

      // Should revert due to test failures
      expect(result.success).toBe(false);
      expect(result.refactoring.status).toBe('reverted');
      expect(result.error).toContain('reverted');

      // Restore original
      testRunner.runTests = originalRunTests;
    });

    it('should warn when no tests exist', async () => {
      const code = 'const x = 1;';
      const refactoring: RefactoringSuggestion = {
        id: 'test-3',
        type: 'rename',
        title: 'Rename x to value',
        description: 'Improve variable name',
        beforeCode: code,
        afterCode: 'const value = 1;',
        diff: '- const x = 1;\n+ const value = 1;',
        benefits: ['Better readability'],
        riskLevel: 'low',
        estimatedEffort: 'low',
        priority: 10,
      };

      // Mock test runner to simulate no tests
      const testRunner = (orchestrator as any).testRunner;
      const originalRunTests = testRunner.runTests.bind(testRunner);
      
      testRunner.runTests = jest.fn(async () => ({
        passed: 0,
        failed: 0,
        errors: [],
        duration: 0,
      }));

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      await orchestrator.applyRefactoring(
        code,
        refactoring,
        'project-1',
        process.cwd()
      );

      expect(consoleWarnSpy).toHaveBeenCalled();

      // Restore
      testRunner.runTests = originalRunTests;
      consoleWarnSpy.mockRestore();
    });
  });

  describe('applyRefactorings', () => {
    it('should apply multiple refactorings in order', async () => {
      const code = 'const x = 1; const y = 2;';
      const refactorings: RefactoringSuggestion[] = [
        {
          id: 'test-4',
          type: 'rename',
          title: 'Rename x',
          description: 'Rename x to value1',
          beforeCode: code,
          afterCode: 'const value1 = 1; const y = 2;',
          diff: '',
          benefits: [],
          riskLevel: 'low',
          estimatedEffort: 'low',
          priority: 10,
        },
        {
          id: 'test-5',
          type: 'rename',
          title: 'Rename y',
          description: 'Rename y to value2',
          beforeCode: 'const value1 = 1; const y = 2;',
          afterCode: 'const value1 = 1; const value2 = 2;',
          diff: '',
          benefits: [],
          riskLevel: 'low',
          estimatedEffort: 'low',
          priority: 9,
        },
      ];

      const result = await orchestrator.applyRefactorings(
        code,
        refactorings,
        'project-1',
        process.cwd()
      );

      expect(result.appliedRefactorings.length).toBeGreaterThan(0);
    });

    it('should rollback all changes in atomic mode on failure', async () => {
      const atomicOrchestrator = new RefactoringOrchestrator({
        ...defaultConfig,
        atomicRefactoring: true,
      });

      const code = 'const x = 1;';
      const refactorings: RefactoringSuggestion[] = [
        {
          id: 'test-6',
          type: 'rename',
          title: 'Rename x',
          description: 'Rename x to value',
          beforeCode: code,
          afterCode: 'const value = 1;',
          diff: '',
          benefits: [],
          riskLevel: 'low',
          estimatedEffort: 'low',
          priority: 10,
        },
      ];

      // Mock validator to fail
      const validator = (atomicOrchestrator as any).validator;
      validator.validateRefactoring = jest.fn(() => ({
        safe: false,
        issues: [{ type: 'syntax', description: 'Invalid syntax' }],
        warnings: [],
      }));

      const result = await atomicOrchestrator.applyRefactorings(
        code,
        refactorings,
        'project-1',
        process.cwd()
      );

      expect(result.success).toBe(false);
      expect(result.warnings).toContain('All refactorings rolled back due to failure');
    });
  });

  describe('undo functionality', () => {
    it('should undo the last refactoring', async () => {
      const code = 'const x = 1;';
      const refactoring: RefactoringSuggestion = {
        id: 'test-7',
        type: 'rename',
        title: 'Rename x',
        description: 'Rename x to value',
        beforeCode: code,
        afterCode: 'const value = 1;',
        diff: '',
        benefits: [],
        riskLevel: 'low',
        estimatedEffort: 'low',
        priority: 10,
      };

      await orchestrator.applyRefactoring(
        code,
        refactoring,
        'project-1',
        process.cwd()
      );

      const undoResult = await orchestrator.undoLastRefactoring('project-1');

      expect(undoResult.success).toBe(true);
      expect(undoResult.refactoring).toBeDefined();
      expect(undoResult.refactoring!.status).toBe('reverted');
    });

    it('should return error when no refactorings to undo', async () => {
      const undoResult = await orchestrator.undoLastRefactoring('project-999');

      expect(undoResult.success).toBe(false);
      expect(undoResult.error).toBe('No refactorings to undo');
    });

    it('should undo all refactorings', async () => {
      const code = 'const x = 1;';
      const refactorings: RefactoringSuggestion[] = [
        {
          id: 'test-8',
          type: 'rename',
          title: 'Rename x',
          description: 'Rename x to value',
          beforeCode: code,
          afterCode: 'const value = 1;',
          diff: '',
          benefits: [],
          riskLevel: 'low',
          estimatedEffort: 'low',
          priority: 10,
        },
        {
          id: 'test-9',
          type: 'rename',
          title: 'Rename value',
          description: 'Rename value to result',
          beforeCode: 'const value = 1;',
          afterCode: 'const result = 1;',
          diff: '',
          benefits: [],
          riskLevel: 'low',
          estimatedEffort: 'low',
          priority: 9,
        },
      ];

      await orchestrator.applyRefactorings(
        code,
        refactorings,
        'project-2',
        process.cwd()
      );

      const undoResult = await orchestrator.undoAllRefactorings('project-2');

      expect(undoResult.success).toBe(true);
      expect(undoResult.count).toBeGreaterThan(0);
    });
  });

  describe('history management', () => {
    it('should track refactoring history', async () => {
      const code = 'const x = 1;';
      const refactoring: RefactoringSuggestion = {
        id: 'test-10',
        type: 'rename',
        title: 'Rename x',
        description: 'Rename x to value',
        beforeCode: code,
        afterCode: 'const value = 1;',
        diff: '',
        benefits: [],
        riskLevel: 'low',
        estimatedEffort: 'low',
        priority: 10,
      };

      await orchestrator.applyRefactoring(
        code,
        refactoring,
        'project-3',
        process.cwd()
      );

      const history = orchestrator.getRefactoringHistory('project-3');

      expect(history.length).toBeGreaterThan(0);
      expect(history[0].id).toBe('test-10');
    });

    it('should clear history', async () => {
      const code = 'const x = 1;';
      const refactoring: RefactoringSuggestion = {
        id: 'test-11',
        type: 'rename',
        title: 'Rename x',
        description: 'Rename x to value',
        beforeCode: code,
        afterCode: 'const value = 1;',
        diff: '',
        benefits: [],
        riskLevel: 'low',
        estimatedEffort: 'low',
        priority: 10,
      };

      await orchestrator.applyRefactoring(
        code,
        refactoring,
        'project-4',
        process.cwd()
      );

      orchestrator.clearHistory('project-4');

      const history = orchestrator.getRefactoringHistory('project-4');
      expect(history.length).toBe(0);
    });
  });

  describe('progress tracking', () => {
    it('should report progress through all stages', async () => {
      const code = 'const x = 1;';
      const progressStages: string[] = [];

      await orchestrator.analyzeAndSuggest(
        code,
        'test.ts',
        'project-5',
        (progress) => {
          if (!progressStages.includes(progress.stage)) {
            progressStages.push(progress.stage);
          }
        }
      );

      expect(progressStages).toContain('detecting');
      expect(progressStages).toContain('suggesting');
      expect(progressStages).toContain('planning');
      expect(progressStages).toContain('complete');
    });

    it('should report percentage progress', async () => {
      const code = 'const x = 1;';
      const percentages: number[] = [];

      await orchestrator.analyzeAndSuggest(
        code,
        'test.ts',
        'project-6',
        (progress) => percentages.push(progress.percentage)
      );

      expect(percentages.length).toBeGreaterThan(0);
      expect(Math.max(...percentages)).toBe(100);
    });
  });
});
