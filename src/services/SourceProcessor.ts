import { ISourceProcessor } from '../interfaces/SourceProcessor';
import simpleGit from 'simple-git';
import AdmZip from 'adm-zip';
import * as fs from 'fs/promises';
import * as path from 'path';
import { existsSync } from 'fs';

/**
 * SourceProcessor Implementation
 * Responsibility: Prepare uploaded content for analysis by extracting and organizing files
 */
export class SourceProcessor implements ISourceProcessor {
  private readonly sourceFileExtensions: Set<string> = new Set([
    '.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cs', '.rb', '.php', '.go',
    '.c', '.cpp', '.h', '.hpp', '.swift', '.kt', '.rs', '.scala', '.clj',
    '.html', '.css', '.scss', '.sass', '.less', '.vue', '.sql', '.sh', '.bash',
    '.m', '.mm', '.pl', '.r', '.dart', '.lua', '.groovy', '.erl', '.ex', '.exs'
  ]);

  private readonly skipDirectories: Set<string> = new Set([
    'node_modules', '.git', 'dist', 'build', 'target', 'bin', 'obj',
    '.idea', '.vscode', '__pycache__', '.pytest_cache', 'coverage',
    '.next', '.nuxt', 'vendor', 'packages', '.gradle', '.mvn'
  ]);

  /**
   * Extract ZIP file to target directory
   */
  async extractZip(zipPath: string, targetDir: string): Promise<void> {
    try {
      // Validate ZIP file exists
      if (!existsSync(zipPath)) {
        throw new Error(`ZIP file not found: ${zipPath}`);
      }

      // Ensure target directory exists
      await this.ensureDirectory(targetDir);

      // Extract ZIP file
      const zip = new AdmZip(zipPath);
      zip.extractAllTo(targetDir, true);
    } catch (error) {
      throw new Error(
        `Failed to extract ZIP file: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Clone Git repository to target directory
   */
  async cloneRepository(url: string, targetDir: string): Promise<void> {
    try {
      // Validate URL format
      if (!this.isValidGitUrl(url)) {
        throw new Error(`Invalid Git repository URL: ${url}`);
      }

      // Ensure parent directory exists
      const parentDir = path.dirname(targetDir);
      await this.ensureDirectory(parentDir);

      // Clone repository with shallow clone for efficiency
      const git = simpleGit();
      await git.clone(url, targetDir, ['--depth', '1']);
    } catch (error) {
      throw new Error(
        `Failed to clone repository: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * List all source files in directory recursively
   */
  async listSourceFiles(directory: string): Promise<string[]> {
    try {
      // Validate directory exists
      if (!existsSync(directory)) {
        throw new Error(`Directory not found: ${directory}`);
      }

      const sourceFiles: string[] = [];
      await this.collectSourceFiles(directory, sourceFiles);
      return sourceFiles;
    } catch (error) {
      throw new Error(
        `Failed to list source files: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Filter out non-code files from file list
   */
  filterNonCodeFiles(files: string[]): string[] {
    return files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return this.sourceFileExtensions.has(ext);
    });
  }

  /**
   * Helper: Recursively collect source files from directory
   */
  private async collectSourceFiles(dirPath: string, result: string[]): Promise<void> {
    const items = await fs.readdir(dirPath, { withFileTypes: true });

    for (const item of items) {
      const itemPath = path.join(dirPath, item.name);

      if (item.isDirectory()) {
        // Skip directories that shouldn't be analyzed
        if (this.skipDirectories.has(item.name)) {
          continue;
        }
        
        // Recursively process subdirectories
        await this.collectSourceFiles(itemPath, result);
      } else if (item.isFile()) {
        // Add file to result list
        result.push(itemPath);
      }
    }
  }

  /**
   * Helper: Validate Git URL format
   */
  private isValidGitUrl(url: string): boolean {
    // Support common Git URL formats
    const patterns = [
      /^https?:\/\/.+\/.+\.git$/,           // HTTPS with .git
      /^https?:\/\/.+\/.+$/,                 // HTTPS without .git
      /^git@.+:.+\/.+\.git$/,                // SSH with .git
      /^git@.+:.+\/.+$/,                     // SSH without .git
      /^ssh:\/\/.+\/.+\.git$/,               // SSH protocol
      /^git:\/\/.+\/.+\.git$/                // Git protocol
    ];

    return patterns.some(pattern => pattern.test(url));
  }

  /**
   * Helper: Ensure directory exists
   */
  private async ensureDirectory(dirPath: string): Promise<void> {
    if (!existsSync(dirPath)) {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }
}
