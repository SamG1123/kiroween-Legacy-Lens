// Project types
export interface Project {
  id: string;
  name: string;
  status: 'pending' | 'analyzing' | 'completed' | 'failed';
  sourceType: 'github' | 'zip' | 'local';
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectDTO {
  name: string;
  sourceType: 'github' | 'zip' | 'local';
  sourceUrl?: string;
  file?: File;
  path?: string;
}

// Analysis types
export interface Analysis {
  id: string;
  projectId: string;
  progress: number;
  stage: string;
  estimatedTimeRemaining?: number;
}

// Report types
export interface Report {
  id: string;
  projectId: string;
  languages: LanguageStats[];
  metrics: CodeMetrics;
  dependencies: Dependency[];
  frameworks?: Framework[];
  issues: Issue[];
}

export interface LanguageStats {
  language: string;
  percentage: number;
  lineCount: number;
}

export interface CodeMetrics {
  totalLines: number;
  codeLines: number;
  commentLines: number;
  blankLines: number;
  maintainabilityIndex: number;
  complexity: number;
}

export interface Dependency {
  name: string;
  version: string;
  type: 'runtime' | 'dev';
  framework?: string;
}

export interface Framework {
  name: string;
  version?: string;
  category: string;
}

export interface Issue {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  file: string;
  line: number;
  description: string;
  codeSnippet?: string;
}
