/**
 * Setup test to verify refactoring engine dependencies are configured correctly
 */

import * as fc from 'fast-check';
import { parseCode } from '../utils/astUtils';
import { calculateSimilarity } from '../utils/codeMetrics';
import { generateDiff } from '../utils/diffGenerator';

describe('Refactoring Engine Setup', () => {
  describe('Dependencies', () => {
    it('should have fast-check available for property-based testing', () => {
      expect(fc).toBeDefined();
      expect(fc.property).toBeDefined();
    });

    it('should be able to parse TypeScript code', () => {
      const code = 'function test() { return 42; }';
      const ast = parseCode(code, true);
      expect(ast).toBeDefined();
      expect(ast.type).toBe('File');
    });

    it('should be able to calculate code similarity', () => {
      const code1 = 'function test() { return 1; }';
      const code2 = 'function test() { return 2; }';
      const similarity = calculateSimilarity(code1, code2);
      expect(similarity).toBeGreaterThan(0.5);
      expect(similarity).toBeLessThan(1.0);
    });

    it('should be able to generate diffs', () => {
      const before = 'const x = 1;';
      const after = 'const x = 2;';
      const diff = generateDiff(before, after);
      expect(diff).toContain('-const x = 1;');
      expect(diff).toContain('+const x = 2;');
    });
  });

  describe('Property-Based Testing Setup', () => {
    it('should run a simple property test', () => {
      fc.assert(
        fc.property(fc.integer(), (n) => {
          return n + 0 === n;
        }),
        { numRuns: 100 }
      );
    });

    it('should generate arbitrary code strings', () => {
      const codeArbitrary = fc.string({ minLength: 1, maxLength: 100 });
      fc.assert(
        fc.property(codeArbitrary, (code) => {
          return typeof code === 'string';
        }),
        { numRuns: 100 }
      );
    });
  });
});
