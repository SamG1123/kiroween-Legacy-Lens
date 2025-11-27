import { TestResult, TestError } from '../types';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

export type TestFramework = 'jest' | 'pytest' | 'junit';

/**
 * Runs tests to verify refactorings preserve behavior
 * Supports Jest, pytest, and JUnit test frameworks
 */
export class TestRunner {
  /**
   * Detects the test framework used in the codebase
   */
  private detectTestFramework(codebase: string): TestFramework | null {
    try {
      // Check for package.json with Jest
      const packageJsonPath = path.join(codebase, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
        if (packageJson.devDependencies?.jest || packageJson.dependencies?.jest) {
          return 'jest';
        }
      }

      // Check for pytest
      const pytestFiles = ['pytest.ini', 'setup.cfg', 'pyproject.toml'];
      for (const file of pytestFiles) {
        if (fs.existsSync(path.join(codebase, file))) {
          return 'pytest';
        }
      }

      // Check for Python test files
      if (this.hasFilesWithPattern(codebase, /test_.*\.py$/)) {
        return 'pytest';
      }

      // Check for JUnit (pom.xml or build.gradle)
      if (fs.existsSync(path.join(codebase, 'pom.xml')) || 
          fs.existsSync(path.join(codebase, 'build.gradle'))) {
        return 'junit';
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Checks if directory has files matching a pattern
   */
  private hasFilesWithPattern(dir: string, pattern: RegExp): boolean {
    try {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          if (this.hasFilesWithPattern(fullPath, pattern)) {
            return true;
          }
        } else if (pattern.test(file)) {
          return true;
        }
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Checks if tests exist in the codebase
   */
  private hasTests(codebase: string): boolean {
    const framework = this.detectTestFramework(codebase);
    if (!framework) {
      // Check for common test file patterns
      return this.hasFilesWithPattern(codebase, /\.(test|spec)\.(ts|js|py|java)$/) ||
             this.hasFilesWithPattern(codebase, /test_.*\.py$/) ||
             this.hasFilesWithPattern(codebase, /.*Test\.java$/);
    }
    return true;
  }

  /**
   * Runs all tests in the codebase
   */
  async runTests(codebase: string): Promise<TestResult> {
    // Check if tests exist
    if (!this.hasTests(codebase)) {
      return {
        passed: 0,
        failed: 0,
        errors: [],
        duration: 0,
      };
    }

    const framework = this.detectTestFramework(codebase);
    
    if (!framework) {
      return {
        passed: 0,
        failed: 0,
        errors: [{
          testName: 'Framework Detection',
          error: 'Could not detect test framework',
          stackTrace: 'No supported test framework found (Jest, pytest, JUnit)',
        }],
        duration: 0,
      };
    }

    switch (framework) {
      case 'jest':
        return this.runJestTests(codebase);
      case 'pytest':
        return this.runPytestTests(codebase);
      case 'junit':
        return this.runJUnitTests(codebase);
      default:
        return {
          passed: 0,
          failed: 0,
          errors: [],
          duration: 0,
        };
    }
  }

  /**
   * Runs specific test files
   */
  async runSpecificTests(codebase: string, testFiles: string[]): Promise<TestResult> {
    if (testFiles.length === 0) {
      return {
        passed: 0,
        failed: 0,
        errors: [],
        duration: 0,
      };
    }

    const framework = this.detectTestFramework(codebase);
    
    if (!framework) {
      return {
        passed: 0,
        failed: 0,
        errors: [{
          testName: 'Framework Detection',
          error: 'Could not detect test framework',
          stackTrace: 'No supported test framework found',
        }],
        duration: 0,
      };
    }

    switch (framework) {
      case 'jest':
        return this.runJestTests(codebase, testFiles);
      case 'pytest':
        return this.runPytestTests(codebase, testFiles);
      case 'junit':
        return this.runJUnitTests(codebase, testFiles);
      default:
        return {
          passed: 0,
          failed: 0,
          errors: [],
          duration: 0,
        };
    }
  }

  /**
   * Runs Jest tests
   */
  private async runJestTests(codebase: string, testFiles?: string[]): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      const testPattern = testFiles ? testFiles.join(' ') : '';
      const command = testFiles 
        ? `npm test -- ${testPattern} --json`
        : 'npm test -- --json';

      const { stdout, stderr } = await execAsync(command, {
        cwd: codebase,
        timeout: 300000, // 5 minutes
      });

      const duration = Date.now() - startTime;

      // Parse Jest JSON output
      try {
        const result = JSON.parse(stdout);
        return {
          passed: result.numPassedTests || 0,
          failed: result.numFailedTests || 0,
          errors: this.parseJestErrors(result),
          duration,
        };
      } catch (parseError) {
        // Fallback: parse text output
        return this.parseJestTextOutput(stdout + stderr, duration);
      }
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      // Jest exits with non-zero code when tests fail
      if (error.stdout) {
        try {
          const result = JSON.parse(error.stdout);
          return {
            passed: result.numPassedTests || 0,
            failed: result.numFailedTests || 0,
            errors: this.parseJestErrors(result),
            duration,
          };
        } catch (parseError) {
          return this.parseJestTextOutput(error.stdout + error.stderr, duration);
        }
      }

      return {
        passed: 0,
        failed: 0,
        errors: [{
          testName: 'Test Execution',
          error: error.message || 'Failed to run Jest tests',
          stackTrace: error.stack || '',
        }],
        duration,
      };
    }
  }

  /**
   * Parses Jest JSON errors
   */
  private parseJestErrors(result: any): TestError[] {
    const errors: TestError[] = [];
    
    if (result.testResults) {
      for (const testFile of result.testResults) {
        if (testFile.assertionResults) {
          for (const assertion of testFile.assertionResults) {
            if (assertion.status === 'failed') {
              errors.push({
                testName: assertion.fullName || assertion.title || 'Unknown test',
                error: assertion.failureMessages?.join('\n') || 'Test failed',
                stackTrace: assertion.failureMessages?.join('\n') || '',
              });
            }
          }
        }
      }
    }
    
    return errors;
  }

  /**
   * Parses Jest text output as fallback
   */
  private parseJestTextOutput(output: string, duration: number): TestResult {
    const passedMatch = output.match(/(\d+) passed/);
    const failedMatch = output.match(/(\d+) failed/);
    
    return {
      passed: passedMatch ? parseInt(passedMatch[1]) : 0,
      failed: failedMatch ? parseInt(failedMatch[1]) : 0,
      errors: [],
      duration,
    };
  }

  /**
   * Runs pytest tests
   */
  private async runPytestTests(codebase: string, testFiles?: string[]): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      const testPattern = testFiles ? testFiles.join(' ') : '';
      const command = `pytest ${testPattern} --json-report --json-report-file=test-report.json`;

      await execAsync(command, {
        cwd: codebase,
        timeout: 300000,
      });

      const duration = Date.now() - startTime;

      // Try to read JSON report
      const reportPath = path.join(codebase, 'test-report.json');
      if (fs.existsSync(reportPath)) {
        const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
        return {
          passed: report.summary?.passed || 0,
          failed: report.summary?.failed || 0,
          errors: this.parsePytestErrors(report),
          duration,
        };
      }

      return {
        passed: 0,
        failed: 0,
        errors: [],
        duration,
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      // Try to parse output even on failure
      if (error.stdout || error.stderr) {
        return this.parsePytestTextOutput(error.stdout + error.stderr, duration);
      }

      return {
        passed: 0,
        failed: 0,
        errors: [{
          testName: 'Test Execution',
          error: error.message || 'Failed to run pytest tests',
          stackTrace: error.stack || '',
        }],
        duration,
      };
    }
  }

  /**
   * Parses pytest JSON errors
   */
  private parsePytestErrors(report: any): TestError[] {
    const errors: TestError[] = [];
    
    if (report.tests) {
      for (const test of report.tests) {
        if (test.outcome === 'failed') {
          errors.push({
            testName: test.nodeid || 'Unknown test',
            error: test.call?.longrepr || 'Test failed',
            stackTrace: test.call?.longrepr || '',
          });
        }
      }
    }
    
    return errors;
  }

  /**
   * Parses pytest text output as fallback
   */
  private parsePytestTextOutput(output: string, duration: number): TestResult {
    const passedMatch = output.match(/(\d+) passed/);
    const failedMatch = output.match(/(\d+) failed/);
    
    return {
      passed: passedMatch ? parseInt(passedMatch[1]) : 0,
      failed: failedMatch ? parseInt(failedMatch[1]) : 0,
      errors: [],
      duration,
    };
  }

  /**
   * Runs JUnit tests
   */
  private async runJUnitTests(codebase: string, testFiles?: string[]): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      // Check if Maven or Gradle
      const isMaven = fs.existsSync(path.join(codebase, 'pom.xml'));
      const command = isMaven ? 'mvn test' : 'gradle test';

      await execAsync(command, {
        cwd: codebase,
        timeout: 300000,
      });

      const duration = Date.now() - startTime;

      // Parse test results from target/surefire-reports or build/test-results
      const resultsDir = isMaven 
        ? path.join(codebase, 'target', 'surefire-reports')
        : path.join(codebase, 'build', 'test-results', 'test');

      if (fs.existsSync(resultsDir)) {
        return this.parseJUnitXmlResults(resultsDir, duration);
      }

      return {
        passed: 0,
        failed: 0,
        errors: [],
        duration,
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      return {
        passed: 0,
        failed: 0,
        errors: [{
          testName: 'Test Execution',
          error: error.message || 'Failed to run JUnit tests',
          stackTrace: error.stack || '',
        }],
        duration,
      };
    }
  }

