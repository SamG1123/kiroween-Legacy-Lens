// Test Generation Orchestrator
// Coordinates analysis, strategy, generation, and validation

import { CodeAnalyzer } from '../analyzers/CodeAnalyzer';
import { CoverageAnalyzer } from '../analyzers/CoverageAnalyzer';
import { TestStrategyPlanner } from '../generators/TestStrategyPlanner';
import { TestCaseGenerator } from '../generators/TestCaseGenerator';
import { MockGenerator } from '../generators/MockGenerator';
import { TestWriter } from '../generators/TestWriter';
import { TestValidator } from '../validators/TestValidator';
import { AITestGenerationClient } from '../ai/AITestGenerationClient';
import {
  TestGeneratorErrorHandler,
  ErrorCategory,
  ErrorSeverity,
  PartialResultManager,
  RetryStrategy,
} from '../utils';
import {
  FunctionInfo,
  ClassInfo,
  TestSuite,
  TestFramework,
  CodeStyle,
  ValidationResult,
} from '../types';

export interface TestGenerationOptions {
  framework: TestFramework;
  language: string;
  codeStyle?: CodeStyle;
  maxRetries?: number;
  enableProgressTracking?: boolean;
}

export interface TestGenerationProgress {
  stage: 'analyzing' | 'planning' | 'generating' | 'validating' | 'complete' | 'failed';
  currentStep: string;
  progress: number; // 0-100
  errors: string[];
}

export interface TestGenerationResult {
  success: boolean;
  testSuite?: TestSuite;
  errors: string[];
  warnings: string[];
  progress: TestGenerationProgress[];
}

export class TestGenerationOrchestrator {
  private codeAnalyzer: CodeAnalyzer;
  private coverageAnalyzer: CoverageAnalyzer;
  private strategyPlanner: TestStrategyPlanner;
  private testCaseGenerator: TestCaseGenerator;
  private mockGenerator: MockGenerator;
  private testWriter: TestWriter;
  private testValidator: TestValidator;
  private progressHistory: TestGenerationProgress[];
  private errorHandler: TestGeneratorErrorHandler;
  private partialResultManager: PartialResultManager;
  private retryStrategy: RetryStrategy;

  constructor(aiClient: AITestGenerationClient) {
    this.codeAnalyzer = new CodeAnalyzer();
    this.coverageAnalyzer = new CoverageAnalyzer();
    this.strategyPlanner = new TestStrategyPlanner();
    this.testCaseGenerator = new TestCaseGenerator(aiClient);
    this.mockGenerator = new MockGenerator();
    this.testWriter = new TestWriter();
    this.testValidator = new TestValidator();
    this.progressHistory = [];
    this.errorHandler = new TestGeneratorErrorHandler();
    this.partialResultManager = new PartialResultManager();
    this.retryStrategy = new RetryStrategy();
  }

