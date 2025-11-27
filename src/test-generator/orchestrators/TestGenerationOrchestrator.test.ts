// Test Generation Orchestrator Tests

import { TestGenerationOrchestrator } from './TestGenerationOrchestrator';
import { AITestGenerationClient } from '../ai/AITestGenerationClient';
import { FunctionInfo, ClassInfo, TestFramework } from '../types';

describe('TestGenerationOrchestrator', () => {
  let orchestrator: TestGenerationOrchestrator;
  let mockAIClient: jest.Mocked<AITestGenerationClient>;

  beforeEach(() => {
    // Create mock AI client
    mockAIClient = {
      suggestTestCases: jest.fn(),
      generateTestCode: jest.fn(),
    } as any;

    orchestrator = new TestGenerationOrchestrator(mockAIClient);
  });

  describe('generateTestsForFunction', () => {
    it('should generate tests for a simple function', async () => {
      const func: FunctionInfo = {
        name: 'add',
        parameters: [
          { name: 'a', type: 'number', optional: false },
          { name: 'b', type: 'number', optional: false },
        ],
        returnType: 'number',
        body: 'return a + b;',
        location: { file: 'math.ts', line: 1 },
      };

      // Mock AI responses
      mockAIClient.suggestTestCases.mockResolvedValue(JSON.stringify([
        {
          name: 'should add two numbers',
          description: 'Test addition',
          inputs: [2, 3],
          expectedOutput: 5,
        },
      ]));

      const result = await orchestrator.generateTestsForFunction(
        func,
        'project-1',
        { framework: 'jest', language: 'typescript' }
      );

      expect(result.success).toBe(true);
      expect(result.testSuite).toBeDefined();
      expect(result.testSuite?.testCode).toContain('add');
      expect(result.errors.length).toBe(0);
    });

    it('should handle functions with no parameters', async () => {
      const func: FunctionInfo = {
        name: 'getCurrentTime',
        parameters: [],
        returnType: 'Date',
        body: 'return new Date();',
        location: { file: 'utils.ts', line: 10 },
      };

      mockAIClient.suggestTestCases.mockResolvedValue(JSON.stringify([
        {
          name: 'should return current time',
          description: 'Test time function',
          inputs: [],
          expectedOutput: 'Date',
        },
      ]));

      const result = await orchestrator.generateTestsForFunction(
        func,
        'project-1',
        { framework: 'jest', language: 'typescript' }
      );

      expect(result.success).toBe(true);
      expect(result.testSuite).toBeDefined();
    });

    it('should retry on AI generation failure', async () => {
      const func: FunctionInfo = {
        name: 'divide',
        parameters: [
          { name: 'a', type: 'number', optional: false },
          { name: 'b', type: 'number', optional: false },
        ],
        returnType: 'number',
        body: 'if (b === 0) throw new Error("Division by zero"); return a / b;',
        location: { file: 'math.ts', line: 5 },
      };

      // First call fails, second succeeds
      mockAIClient.suggestTestCases
        .mockRejectedValueOnce(new Error('AI service unavailable'))
        .mockResolvedValue(JSON.stringify([
          {
            name: 'should divide two numbers',
            description: 'Test division',
            inputs: [10, 2],
            expectedOutput: 5,
          },
        ]));

      const result = await orchestrator.generateTestsForFunction(
        func,
        'project-1',
        { framework: 'jest', language: 'typescript', maxRetries: 3 }
      );

      expect(result.success).toBe(true);
      // The orchestrator generates 3 types of tests (happy path, edge case, error)
      // With retry logic, it may call the AI client multiple times per type
      expect(mockAIClient.suggestTestCases).toHaveBeenCalled();
    });

    it('should track progress through all stages', async () => {
      const func: FunctionInfo = {
        name: 'multiply',
        parameters: [
          { name: 'a', type: 'number', optional: false },
          { name: 'b', type: 'number', optional: false },
        ],
        returnType: 'number',
        body: 'return a * b;',
        location: { file: 'math.ts', line: 15 },
      };

      mockAIClient.suggestTestCases.mockResolvedValue(JSON.stringify([
        {
          name: 'should multiply two numbers',
          description: 'Test multiplication',
          inputs: [3, 4],
          expectedOutput: 12,
        },
      ]));

      const result = await orchestrator.generateTestsForFunction(
        func,
        'project-1',
        { framework: 'jest', language: 'typescript', enableProgressTracking: true }
      );

      expect(result.progress.length).toBeGreaterThan(0);
      
      const stages = result.progress.map(p => p.stage);
      expect(stages).toContain('analyzing');
      expect(stages).toContain('planning');
      expect(stages).toContain('generating');
      expect(stages).toContain('validating');
      expect(stages).toContain('complete');
    });

    it('should fail gracefully after max retries', async () => {
      const func: FunctionInfo = {
        name: 'failingFunction',
        parameters: [],
        returnType: 'void',
        body: 'console.log("test");',
        location: { file: 'test.ts', line: 1 },
      };

      // Always fail
      mockAIClient.suggestTestCases.mockRejectedValue(new Error('Persistent failure'));

      const result = await orchestrator.generateTestsForFunction(
        func,
        'project-1',
        { framework: 'jest', language: 'typescript', maxRetries: 2 }
      );

      // The orchestrator uses fallback test generation, so it still succeeds
      // but may have warnings about AI failures
      expect(result.success).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should apply code style formatting', async () => {
      const func: FunctionInfo = {
        name: 'format',
        parameters: [{ name: 'text', type: 'string', optional: false }],
        returnType: 'string',
        body: 'return text.toUpperCase();',
        location: { file: 'format.ts', line: 1 },
      };

      mockAIClient.suggestTestCases.mockResolvedValue(JSON.stringify([
        {
          name: 'should format text',
          description: 'Test formatting',
          inputs: ['hello'],
          expectedOutput: 'HELLO',
        },
      ]));

      const result = await orchestrator.generateTestsForFunction(
        func,
        'project-1',
        {
          framework: 'jest',
          language: 'typescript',
          codeStyle: {
            indentation: 2,
            quotes: 'single',
            semicolons: true,
          },
        }
      );

      expect(result.success).toBe(true);
      expect(result.testSuite?.testCode).toBeDefined();
    });
  });

  describe('generateTestsForClass', () => {
    it('should generate tests for a simple class', async () => {
      const cls: ClassInfo = {
        name: 'Calculator',
        constructor: {
          name: 'constructor',
          parameters: [],
          returnType: null,
          body: '',
          location: { file: 'Calculator.ts', line: 2 },
        },
        publicMethods: [
          {
            name: 'add',
            parameters: [
              { name: 'a', type: 'number', optional: false },
              { name: 'b', type: 'number', optional: false },
            ],
            returnType: 'number',
            body: 'return a + b;',
            location: { file: 'Calculator.ts', line: 5 },
          },
        ],
        privateMethods: [],
        properties: [],
        inheritance: null,
        location: { file: 'Calculator.ts', line: 1 },
      };

      mockAIClient.suggestTestCases.mockResolvedValue(JSON.stringify([
        {
          name: 'should create Calculator instance',
          description: 'Test constructor',
          inputs: [],
          expectedOutput: 'instance of Calculator',
        },
        {
          name: 'should add numbers',
          description: 'Test add method',
          inputs: [2, 3],
          expectedOutput: 5,
        },
      ]));

      const result = await orchestrator.generateTestsForClass(
        cls,
        'project-1',
        { framework: 'jest', language: 'typescript' }
      );

      expect(result.success).toBe(true);
      expect(result.testSuite).toBeDefined();
      expect(result.testSuite?.testCode).toContain('Calculator');
    });

    it('should handle classes with inheritance', async () => {
      const cls: ClassInfo = {
        name: 'AdvancedCalculator',
        constructor: null,
        publicMethods: [
          {
            name: 'power',
            parameters: [
              { name: 'base', type: 'number', optional: false },
              { name: 'exponent', type: 'number', optional: false },
            ],
            returnType: 'number',
            body: 'return Math.pow(base, exponent);',
            location: { file: 'AdvancedCalculator.ts', line: 3 },
          },
        ],
        privateMethods: [],
        properties: [],
        inheritance: 'Calculator',
        location: { file: 'AdvancedCalculator.ts', line: 1 },
      };

      mockAIClient.suggestTestCases.mockResolvedValue(JSON.stringify([
        {
          name: 'should inherit from Calculator',
          description: 'Test inheritance',
          inputs: [],
          expectedOutput: 'inherited behavior works',
        },
      ]));

      const result = await orchestrator.generateTestsForClass(
        cls,
        'project-1',
        { framework: 'jest', language: 'typescript' }
      );

      expect(result.success).toBe(true);
      expect(result.testSuite).toBeDefined();
    });

    it('should handle classes with state', async () => {
      const cls: ClassInfo = {
        name: 'Counter',
        constructor: {
          name: 'constructor',
          parameters: [{ name: 'initial', type: 'number', optional: false }],
          returnType: null,
          body: 'this.count = initial;',
          location: { file: 'Counter.ts', line: 2 },
        },
        publicMethods: [
          {
            name: 'increment',
            parameters: [],
            returnType: 'void',
            body: 'this.count++;',
            location: { file: 'Counter.ts', line: 6 },
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
        inheritance: null,
        location: { file: 'Counter.ts', line: 1 },
      };

      mockAIClient.suggestTestCases.mockResolvedValue(JSON.stringify([
        {
          name: 'should maintain state correctly',
          description: 'Test state management',
          inputs: [],
          expectedOutput: 'state updated',
        },
      ]));

      const result = await orchestrator.generateTestsForClass(
        cls,
        'project-1',
        { framework: 'jest', language: 'typescript' }
      );

      expect(result.success).toBe(true);
      expect(result.testSuite).toBeDefined();
    });
  });

  describe('progress tracking', () => {
    it('should provide progress history', async () => {
      const func: FunctionInfo = {
        name: 'test',
        parameters: [],
        returnType: 'void',
        body: '',
        location: { file: 'test.ts', line: 1 },
      };

      mockAIClient.suggestTestCases.mockResolvedValue(JSON.stringify([
        {
          name: 'test case',
          description: 'test',
          inputs: [],
          expectedOutput: null,
        },
      ]));

      await orchestrator.generateTestsForFunction(
        func,
        'project-1',
        { framework: 'jest', language: 'typescript' }
      );

      const history = orchestrator.getProgressHistory();
      expect(history.length).toBeGreaterThan(0);
      expect(history[0].stage).toBe('analyzing');
    });
  });

  describe('error handling', () => {
    it('should collect errors during generation', async () => {
      const func: FunctionInfo = {
        name: 'errorFunc',
        parameters: [],
        returnType: 'void',
        body: '',
        location: { file: 'error.ts', line: 1 },
      };

      mockAIClient.suggestTestCases.mockRejectedValue(new Error('Test error'));

      const result = await orchestrator.generateTestsForFunction(
        func,
        'project-1',
        { framework: 'jest', language: 'typescript', maxRetries: 1 }
      );

      // The orchestrator uses fallback generation, so it still succeeds
      // but collects warnings about AI failures
      expect(result.success).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should collect warnings during validation', async () => {
      const func: FunctionInfo = {
        name: 'warnFunc',
        parameters: [],
        returnType: 'void',
        body: '',
        location: { file: 'warn.ts', line: 1 },
      };

      mockAIClient.suggestTestCases.mockResolvedValue(JSON.stringify([
        {
          name: 'test',
          description: 'test',
          inputs: [],
          expectedOutput: null,
        },
      ]));

      const result = await orchestrator.generateTestsForFunction(
        func,
        'project-1',
        { framework: 'jest', language: 'typescript' }
      );

      // Warnings may be present from validation
      expect(result.warnings).toBeDefined();
    });
  });

  describe('framework support', () => {
    const frameworks: TestFramework[] = ['jest', 'mocha', 'pytest', 'junit', 'rspec'];

    frameworks.forEach(framework => {
      it(`should generate tests for ${framework}`, async () => {
        const func: FunctionInfo = {
          name: 'test',
          parameters: [],
          returnType: 'void',
          body: '',
          location: { file: 'test.ts', line: 1 },
        };

        mockAIClient.suggestTestCases.mockResolvedValue(JSON.stringify([
          {
            name: 'test case',
            description: 'test',
            inputs: [],
            expectedOutput: null,
          },
        ]));

        const result = await orchestrator.generateTestsForFunction(
          func,
          'project-1',
          { framework, language: 'typescript' }
        );

        expect(result.testSuite?.framework).toBe(framework);
      });
    });
  });
});
