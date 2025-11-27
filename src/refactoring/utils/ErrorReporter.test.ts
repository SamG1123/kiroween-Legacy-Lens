import { ErrorReporter } from './ErrorReporter';

describe('ErrorReporter', () => {
  let reporter: ErrorReporter;

  beforeEach(() => {
    reporter = new ErrorReporter();
  });

  describe('reportError', () => {
    it('should report an error', () => {
      reporter.reportError('SYNTAX_ERROR', 'Invalid syntax');

      expect(reporter.hasErrors()).toBe(true);
      expect(reporter.getErrors()).toHaveLength(1);
      expect(reporter.getErrors()[0].code).toBe('SYNTAX_ERROR');
      expect(reporter.getErrors()[0].message).toBe('Invalid syntax');
    });

    it('should report an error with details', () => {
      reporter.reportError('NAMING_CONFLICT', 'Duplicate identifier', {
        details: 'Variable x is already defined',
        location: { file: 'test.ts', line: 10, column: 5 },
        context: { identifier: 'x' },
        recoverySuggestions: ['Choose a different name'],
      });

      const errors = reporter.getErrors();
      expect(errors).toHaveLength(1);
      expect(errors[0].details).toBe('Variable x is already defined');
      expect(errors[0].location).toEqual({ file: 'test.ts', line: 10, column: 5 });
      expect(errors[0].context).toEqual({ identifier: 'x' });
      expect(errors[0].recoverySuggestions).toEqual(['Choose a different name']);
    });

    it('should report multiple errors', () => {
      reporter.reportError('SYNTAX_ERROR', 'Error 1');
      reporter.reportError('NAMING_CONFLICT', 'Error 2');
      reporter.reportError('TEST_FAILURE', 'Error 3');

      expect(reporter.getErrors()).toHaveLength(3);
    });
  });

  describe('reportWarning', () => {
    it('should report a warning', () => {
      reporter.reportWarning('NO_TESTS_FOUND', 'No tests available');

      expect(reporter.hasWarnings()).toBe(true);
      expect(reporter.getWarnings()).toHaveLength(1);
      expect(reporter.getWarnings()[0].code).toBe('NO_TESTS_FOUND');
      expect(reporter.getWarnings()[0].message).toBe('No tests available');
    });

    it('should report multiple warnings', () => {
      reporter.reportWarning('NO_TESTS_FOUND', 'Warning 1');
      reporter.reportWarning('UNSAFE_REFACTORING', 'Warning 2');

      expect(reporter.getWarnings()).toHaveLength(2);
    });
  });

  describe('hasErrors', () => {
    it('should return false when no errors', () => {
      expect(reporter.hasErrors()).toBe(false);
    });

    it('should return true when errors exist', () => {
      reporter.reportError('SYNTAX_ERROR', 'Error');
      expect(reporter.hasErrors()).toBe(true);
    });
  });

  describe('hasWarnings', () => {
    it('should return false when no warnings', () => {
      expect(reporter.hasWarnings()).toBe(false);
    });

    it('should return true when warnings exist', () => {
      reporter.reportWarning('NO_TESTS_FOUND', 'Warning');
      expect(reporter.hasWarnings()).toBe(true);
    });
  });

  describe('clear', () => {
    it('should clear all errors and warnings', () => {
      reporter.reportError('SYNTAX_ERROR', 'Error');
      reporter.reportWarning('NO_TESTS_FOUND', 'Warning');

      expect(reporter.hasErrors()).toBe(true);
      expect(reporter.hasWarnings()).toBe(true);

      reporter.clear();

      expect(reporter.hasErrors()).toBe(false);
      expect(reporter.hasWarnings()).toBe(false);
      expect(reporter.getErrors()).toHaveLength(0);
      expect(reporter.getWarnings()).toHaveLength(0);
    });
  });

  describe('generateReport', () => {
    it('should generate a report with no errors or warnings', () => {
      const report = reporter.generateReport();

      expect(report.errors).toHaveLength(0);
      expect(report.warnings).toHaveLength(0);
      expect(report.summary).toBe('No errors or warnings');
      expect(report.canRecover).toBe(true);
    });

    it('should generate a report with errors', () => {
      reporter.reportError('SYNTAX_ERROR', 'Error 1');
      reporter.reportError('NAMING_CONFLICT', 'Error 2');

      const report = reporter.generateReport();

      expect(report.errors).toHaveLength(2);
      expect(report.summary).toBe('2 errors');
      expect(report.canRecover).toBe(true);
    });

    it('should generate a report with warnings', () => {
      reporter.reportWarning('NO_TESTS_FOUND', 'Warning 1');

      const report = reporter.generateReport();

      expect(report.warnings).toHaveLength(1);
      expect(report.summary).toBe('1 warning');
    });

    it('should generate a report with both errors and warnings', () => {
      reporter.reportError('SYNTAX_ERROR', 'Error');
      reporter.reportWarning('NO_TESTS_FOUND', 'Warning');

      const report = reporter.generateReport();

      expect(report.errors).toHaveLength(1);
      expect(report.warnings).toHaveLength(1);
      expect(report.summary).toBe('1 error and 1 warning');
    });

    it('should mark unrecoverable errors', () => {
      reporter.reportError('ROLLBACK_FAILED', 'Rollback failed');

      const report = reporter.generateReport();

      expect(report.canRecover).toBe(false);
    });

    it('should generate recovery actions for syntax errors', () => {
      reporter.reportError('SYNTAX_ERROR', 'Invalid syntax');

      const report = reporter.generateReport();

      expect(report.recoveryActions).toContain('Fix syntax errors in the refactored code');
      expect(report.recoveryActions).toContain('Review the transformation logic for correctness');
    });

    it('should generate recovery actions for naming conflicts', () => {
      reporter.reportError('NAMING_CONFLICT', 'Duplicate identifier');

      const report = reporter.generateReport();

      expect(report.recoveryActions).toContain('Choose a different name that does not conflict');
    });

    it('should generate recovery actions for test failures', () => {
      reporter.reportError('TEST_FAILURE', 'Tests failed');

      const report = reporter.generateReport();

      expect(report.recoveryActions).toContain('Review test failures to identify behavior changes');
    });
  });

  describe('formatError', () => {
    it('should format a basic error', () => {
      reporter.reportError('SYNTAX_ERROR', 'Invalid syntax');

      const formatted = reporter.formatError(reporter.getErrors()[0]);

      expect(formatted).toContain('[SYNTAX_ERROR]');
      expect(formatted).toContain('Invalid syntax');
    });

    it('should format an error with details', () => {
      reporter.reportError('SYNTAX_ERROR', 'Invalid syntax', {
        details: 'Missing semicolon',
      });

      const formatted = reporter.formatError(reporter.getErrors()[0]);

      expect(formatted).toContain('Details: Missing semicolon');
    });

    it('should format an error with location', () => {
      reporter.reportError('SYNTAX_ERROR', 'Invalid syntax', {
        location: { file: 'test.ts', line: 10, column: 5 },
      });

      const formatted = reporter.formatError(reporter.getErrors()[0]);

      expect(formatted).toContain('Location: test.ts:10:5');
    });

    it('should format an error with recovery suggestions', () => {
      reporter.reportError('SYNTAX_ERROR', 'Invalid syntax', {
        recoverySuggestions: ['Fix the syntax', 'Review the code'],
      });

      const formatted = reporter.formatError(reporter.getErrors()[0]);

      expect(formatted).toContain('Recovery suggestions:');
      expect(formatted).toContain('- Fix the syntax');
      expect(formatted).toContain('- Review the code');
    });
  });

  describe('formatAllErrors', () => {
    it('should format all errors and warnings', () => {
      reporter.reportError('SYNTAX_ERROR', 'Error 1');
      reporter.reportError('NAMING_CONFLICT', 'Error 2');
      reporter.reportWarning('NO_TESTS_FOUND', 'Warning 1');

      const formatted = reporter.formatAllErrors();

      expect(formatted).toContain('ERRORS:');
      expect(formatted).toContain('Error 1:');
      expect(formatted).toContain('Error 2:');
      expect(formatted).toContain('WARNINGS:');
      expect(formatted).toContain('Warning 1:');
    });

    it('should return empty string when no errors or warnings', () => {
      const formatted = reporter.formatAllErrors();

      expect(formatted).toBe('');
    });
  });
});
