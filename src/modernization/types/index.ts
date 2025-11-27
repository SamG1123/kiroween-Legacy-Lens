// Type definitions for modernization advisor

export type EffortEstimate = 'low' | 'medium' | 'high';
export type Priority = 'critical' | 'high' | 'medium' | 'low';
export type UpdateCategory = 'major' | 'minor' | 'patch';

export interface Dependency {
  name: string;
  version: string;
  type: 'production' | 'development';
  ecosystem: 'npm' | 'pypi' | 'maven' | 'rubygems';
}

export interface VersionInfo {
  current: string;
  latest: string;
  latestStable: string;
  allVersions: string[];
}

export interface Vulnerability {
  id: string; // CVE ID
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  fixedIn: string;
  publishedDate?: Date;
  references?: string[];
}

export interface DeprecationInfo {
  isDeprecated: boolean;
  deprecationDate?: Date;
  alternatives: string[];
  reason: string;
}

export interface DependencyAnalysis {
  dependency: Dependency;
  currentVersion: string;
  latestVersion: string;
  updateCategory: UpdateCategory;
  isDeprecated: boolean;
  deprecationInfo?: DeprecationInfo;
  vulnerabilities: Vulnerability[];
  alternatives?: string[];
}

export interface Framework {
  name: string;
  version: string;
  type: 'frontend' | 'backend' | 'fullstack';
}

export interface BreakingChange {
  description: string;
  affectedAPIs: string[];
  migrationPath: string;
}

export interface MigrationGuide {
  url: string;
  steps: string[];
  automatedTools: string[];
}

export interface FrameworkAnalysis {
  framework: Framework;
  currentVersion: string;
  latestVersion: string;
  breakingChanges: BreakingChange[];
  migrationGuide: MigrationGuide;
  effortEstimate: EffortEstimate;
}

export interface PatternMatch {
  file: string;
  line: number;
  code: string;
  patternType: string;
}

export interface ModernizationSuggestion {
  description: string;
  beforeCode: string;
  afterCode: string;
  benefits: string[];
}

export interface PatternAnalysis {
  pattern: string;
  occurrences: PatternMatch[];
  modernAlternative: string;
  benefits: string[];
  migrationComplexity: EffortEstimate;
}

export interface Recommendation {
  id: string;
  type: 'dependency' | 'framework' | 'pattern';
  title: string;
  description: string;
  currentState: string;
  suggestedState: string;
  benefits: string[];
  effort: EffortEstimate;
  priority: Priority;
  migrationSteps: string[];
  codeExamples?: {
    before: string;
    after: string;
  };
  resources: string[];
  automatedTools: string[];
}

export interface PriorityFactors {
  hasSecurityVulnerability: boolean;
  vulnerabilitySeverity?: string;
  isDeprecated: boolean;
  hasBreakingChanges: boolean;
  effortToBenefitRatio: number;
  impactScore: number;
}

export interface CompatibilityIssue {
  type: 'peer_dependency' | 'version_conflict' | 'language_incompatibility';
  description: string;
  affectedDependencies: string[];
  severity: 'error' | 'warning';
}

export interface Resolution {
  issue: CompatibilityIssue;
  solution: string;
  alternativeVersions?: string[];
}

export interface CompatibilityReport {
  compatible: boolean;
  issues: CompatibilityIssue[];
  resolutions: Resolution[];
}

export interface PeerDependencyCheck {
  satisfied: boolean;
  missing: string[];
  conflicts: string[];
}

export interface RecommendationDependency {
  recommendationId: string;
  dependsOn: string[];
  reason: string;
}

export interface TimeEstimate {
  min: number; // days
  max: number; // days
  confidence: 'low' | 'medium' | 'high';
}

export interface Phase {
  number: number;
  name: string;
  description: string;
  recommendations: Recommendation[];
  estimate: TimeEstimate;
  prerequisites: number[]; // Phase numbers
}

export interface MigrationRoadmap {
  phases: Phase[];
  totalEstimate: TimeEstimate;
  criticalPath: string[];
  quickWins: Recommendation[];
}

export interface PriorityBreakdown {
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface TypeBreakdown {
  dependency: number;
  framework: number;
  pattern: number;
}

export interface ModernizationReport {
  summary: string;
  statistics: {
    totalRecommendations: number;
    byPriority: PriorityBreakdown;
    byType: TypeBreakdown;
    estimatedEffort: TimeEstimate;
  };
  recommendations: Recommendation[];
  roadmap: MigrationRoadmap;
  compatibilityReport: CompatibilityReport;
  generatedAt: Date;
}
