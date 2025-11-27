/**
 * Configuration for the Refactoring Engine
 */

export interface RefactoringConfig {
  // Smell detection thresholds
  longMethodThreshold: number; // Lines of code
  complexityThreshold: number; // Cyclomatic complexity
  duplicationThreshold: number; // Similarity percentage
  nestingLevelThreshold: number; // Max nesting depth
  
  // AI configuration
  aiProvider: 'openai' | 'anthropic';
  aiEnabled: boolean;
  
  // Safety configuration
  requireTests: boolean; // Require tests before applying refactorings
  autoRevert: boolean; // Automatically revert on test failure
  safeMode: boolean; // Only suggest, don't apply
  atomicRefactoring: boolean; // Rollback all changes if any refactoring fails
  
  // Test runner configuration
  testCommand?: string; // Custom test command
  testTimeout: number; // Test timeout in milliseconds
  
  // Performance
  parallelAnalysis: boolean; // Analyze files in parallel
  cacheResults: boolean; // Cache AST parsing results
}

export const defaultConfig: RefactoringConfig = {
  longMethodThreshold: 50,
  complexityThreshold: 10,
  duplicationThreshold: 0.85,
  nestingLevelThreshold: 4,
  
  aiProvider: 'openai',
  aiEnabled: true,
  
  requireTests: true,
  autoRevert: true,
  safeMode: false,
  atomicRefactoring: false,
  
  testTimeout: 60000, // 1 minute
  
  parallelAnalysis: true,
  cacheResults: true,
};

/**
 * Get refactoring configuration from environment or defaults
 */
export function getRefactoringConfig(): RefactoringConfig {
  return {
    longMethodThreshold: parseInt(process.env.REFACTOR_LONG_METHOD_THRESHOLD || '50'),
    complexityThreshold: parseInt(process.env.REFACTOR_COMPLEXITY_THRESHOLD || '10'),
    duplicationThreshold: parseFloat(process.env.REFACTOR_DUPLICATION_THRESHOLD || '0.85'),
    nestingLevelThreshold: parseInt(process.env.REFACTOR_NESTING_THRESHOLD || '4'),
    
    aiProvider: (process.env.REFACTOR_AI_PROVIDER as 'openai' | 'anthropic') || 'openai',
    aiEnabled: process.env.REFACTOR_AI_ENABLED !== 'false',
    
    requireTests: process.env.REFACTOR_REQUIRE_TESTS !== 'false',
    autoRevert: process.env.REFACTOR_AUTO_REVERT !== 'false',
    safeMode: process.env.REFACTOR_SAFE_MODE === 'true',
    atomicRefactoring: process.env.REFACTOR_ATOMIC === 'true',
    
    testCommand: process.env.REFACTOR_TEST_COMMAND,
    testTimeout: parseInt(process.env.REFACTOR_TEST_TIMEOUT || '60000'),
    
    parallelAnalysis: process.env.REFACTOR_PARALLEL_ANALYSIS !== 'false',
    cacheResults: process.env.REFACTOR_CACHE_RESULTS !== 'false',
  };
}
