// Partial Result Manager
// Saves partial results during test generation to prevent data loss

import { TestSuite, TestCase, Mock } from '../types';

export interface PartialTestSuite {
  id: string;
  projectId: string;
  targetFile: string;
  framework: string;
  partialTestCode?: string;
  completedTestCases: TestCase[];
  failedTestCases: string[];
  completedMocks: Mock[];
  stage: 'analysis' | 'planning' | 'generation' | 'validation' | 'complete' | 'failed';
  lastUpdated: Date;
  errors: string[];
}

export class PartialResultManager {
  private partialResults: Map<string, PartialTestSuite> = new Map();

  /**
   * Initializes a new partial result for a test suite
   */
  initialize(
    id: string,
    projectId: string,
    targetFile: string,
    framework: string
  ): PartialTestSuite {
    const partial: PartialTestSuite = {
      id,
      projectId,
      targetFile,
      framework,
      completedTestCases: [],
      failedTestCases: [],
      completedMocks: [],
      stage: 'analysis',
      lastUpdated: new Date(),
      errors: [],
    };

    this.partialResults.set(id, partial);
    return partial;
  }

  /**
   * Updates the stage of a partial result
   */
  updateStage(
    id: string,
    stage: PartialTestSuite['stage']
  ): void {
    const partial = this.partialResults.get(id);
    if (partial) {
      partial.stage = stage;
      partial.lastUpdated = new Date();
    }
  }

  /**
   * Adds a completed test case to the partial result
   */
  addCompletedTestCase(id: string, testCase: TestCase): void {
    const partial = this.partialResults.get(id);
    if (partial) {
      partial.completedTestCases.push(testCase);
      partial.lastUpdated = new Date();
    }
  }

  /**
   * Adds multiple completed test cases
   */
  addCompletedTestCases(id: string, testCases: TestCase[]): void {
    const partial = this.partialResults.get(id);
    if (partial) {
      partial.completedTestCases.push(...testCases);
      partial.lastUpdated = new Date();
    }
  }

  /**
   * Records a failed test case generation
   */
  addFailedTestCase(id: string, testCaseName: string): void {
    const partial = this.partialResults.get(id);
    if (partial) {
      partial.failedTestCases.push(testCaseName);
      partial.lastUpdated = new Date();
    }
  }

  /**
   * Adds a completed mock to the partial result
   */
  addCompletedMock(id: string, mock: Mock): void {
    const partial = this.partialResults.get(id);
    if (partial) {
      partial.completedMocks.push(mock);
      partial.lastUpdated = new Date();
    }
  }

  /**
   * Updates the partial test code
   */
  updatePartialTestCode(id: string, testCode: string): void {
    const partial = this.partialResults.get(id);
    if (partial) {
      partial.partialTestCode = testCode;
      partial.lastUpdated = new Date();
    }
  }

  /**
   * Adds an error to the partial result
   */
  addError(id: string, error: string): void {
    const partial = this.partialResults.get(id);
    if (partial) {
      partial.errors.push(error);
      partial.lastUpdated = new Date();
    }
  }

  /**
   * Gets a partial result by ID
   */
  get(id: string): PartialTestSuite | undefined {
    return this.partialResults.get(id);
  }

  /**
   * Checks if there are any completed test cases
   */
  hasCompletedTestCases(id: string): boolean {
    const partial = this.partialResults.get(id);
    return partial ? partial.completedTestCases.length > 0 : false;
  }

  /**
   * Converts a partial result to a complete test suite
   * Returns null if there's insufficient data
   */
  toTestSuite(id: string): TestSuite | null {
    const partial = this.partialResults.get(id);
    
    if (!partial || partial.completedTestCases.length === 0) {
      return null;
    }

    return {
      id: partial.id,
      projectId: partial.projectId,
      targetFile: partial.targetFile,
      framework: partial.framework as any,
      testCode: partial.partialTestCode || '',
      testCases: partial.completedTestCases,
      mocks: partial.completedMocks,
      coverageImprovement: this.estimateCoverageImprovement(partial.completedTestCases.length),
      status: partial.stage === 'complete' ? 'validated' : 'generated',
      createdAt: new Date(),
    };
  }

  /**
   * Removes a partial result from memory
   */
  remove(id: string): void {
    this.partialResults.delete(id);
  }

  /**
   * Clears all partial results
   */
  clear(): void {
    this.partialResults.clear();
  }

  /**
   * Gets all partial results
   */
  getAll(): PartialTestSuite[] {
    return Array.from(this.partialResults.values());
  }

  /**
   * Gets partial results by project ID
   */
  getByProjectId(projectId: string): PartialTestSuite[] {
    return Array.from(this.partialResults.values())
      .filter(p => p.projectId === projectId);
  }

  /**
   * Generates a summary of the partial result
   */
  getSummary(id: string): string {
    const partial = this.partialResults.get(id);
    
    if (!partial) {
      return 'No partial result found.';
    }

    const parts: string[] = [];
    
    parts.push(`Stage: ${partial.stage}`);
    parts.push(`Completed test cases: ${partial.completedTestCases.length}`);
    
    if (partial.failedTestCases.length > 0) {
      parts.push(`Failed test cases: ${partial.failedTestCases.length}`);
    }
    
    if (partial.completedMocks.length > 0) {
      parts.push(`Mocks: ${partial.completedMocks.length}`);
    }
    
    if (partial.errors.length > 0) {
      parts.push(`Errors: ${partial.errors.length}`);
    }

    return parts.join(', ');
  }

  /**
   * Estimates coverage improvement based on number of test cases
   */
  private estimateCoverageImprovement(testCaseCount: number): number {
    return Math.min(testCaseCount * 5, 95);
  }
}
