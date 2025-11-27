import { LanguageDistribution } from '../types';

/**
 * Language Detector Interface
 * Responsibility: Identify programming languages in the codebase
 */
export interface ILanguageDetector {
  /**
   * Detect all languages in the codebase
   * @param files - Array of file paths
   * @returns Language distribution with percentages
   */
  detectLanguages(files: string[]): Promise<LanguageDistribution>;

  /**
   * Detect language by file extension
   * @param file - File path
   * @returns Language name or null if unknown
   */
  detectByExtension(file: string): string | null;

  /**
   * Detect language by analyzing file content
   * @param file - File path
   * @returns Language name or null if unknown
   */
  detectByContent(file: string): Promise<string | null>;
}
