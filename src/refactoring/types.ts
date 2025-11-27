/**
 * Core types and interfaces for the Refactoring Engine
 */

export interface Location {
  file: string;
  startLine: number;
  endLine: number;
  startColumn: number;
  endColumn: number;
}

export interface CodeBlock {
  code: string;
  location: Location;
}

export interface Scope {
  type: 'local' | 'class' | 'module' | 'global';
  name: string;
}

// Code Smell Types
export interface CodeSmell {
  type: string;
  location: Location;
  severity: 'low' | 'medium' | 'high';
  description: string;
  metrics?: Record<string, number>;
}

export interface LongMethodSmell extends CodeSmell {
  methodName: string;
  lineCount: number;
  extractableBlocks: CodeBlock[];
}

export interface DuplicationSmell extends CodeSmell {
  instances: Location[];
  similarity: number;
  extractionCandidate: string;
}

export interface ConditionalSmell extends CodeSmell {
  complexity: number;
  nestingLevel: number;
}

export interface NamingSmell extends CodeSmell {
  identifierName: string;
  identifierType: 'variable' | 'method' | 'class';
}

export interface SOLIDSmell extends CodeSmell {
  principle: 'SRP' | 'OCP' | 'LSP' | 'ISP' | 'DIP';
  violationType: string;
}

// Refactoring Types
export type RefactoringType = 
  | 'extract_method'
  | 'remove_duplication'
  | 'simplify_conditional'
  | 'rename'
  | 'split_class'
  | 'introduce_interface'
  | 'inline_method'
  | 'extract_variable'
  | 'introduce_guard_clause'
  | 'move_method';

export interface RefactoringSuggestion {
  id: string;
  type: RefactoringType;
  title: string;
  description: string;
  beforeCode: string;
  afterCode: string;
  diff: string;
  benefits: string[];
  riskLevel: 'low' | 'medium' | 'high';
  estimatedEffort: 'low' | 'medium' | 'high';
  priority: number;
}

export interface ExtractMethodSuggestion extends RefactoringSuggestion {
  type: 'extract_method';
  methodName: string;
  parameters: string[];
  returnType: string;
}

export interface RemoveDuplicationSuggestion extends RefactoringSuggestion {
  type: 'remove_duplication';
  sharedMethodName: string;
  instances: Location[];
}

export interface SimplifyConditionalSuggestion extends RefactoringSuggestion {
  type: 'simplify_conditional';
  simplificationType: 'guard_clause' | 'extract_variable' | 'consolidate';
}

export interface RenameSuggestion extends RefactoringSuggestion {
  type: 'rename';
  oldName: string;
  newName: string;
  scope: Scope;
}

// Refactoring Planning
export interface Dependency {
  refactoringId: string;
  dependsOn: string[];
  reason: string;
}

export interface RefactoringPlan {
  refactorings: RefactoringSuggestion[];
  dependencies: Dependency[];
  estimatedDuration: number;
}

// Transformation Results
export interface Change {
  type: 'add' | 'remove' | 'modify';
  location: Location;
  oldCode: string;
  newCode: string;
}

export interface TransformResult {
  success: boolean;
  transformedCode: string;
  changes: Change[];
  error?: string;
}

// Validation
export interface ValidationIssue {
  type: 'syntax' | 'naming_conflict' | 'behavior_change';
  description: string;
  location?: Location;
}

export interface ValidationResult {
  safe: boolean;
  issues: ValidationIssue[];
  warnings: string[];
}

// Test Results
export interface TestError {
  testName: string;
  error: string;
  stackTrace: string;
}

export interface TestResult {
  passed: number;
  failed: number;
  errors: TestError[];
  duration: number;
}

// Refactoring Model
export interface Refactoring {
  id: string;
  projectId: string;
  type: RefactoringType;
  status: 'suggested' | 'applied' | 'reverted' | 'failed';
  beforeCode: string;
  afterCode: string;
  diff: string;
  testsPassed: boolean;
  appliedAt?: Date;
  revertedAt?: Date;
}
