// Test Case Generator Tests

import { TestCaseGenerator } from './TestCaseGenerator';
import { AITestGenerationClient } from '../ai/AITestGenerationClient';
import { FunctionAnalysis, ClassAnalysis, ParameterInfo } from '../types';

// Mock the AI client
jest.mock('../ai/AITestGenerationClient');

describe('TestCaseGenerator', () => {
  let generator: TestCaseGenerator;
  let mockAIClient: jest.Mocked<AITestGenerationClient>;

  beforeEach(() => {
    mockAIClient = new AITestGenerationClient({
      provider: 'openai',
    }) as jest.Mocked<AITestGenerationClient>;
    generator = new TestCaseGenerator(mockAIClient);
  });

  describe('generateHappyPathTests', () => {
    it('should generate happy path test cases for a function', async () => {
      const funcAnalysis: FunctionAnalysis = {
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

      const mockResponse = JSON.stringify([
        {
          name: 'should add two positive numbers',
          description: 'Tests addition of two positive numbers',
          inputs: [2, 3],
          expectedOutput: 5,
        },
      ]);

      mockAIClient.suggestTestCases.mockResolvedValue(mockResponse);

      const result = await generator.generateHappyPathTests(funcAnalysis);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('should add two positive numbers');
      expect(result[0].type).toBe('happy_path');
      expect(result[0].inputs).toEqual([2, 3]);
      expect(result[0].expectedOutput).toBe(5);
    });

    it('should handle functions with no parameters', async () => {
      const funcAnalysis: FunctionAnalysis = {
        name: 'getCurrentTime',
        parameters: [],
        returnType: 'Date',
        hasErrorHandling: false,
        errorPaths: [],
        dependencies: [],
        complexity: 1,
        sideEffects: [],
      };

      const mockResponse = JSON.stringify([
        {
          name: 'should return current time',
          description: 'Tests that function returns a Date object',
          inputs: [],
          expectedOutput: 'Date object',
        },
      ]);

      mockAIClient.suggestTestCases.mockResolvedValue(mockResponse);

      const result = await generator.generateHappyPathTests(funcAnalysis);

      expect(result).toHaveLength(1);
      expect(result[0].inputs).toEqual([]);
    });
  });

  describe('generateEdgeCaseTests', () => {
    it('should generate edge case tests for number parameters', async () => {
      const funcAnalysis: FunctionAnalysis = {
        name: 'divide',
        parameters: [
          { name: 'a', type: 'number', optional: false },
          { name: 'b', type: 'number', optional: false },
        ],
        returnType: 'number',
        hasErrorHandling: true,
        errorPaths: [],
        dependencies: [],
        complexity: 2,
        sideEffects: [],
      };

      const mockResponse = JSON.stringify([
        {
          name: 'should handle zero divisor',
          description: 'Tests division by zero',
          inputs: [10, 0],
          expectedOutput: 'error',
        },
        {
          name: 'should handle negative numbers',
          description: 'Tests division with negative numbers',
          inputs: [-10, 2],
          expectedOutput: -5,
        },
      ]);

      mockAIClient.suggestTestCases.mockResolvedValue(mockResponse);

      const result = await generator.generateEdgeCaseTests(funcAnalysis);

      expect(result).toHaveLength(2);
      expect(result[0].type).toBe('edge_case');
      expect(result[1].type).toBe('edge_case');
    });

    it('should generate edge cases for string parameters', async () => {
      const funcAnalysis: FunctionAnalysis = {
        name: 'formatName',
        parameters: [{ name: 'name', type: 'string', optional: false }],
        returnType: 'string',
        hasErrorHandling: false,
        errorPaths: [],
        dependencies: [],
        complexity: 1,
        sideEffects: [],
      };

      const mockResponse = JSON.stringify([
        {
          name: 'should handle empty string',
          description: 'Tests with empty string input',
          inputs: [''],
          expectedOutput: '',
        },
      ]);

      mockAIClient.suggestTestCases.mockResolvedValue(mockResponse);

      const result = await generator.generateEdgeCaseTests(funcAnalysis);

      expect(result).toHaveLength(1);
      expect(result[0].inputs).toEqual(['']);
    });
  });

  describe('generateErrorTests', () => {
    it('should generate error test cases', async () => {
      const funcAnalysis: FunctionAnalysis = {
        name: 'parseJSON',
        parameters: [{ name: 'input', type: 'string', optional: false }],
        returnType: 'object',
        hasErrorHandling: true,
        errorPaths: [
          {
            condition: 'invalid JSON',
            exceptionType: 'SyntaxError',
            errorMessage: 'Invalid JSON format',
          },
        ],
        dependencies: [],
        complexity: 2,
        sideEffects: [],
      };

      const mockResponse = JSON.stringify([
        {
          name: 'should throw error for invalid JSON',
          description: 'Tests error handling for malformed JSON',
          inputs: ['{invalid}'],
          expectedOutput: 'error',
        },
      ]);

      mockAIClient.suggestTestCases.mockResolvedValue(mockResponse);

      const result = await generator.generateErrorTests(funcAnalysis);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('error_case');
      expect(result[0].name).toContain('error');
    });
  });

  describe('generateClassTests', () => {
    it('should generate test cases for class methods', async () => {
      const classAnalysis: ClassAnalysis = {
        name: 'Calculator',
        constructor: {
          name: 'constructor',
          parameters: [],
          returnType: null,
          body: '',
          location: { file: 'test.ts', line: 1 },
        },
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
        ],
        privateMethods: [],
        properties: [],
        hasState: false,
        inheritance: null,
      };

      const mockResponse = JSON.stringify([
        {
          name: 'should initialize calculator',
          description: 'Tests constructor initialization',
          inputs: [],
          expectedOutput: 'Calculator instance',
        },
        {
          name: 'should add two numbers',
          description: 'Tests add method',
          inputs: [5, 3],
          expectedOutput: 8,
        },
      ]);

      mockAIClient.suggestTestCases.mockResolvedValue(mockResponse);

      const result = await generator.generateClassTests(classAnalysis);

      expect(result).toHaveLength(2);
      expect(result[0].type).toBe('happy_path');
    });

    it('should handle classes with state', async () => {
      const classAnalysis: ClassAnalysis = {
        name: 'Counter',
        constructor: {
          name: 'constructor',
          parameters: [{ name: 'initial', type: 'number', optional: false }],
          returnType: null,
          body: '',
          location: { file: 'test.ts', line: 1 },
        },
        publicMethods: [
          {
            name: 'increment',
            parameters: [],
            returnType: 'void',
            body: '',
            location: { file: 'test.ts', line: 5 },
          },
        ],
        privateMethods: [],
        properties: [
          {
            name: 'count',
            type: 'number',
            visibility: 'private',
            isStatic: false,
          },
        ],
        hasState: true,
        inheritance: null,
      };

      const mockResponse = JSON.stringify([
        {
          name: 'should initialize with value',
          description: 'Tests constructor sets initial state',
          inputs: [10],
          expectedOutput: 'Counter with count 10',
        },
      ]);

      mockAIClient.suggestTestCases.mockResolvedValue(mockResponse);

      const result = await generator.generateClassTests(classAnalysis);

      expect(result).toHaveLength(1);
    });
  });

  describe('error handling', () => {
    it('should handle invalid JSON response from AI', async () => {
      const funcAnalysis: FunctionAnalysis = {
        name: 'test',
        parameters: [],
        returnType: 'void',
        hasErrorHandling: false,
        errorPaths: [],
        dependencies: [],
        complexity: 1,
        sideEffects: [],
      };

      mockAIClient.suggestTestCases.mockResolvedValue('invalid json');

      const result = await generator.generateHappyPathTests(funcAnalysis);

      // Should return fallback test cases instead of empty array
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].type).toBe('happy_path');
    });

    it('should handle non-array JSON response', async () => {
      const funcAnalysis: FunctionAnalysis = {
        name: 'test',
        parameters: [],
        returnType: 'void',
        hasErrorHandling: false,
        errorPaths: [],
        dependencies: [],
        complexity: 1,
        sideEffects: [],
      };

      mockAIClient.suggestTestCases.mockResolvedValue('{"not": "array"}');

      const result = await generator.generateHappyPathTests(funcAnalysis);

      // Should return fallback test cases instead of empty array
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].type).toBe('happy_path');
    });
  });
});
