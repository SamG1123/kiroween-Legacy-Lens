import {
  CodeSmell,
  RefactoringSuggestion,
  RefactoringPlan,
  Refactoring,
  TransformResult,
  TestResult,
  ValidationResult,
} from '../types';
import { SmellDetector } from '../detectors/SmellDetector';
import { RefactoringSuggester } from '../suggesters/RefactoringSuggester';
import { RefactoringPlanner } from '../planners/RefactoringPlanner';
import { CodeTransformer } from '../transformers/CodeTransformer';
import { SafetyValidator } from '../validators/SafetyValidator';
import { TestRunner } from '../runners/TestRunner';
import { RefactoringConfig, defaultConfig } from '../config';
import { AIRefactoringClient } from '../ai/AIRefactoringClient';
import { ErrorReporter, RefactoringError } from '../utils/ErrorReporter';
import { v4 as uuidv4 } from 'uuid';

/**
 * Progress callback for tracking refactoring operations
 */
export type ProgressCallback = (progress: RefactoringProgress) => void;

/**
 * Progress information for refactoring operations
 */
export interface RefactoringProgress {
  stage: 'detecting' | 'suggesting' | 'planning' | 'validating' | 'testing' | 'applying' | 'complete' | 'error';
  message: string;
  currentStep: number;
  totalSteps: number;
  percentage: number;
}

/**
 * Result of orchestrating a refactoring operation
 */
export interface OrchestrationResult {
  success: boolean;
  appliedRefactorings: Refactoring[];
  failedRefactorings: Refactoring[];
  skippedRefactorings: RefactoringSuggestion[];
  errors: string[];
  warnings: string[];
  detailedErrors?: RefactoringError[];
  detailedWarnings?: RefactoringError[];
  errorReport?: string;
}

/**
 * Orchestrates the entire refactoring pipeline
 * Coordinates smell detection, suggestion, planning, and application
 * Requirements: All
 */
export class RefactoringOrchestrator {
  private detector: SmellDetector;
  private suggester: RefactoringSuggester;
  private planner: RefactoringPlanner;
  private transformer: CodeTransformer;
  private validator: SafetyValidator;
  private testRunner: TestRunner;
  private config: RefactoringConfig;
  private errorReporter: ErrorReporter;
  
  // State management for undo
  private refactoringHistory: Map<string, Refactoring[]> = new Map();
  private codeSnapshots: Map<string, string> = new Map();

  constructor(config: RefactoringConfig = defaultConfig) {
    this.config = config;
    
    const aiClient = config.aiEnabled ? new AIRefactoringClient(config.aiProvider) : undefined;
    
    this.detector = new SmellDetector(config);
    this.suggester = new RefactoringSuggester(config);
    this.planner = new RefactoringPlanner();
    this.transformer = new CodeTransformer(aiClient);
    this.validator = new SafetyValidator();
    this.testRunner = new TestRunner();
    this.errorReporter = new ErrorReporter();
  }

  /**
   * Get the error reporter for detailed error information
   */
  getErrorReporter(): ErrorReporter {
    return this.errorReporter;
  }

  /**
   * Analyze code and generate refactoring suggestions
   * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5
   */
  async analyzeAndSuggest(
    code: string,
    filename: string,
    projectId: string,
    onProgress?: ProgressCallback
  ): Promise<RefactoringSuggestion[]> {
    this.reportProgress(onProgress, 'detecting', 'Detecting code smells...', 1, 3, 10);

    // Detect all code smells
    const smells: CodeSmell[] = [
      ...this.detector.detectLongMethods(code, filename),
      ...this.detector.detectDuplication(code, filename),
      ...this.detector.detectComplexConditionals(code, filename),
      ...this.detector.detectPoorNaming(code, filename),
      ...this.detector.detectSOLIDViolations(code, filename),
    ];

    this.reportProgress(onProgress, 'suggesting', 'Generating refactoring suggestions...', 2, 3, 40);

    // Generate suggestions from smells
    const suggestions = this.suggester.suggestRefactorings(smells);

    this.reportProgress(onProgress, 'planning', 'Planning refactoring order...', 3, 3, 70);

    // Plan the refactorings (orders them by priority and dependencies)
    const plan = this.planner.planRefactorings(suggestions);

    this.reportProgress(onProgress, 'complete', 'Analysis complete', 3, 3, 100);

    return plan.refactorings;
  }

