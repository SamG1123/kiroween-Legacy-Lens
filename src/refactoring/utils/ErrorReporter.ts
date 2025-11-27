/**
 * Enhanced error reporting for refactoring operations
 * Provides detailed error information with codes, context, and recovery suggestions
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 */

export type RefactoringErrorCode =
  | 'SYNTAX_ERROR'
  | 'NAMING_CONFLICT'
  | 'BEHAVIOR_CHANGE'
  | 'TEST_FAILURE'
  | 'VALIDATION_FAILED'
  | 'TRANSFORMATION_FAILED'
  | 'NO_TESTS_FOUND'
  | 'UNSAFE_REFACTORING'
  | 'ROLLBACK_FAILED'
  | 'PARSE_ERROR'
  | 'UNKNOWN_ERROR';

export interface RefactoringError {
  code: RefactoringErrorCode;
  message: string;
  details?: string;
  location?: {
    file: string;
    line?: number;
    column?: number;
  };
  context?: Record<string, any>;
  recoverySuggestions?: string[];
  timestamp: Date;
}

export interface ErrorReport {
  errors: RefactoringError[];
  warnings: RefactoringError[];
  summary: string;
  canRecover: boolean;
  recoveryActions: string[];
}

/**
 * Error reporter for detailed refactoring error tracking
 */
export class ErrorReporter {
  private errors: RefactoringError[] = [];
  private warnings: RefactoringError[] = [];

  /**
   * Report a refactoring error
   */
  reportError(
    code: RefactoringErrorCode,
    message: string,
    options?: {
      details?: string;
      location?: { file: string; line?: number; column?: number };
      context?: Record<string, any>;
      recoverySuggestions?: string[];
    }
  ): void {
    this.errors.push({
      code,
      message,
      details: options?.details,
      location: options?.location,
      context: options?.context,
      recoverySuggestions: options?.recoverySuggestions,
      timestamp: new Date(),
    });
  }

  /**
   * Report a refactoring warning
   */
  reportWarning(
    code: RefactoringErrorCode,
    message: string,
    options?: {
      details?: string;
      location?: { file: string; line?: number; column?: number };
      context?: Record<string, any>;
      recoverySuggestions?: string[];
    }
  ): void {
    this.warnings.push({
      code,
      message,
      details: options?.details,
      location: options?.location,
      context: options?.context,
      recoverySuggestions: options?.recoverySuggestions,
      timestamp: new Date(),
    });
  }

  /**
   * Check if there are any errors
   */
  hasErrors(): boolean {
    return this.errors.length > 0;
  }

  /**
   * Check if there are any warnings
   */
  hasWarnings(): boolean {
    return this.warnings.length > 0;
  }

  /**
   * Get all errors
   */
  getErrors(): RefactoringError[] {
    return [...this.errors];
  }

  /**
   * Get all warnings
   */
  getWarnings(): RefactoringError[] {
    return [...this.warnings];
  }

  /**
   * Generate a comprehensive error report
   */
  generateReport(): ErrorReport {
    const canRecover = this.determineRecoverability();
    const recoveryActions = this.generateRecoveryActions();
    const summary = this.generateSummary();

    return {
      errors: this.getErrors(),
      warnings: this.getWarnings(),
      summary,
      canRecover,
      recoveryActions,
    };
  }

  /**
   * Clear all errors and warnings
   */
  clear(): void {
    this.errors = [];
    this.warnings = [];
  }

  /**
   * Format error for display
   */
  formatError(error: RefactoringError): string {
    const parts: string[] = [];

    parts.push(`[${error.code}] ${error.message}`);

    if (error.details) {
      parts.push(`Details: ${error.details}`);
    }

    if (error.location) {
      const loc = error.location;
      const locStr = loc.line && loc.column
        ? `${loc.file}:${loc.line}:${loc.column}`
        : loc.line
        ? `${loc.file}:${loc.line}`
        : loc.file;
      parts.push(`Location: ${locStr}`);
    }

    if (error.context && Object.keys(error.context).length > 0) {
      parts.push(`Context: ${JSON.stringify(error.context, null, 2)}`);
    }

    if (error.recoverySuggestions && error.recoverySuggestions.length > 0) {
      parts.push('Recovery suggestions:');
      error.recoverySuggestions.forEach(suggestion => {
        parts.push(`  - ${suggestion}`);
      });
    }

    return parts.join('\n');
  }

  /**
   * Format all errors for display
   */
  formatAllErrors(): string {
    const parts: string[] = [];

    if (this.errors.length > 0) {
      parts.push('ERRORS:');
      parts.push('');
      this.errors.forEach((error, index) => {
        parts.push(`Error ${index + 1}:`);
        parts.push(this.formatError(error));
        parts.push('');
      });
    }

    if (this.warnings.length > 0) {
      parts.push('WARNINGS:');
      parts.push('');
      this.warnings.forEach((warning, index) => {
        parts.push(`Warning ${index + 1}:`);
        parts.push(this.formatError(warning));
        parts.push('');
      });
    }

    return parts.join('\n');
  }

  /**
   * Determine if errors are recoverable
   */
  private determineRecoverability(): boolean {
    // Check if any errors are unrecoverable
    const unrecoverableCodes: RefactoringErrorCode[] = [
      'ROLLBACK_FAILED',
      'PARSE_ERROR',
    ];

    return !this.errors.some(error => unrecoverableCodes.includes(error.code));
  }

  /**
   * Generate recovery actions based on errors
   */
  private generateRecoveryActions(): string[] {
    const actions: string[] = [];
    const errorCodes = new Set(this.errors.map(e => e.code));

    if (errorCodes.has('SYNTAX_ERROR')) {
      actions.push('Fix syntax errors in the refactored code');
      actions.push('Review the transformation logic for correctness');
    }

    if (errorCodes.has('NAMING_CONFLICT')) {
      actions.push('Choose a different name that does not conflict');
      actions.push('Review the scope of the renamed identifier');
    }

    if (errorCodes.has('TEST_FAILURE')) {
      actions.push('Review test failures to identify behavior changes');
      actions.push('Update tests if the behavior change is intentional');
      actions.push('Revert the refactoring if behavior should be preserved');
    }

    if (errorCodes.has('NO_TESTS_FOUND')) {
      actions.push('Add tests to verify behavior preservation');
      actions.push('Use safe mode to only suggest refactorings without applying them');
      actions.push('Manually verify the refactoring is correct');
    }

    if (errorCodes.has('VALIDATION_FAILED')) {
      actions.push('Review validation issues before applying refactoring');
      actions.push('Fix the issues identified by the validator');
    }

    if (errorCodes.has('TRANSFORMATION_FAILED')) {
      actions.push('Review the transformation logic');
      actions.push('Check if the code structure is supported');
      actions.push('Try a different refactoring approach');
    }

    if (actions.length === 0) {
      actions.push('Review the error details for specific guidance');
      actions.push('Contact support if the issue persists');
    }

    return actions;
  }

  /**
   * Generate a summary of errors and warnings
   */
  private generateSummary(): string {
    const errorCount = this.errors.length;
    const warningCount = this.warnings.length;

    if (errorCount === 0 && warningCount === 0) {
      return 'No errors or warnings';
    }

    const parts: string[] = [];

    if (errorCount > 0) {
      parts.push(`${errorCount} error${errorCount > 1 ? 's' : ''}`);
    }

    if (warningCount > 0) {
      parts.push(`${warningCount} warning${warningCount > 1 ? 's' : ''}`);
    }

    return parts.join(' and ');
  }
}
