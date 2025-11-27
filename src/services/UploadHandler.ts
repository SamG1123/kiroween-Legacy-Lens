import { IUploadHandler } from '../interfaces/UploadHandler';
import { UploadResult } from '../types';
import simpleGit from 'simple-git';
import AdmZip from 'adm-zip';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs/promises';
import * as path from 'path';
import { existsSync } from 'fs';

/**
 * UploadHandler Implementation
 * Handles codebase uploads from GitHub and ZIP files
 */
export class UploadHandler implements IUploadHandler {
  private readonly workspaceRoot: string;
  private readonly maxSizeBytes: number = 100 * 1024 * 1024; // 100MB
  private readonly sourceFileExtensions: Set<string> = new Set([
    '.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cs', '.rb', '.php', '.go',
    '.c', '.cpp', '.h', '.hpp', '.swift', '.kt', '.rs', '.scala', '.clj',
    '.html', '.css', '.scss', '.sass', '.less', '.vue', '.sql', '.sh', '.bash'
  ]);

  constructor(workspaceRoot: string = './workspace') {
    this.workspaceRoot = workspaceRoot;
  }

  /**
   * Handle GitHub repository upload
   */
  async handleGitHubUpload(url: string): Promise<UploadResult> {
    const projectId = uuidv4();
    const workingDirectory = path.join(this.workspaceRoot, projectId);

    try {
      // Validate GitHub URL format
      if (!this.isValidGitHubUrl(url)) {
        return {
          projectId,
          workingDirectory,
          sourceType: 'github',
          status: 'error',
          error: 'Invalid GitHub URL format'
        };
      }

      // Ensure workspace directory exists
      await this.ensureDirectory(this.workspaceRoot);
      await this.ensureDirectory(workingDirectory);

      // Clone the repository
      const git = simpleGit();
      await git.clone(url, workingDirectory, ['--depth', '1']);

      // Validate size
      const sizeValid = await this.validateSize(workingDirectory);
      if (!sizeValid) {
        await this.cleanup(workingDirectory);
        return {
          projectId,
          workingDirectory,
          sourceType: 'github',
          status: 'error',
          error: 'Repository size exceeds 100MB limit'
        };
      }

      // Validate content
      const contentValid = await this.validateContent(workingDirectory);
      if (!contentValid) {
        await this.cleanup(workingDirectory);
        return {
          projectId,
          workingDirectory,
          sourceType: 'github',
          status: 'error',
          error: 'No recognizable source code files found'
        };
      }

      return {
        projectId,
        workingDirectory,
        sourceType: 'github',
        status: 'success'
      };
    } catch (error) {
      // Cleanup on error
      await this.cleanup(workingDirectory);
      
      return {
        projectId,
        workingDirectory,
        sourceType: 'github',
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error during GitHub upload'
      };
    }
  }

  /**
   * Handle ZIP file upload
   */
  async handleZipUpload(file: Buffer): Promise<UploadResult> {
    const projectId = uuidv4();
    const workingDirectory = path.join(this.workspaceRoot, projectId);

    try {
      // Ensure workspace directory exists
      await this.ensureDirectory(this.workspaceRoot);
      await this.ensureDirectory(workingDirectory);

      // Extract ZIP file
      const zip = new AdmZip(file);
      zip.extractAllTo(workingDirectory, true);

      // Validate size
      const sizeValid = await this.validateSize(workingDirectory);
      if (!sizeValid) {
        await this.cleanup(workingDirectory);
        return {
          projectId,
          workingDirectory,
          sourceType: 'zip',
          status: 'error',
          error: 'Extracted content exceeds 100MB limit'
        };
      }

      // Validate content
      const contentValid = await this.validateContent(workingDirectory);
      if (!contentValid) {
        await this.cleanup(workingDirectory);
        return {
          projectId,
          workingDirectory,
          sourceType: 'zip',
          status: 'error',
          error: 'No recognizable source code files found'
        };
      }

      return {
        projectId,
        workingDirectory,
        sourceType: 'zip',
        status: 'success'
      };
    } catch (error) {
      // Cleanup on error
      await this.cleanup(workingDirectory);
      
      return {
        projectId,
        workingDirectory,
        sourceType: 'zip',
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error during ZIP upload'
      };
    }
  }

  /**
   * Validate that uploaded content doesn't exceed size limit (100MB)
   */
  async validateSize(dirPath: string): Promise<boolean> {
    try {
      const totalSize = await this.getDirectorySize(dirPath);
      return totalSize <= this.maxSizeBytes;
    } catch (error) {
      return false;
    }
  }

  /**
   * Validate that uploaded content contains at least one source code file
   */
  async validateContent(dirPath: string): Promise<boolean> {
    try {
      const hasSourceFiles = await this.hasSourceFiles(dirPath);
      return hasSourceFiles;
    } catch (error) {
      return false;
    }
  }

  /**
   * Helper: Calculate total size of directory recursively
   */
  private async getDirectorySize(dirPath: string): Promise<number> {
    let totalSize = 0;

    const items = await fs.readdir(dirPath, { withFileTypes: true });

    for (const item of items) {
      const itemPath = path.join(dirPath, item.name);

      if (item.isDirectory()) {
        // Skip .git directory to avoid counting it
        if (item.name === '.git') {
          continue;
        }
        totalSize += await this.getDirectorySize(itemPath);
      } else if (item.isFile()) {
        const stats = await fs.stat(itemPath);
        totalSize += stats.size;
      }
    }

    return totalSize;
  }

  /**
   * Helper: Check if directory contains at least one source file
   */
  private async hasSourceFiles(dirPath: string): Promise<boolean> {
    const items = await fs.readdir(dirPath, { withFileTypes: true });

    for (const item of items) {
      const itemPath = path.join(dirPath, item.name);

      if (item.isDirectory()) {
        // Skip common non-source directories
        if (this.shouldSkipDirectory(item.name)) {
          continue;
        }
        
        const hasSourceInSubdir = await this.hasSourceFiles(itemPath);
        if (hasSourceInSubdir) {
          return true;
        }
      } else if (item.isFile()) {
        const ext = path.extname(item.name).toLowerCase();
        if (this.sourceFileExtensions.has(ext)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Helper: Check if directory should be skipped during source file search
   */
  private shouldSkipDirectory(dirName: string): boolean {
    const skipDirs = new Set([
      'node_modules', '.git', 'dist', 'build', 'target', 'bin', 'obj',
      '.idea', '.vscode', '__pycache__', '.pytest_cache', 'coverage',
      '.next', '.nuxt', 'vendor', 'packages'
    ]);
    return skipDirs.has(dirName);
  }

  /**
   * Helper: Validate GitHub URL format
   */
  private isValidGitHubUrl(url: string): boolean {
    const githubUrlPattern = /^https?:\/\/(www\.)?github\.com\/[\w-]+\/[\w.-]+/;
    return githubUrlPattern.test(url);
  }

  /**
   * Helper: Ensure directory exists
   */
  private async ensureDirectory(dirPath: string): Promise<void> {
    if (!existsSync(dirPath)) {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  /**
   * Helper: Cleanup directory
   */
  private async cleanup(dirPath: string): Promise<void> {
    try {
      if (existsSync(dirPath)) {
        await fs.rm(dirPath, { recursive: true, force: true });
      }
    } catch (error) {
      // Log error but don't throw - cleanup is best effort
      console.error(`Failed to cleanup directory ${dirPath}:`, error);
    }
  }
}