  /**
   * Apply a single refactoring with safety checks and rollback capability
   * Requirements: 3.1-3.5, 4.1-4.5, 5.1-5.5, 6.1-6.5, 8.1, 8.2, 8.3, 8.4, 8.5
   */
  async applyRefactoring(
    code: string,
    refactoring: RefactoringSuggestion,
    projectId: string,
    codebasePath: string,
    onProgress?: ProgressCallback
  ): Promise<{ success: boolean; refactoring: Refactoring; transformedCode?: string; error?: string }> {
    // Clear previous errors
    this.errorReporter.clear();

    // Save snapshot for potential rollback
    const snapshotId = uuidv4();
    this.codeSnapshots.set(snapshotId, code);

    try {
      this.reportProgress(onProgress, 'validating', 'Validating refactoring safety...', 1, 4, 10);

      // Validate the refactoring
      const validation = this.validator.validateRefactoring(
        refactoring.beforeCode,
        refactoring.afterCode
      );

      if (!validation.safe) {
        const error = `Refactoring validation failed: ${validation.issues.map(i => i.description).join(', ')}`;
        
        this.errorReporter.reportError('VALIDATION_FAILED', error, {
          details: 'The refactoring failed safety validation checks',
          context: {
            refactoringType: refactoring.type,
            refactoringId: refactoring.id,
            issues: validation.issues,
          },
          recoverySuggestions: [
            'Review the validation issues',
            'Fix the issues before applying the refactoring',
            'Try a different refactoring approach',
          ],
        });

        return {
          success: false,
          refactoring: this.createRefactoringRecord(projectId, refactoring, 'failed', false),
          error,
        };
      }

      this.reportProgress(onProgress, 'testing', 'Running tests before refactoring...', 2, 4, 30);

      // Run tests before refactoring
      const testsBefore = await this.testRunner.runTests(codebasePath);
      
      // Check if tests exist
      if (testsBefore.passed === 0 && testsBefore.failed === 0) {
        const warning = this.testRunner.generateNoTestsWarning();
        console.warn(warning);
        
        this.errorReporter.reportWarning('NO_TESTS_FOUND', warning, {
          details: 'No tests were found in the codebase',
          context: {
            codebasePath,
            refactoringType: refactoring.type,
          },
          recoverySuggestions: [
            'Add tests to verify behavior preservation',
            'Manually verify the refactoring is correct',
            'Use safe mode to only suggest refactorings without applying them',
          ],
        });
        
        // In safe mode, don't apply refactorings without tests
        if (this.config.safeMode) {
          const error = 'Safe mode: Cannot apply refactoring without tests';
          
          this.errorReporter.reportError('UNSAFE_REFACTORING', error, {
            details: 'Safe mode is enabled and no tests were found',
            context: {
              safeMode: this.config.safeMode,
              refactoringType: refactoring.type,
            },
            recoverySuggestions: [
              'Add tests to the codebase',
              'Disable safe mode if you want to proceed without tests',
              'Manually verify the refactoring is correct',
            ],
          });

          return {
            success: false,
            refactoring: this.createRefactoringRecord(projectId, refactoring, 'failed', false),
            error,
          };
        }
      }

      this.reportProgress(onProgress, 'applying', 'Applying refactoring...', 3, 4, 50);

      // Apply the transformation
      const transformResult = await this.applyTransformation(code, refactoring);

      if (!transformResult.success) {
        const error = transformResult.error || 'Transformation failed';
        
        this.errorReporter.reportError('TRANSFORMATION_FAILED', error, {
          details: 'The code transformation failed to complete',
          context: {
            refactoringType: refactoring.type,
            refactoringId: refactoring.id,
          },
          recoverySuggestions: [
            'Review the transformation logic',
            'Check if the code structure is supported',
            'Try a different refactoring approach',
          ],
        });

        return {
          success: false,
          refactoring: this.createRefactoringRecord(projectId, refactoring, 'failed', false),
          error,
        };
      }

      this.reportProgress(onProgress, 'testing', 'Running tests after refactoring...', 4, 4, 70);

      // Run tests after refactoring
      const testsAfter = await this.testRunner.runTests(codebasePath);

      // Check if tests still pass
      if (this.testRunner.shouldRevert(testsBefore, testsAfter)) {
        this.reportProgress(onProgress, 'error', 'Tests failed, reverting changes...', 4, 4, 80);
        
        const error = 'Tests failed after refactoring, changes reverted';
        
        this.errorReporter.reportError('TEST_FAILURE', error, {
          details: 'Tests that were passing before the refactoring are now failing',
          context: {
            testsBefore: {
              passed: testsBefore.passed,
              failed: testsBefore.failed,
            },
            testsAfter: {
              passed: testsAfter.passed,
              failed: testsAfter.failed,
            },
            refactoringType: refactoring.type,
            refactoringId: refactoring.id,
          },
          recoverySuggestions: [
            'Review test failures to identify behavior changes',
            'Update tests if the behavior change is intentional',
            'Modify the refactoring to preserve behavior',
          ],
        });
        
        // Automatic reversion
        const revertedCode = this.codeSnapshots.get(snapshotId)!;
        this.codeSnapshots.delete(snapshotId);
        
        return {
          success: false,
          refactoring: this.createRefactoringRecord(projectId, refactoring, 'reverted', false),
          transformedCode: revertedCode,
          error,
        };
      }

      this.reportProgress(onProgress, 'complete', 'Refactoring applied successfully', 4, 4, 100);

      // Create refactoring record
      const refactoringRecord = this.createRefactoringRecord(
        projectId,
        refactoring,
        'applied',
        true,
        transformResult.transformedCode
      );

      // Store in history for undo
      if (!this.refactoringHistory.has(projectId)) {
        this.refactoringHistory.set(projectId, []);
      }
      this.refactoringHistory.get(projectId)!.push(refactoringRecord);

      // Clean up snapshot
      this.codeSnapshots.delete(snapshotId);

      return {
        success: true,
        refactoring: refactoringRecord,
        transformedCode: transformResult.transformedCode,
      };
    } catch (error) {
      // Handle unexpected errors
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      this.errorReporter.reportError('UNKNOWN_ERROR', errorMessage, {
        details: 'An unexpected error occurred during refactoring',
        context: {
          refactoringType: refactoring.type,
          refactoringId: refactoring.id,
          error: error instanceof Error ? error.stack : String(error),
        },
        recoverySuggestions: [
          'Review the error details',
          'Check if the code structure is supported',
          'Contact support if the issue persists',
        ],
      });

      // Clean up snapshot
      this.codeSnapshots.delete(snapshotId);

      return {
        success: false,
        refactoring: this.createRefactoringRecord(projectId, refactoring, 'failed', false),
        error: errorMessage,
      };
    }
  }

