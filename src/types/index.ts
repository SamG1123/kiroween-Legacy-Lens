// Core type definitions for the Codebase Analysis Engine

export type ProjectStatus = 'pending' | 'analyzing' | 'completed' | 'failed';
export type SourceType = 'github' | 'zip' | 'local';
export type CodeSmellType = 'long_function' | 'too_complex' | 'duplication' | 'deep_nesting';
export type Severity = 'low' | 'medium' | 'high';
export type DependencyType = 'runtime' | 'dev';

// Project Model
export interface Project {
  id: string; // UUID
  name: string;
  sourceType: SourceType;
  sourceUrl: string | null;
  status: ProjectStatus;
  createdAt: Date;
  updatedAt: Date;
}

// Analysis Model
export interface Analysis {
  id: string; // UUID
  projectId: string;
  agentType: string;
  result: AnalysisReport;
  createdAt: Date;
}

// Upload Handler Interfaces
export interface UploadResult {
  projectId: string;
  workingDirectory: string;
  sourceType: SourceType;
  status: 'success' | 'error';
  error?: string;
}

// Language Detection Interfaces
export interface LanguageDistribution {
  languages: Array<{
    name: string;
    percentage: number;
    lineCount: number;
  }>;
}

// Dependency Analysis Interfaces
export interface Dependency {
  name: string;
  version: string;
  type: DependencyType;
}

export interface Framework {
  name: string;
  version: string | null;
  confidence: number;
}

export interface DependencyReport {
  dependencies: Dependency[];
  frameworks: Framework[];
}

// Metrics Interfaces
export interface LOCCount {
  total: number;
  code: number;
  comments: number;
  blank: number;
}

export interface ComplexityMetrics {
  functions: Array<{
    name: string;
    complexity: number;
    lineCount: number;
  }>;
  averageComplexity: number;
}

export interface CodeMetrics {
  totalFiles: number;
  totalLines: number;
  codeLines: number;
  commentLines: number;
  blankLines: number;
  averageComplexity: number;
  maintainabilityIndex: number;
}

// Code Smell Interfaces
export interface CodeSmell {
  type: CodeSmellType;
  severity: Severity;
  file: string;
  line: number;
  description: string;
  metadata?: Record<string, any>;
}

// Analysis Report
export interface AnalysisReport {
  projectId: string;
  status: 'completed' | 'failed' | 'partial';
  startTime: Date;
  endTime: Date;
  languages: LanguageDistribution;
  frameworks: Framework[];
  dependencies: Dependency[];
  metrics: CodeMetrics;
  issues: CodeSmell[];
  error?: string;
  structure?: any; // Directory structure
  entryPoints?: string[]; // Main entry points
  apiEndpoints?: any[]; // API endpoints
  documentation?: {
    readme?: string;
    api?: string;
    architecture?: string;
    metadata: {
      projectId: string;
      generatedAt: string;
      generator: string;
      version: string;
      options: any;
      statistics: {
        filesDocumented: number;
        functionsDocumented: number;
        classesDocumented: number;
        apiEndpointsDocumented: number;
      };
    };
  };
}

// Analysis Data (intermediate)
export interface AnalysisData {
  languages: LanguageDistribution;
  frameworks: Framework[];
  dependencies: Dependency[];
  metrics: CodeMetrics;
  issues: CodeSmell[];
}

// Error Response
export interface ErrorResponse {
  projectId: string;
  status: 'failed';
  stage: string;
  error: {
    code: string;
    message: string;
    details?: any;
  };
  partialResults?: Partial<AnalysisReport>;
}
