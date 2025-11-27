import { ErrorHandler, ModernizationError, getErrorHandler, resetErrorHandler } from './ErrorHandler';

describe('ErrorHandler', () => {
  let errorHandler: ErrorHandler;

  beforeEach(() => {
    errorHandler = new ErrorHandler();
  });

  describe('handleError', () => {
    it('should record error with context', () => {
      const error = new Error('Test error');
      const context = {
        operation: 'testOp',
        component: 'TestComponent',
        packageName: 'test-package',
      };

      const report = errorHandler.handleError(error, context);

      expect(report.message).toBe('Test error');
      expect(report.severity).toBe('error');
      expect(report.context).toEqual(context);
      expect(report.recoverable).toBe(false);
    });

    it('should mark network errors as recoverable', () => {
      const error = new Error('Connection timeout');
      error.name = 'ETIMEDOUT';
      const context = {
        operation: 'fetch',
        component: 'Client',
      };

      const report = errorHandler.handleError(error, context);

      expect(report.recoverable).toBe(true);
    });

    it('should record fallback usage', () => {
      const error = new Error('API failed');
      const context = {
        operation: 'getData',
        component: 'Client',
      };

      const report = errorHandler.handleError(error, context, 'cached data');

      expect(report.fallbackUsed).toBe('cached data');
    });
  });

  describe('handleWarning', () => {
    it('should record warning', () => {
      const context = {
        operation: 'testOp',
        component: 'TestComponent',
      };

      const report = errorHandler.handleWarning('Warning message', context);

      expect(report.message).toBe('Warning message');
      expect(report.severity).toBe('warning');
      expect(report.recoverable).toBe(true);
    });
  });

  describe('getErrors and getWarnings', () => {
    it('should return all errors', () => {
      const error1 = new Error('Error 1');
      const error2 = new Error('Error 2');
      const context = { operation: 'test', component: 'Test' };

      errorHandler.handleError(error1, context);
      errorHandler.handleError(error2, context);

      const errors = errorHandler.getErrors();
      expect(errors).toHaveLength(2);
    });

    it('should return all warnings', () => {
      const context = { operation: 'test', component: 'Test' };

      errorHandler.handleWarning('Warning 1', context);
      errorHandler.handleWarning('Warning 2', context);

      const warnings = errorHandler.getWarnings();
      expect(warnings).toHaveLength(2);
    });
  });

  describe('hasCriticalErrors', () => {
    it('should return true for non-recoverable errors', () => {
      const error = new Error('Critical error');
      const context = { operation: 'test', component: 'Test' };

      errorHandler.handleError(error, context);

      expect(errorHandler.hasCriticalErrors()).toBe(true);
    });

    it('should return false for recoverable errors', () => {
      const error = new Error('Timeout');
      error.name = 'ETIMEDOUT';
      const context = { operation: 'test', component: 'Test' };

      errorHandler.handleError(error, context);

      expect(errorHandler.hasCriticalErrors()).toBe(false);
    });
  });

  describe('generateSummary', () => {
    it('should generate summary with errors and warnings', () => {
      const error = new Error('Test error');
      const context = { operation: 'testOp', component: 'TestComponent' };

      errorHandler.handleError(error, context);
      errorHandler.handleWarning('Test warning', context);

      const summary = errorHandler.generateSummary();

      expect(summary).toContain('Errors (1)');
      expect(summary).toContain('Warnings (1)');
      expect(summary).toContain('Test error');
      expect(summary).toContain('Test warning');
    });

    it('should return no errors message when empty', () => {
      const summary = errorHandler.generateSummary();
      expect(summary).toBe('No errors or warnings');
    });
  });

  describe('clear', () => {
    it('should clear all errors and warnings', () => {
      const error = new Error('Test error');
      const context = { operation: 'test', component: 'Test' };

      errorHandler.handleError(error, context);
      errorHandler.handleWarning('Warning', context);

      errorHandler.clear();

      expect(errorHandler.getErrors()).toHaveLength(0);
      expect(errorHandler.getWarnings()).toHaveLength(0);
    });
  });

  describe('global error handler', () => {
    it('should return singleton instance', () => {
      const handler1 = getErrorHandler();
      const handler2 = getErrorHandler();

      expect(handler1).toBe(handler2);
    });

    it('should reset global instance', () => {
      const handler1 = getErrorHandler();
      handler1.handleError(new Error('Test'), { operation: 'test', component: 'Test' });

      resetErrorHandler();
      const handler2 = getErrorHandler();

      expect(handler2.getErrors()).toHaveLength(0);
    });
  });
});

describe('ModernizationError', () => {
  it('should create error with context', () => {
    const context = {
      operation: 'testOp',
      component: 'TestComponent',
      packageName: 'test-package',
    };

    const error = new ModernizationError('Test error', context, true);

    expect(error.message).toBe('Test error');
    expect(error.context).toEqual(context);
    expect(error.recoverable).toBe(true);
    expect(error.name).toBe('ModernizationError');
  });
});