  /**
   * Generates a complete test suite for a function
   * Coordinates all components with retry logic and progress tracking
   */
  async generateTestsForFunction(
    func: FunctionInfo,
    projectId: string,
    options: TestGenerationOptions
  ): Promise<TestGenerationResult> {
    const maxRetries = options.maxRetries || 3;
    const suiteId = this.generateId();
    
    this.progressHistory = [];
    this.errorHandler.clear();
    
    // Initialize partial result tracking
    const partial = this.partialResultManager.initialize(
      suiteId,
      projectId,
      func.location.file,
      options.framework
    );
    
    try {
      // Stage 1: Analysis
      this.updateProgress('analyzing', 'Analyzing function structure', 10);
      this.partialResultManager.updateStage(suiteId, 'analysis');
      
      const analysis = await this.retryStrategy.executeWithRetry(
        () => Promise.resolve(this.codeAnalyzer.analyzeFunction(func)),
        { maxAttempts: 2 }
      );
      
      if (!analysis.success || !analysis.result) {
        this.errorHandler.recordError(
          ErrorCategory.ANALYSIS,
          ErrorSeverity.CRITICAL,
          'Failed to analyze function',
          analysis.error
        );
        throw new Error('Function analysis failed');
      }
      
      // Stage 2: Strategy Planning
      this.updateProgress('planning', 'Planning test strategy', 30);
      this.partialResultManager.updateStage(suiteId, 'planning');
      
      const strategy = this.strategyPlanner.planFunctionTests(analysis.result);
      
      // Stage 3: Test Case Generation (with retry and graceful degradation)
      this.updateProgress('generating', 'Generating test cases', 50);
      this.partialResultManager.updateStage(suiteId, 'generation');
      
      const testCases = await this.generateTestCasesWithFallback(
        analysis.result,
        suiteId,
        maxRetries
      );
      
      if (testCases.length === 0) {
        this.errorHandler.recordError(
          ErrorCategory.GENERATION,
          ErrorSeverity.HIGH,
          'No test cases could be generated'
        );
      }
      
      // Update strategy with generated test cases
      strategy.testCases = testCases;
      this.partialResultManager.addCompletedTestCases(suiteId, testCases);
      
      // Stage 4: Mock Generation
      this.updateProgress('generating', 'Generating mocks', 60);
      const mocks = await this.generateMocksWithFallback(analysis.result.dependencies, suiteId);
      for (const mock of mocks) {
        this.partialResultManager.addCompletedMock(suiteId, mock);
      }
      
      // Stage 5: Test Writing
      this.updateProgress('generating', 'Writing test code', 70);
      let testCode = this.testWriter.writeTestSuite(strategy, options.framework);
      
      // Apply code style if provided
      if (options.codeStyle) {
        testCode = this.testWriter.formatTest(testCode, options.codeStyle);
      }
      
      this.partialResultManager.updatePartialTestCode(suiteId, testCode);
      
      // Stage 6: Validation (with retry and auto-fix)
      this.updateProgress('validating', 'Validating test code', 80);
      this.partialResultManager.updateStage(suiteId, 'validation');
      
      const validationResult = await this.validateAndFixTestCode(
        testCode,
        options.language,
        maxRetries
      );
      
      testCode = validationResult.fixedCode;
      this.partialResultManager.updatePartialTestCode(suiteId, testCode);
      
      // Stage 7: Create Test Suite
      this.updateProgress('complete', 'Test generation complete', 100);
      this.partialResultManager.updateStage(suiteId, 'complete');
      
      const testSuite: TestSuite = {
        id: suiteId,
        projectId,
        targetFile: func.location.file,
        framework: options.framework,
        testCode,
        testCases,
        mocks,
        coverageImprovement: this.estimateCoverageImprovement(testCases.length),
        status: validationResult.valid ? 'validated' : 'generated',
        createdAt: new Date(),
      };
      
      // Generate error report
      const errorReport = this.errorHandler.generateReport();
      
      return {
        success: true,
        testSuite,
        errors: errorReport.errors.map(e => e.message),
        warnings: errorReport.warnings.map(w => w.message),
        progress: this.progressHistory,
      };
      
    } catch (error) {
      this.updateProgress('failed', 'Test generation failed', 0, [
        error instanceof Error ? error.message : String(error)
      ]);
      
      this.errorHandler.recordError(
        ErrorCategory.GENERATION,
        ErrorSeverity.CRITICAL,
        'Test generation failed',
        error instanceof Error ? error : undefined
      );
      
      // Try to save partial results
      const partialSuite = this.partialResultManager.toTestSuite(suiteId);
      const errorReport = this.errorHandler.generateReport();
      
      return {
        success: false,
        testSuite: partialSuite || undefined,
        errors: errorReport.errors.map(e => e.message),
        warnings: errorReport.warnings.map(w => w.message),
        progress: this.progressHistory,
      };
    } finally {
      // Clean up partial results
      this.partialResultManager.remove(suiteId);
    }
  }

  /**
   * Generates a complete test suite for a class
   * Coordinates all components with retry logic and progress tracking
   */
  async generateTestsForClass(
    cls: ClassInfo,
    projectId: string,
    options: TestGenerationOptions
  ): Promise<TestGenerationResult> {
    const maxRetries = options.maxRetries || 3;
    const errors: string[] = [];
    const warnings: string[] = [];
    
    this.progressHistory = [];
    
    try {
      // Stage 1: Analysis
      this.updateProgress('analyzing', 'Analyzing class structure', 10);
      const analysis = this.codeAnalyzer.analyzeClass(cls);
      
      // Stage 2: Strategy Planning
      this.updateProgress('planning', 'Planning test strategy', 30);
      const strategy = this.strategyPlanner.planClassTests(analysis);
      
      // Stage 3: Test Case Generation (with retry)
      this.updateProgress('generating', 'Generating test cases', 50);
      let testCases = strategy.testCases;
      
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          const classTests = await this.testCaseGenerator.generateClassTests(analysis);
          
          testCases = classTests;
          
          if (testCases.length > 0) {
            break;
          }
        } catch (error) {
          const errorMsg = `Test generation attempt ${attempt + 1} failed: ${error instanceof Error ? error.message : String(error)}`;
          errors.push(errorMsg);
          
          if (attempt === maxRetries - 1) {
            throw new Error(`Failed to generate test cases after ${maxRetries} attempts`);
          }
          
          // Wait before retry
          await this.delay(1000 * (attempt + 1));
        }
      }
      
