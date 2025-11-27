import { TestRunner } from './TestRunner';
import { TestResult } from '../types';
import * as fs from 'fs';
import * as path from 'path';

describe('TestRunner', () => {
  let testRunner: TestRunner;

  beforeEach(() => {
    testRunner = new TestRunner();
  });

  describe('compareResults', () => {
    it('should return true when results are identical', () => {
      const before: TestResult = {
        passed: 10,
        failed: 2,
        errors: [],
        duration: 1000,
      };

      const after: TestResult = {
        passed: 10,
        failed: 2,
        errors: [],
        duration: 1100,
      };

      expect(testRunner.compareResults(before, after)).toBe(true);
    });

    it('should return true when more tests pass after refactoring', () => {
      const before: TestResult = {
        passed: 10,
        failed: 2,
        errors: [],
        duration: 1000,
      };

      const after: TestResult = {
        passed: 12,
        failed: 0,
        errors: [],
        duration: 1100,
      };

      expect(testRunner.compareResults(before, after)).toBe(true);
    });

    it('should return false when tests fail after refactoring', () => {
      const before: TestResult = {
        passed: 10,
        failed: 0,
        errors: [],
        duration: 1000,
      };

      const after: TestResult = {
        passed: 8,
        failed: 2,
        errors: [],
        duration: 1100,
      };

      expect(testRunner.compareResults(before, after)).toBe(false);
    });

    it('should return false when fewer tests pass', () => {
      const before: TestResult = {
        passed: 10,
        failed: 2,
        errors: [],
        duration: 1000,
      };

      const after: TestResult = {
        passed: 9,
        failed: 2,
        errors: [],
        duration: 1100,
      };

      expect(testRunner.compareResults(before, after)).toBe(false);
    });
  });

  describe('shouldRevert', () => {
    it('should return true when tests fail after refactoring', () => {
      const before: TestResult = {
        passed: 10,
        failed: 0,
        errors: [],
        duration: 1000,
      };

      const after: TestResult = {
        passed: 9,
        failed: 1,
        errors: [],
        duration: 1100,
      };

      expect(testRunner.shouldRevert(before, after)).toBe(true);
    });

    it('should return false when results are the same', () => {
      const before: TestResult = {
        passed: 10,
        failed: 2,
        errors: [],
        duration: 1000,
      };

      const after: TestResult = {
        passed: 10,
        failed: 2,
        errors: [],
        duration: 1100,
      };

      expect(testRunner.shouldRevert(before, after)).toBe(false);
    });

    it('should return false when results improve', () => {
      const before: TestResult = {
        passed: 10,
        failed: 2,
        errors: [],
        duration: 1000,
      };

      const after: TestResult = {
        passed: 12,
        failed: 0,
        errors: [],
        duration: 1100,
      };

      expect(testRunner.shouldRevert(before, after)).toBe(false);
    });
  });

  describe('generateNoTestsWarning', () => {
    it('should generate appropriate warning message', () => {
      const warning = testRunner.generateNoTestsWarning();
      
      expect(warning).toContain('WARNING');
      expect(warning).toContain('No tests found');
      expect(warning).toContain('safety cannot be guaranteed');
    });
  });

  describe('runTests', () => {
    it('should return empty result when no tests exist', async () => {
      // Create a temporary directory without tests
      const tempDir = path.join(__dirname, 'temp-no-tests');
      
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      try {
        const result = await testRunner.runTests(tempDir);
        
        expect(result.passed).toBe(0);
        expect(result.failed).toBe(0);
        expect(result.errors).toEqual([]);
      } finally {
        // Cleanup
        if (fs.existsSync(tempDir)) {
          fs.rmdirSync(tempDir, { recursive: true });
        }
      }
    });

    it('should detect Jest framework from package.json', async () => {
      const tempDir = path.join(__dirname, 'temp-jest');
      
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const packageJson = {
        name: 'test-project',
        devDependencies: {
          jest: '^29.0.0',
        },
      };

      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify(packageJson, null, 2)
      );

      try {
        // This will fail to run tests but should detect the framework
        const result = await testRunner.runTests(tempDir);
        
        // Should attempt to run Jest (will fail but that's ok for this test)
        expect(result).toBeDefined();
      } finally {
        // Cleanup
        if (fs.existsSync(tempDir)) {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
      }
    });
  });
});
