import { Project, Analysis, Language, Dependency, Metric, Issue } from '../types';

export const mockProject: Project = {
  id: '1',
  name: 'Test Project',
  sourceType: 'github',
  sourceUrl: 'https://github.com/test/repo',
  status: 'completed',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T01:00:00Z',
};

export const mockAnalyzingProject: Project = {
  id: '2',
  name: 'Analyzing Project',
  sourceType: 'zip',
  status: 'analyzing',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:30:00Z',
};

export const mockLanguages: Language[] = [
  { name: 'TypeScript', percentage: 65.5, lines: 10000, color: '#3178c6' },
  { name: 'JavaScript', percentage: 25.3, lines: 3800, color: '#f7df1e' },
  { name: 'CSS', percentage: 9.2, lines: 1400, color: '#264de4' },
];

export const mockDependencies: Dependency[] = [
  {
    name: 'react',
    version: '18.2.0',
    type: 'runtime',
    latest: '18.2.0',
    isOutdated: false,
  },
  {
    name: 'typescript',
    version: '5.0.0',
    type: 'dev',
    latest: '5.3.0',
    isOutdated: true,
  },
  {
    name: 'axios',
    version: '1.5.0',
    type: 'runtime',
    latest: '1.6.0',
    isOutdated: true,
  },
];

export const mockMetrics: Metric = {
  totalLines: 15200,
  codeLines: 12000,
  commentLines: 2000,
  blankLines: 1200,
  maintainabilityIndex: 75,
  cyclomaticComplexity: 45,
  averageComplexity: 3.2,
  filesCount: 120,
};

export const mockIssues: Issue[] = [
  {
    id: '1',
    type: 'code-smell',
    severity: 'high',
    message: 'Function is too complex',
    file: 'src/utils/helper.ts',
    line: 42,
    column: 10,
    snippet: 'function complexFunction() {\n  // ...\n}',
  },
  {
    id: '2',
    type: 'security',
    severity: 'critical',
    message: 'Potential SQL injection',
    file: 'src/api/database.ts',
    line: 15,
    column: 5,
    snippet: 'const query = `SELECT * FROM users WHERE id = ${userId}`;',
  },
  {
    id: '3',
    type: 'performance',
    severity: 'medium',
    message: 'Inefficient loop',
    file: 'src/components/List.tsx',
    line: 28,
    column: 8,
    snippet: 'for (let i = 0; i < items.length; i++) {\n  // ...\n}',
  },
];

export const mockAnalysis: Analysis = {
  id: '1',
  projectId: '1',
  status: 'completed',
  progress: 100,
  currentStage: 'completed',
  languages: mockLanguages,
  dependencies: mockDependencies,
  metrics: mockMetrics,
  issues: mockIssues,
  frameworks: ['React', 'Vite'],
  startedAt: '2024-01-01T00:00:00Z',
  completedAt: '2024-01-01T01:00:00Z',
};

export const mockProjects: Project[] = [
  mockProject,
  mockAnalyzingProject,
  {
    id: '3',
    name: 'Failed Project',
    sourceType: 'local',
    status: 'failed',
    error: 'Analysis failed due to invalid code structure',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:15:00Z',
  },
];
