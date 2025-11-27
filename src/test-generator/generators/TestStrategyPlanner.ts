// Test Strategy Planner
// Plans comprehensive test strategy for code units

import {
  FunctionAnalysis,
  ClassAnalysis,
  TestStrategy,
  TestCase,
  EdgeCase,
  ErrorCase,
  ParameterInfo,
  MockingStrategy,
} from '../types';

export interface ITestStrategyPlanner {
  planFunctionTests(analysis: FunctionAnalysis): TestStrategy;
  planClassTests(analysis: ClassAnalysis): TestStrategy;
  identifyTestCases(analysis: FunctionAnalysis): TestCase[];
  identifyEdgeCases(parameters: ParameterInfo[]): EdgeCase[];
}

export class TestStrategyPlanner implements ITestStrategyPlanner {
  /**
   * Plans comprehensive test strategy for a function
   * Requirements: 1.1, 1.2, 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2
   */
  planFunctionTests(analysis: FunctionAnalysis): TestStrategy {
    const testCases = this.identifyTestCases(analysis);
    const edgeCases = this.identifyEdgeCases(analysis.parameters);
    const errorCases = this.identifyErrorCases(analysis);
    const mockingStrategy = this.determineMockingStrategy(analysis);
    const setupRequired = this.identifySetupRequirements(analysis);
    const teardownRequired = this.identifyTeardownRequirements(analysis);

    return {
      targetCode: analysis.name,
      testCases,
      edgeCases,
      errorCases,
      mockingStrategy,
      setupRequired,
      teardownRequired,
    };
  }

  /**
   * Plans comprehensive test strategy for a class
   * Requirements: 4.1
   */
  planClassTests(analysis: ClassAnalysis): TestStrategy {
    const testCases: TestCase[] = [];
    const edgeCases: EdgeCase[] = [];
    const errorCases: ErrorCase[] = [];

    // Test constructor if present (Requirement 4.1)
    if (analysis.constructor) {
      testCases.push({
        name: `should create instance of ${analysis.name}`,
        description: 'Test constructor initialization',
        inputs: analysis.constructor.parameters.map(p => this.getDefaultValue(p)),
        expectedOutput: `instance of ${analysis.name}`,
        type: 'happy_path',
      });
    }

    // Test all public methods (Requirement 4.1)
    for (const method of analysis.publicMethods) {
      testCases.push({
        name: `should call ${method.name} successfully`,
        description: `Test ${method.name} method`,
        inputs: method.parameters.map(p => this.getDefaultValue(p)),
        expectedOutput: 'success',
        type: 'happy_path',
      });
    }

    // Test state changes if class has state (Requirement 4.1)
    if (analysis.hasState) {
      testCases.push({
        name: `should maintain state correctly in ${analysis.name}`,
        description: 'Test state management',
        inputs: [],
        expectedOutput: 'state updated',
        type: 'happy_path',
      });
    }

    // Test inheritance if present (Requirement 4.1)
    if (analysis.inheritance) {
      testCases.push({
        name: `should inherit behavior from ${analysis.inheritance}`,
        description: 'Test inherited methods',
        inputs: [],
        expectedOutput: 'inherited behavior works',
        type: 'happy_path',
      });
    }

    const mockingStrategy: MockingStrategy = {
      dependencies: [],
      mockType: 'full',
    };

    // Setup and teardown for class tests (Requirement 4.1)
    const setupRequired = [`Create instance of ${analysis.name}`];
    const teardownRequired = [`Clean up ${analysis.name} instance`];

    return {
      targetCode: analysis.name,
      testCases,
      edgeCases,
      errorCases,
      mockingStrategy,
      setupRequired,
      teardownRequired,
    };
  }

