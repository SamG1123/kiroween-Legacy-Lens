// Partial Result Manager Tests

import { PartialResultManager } from './PartialResultManager';
import { TestCase } from '../types';

describe('PartialResultManager', () => {
  let manager: PartialResultManager;

  beforeEach(() => {
    manager = new PartialResultManager();
  });

  describe('initialize', () => {
    it('should initialize a new partial result', () => {
      const partial = manager.initialize('test-1', 'project-1', 'test.ts', 'jest');

      expect(partial.id).toBe('test-1');
      expect(partial.projectId).toBe('project-1');
      expect(partial.targetFile).toBe('test.ts');
      expect(partial.framework).toBe('jest');
      expect(partial.stage).toBe('analysis');
      expect(partial.completedTestCases).toEqual([]);
      expect(partial.errors).toEqual([]);
    });
  });

  describe('updateStage', () => {
    it('should update the stage of a partial result', () => {
      manager.initialize('test-1', 'project-1', 'test.ts', 'jest');
      manager.updateStage('test-1', 'generation');

      const partial = manager.get('test-1');
      expect(partial?.stage).toBe('generation');
    });
  });

  describe('addCompletedTestCase', () => {
    it('should add a completed test case', () => {
      manager.initialize('test-1', 'project-1', 'test.ts', 'jest');

      const testCase: TestCase = {
        name: 'test 1',
        description: 'test description',
        inputs: [1, 2],
        expectedOutput: 3,
        type: 'happy_path',
      };

      manager.addCompletedTestCase('test-1', testCase);

      const partial = manager.get('test-1');
      expect(partial?.completedTestCases.length).toBe(1);
      expect(partial?.completedTestCases[0]).toEqual(testCase);
    });
  });

  describe('addCompletedTestCases', () => {
    it('should add multiple completed test cases', () => {
      manager.initialize('test-1', 'project-1', 'test.ts', 'jest');

      const testCases: TestCase[] = [
        {
          name: 'test 1',
          description: 'test 1',
          inputs: [],
          expectedOutput: null,
          type: 'happy_path',
        },
        {
          name: 'test 2',
          description: 'test 2',
          inputs: [],
          expectedOutput: null,
          type: 'edge_case',
        },
      ];

      manager.addCompletedTestCases('test-1', testCases);

      const partial = manager.get('test-1');
      expect(partial?.completedTestCases.length).toBe(2);
    });
  });

  describe('addFailedTestCase', () => {
    it('should record a failed test case', () => {
      manager.initialize('test-1', 'project-1', 'test.ts', 'jest');
      manager.addFailedTestCase('test-1', 'failed_test');

      const partial = manager.get('test-1');
      expect(partial?.failedTestCases).toContain('failed_test');
    });
  });

  describe('updatePartialTestCode', () => {
    it('should update the partial test code', () => {
      manager.initialize('test-1', 'project-1', 'test.ts', 'jest');
      manager.updatePartialTestCode('test-1', 'test code here');

      const partial = manager.get('test-1');
      expect(partial?.partialTestCode).toBe('test code here');
    });
  });

  describe('addError', () => {
    it('should add an error to the partial result', () => {
      manager.initialize('test-1', 'project-1', 'test.ts', 'jest');
      manager.addError('test-1', 'Error message');

      const partial = manager.get('test-1');
      expect(partial?.errors).toContain('Error message');
    });
  });

  describe('hasCompletedTestCases', () => {
    it('should return true when test cases exist', () => {
      manager.initialize('test-1', 'project-1', 'test.ts', 'jest');
      manager.addCompletedTestCase('test-1', {
        name: 'test',
        description: 'test',
        inputs: [],
        expectedOutput: null,
        type: 'happy_path',
      });

      expect(manager.hasCompletedTestCases('test-1')).toBe(true);
    });

    it('should return false when no test cases', () => {
      manager.initialize('test-1', 'project-1', 'test.ts', 'jest');

      expect(manager.hasCompletedTestCases('test-1')).toBe(false);
    });
  });

  describe('toTestSuite', () => {
    it('should convert partial result to test suite', () => {
      manager.initialize('test-1', 'project-1', 'test.ts', 'jest');
      manager.addCompletedTestCase('test-1', {
        name: 'test',
        description: 'test',
        inputs: [],
        expectedOutput: null,
        type: 'happy_path',
      });
      manager.updatePartialTestCode('test-1', 'test code');

      const testSuite = manager.toTestSuite('test-1');

      expect(testSuite).toBeDefined();
      expect(testSuite?.id).toBe('test-1');
      expect(testSuite?.testCode).toBe('test code');
      expect(testSuite?.testCases.length).toBe(1);
    });

    it('should return null when no test cases', () => {
      manager.initialize('test-1', 'project-1', 'test.ts', 'jest');

      const testSuite = manager.toTestSuite('test-1');

      expect(testSuite).toBeNull();
    });
  });

  describe('getSummary', () => {
    it('should generate a summary of the partial result', () => {
      manager.initialize('test-1', 'project-1', 'test.ts', 'jest');
      manager.addCompletedTestCase('test-1', {
        name: 'test',
        description: 'test',
        inputs: [],
        expectedOutput: null,
        type: 'happy_path',
      });
      manager.addFailedTestCase('test-1', 'failed');
      manager.addError('test-1', 'error');

      const summary = manager.getSummary('test-1');

      expect(summary).toContain('Completed test cases: 1');
      expect(summary).toContain('Failed test cases: 1');
      expect(summary).toContain('Errors: 1');
    });
  });

  describe('clear', () => {
    it('should clear all partial results', () => {
      manager.initialize('test-1', 'project-1', 'test.ts', 'jest');
      manager.initialize('test-2', 'project-1', 'test2.ts', 'jest');

      manager.clear();

      expect(manager.getAll().length).toBe(0);
    });
  });

  describe('getByProjectId', () => {
    it('should get partial results by project ID', () => {
      manager.initialize('test-1', 'project-1', 'test.ts', 'jest');
      manager.initialize('test-2', 'project-1', 'test2.ts', 'jest');
      manager.initialize('test-3', 'project-2', 'test3.ts', 'jest');

      const results = manager.getByProjectId('project-1');

      expect(results.length).toBe(2);
      expect(results.every(r => r.projectId === 'project-1')).toBe(true);
    });
  });
});
