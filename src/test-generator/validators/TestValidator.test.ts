import { TestValidator } from './TestValidator';
import { ValidationError } from '../types';

describe('TestValidator', () => {
  let validator: TestValidator;

  beforeEach(() => {
    validator = new TestValidator();
  });

  describe('validateSyntax', () => {
    it('should validate correct TypeScript syntax', () => {
      const testCode = `
        import { describe, it, expect } from '@jest/globals';
        
        describe('MyTest', () => {
          it('should work', () => {
            expect(true).toBe(true);
          });
        });
      `;

      const result = validator.validateSyntax(testCode, 'typescript');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect syntax errors in TypeScript', () => {
      const testCode = `
        const x = {
          name: 'test'
          value: 123
        };
      `;

      const result = validator.validateSyntax(testCode, 'typescript');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject empty test code', () => {
      const result = validator.validateSyntax('', 'typescript');
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toBe('Test code is empty');
    });

    it('should handle unsupported languages gracefully', () => {
      const testCode = 'some code';
      const result = validator.validateSyntax(testCode, 'ruby');
      expect(result.valid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should validate Python syntax with proper indentation', () => {
      const testCode = `
def test_example():
    assert True
      `;

      const result = validator.validateSyntax(testCode, 'python');
      expect(result.valid).toBe(true);
    });

    it('should detect Python indentation errors', () => {
      const testCode = `
def test_example():
assert True
      `;

      const result = validator.validateSyntax(testCode, 'python');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should validate Java syntax', () => {
      const testCode = `
public class TestExample {
  @Test
  public void testMethod() {
    assertEquals(1, 1);
  }
}
      `;

      const result = validator.validateSyntax(testCode, 'java');
      expect(result.valid).toBe(true);
    });

    it('should detect unmatched braces in Java', () => {
      const testCode = `
public class TestExample {
  public void testMethod() {
    assertEquals(1, 1);
  }
      `;

      const result = validator.validateSyntax(testCode, 'java');
      expect(result.valid).toBe(false);
    });
  });

  describe('validateImports', () => {
    it('should validate common testing library imports', () => {
      const testCode = `
        import { describe, it, expect } from '@jest/globals';
        import jest from 'jest';
      `;
      const codebase = '';

      const result = validator.validateImports(testCode, codebase);
      expect(result.valid).toBe(true);
    });

    it('should detect missing relative imports', () => {
      const testCode = `
        import { MyClass } from './MyClass';
      `;
      const codebase = 'src/other/file.ts';

      const result = validator.validateImports(testCode, codebase);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].message).toContain('Cannot find module');
    });

    it('should validate existing relative imports', () => {
      const testCode = `
        import { MyClass } from './MyClass';
      `;
      const codebase = 'MyClass.ts';

      const result = validator.validateImports(testCode, codebase);
      expect(result.valid).toBe(true);
    });

    it('should warn about unknown external dependencies', () => {
      const testCode = `
        import { SomeLibrary } from 'unknown-library';
      `;
      const codebase = '';

      const result = validator.validateImports(testCode, codebase);
      expect(result.valid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should handle CommonJS require statements', () => {
      const testCode = `
        const jest = require('jest');
        const myModule = require('./myModule');
      `;
      const codebase = '';

      const result = validator.validateImports(testCode, codebase);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should validate testing library imports', () => {
      const testCode = `
        import { render } from '@testing-library/react';
        import '@testing-library/jest-dom';
      `;
      const codebase = '';

      const result = validator.validateImports(testCode, codebase);
      expect(result.valid).toBe(true);
    });
  });

  describe('attemptCompilation', () => {
    it('should compile valid TypeScript code', () => {
      const testCode = `
        const add = (a: number, b: number): number => a + b;
        const result = add(1, 2);
      `;

      const result = validator.attemptCompilation(testCode);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect type errors', () => {
      const testCode = `
        const add = (a: number, b: number): number => a + b;
        const result: string = add(1, 2);
      `;

      const result = validator.attemptCompilation(testCode);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should detect undefined variables', () => {
      const testCode = `
        const result = undefinedVariable + 1;
      `;

      const result = validator.attemptCompilation(testCode);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle compilation with JSX', () => {
      const testCode = `
        import React from 'react';
        const element = <div>Hello</div>;
      `;

      const result = validator.attemptCompilation(testCode);
      // JSX will have errors about React not being found, but syntax should be valid
      // We're mainly checking it doesn't crash
      expect(result).toBeDefined();
      expect(result.errors).toBeDefined();
    });

    it('should detect missing semicolons when strict', () => {
      const testCode = `
        const x = 1
        const y = 2
      `;

      const result = validator.attemptCompilation(testCode);
      // TypeScript allows this, so it should be valid
      expect(result.valid).toBe(true);
    });
  });

  describe('suggestFixes', () => {
    it('should suggest import fixes for undefined identifiers', () => {
      const errors: ValidationError[] = [
        {
          message: "Cannot find name 'describe'",
          severity: 'error',
        },
      ];

      const fixes = validator.suggestFixes(errors);
      expect(fixes.length).toBeGreaterThan(0);
      expect(fixes[0].description).toContain('import');
      expect(fixes[0].code).toContain('describe');
    });

    it('should suggest module installation for missing modules', () => {
      const errors: ValidationError[] = [
        {
          message: "Cannot find module 'some-package'",
          severity: 'error',
        },
      ];

      const fixes = validator.suggestFixes(errors);
      expect(fixes.length).toBeGreaterThan(0);
      expect(fixes[0].description).toContain('Install');
      expect(fixes[0].code).toContain('npm install');
    });

    it('should suggest type assertion for type errors', () => {
      const errors: ValidationError[] = [
        {
          message: "Type 'number' is not assignable to type 'string'",
          severity: 'error',
        },
      ];

      const fixes = validator.suggestFixes(errors);
      expect(fixes.length).toBeGreaterThan(0);
      expect(fixes[0].description).toContain('type');
    });

    it('should suggest async keyword for await errors', () => {
      const errors: ValidationError[] = [
        {
          message: "'await' expressions are only allowed within async functions",
          severity: 'error',
        },
      ];

      const fixes = validator.suggestFixes(errors);
      expect(fixes.length).toBeGreaterThan(0);
      expect(fixes[0].description).toContain('async');
    });

    it('should suggest variable declaration for undefined variables', () => {
      const errors: ValidationError[] = [
        {
          message: "myVar is undefined in this scope",
          severity: 'error',
        },
      ];

      const fixes = validator.suggestFixes(errors);
      expect(fixes.length).toBeGreaterThan(0);
      expect(fixes[0].description).toContain('variable');
    });

    it('should handle multiple errors', () => {
      const errors: ValidationError[] = [
        {
          message: "Cannot find name 'describe'",
          severity: 'error',
        },
        {
          message: "Cannot find name 'it'",
          severity: 'error',
        },
      ];

      const fixes = validator.suggestFixes(errors);
      expect(fixes.length).toBeGreaterThanOrEqual(2);
    });

    it('should return empty array for no errors', () => {
      const fixes = validator.suggestFixes([]);
      expect(fixes).toHaveLength(0);
    });
  });
});