  /**
   * Identifies test cases for various scenarios
   * Requirements: 1.1, 1.2, 3.1, 3.2
   */
  identifyTestCases(analysis: FunctionAnalysis): TestCase[] {
    const testCases: TestCase[] = [];

    // Happy path test (Requirement 1.1)
    testCases.push({
      name: `should execute ${analysis.name} with valid inputs`,
      description: 'Test happy path with typical inputs',
      inputs: analysis.parameters.map(p => this.getDefaultValue(p)),
      expectedOutput: analysis.returnType || 'void',
      type: 'happy_path',
    });

    // Additional happy path with varied inputs (Requirement 1.2)
    if (analysis.parameters.length > 0) {
      testCases.push({
        name: `should handle different valid inputs for ${analysis.name}`,
        description: 'Test with varied valid inputs',
        inputs: analysis.parameters.map(p => this.getAlternativeValue(p)),
        expectedOutput: analysis.returnType || 'void',
        type: 'happy_path',
      });
    }

    return testCases;
  }

  /**
   * Identifies edge cases based on parameter types
   * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
   */
  identifyEdgeCases(parameters: ParameterInfo[]): EdgeCase[] {
    const edgeCases: EdgeCase[] = [];

    for (const param of parameters) {
      const type = param.type?.toLowerCase() || '';

      // Number edge cases (Requirement 2.1)
      if (type.includes('number') || type.includes('int') || type.includes('float')) {
        edgeCases.push(
          {
            parameter: param.name,
            value: 0,
            reason: 'Zero value',
          },
          {
            parameter: param.name,
            value: -1,
            reason: 'Negative value',
          },
          {
            parameter: param.name,
            value: Number.MAX_SAFE_INTEGER,
            reason: 'Maximum boundary value',
          },
          {
            parameter: param.name,
            value: Number.MIN_SAFE_INTEGER,
            reason: 'Minimum boundary value',
          }
        );
      }

      // String edge cases (Requirement 2.2)
      if (type.includes('string')) {
        edgeCases.push(
          {
            parameter: param.name,
            value: '',
            reason: 'Empty string',
          },
          {
            parameter: param.name,
            value: '!@#$%^&*()',
            reason: 'Special characters',
          },
          {
            parameter: param.name,
            value: 'a'.repeat(1000),
            reason: 'Very long string',
          }
        );
      }

      // Array edge cases (Requirement 2.3)
      if (type.includes('array') || type.includes('[]')) {
        edgeCases.push(
          {
            parameter: param.name,
            value: [],
            reason: 'Empty array',
          },
          {
            parameter: param.name,
            value: [1],
            reason: 'Single-element array',
          }
        );
      }

      // Null/undefined edge cases (Requirement 2.4)
      if (param.optional || type.includes('null') || type.includes('undefined')) {
        edgeCases.push(
          {
            parameter: param.name,
            value: null,
            reason: 'Null value',
          },
          {
            parameter: param.name,
            value: undefined,
            reason: 'Undefined value',
          }
        );
      }

      // Boolean edge cases
      if (type.includes('boolean') || type.includes('bool')) {
        edgeCases.push(
          {
            parameter: param.name,
            value: true,
            reason: 'True value',
          },
          {
            parameter: param.name,
            value: false,
            reason: 'False value',
          }
        );
      }

      // Object edge cases
      if (type.includes('object') || type === 'any') {
        edgeCases.push(
          {
            parameter: param.name,
            value: {},
            reason: 'Empty object',
          }
        );
      }
    }

    return edgeCases;
  }

