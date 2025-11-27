// Type definitions for Test Generator

export interface FunctionInfo {
  name: string;
  parameters: ParameterInfo[];
  returnType: string | null;
  body: string;
  location: {
    file: string;
    line: number;
  };
}

export interface ParameterInfo {
  name: string;
  type: string | null;
  optional: boolean;
  defaultValue?: any;
}

export interface ClassInfo {
  name: string;
  constructor: FunctionInfo | null;
  publicMethods: FunctionInfo[];
  privateMethods: FunctionInfo[];
  properties: PropertyInfo[];
  inheritance: string | null;
  location: {
    file: string;
    line: number;
  };
}

export interface PropertyInfo {
  name: string;
  type: string | null;
  visibility: 'public' | 'private' | 'protected';
  isStatic: boolean;
}

export interface Dependency {
  name: string;
  type: 'module' | 'database' | 'api' | 'filesystem' | 'external';
  source: string;
}

export interface SideEffect {
  type: 'mutation' | 'io' | 'network' | 'database';
  description: string;
}

export interface ErrorPath {
  condition: string;
  exceptionType: string | null;
  errorMessage: string | null;
}

export interface FunctionAnalysis {
  name: string;
  parameters: ParameterInfo[];
  returnType: string | null;
  hasErrorHandling: boolean;
  errorPaths: ErrorPath[];
  dependencies: Dependency[];
  complexity: number;
  sideEffects: SideEffect[];
}

export interface ClassAnalysis {
  name: string;
  constructor: FunctionInfo | null;
  publicMethods: FunctionInfo[];
  privateMethods: FunctionInfo[];
  properties: PropertyInfo[];
  hasState: boolean;
  inheritance: string | null;
}

export interface CoverageReport {
  overallPercentage: number;
  byFile: Map<string, number>;
  untestedFunctions: string[];
  untestedClasses: string[];
  criticalPathsCovered: boolean;
}

export interface UntestedCode {
  type: 'function' | 'class' | 'module';
  name: string;
  file: string;
  complexity: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
}

export interface CoverageGap {
  type: 'edge_case' | 'error_path' | 'branch';
  description: string;
  location: string;
  estimatedImpact: number;
}

export interface TestCase {
  name: string;
  description: string;
  inputs: any[];
  expectedOutput: any;
  type: 'happy_path' | 'edge_case' | 'error_case';
}

export interface EdgeCase {
  parameter: string;
  value: any;
  reason: string;
}

export interface ErrorCase {
  scenario: string;
  expectedError: string;
  errorMessage?: string;
}

export interface MockingStrategy {
  dependencies: Dependency[];
  mockType: 'full' | 'partial' | 'spy';
}

export interface TestStrategy {
  targetCode: string;
  testCases: TestCase[];
  edgeCases: EdgeCase[];
  errorCases: ErrorCase[];
  mockingStrategy: MockingStrategy;
  setupRequired: string[];
  teardownRequired: string[];
}

export interface Mock {
  target: string;
  mockCode: string;
  mockLibrary: string;
  setupCode: string;
}

export interface DatabaseCall {
  operation: string;
  table?: string;
  query?: string;
}

export interface APICall {
  method: string;
  endpoint: string;
  expectedResponse?: any;
}

export interface FileOperation {
  operation: 'read' | 'write' | 'delete' | 'exists';
  path: string;
}

export type TestFramework = 'jest' | 'mocha' | 'pytest' | 'junit' | 'rspec';

export interface CodeStyle {
  indentation: number;
  quotes: 'single' | 'double';
  semicolons: boolean;
}

export interface ValidationError {
  message: string;
  line?: number;
  column?: number;
  severity: 'error' | 'warning';
}

export interface ValidationWarning {
  message: string;
  line?: number;
  column?: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface Fix {
  description: string;
  code: string;
  location?: {
    line: number;
    column: number;
  };
}

export interface TestSuite {
  id: string;
  projectId: string;
  targetFile: string;
  framework: TestFramework;
  testCode: string;
  testCases: TestCase[];
  mocks: Mock[];
  coverageImprovement: number;
  status: 'generated' | 'validated' | 'failed';
  createdAt: Date;
}
