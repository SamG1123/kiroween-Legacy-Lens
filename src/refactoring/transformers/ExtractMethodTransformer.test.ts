import { ExtractMethodTransformer } from './ExtractMethodTransformer';
import { CodeBlock, Location } from '../types';
import { AIRefactoringClient } from '../ai/AIRefactoringClient';

// Mock AI client to avoid API calls in tests
class MockAIClient extends AIRefactoringClient {
  async suggestMethodName(code: string): Promise<string> {
    return 'extractedMethod';
  }
}

describe('ExtractMethodTransformer', () => {
  let transformer: ExtractMethodTransformer;

  beforeEach(() => {
    transformer = new ExtractMethodTransformer(new MockAIClient());
  });

  describe('extractMethod', () => {
    it('should extract a simple code block into a method', async () => {
      const code = `
function calculate() {
  const x = 5;
  const y = 10;
  const sum = x + y;
  console.log(sum);
  return sum;
}
`;

      const block: CodeBlock = {
        code: 'const sum = x + y;\nconsole.log(sum);',
        location: {
          file: 'test.ts',
          startLine: 4,
          endLine: 5,
          startColumn: 2,
          endColumn: 20,
        },
      };

      const result = await transformer.extractMethod(code, block, 'calculateSum');

      expect(result.success).toBe(true);
      expect(result.transformedCode).toContain('calculateSum');
      expect(result.transformedCode).toContain('function calculateSum');
      expect(result.changes.length).toBeGreaterThan(0);
    });

    it('should identify parameters correctly', async () => {
      const code = `
function process() {
  const a = 5;
  const b = 10;
  const result = a + b;
  return result;
}
`;

      const block: CodeBlock = {
        code: 'const result = a + b;',
        location: {
          file: 'test.ts',
          startLine: 4,
          endLine: 4,
          startColumn: 2,
          endColumn: 23,
        },
      };

      const result = await transformer.extractMethod(code, block, 'add');

      expect(result.success).toBe(true);
      // The extracted method should have parameters a and b
      expect(result.transformedCode).toContain('function add');
    });

    it('should handle code with return statements', async () => {
      const code = `
function compute() {
  const x = 5;
  const y = 10;
  return x * y;
}
`;

      const block: CodeBlock = {
        code: 'return x * y;',
        location: {
          file: 'test.ts',
          startLine: 4,
          endLine: 4,
          startColumn: 2,
          endColumn: 15,
        },
      };

      const result = await transformer.extractMethod(code, block, 'multiply');

      expect(result.success).toBe(true);
      expect(result.transformedCode).toContain('function multiply');
    });

    it('should use AI-suggested name when no name provided', async () => {
      const code = `
function test() {
  const x = 1;
  const y = 2;
  console.log(x + y);
}
`;

      const block: CodeBlock = {
        code: 'console.log(x + y);',
        location: {
          file: 'test.ts',
          startLine: 4,
          endLine: 4,
          startColumn: 2,
          endColumn: 21,
        },
      };

      const result = await transformer.extractMethod(code, block);

      expect(result.success).toBe(true);
      // Should use the mocked AI suggestion
      expect(result.transformedCode).toContain('extractedMethod');
    });

    it('should handle extraction failure gracefully', async () => {
      const code = 'invalid code {{{';

      const block: CodeBlock = {
        code: 'invalid',
        location: {
          file: 'test.ts',
          startLine: 1,
          endLine: 1,
          startColumn: 0,
          endColumn: 7,
        },
      };

      const result = await transformer.extractMethod(code, block);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should preserve behavior when extracting method', async () => {
      const code = `
function original() {
  const a = 5;
  const b = 10;
  const sum = a + b;
  const product = a * b;
  return sum + product;
}
`;

      const block: CodeBlock = {
        code: 'const sum = a + b;\nconst product = a * b;',
        location: {
          file: 'test.ts',
          startLine: 4,
          endLine: 5,
          startColumn: 2,
          endColumn: 24,
        },
      };

      const result = await transformer.extractMethod(code, block, 'calculate');

      expect(result.success).toBe(true);
      expect(result.transformedCode).toContain('calculate');
      // The original function should still return sum + product
      expect(result.transformedCode).toContain('return');
    });
  });
});