  /**
   * Apply multiple refactorings atomically
   * Requirements: 8.1, 8.2, 8.5
   */
  async applyRefactorings(
    code: string,
    refactorings: RefactoringSuggestion[],
    projectId: string,
    codebasePath: string,
    onProgress?: ProgressCallback
  ): Promise<OrchestrationResult> {
    // Clear previous errors
    this.errorReporter.clear();

    const result: OrchestrationResult = {
      success: true,
      appliedRefactorings: [],
      failedRefactorings: [],
      skippedRefactorings: [],
      errors: [],
      warnings: [],
    };

    // Save initial snapshot
    const initialSnapshot = code;
    let currentCode = code;

    try {
      // Plan the refactorings
      const plan = this.planner.planRefactorings(refactorings);
      const totalSteps = plan.refactorings.length;

      // Apply each refactoring in order
      for (let i = 0; i < plan.refactorings.length; i++) {
        const refactoring = plan.refactorings[i];
        
        this.reportProgress(
          onProgress,
          'applying',
          `Applying refactoring ${i + 1}/${totalSteps}: ${refactoring.title}`,
          i + 1,
          totalSteps,
          (i / totalSteps) * 100
        );

        const applyResult = await this.applyRefactoring(
          currentCode,
          refactoring,
          projectId,
          codebasePath,
          onProgress
        );

        if (applyResult.success) {
          result.appliedRefactorings.push(applyResult.refactoring);
          currentCode = applyResult.transformedCode!;
        } else {
          result.failedRefactorings.push(applyResult.refactoring);
          result.errors.push(applyResult.error || 'Unknown error');
          
          // If atomic mode, rollback all changes
          if (this.config.atomicRefactoring) {
            this.reportProgress(
              onProgress,
              'error',
              'Refactoring failed, rolling back all changes...',
              i + 1,
              totalSteps,
              100
            );
            
            this.errorReporter.reportError('ROLLBACK_FAILED', 
              'Atomic refactoring mode: Rolling back all changes due to failure', {
              details: `Refactoring ${i + 1} of ${totalSteps} failed, rolling back all ${result.appliedRefactorings.length} applied refactorings`,
              context: {
                failedRefactoring: refactoring.id,
                appliedCount: result.appliedRefactorings.length,
                atomicMode: this.config.atomicRefactoring,
              },
              recoverySuggestions: [
                'Review the failed refactoring',
                'Fix the issue and try again',
                'Disable atomic mode to apply refactorings individually',
              ],
            });
            
            // Rollback to initial state
            currentCode = initialSnapshot;
            result.success = false;
            result.warnings.push('All refactorings rolled back due to failure');
            break;
          } else {
            // Continue with remaining refactorings
            result.skippedRefactorings.push(refactoring);
          }
        }
      }

      this.reportProgress(onProgress, 'complete', 'Refactoring complete', totalSteps, totalSteps, 100);

      // Add detailed error information to result
      result.detailedErrors = this.errorReporter.getErrors();
      result.detailedWarnings = this.errorReporter.getWarnings();
      result.errorReport = this.errorReporter.formatAllErrors();

      return result;
    } catch (error) {
      // Handle unexpected errors
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      this.errorReporter.reportError('UNKNOWN_ERROR', errorMessage, {
        details: 'An unexpected error occurred during batch refactoring',
        context: {
          projectId,
          refactoringCount: refactorings.length,
          error: error instanceof Error ? error.stack : String(error),
        },
        recoverySuggestions: [
          'Review the error details',
          'Try applying refactorings one at a time',
          'Contact support if the issue persists',
        ],
      });

      result.success = false;
      result.errors.push(errorMessage);
      result.detailedErrors = this.errorReporter.getErrors();
      result.detailedWarnings = this.errorReporter.getWarnings();
      result.errorReport = this.errorReporter.formatAllErrors();

      return result;
    }
  }

