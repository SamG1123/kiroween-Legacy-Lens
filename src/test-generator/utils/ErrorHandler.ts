// Error Handler for Test Generator
// Provides graceful degradation, detailed error reporting, and recovery strategies

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum ErrorCategory {
  ANALYSIS = 'analysis',
  GENERATION = 'generation',
  VALIDATION = 'validation',
  AI_API = 'ai_api',
  COMPILATION = 'compilation',
  NETWORK = 'network',
  CONFIGURATION = 'configuration',
}

export interface TestGeneratorError {
  category: ErrorCategory;
  severity: ErrorSeverity;
  message: string;
  originalError?: Error;
  context?: Record<string, any>;
  timestamp: Date;
  recoverable: boolean;
  suggestedAction?: string;
}

export interface ErrorReport {
  errors: TestGeneratorError[];
  warnings: TestGeneratorError[];
  summary: string;
  totalErrors: number;
  criticalErrors: number;
  recoverableErrors: number;
}

export class TestGeneratorErrorHandler {
  private errors: TestGeneratorError[] = [];
  private warnings: TestGeneratorError[] = [];

  /**
   * Records an error with context and categorization
   */
  recordError(
    category: ErrorCategory,
    severity: ErrorSeverity,
    message: string,
    originalError?: Error,
    context?: Record<string, any>
  ): TestGeneratorError {
    const error: TestGeneratorError = {
      category,
      severity,
      message,
      originalError,
      context,
      timestamp: new Date(),
      recoverable: this.isRecoverable(category, severity),
      suggestedAction: this.getSuggestedAction(category, severity, message),
    };

    if (severity === ErrorSeverity.LOW || severity === ErrorSeverity.MEDIUM) {
      this.warnings.push(error);
    } else {
      this.errors.push(error);
    }

    return error;
  }

  /**
   * Records a warning
   */
  recordWarning(
    category: ErrorCategory,
    message: string,
    context?: Record<string, any>
  ): TestGeneratorError {
    return this.recordError(category, ErrorSeverity.LOW, message, undefined, context);
  }

  /**
   * Generates a comprehensive error report
   */
  generateReport(): ErrorReport {
    const criticalErrors = this.errors.filter(e => e.severity === ErrorSeverity.CRITICAL).length;
    const recoverableErrors = this.errors.filter(e => e.recoverable).length;

    return {
      errors: [...this.errors],
      warnings: [...this.warnings],
      summary: this.generateSummary(),
      totalErrors: this.errors.length,
      criticalErrors,
      recoverableErrors,
    };
  }

  /**
   * Clears all recorded errors and warnings
   */
  clear(): void {
    this.errors = [];
    this.warnings = [];
  }

  /**
   * Gets all errors of a specific category
   */
  getErrorsByCategory(category: ErrorCategory): TestGeneratorError[] {
    return this.errors.filter(e => e.category === category);
  }

  /**
   * Gets all critical errors
   */
  getCriticalErrors(): TestGeneratorError[] {
    return this.errors.filter(e => e.severity === ErrorSeverity.CRITICAL);
  }

  /**
   * Checks if there are any critical errors
   */
  hasCriticalErrors(): boolean {
    return this.getCriticalErrors().length > 0;
  }

  /**
   * Checks if there are any errors
   */
  hasErrors(): boolean {
    return this.errors.length > 0;
  }

  /**
   * Determines if an error is recoverable based on category and severity
   */
  private isRecoverable(category: ErrorCategory, severity: ErrorSeverity): boolean {
    // Critical errors are generally not recoverable
    if (severity === ErrorSeverity.CRITICAL) {
      return false;
    }

    // Some categories are more recoverable than others
    switch (category) {
      case ErrorCategory.AI_API:
        return severity !== ErrorSeverity.HIGH; // Can retry API calls
      case ErrorCategory.VALIDATION:
        return true; // Can often auto-fix validation issues
      case ErrorCategory.GENERATION:
        return severity === ErrorSeverity.LOW || severity === ErrorSeverity.MEDIUM;
      case ErrorCategory.NETWORK:
        return true; // Can retry network operations
      case ErrorCategory.ANALYSIS:
        return severity === ErrorSeverity.LOW;
      case ErrorCategory.COMPILATION:
        return severity !== ErrorSeverity.HIGH; // Can attempt fixes
      case ErrorCategory.CONFIGURATION:
        return false; // Configuration errors need manual intervention
      default:
        return false;
    }
  }

