// Unit tests for TestStrategyPlanner

import { TestStrategyPlanner } from './TestStrategyPlanner';
import {
  FunctionAnalysis,
  ClassAnalysis,
  ParameterInfo,
  FunctionInfo,
} from '../types';

describe('TestStrategyPlanner', () => {
  let planner: TestStrategyPlanner;

  beforeEach(() => {
    planner = new TestStrategyPlanner();
  });

  describe('planFunctionTests', () => {
    it('should create test strategy for simple function', () => {
      const analysis: FunctionAnalysis = {
        name: 'add',
        parameters: [
          { name: 'a', type: 'number', optional: false },
          { name: 'b', type: 'number', optional: false },
        ],
        returnType: 'number',
        hasErrorHandling: false,
        errorPaths: [],
        dependencies: [],
        complexity: 1,
        sideEffects: [],
      };

      const strategy = planner.planFunctionTests(analysis);

      expect(strategy.targetCode).toBe('add');
      expect(strategy.testCases.length).toBeGreaterThan(0);
      expect(strategy.testCases[0].type).toBe('happy_path');
    });

    it('should include error cases when function has error handling', () => {
      const analysis: FunctionAnalysis = {
        name: 'divide',
        parameters: [
          { name: 'a', type: 'number', optional: false },
          { name: 'b', type: 'number', optional: false },
        ],
        returnType: 'number',
        hasErrorHandling: true,
        errorPaths: [
          {
            condition: 'b === 0',
            exceptionType: 'Error',
            errorMessage: 'Division by zero',
          },
        ],
        dependencies: [],
        complexity: 2,
        sideEffects: [],
      };

      const strategy = planner.planFunctionTests(analysis);

      expect(strategy.errorCases.length).toBeGreaterThan(0);
      expect(strategy.errorCases[0].expectedError).toBe('Error');
    });

    it('should identify mocking needs for functions with dependencies', () => {
      const analysis: FunctionAnalysis = {
        name: 'fetchData',
        parameters: [],
        returnType: 'Promise<any>',
        hasErrorHandling: false,
        errorPaths: [],
        dependencies: [
          { name: 'axios', type: 'api', source: 'axios' },
        ],
        complexity: 1,
        sideEffects: [
          { type: 'network', description: 'HTTP request' },
        ],
      };

      const strategy = planner.planFunctionTests(analysis);

      expect(strategy.mockingStrategy.mockType).toBe('full');
      expect(strategy.mockingStrategy.dependencies.length).toBe(1);
    });
  });

  describe('planClassTests', () => {
    it('should create test strategy for class with constructor', () => {
      const analysis: ClassAnalysis = {
        name: 'Calculator',
        constructor: {
          name: 'constructor',
          parameters: [{ name: 'precision', type: 'number', optional: false }],
          returnType: null,
          body: '',
          location: { file: 'test.ts', line: 1 },
        },
        publicMethods: [],
        privateMethods: [],
        properties: [],
        hasState: false,
        inheritance: null,
      };

      const strategy = planner.planClassTests(analysis);

      expect(strategy.targetCode).toBe('Calculator');
      expect(strategy.testCases.some(tc => tc.name.includes('create instance'))).toBe(true);
    });

    it('should test all public methods', () => {
      const analysis: ClassAnalysis = {
        name: 'Calculator',
        constructor: null,
        publicMethods: [
          {
            name: 'add',
            parameters: [
              { name: 'a', type: 'number', optional: false },
              { name: 'b', type: 'number', optional: false },
            ],
            returnType: 'number',
            body: '',
            location: { file: 'test.ts', line: 5 },
          },
          {
            name: 'subtract',
            parameters: [
              { name: 'a', type: 'number', optional: false },
              { name: 'b', type: 'number', optional: false },
            ],
            returnType: 'number',
            body: '',
            location: { file: 'test.ts', line: 10 },
          },
        ],
        privateMethods: [],
        properties: [],
        hasState: false,
        inheritance: null,
      };

      const strategy = planner.planClassTests(analysis);

      expect(strategy.testCases.some(tc => tc.name.includes('add'))).toBe(true);
      expect(strategy.testCases.some(tc => tc.name.includes('subtract'))).toBe(true);
    });

    it('should include state tests for stateful classes', () => {
      const analysis: ClassAnalysis = {
        name: 'Counter',
        constructor: null,
        publicMethods: [],
        privateMethods: [],
        properties: [
          { name: 'count', type: 'number', visibility: 'private', isStatic: false },
        ],
        hasState: true,
        inheritance: null,
      };

      const strategy = planner.planClassTests(analysis);

      expect(strategy.testCases.some(tc => tc.name.includes('state'))).toBe(true);
    });

    it('should include inheritance tests when class extends another', () => {
      const analysis: ClassAnalysis = {
        name: 'AdvancedCalculator',
        constructor: null,
        publicMethods: [],
        privateMethods: [],
        properties: [],
        hasState: false,
        inheritance: 'Calculator',
      };

      const strategy = planner.planClassTests(analysis);

      expect(strategy.testCases.some(tc => tc.name.includes('inherit'))).toBe(true);
    });
  });

  describe('identifyTestCases', () => {
    it('should generate happy path test case', () => {
      const analysis: FunctionAnalysis = {
        name: 'multiply',
        parameters: [
          { name: 'x', type: 'number', optional: false },
          { name: 'y', type: 'number', optional: false },
        ],
        returnType: 'number',
        hasErrorHandling: false,
        errorPaths: [],
        dependencies: [],
        complexity: 1,
        sideEffects: [],
      };

      const testCases = planner.identifyTestCases(analysis);

      expect(testCases.length).toBeGreaterThan(0);
      expect(testCases[0].type).toBe('happy_path');
      expect(testCases[0].name).toContain('multiply');
    });

    it('should generate varied input test cases for functions with parameters', () => {
      const analysis: FunctionAnalysis = {
        name: 'concat',
        parameters: [
          { name: 'str1', type: 'string', optional: false },
          { name: 'str2', type: 'string', optional: false },
        ],
        returnType: 'string',
        hasErrorHandling: false,
        errorPaths: [],
        dependencies: [],
        complexity: 1,
        sideEffects: [],
      };

      const testCases = planner.identifyTestCases(analysis);

      expect(testCases.length).toBeGreaterThanOrEqual(2);
      expect(testCases.some(tc => tc.description.includes('varied'))).toBe(true);
    });
  });

  describe('identifyEdgeCases', () => {
    it('should identify edge cases for number parameters', () => {
      const parameters: ParameterInfo[] = [
        { name: 'count', type: 'number', optional: false },
      ];

      const edgeCases = planner.identifyEdgeCases(parameters);

      expect(edgeCases.some(ec => ec.value === 0 && ec.reason.includes('Zero'))).toBe(true);
      expect(edgeCases.some(ec => ec.value === -1 && ec.reason.includes('Negative'))).toBe(true);
      expect(edgeCases.some(ec => ec.reason.includes('boundary'))).toBe(true);
    });

    it('should identify edge cases for string parameters', () => {
      const parameters: ParameterInfo[] = [
        { name: 'text', type: 'string', optional: false },
      ];

      const edgeCases = planner.identifyEdgeCases(parameters);

      expect(edgeCases.some(ec => ec.value === '' && ec.reason.includes('Empty'))).toBe(true);
      expect(edgeCases.some(ec => ec.reason.includes('Special characters'))).toBe(true);
    });

    it('should identify edge cases for array parameters', () => {
      const parameters: ParameterInfo[] = [
        { name: 'items', type: 'array', optional: false },
      ];

      const edgeCases = planner.identifyEdgeCases(parameters);

      expect(edgeCases.some(ec => Array.isArray(ec.value) && ec.value.length === 0)).toBe(true);
      expect(edgeCases.some(ec => Array.isArray(ec.value) && ec.value.length === 1)).toBe(true);
    });

    it('should identify null/undefined edge cases for optional parameters', () => {
      const parameters: ParameterInfo[] = [
        { name: 'config', type: 'object', optional: true },
      ];

      const edgeCases = planner.identifyEdgeCases(parameters);

      expect(edgeCases.some(ec => ec.value === null)).toBe(true);
      expect(edgeCases.some(ec => ec.value === undefined)).toBe(true);
    });

    it('should identify edge cases for boolean parameters', () => {
      const parameters: ParameterInfo[] = [
        { name: 'enabled', type: 'boolean', optional: false },
      ];

      const edgeCases = planner.identifyEdgeCases(parameters);

      expect(edgeCases.some(ec => ec.value === true)).toBe(true);
      expect(edgeCases.some(ec => ec.value === false)).toBe(true);
    });

    it('should handle multiple parameters', () => {
      const parameters: ParameterInfo[] = [
        { name: 'count', type: 'number', optional: false },
        { name: 'text', type: 'string', optional: false },
      ];

      const edgeCases = planner.identifyEdgeCases(parameters);

      expect(edgeCases.some(ec => ec.parameter === 'count')).toBe(true);
      expect(edgeCases.some(ec => ec.parameter === 'text')).toBe(true);
    });
  });
});
