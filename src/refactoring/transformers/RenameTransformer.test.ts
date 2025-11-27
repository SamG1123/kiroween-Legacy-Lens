import { RenameTransformer } from './RenameTransformer';
import { Scope, Location } from '../types';
import { AIRefactoringClient } from '../ai/AIRefactoringClient';

// Mock AI client to avoid API calls in tests
class MockAIClient extends AIRefactoringClient {
  async suggestMethodName(code: string): Promise<string> {
    return 'descriptiveMethod';
  }

  async suggestVariableName(currentName: string, usage: string): Promise<string> {
    return 'descriptiveVariable';
  }
}

describe('RenameTransformer', () => {
  let transformer: RenameTransformer;

  beforeEach(() => {
    transformer = new RenameTransformer(new MockAIClient());
  });

  describe('rename', () => {
    it('should rename a simple variable', async () => {
      const code = `
function test() {
  const x = 5;
  const y = x + 10;
  return y;
}
`;

      const scope: Scope = {
        type: 'local',
        name: 'test',
      };

      const result = await transformer.rename(code, 'x', 'value', scope);

      expect(result.success).toBe(true);
      expect(result.transformedCode).toContain('value');
      expect(result.transformedCode).not.toContain('const x =');
      expect(result.transformedCode).toContain('const y = value + 10');
      expect(result.changes.length).toBeGreaterThan(0);
    });

    it('should rename a function', async () => {
      const code = `
function oldName() {
  return 42;
}

const result = oldName();
`;

      const scope: Scope = {
        type: 'module',
        name: 'module',
      };

      const result = await transformer.rename(code, 'oldName', 'newName', scope);

      expect(result.success).toBe(true);
      expect(result.transformedCode).toContain('function newName');
      expect(result.transformedCode).toContain('const result = newName()');
      expect(result.transformedCode).not.toContain('oldName');
    });

    it('should rename all references in scope', async () => {
      const code = `
function calculate() {
  const num = 5;
  const doubled = num * 2;
  const tripled = num * 3;
  return num + doubled + tripled;
}
`;

      const scope: Scope = {
        type: 'local',
        name: 'calculate',
      };

      const result = await transformer.rename(code, 'num', 'number', scope);

      expect(result.success).toBe(true);
      expect(result.transformedCode).toContain('const number = 5');
      expect(result.transformedCode).toContain('const doubled = number * 2');
      expect(result.transformedCode).toContain('const tripled = number * 3');
      expect(result.transformedCode).toContain('return number + doubled + tripled');
    });

    it('should handle scope correctly and not rename outside scope', async () => {
      const code = `
const x = 10;

function test() {
  const x = 5;
  return x + 1;
}

const result = x + 20;
`;

      const scope: Scope = {
        type: 'local',
        name: 'test',
      };

      const result = await transformer.rename(code, 'x', 'localValue', scope);

      expect(result.success).toBe(true);
      // Should rename x inside the function
      expect(result.transformedCode).toContain('const localValue = 5');
      expect(result.transformedCode).toContain('return localValue + 1');
      // Should NOT rename x outside the function
      expect(result.transformedCode).toContain('const x = 10');
      expect(result.transformedCode).toContain('const result = x + 20');
    });

    it('should detect naming conflicts', async () => {
      const code = `
function test() {
  const x = 5;
  const y = 10;
  return x + y;
}
`;

      const scope: Scope = {
        type: 'local',
        name: 'test',
      };

      // Try to rename x to y (which already exists)
      const result = await transformer.rename(code, 'x', 'y', scope);

      expect(result.success).toBe(false);
      expect(result.error).toContain('conflict');
    });

    it('should not allow renaming to reserved keywords', async () => {
      const code = `
function test() {
  const x = 5;
  return x;
}
`;

      const scope: Scope = {
        type: 'local',
        name: 'test',
      };

      // Try to rename to a reserved keyword
      const result = await transformer.rename(code, 'x', 'const', scope);

      expect(result.success).toBe(false);
      expect(result.error).toContain('conflict');
    });

    it('should use AI-suggested name when no name provided', async () => {
      const code = `
function test() {
  const x = 5;
  return x + 10;
}
`;

      const scope: Scope = {
        type: 'local',
        name: 'test',
      };

      const result = await transformer.rename(code, 'x', undefined, scope);

      expect(result.success).toBe(true);
      // Should use the mocked AI suggestion
      expect(result.transformedCode).toContain('descriptiveVariable');
    });

    it('should rename function parameters', async () => {
      const code = `
function add(a, b) {
  return a + b;
}
`;

      const scope: Scope = {
        type: 'local',
        name: 'add',
      };

      const result = await transformer.rename(code, 'a', 'firstNumber', scope);

      expect(result.success).toBe(true);
      expect(result.transformedCode).toContain('function add(firstNumber, b)');
      expect(result.transformedCode).toContain('return firstNumber + b');
    });

    it('should handle class method renaming', async () => {
      const code = `
class Calculator {
  oldMethod() {
    return 42;
  }

  useMethod() {
    return this.oldMethod();
  }
}
`;

      const scope: Scope = {
        type: 'class',
        name: 'Calculator',
      };

      const result = await transformer.rename(code, 'oldMethod', 'newMethod', scope);

      expect(result.success).toBe(true);
      expect(result.transformedCode).toContain('newMethod()');
      expect(result.transformedCode).toContain('this.newMethod()');
    });

    it('should handle renaming with location hint', async () => {
      const code = `
const x = 5;
function test() {
  const x = 10;
  return x;
}
`;

      const location: Location = {
        file: 'test.ts',
        startLine: 4,
        endLine: 4,
        startColumn: 8,
        endColumn: 9,
      };

      const scope: Scope = {
        type: 'local',
        name: 'test',
      };

      const result = await transformer.rename(code, 'x', 'localX', scope, location);

      expect(result.success).toBe(true);
      // Should rename the x inside the function
      expect(result.transformedCode).toContain('const localX = 10');
      // Should not rename the outer x
      expect(result.transformedCode).toContain('const x = 5');
    });

    it('should handle invalid code gracefully', async () => {
      const code = 'invalid code {{{';

      const scope: Scope = {
        type: 'global',
        name: 'global',
      };

      const result = await transformer.rename(code, 'x', 'y', scope);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle identifier not found', async () => {
      const code = `
function test() {
  const x = 5;
  return x;
}
`;

      const scope: Scope = {
        type: 'local',
        name: 'test',
      };

      // Try to rename a non-existent identifier
      const result = await transformer.rename(code, 'nonExistent', 'newName', scope);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Could not locate');
    });
  });
});