      // Update strategy with generated test cases
      strategy.testCases = testCases;
      
      // Stage 4: Mock Generation
      this.updateProgress('generating', 'Generating mocks', 60);
      const mocks: any[] = []; // Classes typically need fewer mocks
      
      // Stage 5: Test Writing
      this.updateProgress('generating', 'Writing test code', 70);
      let testCode = this.testWriter.writeTestSuite(strategy, options.framework);
      
      // Apply code style if provided
      if (options.codeStyle) {
        testCode = this.testWriter.formatTest(testCode, options.codeStyle);
      }
      
      // Stage 6: Validation (with retry and auto-fix)
      this.updateProgress('validating', 'Validating test code', 80);
      let validationResult: ValidationResult;
      
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        validationResult = await this.validateTestCode(testCode, options.language, '');
        
        if (validationResult.valid) {
          break;
        }
        
        // Try to auto-fix common issues
        if (attempt < maxRetries - 1) {
          const fixes = this.testValidator.suggestFixes(validationResult.errors);
          
          if (fixes.length > 0) {
            testCode = this.applyFixes(testCode, fixes);
            warnings.push(`Applied ${fixes.length} automatic fixes on attempt ${attempt + 1}`);
          } else {
            // No fixes available, record errors and break
            validationResult.errors.forEach(err => errors.push(err.message));
            break;
          }
        } else {
          // Final attempt failed
          validationResult.errors.forEach(err => errors.push(err.message));
        }
      }
      
      // Collect warnings
      if (validationResult! && validationResult.warnings) {
        validationResult.warnings.forEach(warn => warnings.push(warn.message));
      }
      
      // Stage 7: Create Test Suite
      this.updateProgress('complete', 'Test generation complete', 100);
      
      const testSuite: TestSuite = {
        id: this.generateId(),
        projectId,
        targetFile: cls.location.file,
        framework: options.framework,
        testCode,
        testCases,
        mocks,
        coverageImprovement: this.estimateCoverageImprovement(testCases.length),
        status: validationResult!.valid ? 'validated' : 'generated',
        createdAt: new Date(),
      };
      
      return {
        success: true,
        testSuite,
        errors,
        warnings,
        progress: this.progressHistory,
      };
      
    } catch (error) {
      this.updateProgress('failed', 'Test generation failed', 0, [
        error instanceof Error ? error.message : String(error)
      ]);
      
      return {
        success: false,
        errors: [...errors, error instanceof Error ? error.message : String(error)],
        warnings,
        progress: this.progressHistory,
      };
    }
  }

  /**
   * Validates test code with all validation checks
   */
  private async validateTestCode(
    testCode: string,
    language: string,
    codebase: string
  ): Promise<ValidationResult> {
    const errors: any[] = [];
    const warnings: any[] = [];
    
    // Syntax validation
    const syntaxResult = this.testValidator.validateSyntax(testCode, language);
    errors.push(...syntaxResult.errors);
    warnings.push(...syntaxResult.warnings);
    
    // Import validation
    const importResult = this.testValidator.validateImports(testCode, codebase);
    errors.push(...importResult.errors);
    warnings.push(...importResult.warnings);
    
    // Compilation validation (for TypeScript/JavaScript)
    if (language.toLowerCase() === 'typescript' || language.toLowerCase() === 'javascript') {
      const compilationResult = this.testValidator.attemptCompilation(testCode);
      errors.push(...compilationResult.errors);
      warnings.push(...compilationResult.warnings);
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Applies suggested fixes to test code
   */
  private applyFixes(testCode: string, fixes: any[]): string {
    let fixedCode = testCode;
    
    // Sort fixes by line number (descending) to avoid offset issues
    const sortedFixes = fixes
      .filter(fix => fix.location)
      .sort((a, b) => (b.location?.line || 0) - (a.location?.line || 0));
    
    for (const fix of sortedFixes) {
      if (fix.location && fix.code) {
        const lines = fixedCode.split('\n');
        const lineIndex = fix.location.line - 1;
        
        if (lineIndex >= 0 && lineIndex < lines.length) {
          // Insert fix at the specified location
          lines.splice(lineIndex, 0, fix.code);
          fixedCode = lines.join('\n');
        }
      }
    }
    
    return fixedCode;
  }

  /**
   * Updates progress tracking
   */
  private updateProgress(
    stage: TestGenerationProgress['stage'],
    currentStep: string,
    progress: number,
    errors: string[] = []
  ): void {
    const progressUpdate: TestGenerationProgress = {
      stage,
      currentStep,
      progress,
      errors,
    };
    
    this.progressHistory.push(progressUpdate);
  }

  /**
   * Estimates coverage improvement based on number of test cases
   */
  private estimateCoverageImprovement(testCaseCount: number): number {
    // Simple heuristic: each test case adds ~5% coverage, capped at 95%
    return Math.min(testCaseCount * 5, 95);
  }

  /**
   * Generates a unique ID for test suites
   */
  private generateId(): string {
    return `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Delays execution for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Gets the current progress history
   */
  getProgressHistory(): TestGenerationProgress[] {
    return [...this.progressHistory];
  }

  /**
   * Generates test cases with fallback to simpler generation
   */
  private async generateTestCasesWithFallback(
    analysis: any,
    suiteId: string,
    maxRetries: number
  ): Promise<any[]> {
    const allTestCases: any[] = [];

    // Try to generate happy path tests
    const happyPathResult = await this.retryStrategy.executeWithRetry(
      () => this.testCaseGenerator.generateHappyPathTests(analysis),
      { maxAttempts: maxRetries }
    );

    if (happyPathResult.success && happyPathResult.result) {
      allTestCases.push(...happyPathResult.result);
    } else {
      this.errorHandler.recordWarning(
        ErrorCategory.GENERATION,
        'Happy path test generation failed, using fallback',
        { error: happyPathResult.error?.message }
      );
      this.partialResultManager.addFailedTestCase(suiteId, 'happy_path_tests');
    }

    // Try to generate edge case tests
    const edgeCaseResult = await this.retryStrategy.executeWithRetry(
      () => this.testCaseGenerator.generateEdgeCaseTests(analysis),
      { maxAttempts: maxRetries }
    );

    if (edgeCaseResult.success && edgeCaseResult.result) {
      allTestCases.push(...edgeCaseResult.result);
    } else {
      this.errorHandler.recordWarning(
        ErrorCategory.GENERATION,
        'Edge case test generation failed',
        { error: edgeCaseResult.error?.message }
      );
      this.partialResultManager.addFailedTestCase(suiteId, 'edge_case_tests');
    }

    // Try to generate error tests
    const errorTestResult = await this.retryStrategy.executeWithRetry(
      () => this.testCaseGenerator.generateErrorTests(analysis),
      { maxAttempts: maxRetries }
    );

    if (errorTestResult.success && errorTestResult.result) {
      allTestCases.push(...errorTestResult.result);
    } else {
      this.errorHandler.recordWarning(
        ErrorCategory.GENERATION,
        'Error test generation failed',
        { error: errorTestResult.error?.message }
      );
      this.partialResultManager.addFailedTestCase(suiteId, 'error_tests');
    }

    return allTestCases;
  }

  /**
   * Generates mocks with fallback
   */
  private async generateMocksWithFallback(
    dependencies: any[],
    suiteId: string
  ): Promise<any[]> {
    try {
      return this.mockGenerator.generateMocks(dependencies);
    } catch (error) {
      this.errorHandler.recordWarning(
        ErrorCategory.GENERATION,
        'Mock generation failed, continuing without mocks',
        { error: error instanceof Error ? error.message : String(error) }
      );
      return [];
    }
  }

  /**
   * Validates and attempts to fix test code
   */
  private async validateAndFixTestCode(
    testCode: string,
    language: string,
    maxRetries: number
  ): Promise<{ valid: boolean; fixedCode: string }> {
    let currentCode = testCode;
    let validationResult: ValidationResult;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      validationResult = await this.validateTestCode(currentCode, language, '');

      if (validationResult.valid) {
        return { valid: true, fixedCode: currentCode };
      }

      // Record validation errors
      for (const error of validationResult.errors) {
        this.errorHandler.recordError(
          ErrorCategory.VALIDATION,
          ErrorSeverity.MEDIUM,
          error.message,
          undefined,
          { line: error.line, column: error.column }
        );
      }

      // Try to auto-fix common issues
      if (attempt < maxRetries - 1) {
        const fixes = this.testValidator.suggestFixes(validationResult.errors);

        if (fixes.length > 0) {
          currentCode = this.applyFixes(currentCode, fixes);
          this.errorHandler.recordWarning(
            ErrorCategory.VALIDATION,
            `Applied ${fixes.length} automatic fixes on attempt ${attempt + 1}`
          );
        } else {
          // No fixes available, stop trying
          break;
        }
      }
    }

    return { valid: false, fixedCode: currentCode };
  }

  /**
   * Gets the error handler for external access
   */
  getErrorHandler(): TestGeneratorErrorHandler {
    return this.errorHandler;
  }

  /**
   * Gets the partial result manager for external access
   */
  getPartialResultManager(): PartialResultManager {
    return this.partialResultManager;
  }
}
