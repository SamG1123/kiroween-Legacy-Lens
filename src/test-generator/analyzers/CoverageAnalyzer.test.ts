// Unit tests for CoverageAnalyzer
import { CoverageAnalyzer } from './CoverageAnalyzer';

describe('CoverageAnalyzer', () => {
  let analyzer: CoverageAnalyzer;

  beforeEach(() => {
    analyzer = new CoverageAnalyzer();
  });

  describe('analyzeCurrentCoverage', () => {
    it('should analyze coverage for code with functions', () => {
      const code = `
        function add(a, b) {
          return a + b;
        }
        
        function subtract(a, b) {
          return a - b;
        }
        
        describe('add', () => {
          it('should add two numbers', () => {
            expect(add(1, 2)).toBe(3);
          });
        });
      `;

      const result = analyzer.analyzeCurrentCoverage(code);

      expect(result.overallPercentage).toBeGreaterThanOrEqual(0);
      expect(result.untestedFunctions).toContain('subtract');
      expect(result.byFile).toBeInstanceOf(Map);
    });

    it('should handle code with no tests', () => {
      const code = `
        function multiply(a, b) {
          return a * b;
        }
      `;

      const result = analyzer.analyzeCurrentCoverage(code);

      expect(result.overallPercentage).toBe(0);
      expect(result.untestedFunctions).toContain('multiply');
    });

    it('should identify critical paths', () => {
      const code = `
        function main() {
          console.log('Starting application');
        }
        
        test('main', () => {
          main();
        });
      `;

      const result = analyzer.analyzeCurrentCoverage(code);

      expect(result.criticalPathsCovered).toBe(true);
    });
  });

  describe('identifyUntestedCode', () => {
    it('should identify untested functions', () => {
      const code = `
        function testedFunction() {
          return 'tested';
        }
        
        function untestedFunction() {
          return 'untested';
        }
        
        describe('testedFunction', () => {
          it('works', () => {
            expect(testedFunction()).toBe('tested');
          });
        });
      `;

      const result = analyzer.identifyUntestedCode(code);

      expect(result.length).toBeGreaterThan(0);
      expect(result.some(item => item.name === 'untestedFunction')).toBe(true);
      expect(result.every(item => item.type === 'function' || item.type === 'class')).toBe(true);
    });

    it('should calculate complexity for untested code', () => {
      const code = `
        function complexFunction(x) {
          if (x > 0) {
            if (x > 10) {
              return 'large';
            }
            return 'small';
          }
          return 'negative';
        }
      `;

      const result = analyzer.identifyUntestedCode(code);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].complexity).toBeGreaterThan(1);
    });

    it('should identify untested classes', () => {
      const code = `
        class Calculator {
          add(a, b) {
            return a + b;
          }
        }
      `;

      const result = analyzer.identifyUntestedCode(code);

      expect(result.some(item => item.type === 'class' && item.name === 'Calculator')).toBe(true);
    });
  });

  describe('calculateCoverageGaps', () => {
    it('should identify missing edge case tests', () => {
      const code = `
        function divide(a, b) {
          if (b === 0) {
            throw new Error('Division by zero');
          }
          return a / b;
        }
      `;

      const existingTests = [
        {
          id: '1',
          projectId: 'test',
          targetFile: 'test.ts',
          framework: 'jest' as const,
          testCode: 'test code',
          testCases: [
            {
              name: 'divide happy path',
              description: 'divides two numbers',
              inputs: [10, 2],
              expectedOutput: 5,
              type: 'happy_path' as const,
            },
          ],
          mocks: [],
          coverageImprovement: 0,
          status: 'generated' as const,
          createdAt: new Date(),
        },
      ];

      const result = analyzer.calculateCoverageGaps(existingTests, code);

      expect(result.length).toBeGreaterThan(0);
      expect(result.some(gap => gap.type === 'edge_case' || gap.type === 'error_path')).toBe(true);
    });

    it('should estimate impact of gaps', () => {
      const code = `
        function process(data) {
          try {
            return data.value;
          } catch (error) {
            return null;
          }
        }
      `;

      const result = analyzer.calculateCoverageGaps([], code);

      expect(result.every(gap => gap.estimatedImpact >= 0 && gap.estimatedImpact <= 1)).toBe(true);
    });
  });

  describe('prioritizeUntestedCode', () => {
    it('should prioritize by priority level', () => {
      const untested = [
        {
          type: 'function' as const,
          name: 'lowPriority',
          file: 'test.ts',
          complexity: 2,
          priority: 'low' as const,
        },
        {
          type: 'function' as const,
          name: 'criticalFunction',
          file: 'test.ts',
          complexity: 5,
          priority: 'critical' as const,
        },
        {
          type: 'function' as const,
          name: 'mediumPriority',
          file: 'test.ts',
          complexity: 3,
          priority: 'medium' as const,
        },
      ];

      const result = analyzer.prioritizeUntestedCode(untested);

      expect(result[0].priority).toBe('critical');
      expect(result[result.length - 1].priority).toBe('low');
    });

    it('should prioritize by complexity within same priority', () => {
      const untested = [
        {
          type: 'function' as const,
          name: 'simpleHigh',
          file: 'test.ts',
          complexity: 2,
          priority: 'high' as const,
        },
        {
          type: 'function' as const,
          name: 'complexHigh',
          file: 'test.ts',
          complexity: 10,
          priority: 'high' as const,
        },
      ];

      const result = analyzer.prioritizeUntestedCode(untested);

      expect(result[0].complexity).toBeGreaterThan(result[1].complexity);
    });
  });
});
