import { Dependency, Framework, DependencyReport } from '../types';

/**
 * Dependency Analyzer Interface
 * Responsibility: Extract and identify dependencies and frameworks
 */
export interface IDependencyAnalyzer {
  /**
   * Analyze all dependencies in the codebase
   * @param directory - Root directory of codebase
   * @returns Complete dependency report
   */
  analyzeDependencies(directory: string): Promise<DependencyReport>;

  /**
   * Parse package.json for Node.js dependencies
   * @param path - Path to package.json
   * @returns Array of dependencies
   */
  parsePackageJson(path: string): Promise<Dependency[]>;

  /**
   * Parse Python requirements files
   * @param path - Path to requirements.txt or Pipfile
   * @returns Array of dependencies
   */
  parsePythonRequirements(path: string): Promise<Dependency[]>;

  /**
   * Parse Java dependency files
   * @param path - Path to pom.xml or build.gradle
   * @returns Array of dependencies
   */
  parseJavaDependencies(path: string): Promise<Dependency[]>;

  /**
   * Detect frameworks based on file patterns
   * @param files - Array of file paths
   * @returns Array of detected frameworks
   */
  detectFrameworks(files: string[]): Promise<Framework[]>;
}
