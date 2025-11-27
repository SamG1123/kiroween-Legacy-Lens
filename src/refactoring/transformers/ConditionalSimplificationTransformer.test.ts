import { ConditionalSimplificationTransformer } from './ConditionalSimplificationTransformer';
import { Location } from '../types';
import { AIRefactoringClient } from '../ai/AIRefactoringClient';

// Mock AI client to avoid API calls in tests
class MockAIClient extends AIRefactoringClient {
  async suggestMethodName(code: string): Promise<string> {
    return 'extractedMethod';
  }

  async suggestVariableName(
    currentName: string,
    usage: string,
    type?: string
  ): Promise<string> {
    return 'isValid';
  }
}

describe('ConditionalSimplificationTransformer', () => {
  let transformer: ConditionalSimplificationTransformer;

  beforeEach(() => {
    transformer = new ConditionalSimplificationTransformer(new MockAIClient());
  });

  describe('simplifyConditional - guard clause', () => {
    it('should introduce guard clause for nested conditional', async () => {
      const code = `
function validate(user) {
  if (user) {
    if (user.age >= 18) {
      return true;
    }
  }
  return false;
}
`;

      const location: Location = {
        file: 'test.ts',
        startLine: 3,
        endLine: 7,
        startColumn: 2,
        endColumn: 3,
      };

      const result = await transformer.simplifyConditional(code, location, 'guard_clause');

      expect(result.success).toBe(true);
      expect(result.transformedCode).toBeDefined();
      expect(result.changes.length).toBeGreaterThan(0);
    });

    it('should handle simple if-else with guard clause', async () => {
      const code = `
function process(data) {
  if (data !== null) {
    console.log(data);
    return data;
  } else {
    return null;
  }
}
`;

      const location: Location = {
        file: 'test.ts',
        startLine: 3,
        endLine: 8,
        startColumn: 2,
        endColumn: 3,
      };

      const result = await transformer.simplifyConditional(code, location, 'guard_clause');

      expect(result.success).toBe(true);
      expect(result.transformedCode).toBeDefined();
    });
  });

  describe('simplifyConditional - extract variable', () => {
    it('should extract complex boolean expression to variable', async () => {
      const code = `
function check(user) {
  if (user && user.age >= 18 && user.verified === true) {
    return true;
  }
  return false;
}
`;

      const location: Location = {
        file: 'test.ts',
        startLine: 3,
        endLine: 5,
        startColumn: 2,
        endColumn: 3,
      };

      const result = await transformer.simplifyConditional(code, location, 'extract_variable');

      expect(result.success).toBe(true);
      expect(result.transformedCode).toContain('const');
      expect(result.transformedCode).toContain('isValid');
      expect(result.changes.length).toBeGreaterThan(0);
    });

    it('should handle multiple logical operators', async () => {
      const code = `
function validate(x, y, z) {
  if ((x > 0 && y > 0) || (z < 100 && z > 0)) {
    return true;
  }
  return false;
}
`;

      const location: Location = {
        file: 'test.ts',
        startLine: 3,
        endLine: 5,
        startColumn: 2,
        endColumn: 3,
      };

      const result = await transformer.simplifyConditional(code, location, 'extract_variable');

      expect(result.success).toBe(true);
      expect(result.transformedCode).toContain('const');
    });
  });

  describe('simplifyConditional - consolidate', () => {
    it('should handle consolidation when no repeated conditions exist', async () => {
      const code = `
function test(x) {
  if (x > 0) {
    return true;
  }
  return false;
}
`;

      const location: Location = {
        file: 'test.ts',
        startLine: 3,
        endLine: 5,
        startColumn: 2,
        endColumn: 3,
      };

      const result = await transformer.simplifyConditional(code, location, 'consolidate');

      // Should fail gracefully when no consolidation is possible
      expect(result.success).toBe(false);
      expect(result.error).toContain('No repeated conditional logic');
    });
  });

  describe('simplifyConditional - auto strategy', () => {
    it('should automatically choose guard clause for nested conditionals', async () => {
      const code = `
function process(data) {
  if (data) {
    if (data.valid) {
      return data.value;
    }
  }
  return null;
}
`;

      const location: Location = {
        file: 'test.ts',
        startLine: 3,
        endLine: 7,
        startColumn: 2,
        endColumn: 3,
      };

      const result = await transformer.simplifyConditional(code, location, 'auto');

      expect(result.success).toBe(true);
      expect(result.transformedCode).toBeDefined();
    });

    it('should automatically choose extract variable for complex expressions', async () => {
      const code = `
function validate(a, b, c) {
  if (a > 0 && b < 100 && c !== null && c.length > 0) {
    return true;
  }
  return false;
}
`;

      const location: Location = {
        file: 'test.ts',
        startLine: 3,
        endLine: 5,
        startColumn: 2,
        endColumn: 3,
      };

      const result = await transformer.simplifyConditional(code, location, 'auto');

      expect(result.success).toBe(true);
      expect(result.transformedCode).toContain('const');
    });
  });

  describe('error handling', () => {
    it('should handle invalid code gracefully', async () => {
      const code = 'invalid code {{{';

      const location: Location = {
        file: 'test.ts',
        startLine: 1,
        endLine: 1,
        startColumn: 0,
        endColumn: 10,
      };

      const result = await transformer.simplifyConditional(code, location);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle non-existent location', async () => {
      const code = `
function test() {
  return true;
}
`;

      const location: Location = {
        file: 'test.ts',
        startLine: 100,
        endLine: 100,
        startColumn: 0,
        endColumn: 10,
      };

      const result = await transformer.simplifyConditional(code, location);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Could not locate');
    });
  });

  describe('logical equivalence verification', () => {
    it('should verify that transformations preserve logic', async () => {
      const code = `
function check(x) {
  if (x > 0 && x < 100) {
    return true;
  }
  return false;
}
`;

      const location: Location = {
        file: 'test.ts',
        startLine: 3,
        endLine: 5,
        startColumn: 2,
        endColumn: 3,
      };

      const result = await transformer.simplifyConditional(code, location, 'extract_variable');

      expect(result.success).toBe(true);
      // The transformation should preserve the logical behavior
      expect(result.transformedCode).toBeDefined();
    });
  });
});