  /**
   * Provides suggested actions for different error types
   */
  private getSuggestedAction(
    category: ErrorCategory,
    severity: ErrorSeverity,
    message: string
  ): string {
    const lowerMessage = message.toLowerCase();

    // AI API specific suggestions
    if (category === ErrorCategory.AI_API) {
      if (lowerMessage.includes('rate limit')) {
        return 'Wait and retry with exponential backoff. Consider reducing request frequency.';
      }
      if (lowerMessage.includes('api key') || lowerMessage.includes('authentication')) {
        return 'Verify API key is set correctly in environment variables.';
      }
      if (lowerMessage.includes('timeout')) {
        return 'Retry the request. Consider increasing timeout duration.';
      }
      return 'Retry the AI API call with exponential backoff.';
    }

    // Validation specific suggestions
    if (category === ErrorCategory.VALIDATION) {
      if (lowerMessage.includes('import') || lowerMessage.includes('module')) {
        return 'Check that all required dependencies are installed and imports are correct.';
      }
      if (lowerMessage.includes('syntax')) {
        return 'Review generated code for syntax errors. Apply automatic fixes if available.';
      }
      if (lowerMessage.includes('type')) {
        return 'Add type assertions or fix type mismatches in generated code.';
      }
      return 'Apply automatic validation fixes or regenerate the test code.';
    }

    // Generation specific suggestions
    if (category === ErrorCategory.GENERATION) {
      if (lowerMessage.includes('empty') || lowerMessage.includes('no test')) {
        return 'Simplify the test generation prompt or try with different parameters.';
      }
      return 'Retry test generation with adjusted parameters or fallback to simpler templates.';
    }

    // Network specific suggestions
    if (category === ErrorCategory.NETWORK) {
      return 'Check network connectivity and retry the operation.';
    }

    // Compilation specific suggestions
    if (category === ErrorCategory.COMPILATION) {
      return 'Review compilation errors and apply suggested fixes. May need manual intervention.';
    }

    // Configuration specific suggestions
    if (category === ErrorCategory.CONFIGURATION) {
      return 'Review configuration settings and ensure all required values are set correctly.';
    }

    // Analysis specific suggestions
    if (category === ErrorCategory.ANALYSIS) {
      if (lowerMessage.includes('parse') || lowerMessage.includes('syntax')) {
        return 'Ensure the source code is valid and parseable. Check for syntax errors.';
      }
      return 'Verify the code structure is supported and try with simpler code patterns.';
    }

    return 'Review the error details and take appropriate corrective action.';
  }

  /**
   * Generates a human-readable summary of all errors
   */
  private generateSummary(): string {
    if (this.errors.length === 0 && this.warnings.length === 0) {
      return 'No errors or warnings recorded.';
    }

    const parts: string[] = [];

    if (this.errors.length > 0) {
      const critical = this.errors.filter(e => e.severity === ErrorSeverity.CRITICAL).length;
      const high = this.errors.filter(e => e.severity === ErrorSeverity.HIGH).length;
      
      parts.push(`${this.errors.length} error(s) recorded`);
      
      if (critical > 0) {
        parts.push(`${critical} critical`);
      }
      if (high > 0) {
        parts.push(`${high} high severity`);
      }
    }

    if (this.warnings.length > 0) {
      parts.push(`${this.warnings.length} warning(s)`);
    }

    const categorySummary = this.getCategorySummary();
    if (categorySummary) {
      parts.push(categorySummary);
    }

    return parts.join(', ') + '.';
  }

  /**
   * Gets a summary of errors by category
   */
  private getCategorySummary(): string {
    const categories = new Map<ErrorCategory, number>();
    
    for (const error of this.errors) {
      categories.set(error.category, (categories.get(error.category) || 0) + 1);
    }

    if (categories.size === 0) {
      return '';
    }

    const parts: string[] = [];
    for (const [category, count] of categories.entries()) {
      parts.push(`${count} ${category}`);
    }

    return `Categories: ${parts.join(', ')}`;
  }
}
