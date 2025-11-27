import { ValidationResult, ValidationIssue } from '../types';
import { parseCode, findVariableReferences } from '../utils/astUtils';
import { ErrorReporter } from '../utils/ErrorReporter';
import traverse from '@babel/traverse';
import * as t from '@babel/types';

/**
 * Validates that refactorings are safe and behavior-preserving
 * Requirements: 8.1, 8.3, 8.4
 */
export class SafetyValidator {
  private errorReporter: ErrorReporter;

  constructor() {
    this.errorReporter = new ErrorReporter();
  }

  /**
   * Get the error reporter for detailed error information
   */
  getErrorReporter(): ErrorReporter {
    return this.errorReporter;
  }
  /**
   * Validate a refactoring by checking syntax, naming conflicts, and behavior preservation
   * Requirement 8.4: Only suggest refactorings that are known to be behavior-preserving
   */
  validateRefactoring(original: string, refactored: string): ValidationResult {
    // Clear previous errors
    this.errorReporter.clear();

    const issues: ValidationIssue[] = [];
    const warnings: string[] = [];

    // Check syntax of refactored code
    if (!this.checkSyntax(refactored)) {
      const issue: ValidationIssue = {
        type: 'syntax',
        description: 'Refactored code contains syntax errors',
      };
      issues.push(issue);

      this.errorReporter.reportError('SYNTAX_ERROR', issue.description, {
        details: 'The refactored code could not be parsed. This indicates invalid syntax.',
        recoverySuggestions: [
          'Review the transformation logic for correctness',
          'Check if the refactoring is appropriate for this code structure',
          'Verify that all brackets, parentheses, and quotes are balanced',
        ],
      });
    }

    // Check for potential naming conflicts
    const namingIssues = this.detectNamingConflicts(refactored);
    issues.push(...namingIssues);

    // Report naming conflicts to error reporter
    namingIssues.forEach(issue => {
      this.errorReporter.reportError('NAMING_CONFLICT', issue.description, {
        details: 'A naming conflict was detected in the refactored code',
        location: issue.location ? {
          file: issue.location.file,
          line: issue.location.startLine,
          column: issue.location.startColumn,
        } : undefined,
        recoverySuggestions: [
          'Choose a different name that does not conflict with existing identifiers',
          'Review the scope of the renamed identifier',
          'Consider using a more specific name to avoid conflicts',
        ],
      });
    });

    // Warn about behavior preservation (requires tests to verify)
    if (issues.length === 0) {
      warnings.push('Behavior preservation should be verified by running tests');
      
      this.errorReporter.reportWarning('NO_TESTS_FOUND', 
        'Behavior preservation cannot be guaranteed without tests', {
        details: 'The refactoring appears safe structurally, but behavior preservation must be verified by running tests',
        recoverySuggestions: [
          'Add tests to verify behavior preservation',
          'Manually verify the refactoring is correct',
          'Use safe mode to only suggest refactorings without applying them',
        ],
      });
    }

    return {
      safe: issues.length === 0,
      issues,
      warnings,
    };
  }

  /**
   * Check if code has valid syntax
   * Requirement 8.3: Warn when safety cannot be guaranteed
   */
  checkSyntax(code: string): boolean {
    try {
      // Try parsing as TypeScript first
      parseCode(code, true);
      return true;
    } catch (tsError) {
      try {
        // Fall back to JavaScript
        parseCode(code, false);
        return true;
      } catch (jsError) {
        return false;
      }
    }
  }

  /**
   * Check if a new name would create conflicts in the code
   * Requirement 8.3: Warn when safety cannot be guaranteed
   */
  checkNamingConflicts(code: string, newName: string): boolean {
    try {
      const ast = parseCode(code, true);
      
      // Check if the new name already exists in any scope
      let hasConflict = false;
      
      traverse(ast, {
        FunctionDeclaration(path) {
          if (path.node.id && path.node.id.name === newName) {
            hasConflict = true;
            path.stop();
          }
        },
        VariableDeclarator(path) {
          if (t.isIdentifier(path.node.id) && path.node.id.name === newName) {
            hasConflict = true;
            path.stop();
          }
        },
        ClassDeclaration(path) {
          if (path.node.id && path.node.id.name === newName) {
            hasConflict = true;
            path.stop();
          }
        },
      });
      
      return hasConflict;
    } catch (error) {
      // If we can't parse, assume there might be conflicts
      return true;
    }
  }

  /**
   * Detect all naming conflicts in code
   */
  private detectNamingConflicts(code: string): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    
    try {
      const ast = parseCode(code, true);
      const scopeNames = new Map<string, Set<string>>();
      
      // Track all identifiers in each scope
      traverse(ast, {
        Scope(path) {
          const scopeId = path.scope.uid.toString();
          if (!scopeNames.has(scopeId)) {
            scopeNames.set(scopeId, new Set());
          }
          
          const names = scopeNames.get(scopeId)!;
          
          // Check for duplicate declarations in the same scope
          Object.keys(path.scope.bindings).forEach((name) => {
            if (names.has(name)) {
              issues.push({
                type: 'naming_conflict',
                description: `Duplicate identifier '${name}' in the same scope`,
              });
            }
            names.add(name);
          });
        },
      });
    } catch (error) {
      // Syntax errors are handled separately
    }
    
    return issues;
  }

  /**
   * Check if behavior is preserved between original and refactored code
   * This is a heuristic check - actual behavior preservation requires running tests
   * Requirement 8.1: Run existing tests to verify behavior is preserved
   */
  async checkBehaviorPreservation(original: string, refactored: string): Promise<boolean> {
    // This is a placeholder for structural comparison
    // Real behavior preservation must be verified by running tests (handled by TestRunner)
    
    try {
      const originalAst = parseCode(original, true);
      const refactoredAst = parseCode(refactored, true);
      
      // Basic structural checks
      const originalFunctions = this.countNodes(originalAst, 'FunctionDeclaration');
      const refactoredFunctions = this.countNodes(refactoredAst, 'FunctionDeclaration');
      
      const originalClasses = this.countNodes(originalAst, 'ClassDeclaration');
      const refactoredClasses = this.countNodes(refactoredAst, 'ClassDeclaration');
      
      // If major structural changes occurred, flag for test verification
      const majorChanges = 
        Math.abs(originalFunctions - refactoredFunctions) > 1 ||
        Math.abs(originalClasses - refactoredClasses) > 1;
      
      // Return false if major changes detected (requires test verification)
      return !majorChanges;
    } catch (error) {
      // If we can't parse, assume behavior might not be preserved
      return false;
    }
  }

  /**
   * Count nodes of a specific type in an AST
   */
  private countNodes(ast: t.File, nodeType: string): number {
    let count = 0;
    
    traverse(ast, {
      enter(path) {
        if (path.node.type === nodeType) {
          count++;
        }
      },
    });
    
    return count;
  }
}