  /**
   * Parses JUnit XML results
   */
  private parseJUnitXmlResults(resultsDir: string, duration: number): TestResult {
    // Simplified parsing - in production would use xml2js
    let passed = 0;
    let failed = 0;
    const errors: TestError[] = [];

    try {
      const files = fs.readdirSync(resultsDir);
      for (const file of files) {
        if (file.endsWith('.xml')) {
          const content = fs.readFileSync(path.join(resultsDir, file), 'utf-8');
          
          // Simple regex parsing
          const testsMatch = content.match(/tests="(\d+)"/);
          const failuresMatch = content.match(/failures="(\d+)"/);
          const errorsMatch = content.match(/errors="(\d+)"/);
          
          if (testsMatch) {
            const total = parseInt(testsMatch[1]);
            const failures = failuresMatch ? parseInt(failuresMatch[1]) : 0;
            const testErrors = errorsMatch ? parseInt(errorsMatch[1]) : 0;
            
            failed += failures + testErrors;
            passed += total - failures - testErrors;
          }
        }
      }
    } catch (error) {
      // Ignore parsing errors
    }

    return {
      passed,
      failed,
      errors,
      duration,
    };
  }

  /**
   * Compares test results before and after refactoring
   * Returns true if results are equivalent (same or better)
   */
  compareResults(before: TestResult, after: TestResult): boolean {
    // After refactoring should have at least as many passing tests
    // and no more failing tests
    return after.passed >= before.passed && after.failed <= before.failed;
  }

  /**
   * Generates a warning message when no tests exist
   */
  generateNoTestsWarning(): string {
    return 'WARNING: No tests found in codebase. Refactoring safety cannot be guaranteed without tests. ' +
           'It is strongly recommended to add tests before applying refactorings.';
  }

  /**
   * Checks if automatic reversion is needed based on test results
   */
  shouldRevert(before: TestResult, after: TestResult): boolean {
    // Revert if any tests that were passing now fail
    return after.failed > before.failed || after.passed < before.passed;
  }
}
