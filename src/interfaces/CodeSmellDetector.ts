import { CodeSmell } from '../types';

/**
 * Code Smell Detector Interface
 * Responsibility: Identify code smells and quality issues
 */
export interface ICodeSmellDetector {
  /**
   * Detect all code smells in the codebase
   * @param files - Array of file paths
   * @returns Array of detected code smells
   */
  detectSmells(files: string[]): Promise<CodeSmell[]>;

  /**
   * Detect long functions (>50 lines)
   * @param file - File path
   * @returns Array of long function smells
   */
  detectLongFunctions(file: string): Promise<CodeSmell[]>;

  /**
   * Detect overly complex functions (complexity >10)
   * @param file - File path
   * @returns Array of complex function smells
   */
  detectComplexFunctions(file: string): Promise<CodeSmell[]>;

  /**
   * Detect duplicate code blocks
   * @param files - Array of file paths
   * @returns Array of duplication smells
   */
  detectDuplication(files: string[]): Promise<CodeSmell[]>;

  /**
   * Detect deeply nested conditionals (>4 levels)
   * @param file - File path
   * @returns Array of deep nesting smells
   */
  detectDeepNesting(file: string): Promise<CodeSmell[]>;
}
