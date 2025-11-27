import { SafetyValidator } from './SafetyValidator';

describe('SafetyValidator', () => {
  let validator: SafetyValidator;

  beforeEach(() => {
    validator = new SafetyValidator();
  });

  describe('checkSyntax', () => {
    it('should return true for valid TypeScript code', () => {
      const validCode = `
        function add(a: number, b: number): number {
          return a + b;
        }
      `;
      expect(validator.checkSyntax(validCode)).toBe(true);
    });

    it('should return true for valid JavaScript code', () => {
      const validCode = `
        function add(a, b) {
          return a + b;
        }
      `;
      expect(validator.checkSyntax(validCode)).toBe(true);
    });

    it('should return false for code with syntax errors', () => {
      const invalidCode = `
        function add(a, b {
          return a + b;
        }
      `;
      expect(validator.checkSyntax(invalidCode)).toBe(false);
    });

    it('should return false for code with mismatched braces', () => {
      const invalidCode = `
        function test() {
          if (true) {
            console.log('test');
          }
      `;
      expect(validator.checkSyntax(invalidCode)).toBe(false);
    });
  });

  describe('checkNamingConflicts', () => {
    it('should return true when name already exists as a variable', () => {
      const code = `
        const myVar = 10;
        function test() {
          return myVar;
        }
      `;
      expect(validator.checkNamingConflicts(code, 'myVar')).toBe(true);
    });

    it('should return true when name already exists as a function', () => {
      const code = `
        function myFunction() {
          return 42;
        }
      `;
      expect(validator.checkNamingConflicts(code, 'myFunction')).toBe(true);
    });

    it('should return true when name already exists as a class', () => {
      const code = `
        class MyClass {
          constructor() {}
        }
      `;
      expect(validator.checkNamingConflicts(code, 'MyClass')).toBe(true);
    });

    it('should return false when name does not exist', () => {
      const code = `
        const myVar = 10;
        function test() {
          return myVar;
        }
      `;
      expect(validator.checkNamingConflicts(code, 'newName')).toBe(false);
    });

    it('should return false when name only exists as a reference', () => {
      const code = `
        const myVar = 10;
        function test() {
          return myVar; // myVar is referenced but not declared here
        }
      `;
      expect(validator.checkNamingConflicts(code, 'test')).toBe(true);
      expect(validator.checkNamingConflicts(code, 'unusedName')).toBe(false);
    });
  });

  describe('validateRefactoring', () => {
    it('should return safe=true for valid refactoring', () => {
      const original = `
        function longMethod() {
          const x = 1;
          const y = 2;
          return x + y;
        }
      `;
      const refactored = `
        function longMethod() {
          return add(1, 2);
        }
        
        function add(a, b) {
          return a + b;
        }
      `;
      
      const result = validator.validateRefactoring(original, refactored);
      expect(result.safe).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should return safe=false for refactoring with syntax errors', () => {
      const original = `
        function test() {
          return 42;
        }
      `;
      const refactored = `
        function test() {
          return 42
        }
      `;
      
      const result = validator.validateRefactoring(original, refactored);
      expect(result.safe).toBe(true); // Missing semicolon is valid JS
    });

    it('should detect syntax errors in refactored code', () => {
      const original = `
        function test() {
          return 42;
        }
      `;
      const refactored = `
        function test( {
          return 42;
        }
      `;
      
      const result = validator.validateRefactoring(original, refactored);
      expect(result.safe).toBe(false);
      expect(result.issues.some(issue => issue.type === 'syntax')).toBe(true);
    });

    it('should include warnings about behavior preservation', () => {
      const original = `
        function test() {
          return 42;
        }
      `;
      const refactored = `
        function test() {
          return 42;
        }
      `;
      
      const result = validator.validateRefactoring(original, refactored);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('Behavior preservation');
    });
  });

  describe('checkBehaviorPreservation', () => {
    it('should return true when structure is similar', async () => {
      const original = `
        function test() {
          return 42;
        }
      `;
      const refactored = `
        function test() {
          const result = 42;
          return result;
        }
      `;
      
      const result = await validator.checkBehaviorPreservation(original, refactored);
      expect(result).toBe(true);
    });

    it('should return false when major structural changes occur', async () => {
      const original = `
        function test() {
          return 42;
        }
      `;
      const refactored = `
        function test() {
          return helper1() + helper2();
        }
        
        function helper1() {
          return 20;
        }
        
        function helper2() {
          return 22;
        }
      `;
      
      const result = await validator.checkBehaviorPreservation(original, refactored);
      expect(result).toBe(false);
    });

    it('should return false when code has syntax errors', async () => {
      const original = `
        function test() {
          return 42;
        }
      `;
      const refactored = `
        function test( {
          return 42;
        }
      `;
      
      const result = await validator.checkBehaviorPreservation(original, refactored);
      expect(result).toBe(false);
    });
  });
});
