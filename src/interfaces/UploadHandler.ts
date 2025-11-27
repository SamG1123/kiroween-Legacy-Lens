import { UploadResult } from '../types';

/**
 * Upload Handler Interface
 * Responsibility: Accept codebase uploads from multiple sources and validate inputs
 */
export interface IUploadHandler {
  /**
   * Handle GitHub repository upload
   * @param url - GitHub repository URL
   * @returns Upload result with project ID and working directory
   */
  handleGitHubUpload(url: string): Promise<UploadResult>;

  /**
   * Handle ZIP file upload
   * @param file - ZIP file buffer
   * @returns Upload result with project ID and working directory
   */
  handleZipUpload(file: Buffer): Promise<UploadResult>;

  /**
   * Validate that uploaded content doesn't exceed size limit
   * @param path - Path to uploaded content
   * @returns True if size is valid
   */
  validateSize(path: string): Promise<boolean>;

  /**
   * Validate that uploaded content contains at least one source code file
   * @param path - Path to uploaded content
   * @returns True if valid source files are present
   */
  validateContent(path: string): Promise<boolean>;
}
