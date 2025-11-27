/**
 * Source Processor Interface
 * Responsibility: Prepare uploaded content for analysis by extracting and organizing files
 */
export interface ISourceProcessor {
  /**
   * Extract ZIP file to target directory
   * @param zipPath - Path to ZIP file
   * @param targetDir - Target extraction directory
   */
  extractZip(zipPath: string, targetDir: string): Promise<void>;

  /**
   * Clone Git repository to target directory
   * @param url - Repository URL
   * @param targetDir - Target clone directory
   */
  cloneRepository(url: string, targetDir: string): Promise<void>;

  /**
   * List all source files in directory
   * @param directory - Directory to scan
   * @returns Array of file paths
   */
  listSourceFiles(directory: string): Promise<string[]>;

  /**
   * Filter out non-code files from file list
   * @param files - Array of file paths
   * @returns Filtered array of source code files
   */
  filterNonCodeFiles(files: string[]): string[];
}
