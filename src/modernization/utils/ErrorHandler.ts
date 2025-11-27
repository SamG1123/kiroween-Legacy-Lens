/**
 * Error handling utilities for graceful degradation
 */

export interface ErrorContext {
  operation: string;
  component: string;
  packageName?: string;
  details?: Record<string, any>;
}

export interface ErrorReport {
  message: string;
  severity: 'error' | 'warning' | 'info';
  context: ErrorContext;
  timestamp: Date;
  recoverable: boolean;
  fallbackUsed?: string;
}

export class ModernizationError extends Error {
  constructor(
    message: string,
    public context: ErrorContext,
    public recoverable: boolean = true,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'ModernizationError';
  }
}

/**
 * Error handler with graceful degradation support
 */
export class ErrorHandler {
  private errors: ErrorReport[] = [];
  private warnings: ErrorReport[] = [];

  /**
   * Handle an error with graceful degradation
   */
  handleError(error: Error, context: ErrorContext, fallback?: string): ErrorReport {
    const report: ErrorReport = {
      message: error.message,
      severity: 'error',
      context,
      timestamp: new Date(),
      recoverable: this.isRecoverable(error),
      fallbackUsed: fallback,
    };

    this.errors.push(report);
    console.error(`[${context.component}] ${context.operation} failed:`, error.message);

    if (fallback) {
      console.info(`[${context.component}] Using fallback: ${fallback}`);
    }

    return report;
  }

  /**
   * Handle a warning (non-critical error)
   */
  handleWarning(message: string, context: ErrorContext): ErrorReport {
    const report: ErrorReport = {
      message,
      severity: 'warning',
      context,
      timestamp: new Date(),
      recoverable: true,
    };

    this.warnings.push(report);
    console.warn(`[${context.component}] ${context.operation}: ${message}`);

    return report;
  }

  /**
   * Check if an error is recoverable
   */
  private isRecoverable(error: Error): boolean {
    // Network errors are generally recoverable
    const networkErrors = ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'AbortError'];
    if (networkErrors.includes((error as any).code || error.name)) {
      return true;
    }

    // Rate limiting is recoverable
    if (error.message.includes('429') || error.message.includes('rate limit')) {
      return true;
    }

    // Temporary server errors are recoverable
    if (error.message.match(/50[234]/)) {
      return true;
    }

    // Timeout errors are recoverable
    if (error.message.toLowerCase().includes('timeout')) {
      return true;
    }

    return false;
  }

  /**
   * Get all error reports
   */
  getErrors(): ErrorReport[] {
    return [...this.errors];
  }

  /**
   * Get all warning reports
   */
  getWarnings(): ErrorReport[] {
    return [...this.warnings];
  }

  /**
   * Get all reports (errors and warnings)
   */
  getAllReports(): ErrorReport[] {
    return [...this.errors, ...this.warnings].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    );
  }

  /**
   * Check if there are any critical errors
   */
  hasCriticalErrors(): boolean {
    return this.errors.some((e) => !e.recoverable);
  }

  /**
   * Clear all error reports
   */
  clear(): void {
    this.errors = [];
    this.warnings = [];
  }

  /**
   * Generate a summary of errors for reporting
   */
  generateSummary(): string {
    if (this.errors.length === 0 && this.warnings.length === 0) {
      return 'No errors or warnings';
    }

    const lines: string[] = [];

    if (this.errors.length > 0) {
      lines.push(`Errors (${this.errors.length}):`);
      this.errors.forEach((error) => {
        lines.push(
          `  - [${error.context.component}] ${error.context.operation}: ${error.message}`
        );
        if (error.fallbackUsed) {
          lines.push(`    Fallback: ${error.fallbackUsed}`);
        }
      });
    }

    if (this.warnings.length > 0) {
      lines.push(`Warnings (${this.warnings.length}):`);
      this.warnings.forEach((warning) => {
        lines.push(
          `  - [${warning.context.component}] ${warning.context.operation}: ${warning.message}`
        );
      });
    }

    return lines.join('\n');
  }
}

/**
 * Global error handler instance
 */
let globalErrorHandler: ErrorHandler | null = null;

export function getErrorHandler(): ErrorHandler {
  if (!globalErrorHandler) {
    globalErrorHandler = new ErrorHandler();
  }
  return globalErrorHandler;
}

export function resetErrorHandler(): void {
  globalErrorHandler = new ErrorHandler();
}
