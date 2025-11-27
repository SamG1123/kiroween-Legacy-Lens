// Error Handler Tests

import {
  TestGeneratorErrorHandler,
  ErrorCategory,
  ErrorSeverity,
} from './ErrorHandler';

describe('TestGeneratorErrorHandler', () => {
  let errorHandler: TestGeneratorErrorHandler;

  beforeEach(() => {
    errorHandler = new TestGeneratorErrorHandler();
  });

  describe('recordError', () => {
    it('should record an error with all details', () => {
      const error = errorHandler.recordError(
        ErrorCategory.GENERATION,
        ErrorSeverity.HIGH,
        'Test generation failed',
        new Error('Original error'),
        { functionName: 'testFunc' }
      );

      expect(error.category).toBe(ErrorCategory.GENERATION);
      expect(error.severity).toBe(ErrorSeverity.HIGH);
      expect(error.message).toBe('Test generation failed');
      expect(error.originalError).toBeDefined();
      expect(error.context).toEqual({ functionName: 'testFunc' });
      expect(error.timestamp).toBeInstanceOf(Date);
    });

    it('should mark recoverable errors correctly', () => {
      const recoverableError = errorHandler.recordError(
        ErrorCategory.AI_API,
        ErrorSeverity.MEDIUM,
        'Rate limit exceeded'
      );

      const nonRecoverableError = errorHandler.recordError(
        ErrorCategory.CONFIGURATION,
        ErrorSeverity.CRITICAL,
        'Invalid configuration'
      );

      expect(recoverableError.recoverable).toBe(true);
      expect(nonRecoverableError.recoverable).toBe(false);
    });

    it('should provide suggested actions', () => {
      const error = errorHandler.recordError(
        ErrorCategory.AI_API,
        ErrorSeverity.MEDIUM,
        'Rate limit exceeded'
      );

      expect(error.suggestedAction).toContain('retry');
    });
  });

  describe('recordWarning', () => {
    it('should record a warning with low severity', () => {
      const warning = errorHandler.recordWarning(
        ErrorCategory.VALIDATION,
        'Missing semicolon'
      );

      expect(warning.severity).toBe(ErrorSeverity.LOW);
      expect(warning.message).toBe('Missing semicolon');
    });
  });

  describe('generateReport', () => {
    it('should generate a comprehensive error report', () => {
      errorHandler.recordError(
        ErrorCategory.GENERATION,
        ErrorSeverity.CRITICAL,
        'Critical error'
      );
      errorHandler.recordError(
        ErrorCategory.VALIDATION,
        ErrorSeverity.HIGH,
        'High severity error'
      );
      errorHandler.recordWarning(
        ErrorCategory.ANALYSIS,
        'Warning message'
      );

      const report = errorHandler.generateReport();

      expect(report.totalErrors).toBe(2);
      expect(report.criticalErrors).toBe(1);
      expect(report.warnings.length).toBe(1);
      expect(report.summary).toContain('error');
    });

    it('should generate summary when no errors', () => {
      const report = errorHandler.generateReport();

      expect(report.totalErrors).toBe(0);
      expect(report.summary).toContain('No errors');
    });
  });

  describe('getErrorsByCategory', () => {
    it('should filter errors by category', () => {
      errorHandler.recordError(
        ErrorCategory.GENERATION,
        ErrorSeverity.HIGH,
        'Generation error'
      );
      errorHandler.recordError(
        ErrorCategory.VALIDATION,
        ErrorSeverity.MEDIUM,
        'Validation error'
      );

      const generationErrors = errorHandler.getErrorsByCategory(ErrorCategory.GENERATION);

      expect(generationErrors.length).toBe(1);
      expect(generationErrors[0].message).toBe('Generation error');
    });
  });

  describe('getCriticalErrors', () => {
    it('should return only critical errors', () => {
      errorHandler.recordError(
        ErrorCategory.GENERATION,
        ErrorSeverity.CRITICAL,
        'Critical error'
      );
      errorHandler.recordError(
        ErrorCategory.VALIDATION,
        ErrorSeverity.HIGH,
        'High error'
      );

      const criticalErrors = errorHandler.getCriticalErrors();

      expect(criticalErrors.length).toBe(1);
      expect(criticalErrors[0].severity).toBe(ErrorSeverity.CRITICAL);
    });
  });

  describe('hasCriticalErrors', () => {
    it('should return true when critical errors exist', () => {
      errorHandler.recordError(
        ErrorCategory.GENERATION,
        ErrorSeverity.CRITICAL,
        'Critical error'
      );

      expect(errorHandler.hasCriticalErrors()).toBe(true);
    });

    it('should return false when no critical errors', () => {
      errorHandler.recordError(
        ErrorCategory.VALIDATION,
        ErrorSeverity.HIGH,
        'High error'
      );

      expect(errorHandler.hasCriticalErrors()).toBe(false);
    });
  });

  describe('clear', () => {
    it('should clear all errors and warnings', () => {
      errorHandler.recordError(
        ErrorCategory.GENERATION,
        ErrorSeverity.HIGH,
        'Error'
      );
      errorHandler.recordWarning(
        ErrorCategory.VALIDATION,
        'Warning'
      );

      errorHandler.clear();

      const report = errorHandler.generateReport();
      expect(report.totalErrors).toBe(0);
      expect(report.warnings.length).toBe(0);
    });
  });
});
