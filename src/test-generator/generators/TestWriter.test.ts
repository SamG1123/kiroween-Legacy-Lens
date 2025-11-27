import { TestWriter } from './TestWriter';
import { TestStrategy, TestCase, TestFramework, CodeStyle } from '../types';

describe('TestWriter', () => {
  let writer: TestWriter;

  beforeEach(() => {
    writer = new TestWriter();
  });

  describe('writeTestCase', () => {
    it('should write a Jest test case for happy path', () => {
      const testCase: TestCase = {
        name: 'should add two numbers',
        description: 'Tests addition of two positive numbers',
        inputs: [2, 3],
        expectedOutput: 5,
        type: 'happy_path',
      };

      const result = writer.writeTestCase(testCase, 'jest');

      expect(result).toContain("it('should add two numbers'");
      expect(result).toContain('expect(result).toBe(5)');
    });

    it('should write a Jest test case for error case', () => {
      const testCase: TestCase = {
        name: 'should throw on invalid input',
        description: 'Tests error handling',
        inputs: [null],
        expectedOutput: null,
        type: 'error_case',
      };

      const result = writer.writeTestCase(testCase, 'jest');

      expect(result).toContain("it('should throw on invalid input'");
      expect(result).toContain('toThrow()');
    });

    it('should write a pytest test case', () => {
      const testCase: TestCase = {
        name: 'should add two numbers',
        description: 'Tests addition',
        inputs: [2, 3],
        expectedOutput: 5,
        type: 'happy_path',
      };

      const result = writer.writeTestCase(testCase, 'pytest');

      expect(result).toContain('def test_should_add_two_numbers');
      expect(result).toContain('assert result == 5');
    });
  });

  describe('writeSetup', () => {
    it('should write Jest setup code', () => {
      const setup = ['const x = 1', 'const y = 2'];
      const result = writer.writeSetup(setup, 'jest');

      expect(result).toContain('beforeEach');
      expect(result).toContain('const x = 1');
      expect(result).toContain('const y = 2');
    });

    it('should return empty string for no setup', () => {
      const result = writer.writeSetup([], 'jest');
      expect(result).toBe('');
    });

    it('should write pytest setup code', () => {
      const setup = ['x = 1', 'y = 2'];
      const result = writer.writeSetup(setup, 'pytest');

      expect(result).toContain('@pytest.fixture');
      expect(result).toContain('x = 1');
      expect(result).toContain('yield');
    });
  });

  describe('writeTeardown', () => {
    it('should write Jest teardown code', () => {
      const teardown = ['cleanup()', 'reset()'];
      const result = writer.writeTeardown(teardown, 'jest');

      expect(result).toContain('afterEach');
      expect(result).toContain('cleanup()');
      expect(result).toContain('reset()');
    });

    it('should return empty string for no teardown', () => {
      const result = writer.writeTeardown([], 'jest');
      expect(result).toBe('');
    });
  });

  describe('writeTestSuite', () => {
    it('should write a complete Jest test suite', () => {
      const strategy: TestStrategy = {
        targetCode: 'addNumbers',
        testCases: [
          {
            name: 'should add positive numbers',
            description: 'Tests addition',
            inputs: [2, 3],
            expectedOutput: 5,
            type: 'happy_path',
          },
        ],
        edgeCases: [],
        errorCases: [],
        mockingStrategy: {
          dependencies: [],
          mockType: 'full',
        },
        setupRequired: ['const calculator = new Calculator()'],
        teardownRequired: ['calculator.cleanup()'],
      };

      const result = writer.writeTestSuite(strategy, 'jest');

      expect(result).toContain("describe('addNumbers'");
      expect(result).toContain('beforeEach');
      expect(result).toContain('afterEach');
      expect(result).toContain("it('should add positive numbers'");
    });

    it('should write a complete pytest test suite', () => {
      const strategy: TestStrategy = {
        targetCode: 'add_numbers',
        testCases: [
          {
            name: 'should add positive numbers',
            description: 'Tests addition',
            inputs: [2, 3],
            expectedOutput: 5,
            type: 'happy_path',
          },
        ],
        edgeCases: [],
        errorCases: [],
        mockingStrategy: {
          dependencies: [],
          mockType: 'full',
        },
        setupRequired: [],
        teardownRequired: [],
      };

      const result = writer.writeTestSuite(strategy, 'pytest');

      expect(result).toContain('"""Tests for add_numbers"""');
      expect(result).toContain('def test_should_add_positive_numbers');
    });
  });

  describe('formatTest', () => {
    it('should apply indentation style', () => {
      const code = 'function test() {\n  return true;\n}';
      const style: CodeStyle = {
        indentation: 4,
        quotes: 'single',
        semicolons: true,
      };

      const result = writer.formatTest(code, style);

      expect(result).toContain('    '); // 4 spaces
    });

    it('should convert to single quotes', () => {
      const code = 'const x = "hello";';
      const style: CodeStyle = {
        indentation: 2,
        quotes: 'single',
        semicolons: true,
      };

      const result = writer.formatTest(code, style);

      expect(result).toContain("'hello'");
      expect(result).not.toContain('"hello"');
    });

    it('should convert to double quotes', () => {
      const code = "const x = 'hello';";
      const style: CodeStyle = {
        indentation: 2,
        quotes: 'double',
        semicolons: true,
      };

      const result = writer.formatTest(code, style);

      expect(result).toContain('"hello"');
      expect(result).not.toContain("'hello'");
    });
  });

  describe('framework support', () => {
    const testCase: TestCase = {
      name: 'test case',
      description: 'A test',
      inputs: [1],
      expectedOutput: 2,
      type: 'happy_path',
    };

    it('should support Jest framework', () => {
      const result = writer.writeTestCase(testCase, 'jest');
      expect(result).toContain('it(');
      expect(result).toContain('expect(');
    });

    it('should support Mocha framework', () => {
      const result = writer.writeTestCase(testCase, 'mocha');
      expect(result).toContain('it(');
      expect(result).toContain('expect(');
    });

    it('should support pytest framework', () => {
      const result = writer.writeTestCase(testCase, 'pytest');
      expect(result).toContain('def test_');
      expect(result).toContain('assert');
    });

    it('should support JUnit framework', () => {
      const result = writer.writeTestCase(testCase, 'junit');
      expect(result).toContain('@Test');
      expect(result).toContain('assertEquals');
    });

    it('should support RSpec framework', () => {
      const result = writer.writeTestCase(testCase, 'rspec');
      expect(result).toContain("it '");
      expect(result).toContain('expect(');
    });
  });
});