  /**
   * Identifies error test cases based on error paths
   * Requirements: 3.1, 3.2
   */
  private identifyErrorCases(analysis: FunctionAnalysis): ErrorCase[] {
    const errorCases: ErrorCase[] = [];

    // Generate error cases from identified error paths (Requirement 3.1)
    for (const errorPath of analysis.errorPaths) {
      errorCases.push({
        scenario: errorPath.condition,
        expectedError: errorPath.exceptionType || 'Error',
        errorMessage: errorPath.errorMessage || undefined,
      });
    }

    // Generate error cases for invalid inputs (Requirement 3.2)
    for (const param of analysis.parameters) {
      const type = param.type?.toLowerCase() || '';
      
      if (!param.optional) {
        // Test with wrong type
        errorCases.push({
          scenario: `Invalid type for ${param.name}`,
          expectedError: 'TypeError',
          errorMessage: `Expected ${param.type} but received invalid type`,
        });
      }

      // Type-specific invalid inputs
      if (type.includes('number')) {
        errorCases.push({
          scenario: `NaN value for ${param.name}`,
          expectedError: 'Error',
          errorMessage: 'Invalid number',
        });
      }

      if (type.includes('array')) {
        errorCases.push({
          scenario: `Non-array value for ${param.name}`,
          expectedError: 'TypeError',
          errorMessage: 'Expected array',
        });
      }
    }

    return errorCases;
  }

  /**
   * Determines the mocking strategy based on dependencies
   */
  private determineMockingStrategy(analysis: FunctionAnalysis): MockingStrategy {
    const hasDependencies = analysis.dependencies.length > 0;
    const hasSideEffects = analysis.sideEffects.length > 0;

    return {
      dependencies: analysis.dependencies,
      mockType: hasDependencies || hasSideEffects ? 'full' : 'partial',
    };
  }

  /**
   * Identifies setup requirements for tests
   */
  private identifySetupRequirements(analysis: FunctionAnalysis): string[] {
    const setup: string[] = [];

    // Setup for dependencies
    for (const dep of analysis.dependencies) {
      if (dep.type === 'database') {
        setup.push('Initialize database mock');
      } else if (dep.type === 'api') {
        setup.push('Initialize API mock');
      } else if (dep.type === 'filesystem') {
        setup.push('Initialize filesystem mock');
      }
    }

    // Setup for side effects
    for (const effect of analysis.sideEffects) {
      if (effect.type === 'database') {
        setup.push('Setup database connection');
      } else if (effect.type === 'network') {
        setup.push('Setup network mock');
      }
    }

    return setup.length > 0 ? setup : ['No setup required'];
  }

  /**
   * Identifies teardown requirements for tests
   */
  private identifyTeardownRequirements(analysis: FunctionAnalysis): string[] {
    const teardown: string[] = [];

    // Teardown for dependencies
    for (const dep of analysis.dependencies) {
      if (dep.type === 'database') {
        teardown.push('Clean up database mock');
      } else if (dep.type === 'api') {
        teardown.push('Clean up API mock');
      } else if (dep.type === 'filesystem') {
        teardown.push('Clean up filesystem mock');
      }
    }

    // Teardown for side effects
    for (const effect of analysis.sideEffects) {
      if (effect.type === 'database') {
        teardown.push('Close database connection');
      } else if (effect.type === 'network') {
        teardown.push('Clean up network mock');
      }
    }

    return teardown.length > 0 ? teardown : ['No teardown required'];
  }

  /**
   * Gets a default value for a parameter based on its type
   */
  private getDefaultValue(param: ParameterInfo): any {
    if (param.defaultValue !== undefined) {
      return param.defaultValue;
    }

    const type = param.type?.toLowerCase() || '';

    if (type.includes('string')) return 'test';
    if (type.includes('number') || type.includes('int')) return 1;
    if (type.includes('boolean') || type.includes('bool')) return true;
    if (type.includes('array') || type.includes('[]')) return [1, 2, 3];
    if (type.includes('object')) return { key: 'value' };
    
    return null;
  }

  /**
   * Gets an alternative value for a parameter to vary test inputs
   */
  private getAlternativeValue(param: ParameterInfo): any {
    const type = param.type?.toLowerCase() || '';

    if (type.includes('string')) return 'alternative';
    if (type.includes('number') || type.includes('int')) return 42;
    if (type.includes('boolean') || type.includes('bool')) return false;
    if (type.includes('array') || type.includes('[]')) return [10, 20];
    if (type.includes('object')) return { alt: 'value' };
    
    return null;
  }
}