  /**
   * Undo the last applied refactoring for a project
   * Requirements: 8.5
   */
  async undoLastRefactoring(projectId: string): Promise<{ success: boolean; refactoring?: Refactoring; error?: string }> {
    const history = this.refactoringHistory.get(projectId);
    
    if (!history || history.length === 0) {
      return {
        success: false,
        error: 'No refactorings to undo',
      };
    }

    // Get the last applied refactoring
    const lastRefactoring = history[history.length - 1];
    
    if (lastRefactoring.status !== 'applied') {
      return {
        success: false,
        error: 'Last refactoring was not successfully applied',
      };
    }

    // Mark as reverted
    lastRefactoring.status = 'reverted';
    lastRefactoring.revertedAt = new Date();

    // Remove from history
    history.pop();

    return {
      success: true,
      refactoring: lastRefactoring,
    };
  }

  /**
   * Undo all refactorings for a project
   * Requirements: 8.5
   */
  async undoAllRefactorings(projectId: string): Promise<{ success: boolean; count: number }> {
    const history = this.refactoringHistory.get(projectId);
    
    if (!history || history.length === 0) {
      return {
        success: true,
        count: 0,
      };
    }

    const count = history.length;

    // Mark all as reverted
    for (const refactoring of history) {
      if (refactoring.status === 'applied') {
        refactoring.status = 'reverted';
        refactoring.revertedAt = new Date();
      }
    }

    // Clear history
    this.refactoringHistory.delete(projectId);

    return {
      success: true,
      count,
    };
  }

  /**
   * Get refactoring history for a project
   */
  getRefactoringHistory(projectId: string): Refactoring[] {
    return this.refactoringHistory.get(projectId) || [];
  }

  /**
   * Clear refactoring history for a project
   */
  clearHistory(projectId: string): void {
    this.refactoringHistory.delete(projectId);
    
    // Clean up any snapshots
    for (const [key, _] of this.codeSnapshots.entries()) {
      if (key.startsWith(projectId)) {
        this.codeSnapshots.delete(key);
      }
    }
  }

  // Private helper methods

  /**
   * Apply the actual transformation based on refactoring type
   */
  private async applyTransformation(
    code: string,
    refactoring: RefactoringSuggestion
  ): Promise<TransformResult> {
    // For now, use the afterCode from the suggestion
    // In a full implementation, this would call the appropriate transformer
    return {
      success: true,
      transformedCode: refactoring.afterCode,
      changes: [],
    };
  }

  /**
   * Create a refactoring record
   */
  private createRefactoringRecord(
    projectId: string,
    suggestion: RefactoringSuggestion,
    status: 'suggested' | 'applied' | 'reverted' | 'failed',
    testsPassed: boolean,
    afterCode?: string
  ): Refactoring {
    return {
      id: suggestion.id,
      projectId,
      type: suggestion.type,
      status,
      beforeCode: suggestion.beforeCode,
      afterCode: afterCode || suggestion.afterCode,
      diff: suggestion.diff,
      testsPassed,
      appliedAt: status === 'applied' ? new Date() : undefined,
      revertedAt: status === 'reverted' ? new Date() : undefined,
    };
  }

  /**
   * Report progress to callback
   */
  private reportProgress(
    callback: ProgressCallback | undefined,
    stage: RefactoringProgress['stage'],
    message: string,
    currentStep: number,
    totalSteps: number,
    percentage: number
  ): void {
    if (callback) {
      callback({
        stage,
        message,
        currentStep,
        totalSteps,
        percentage,
      });
    }
  }
}
