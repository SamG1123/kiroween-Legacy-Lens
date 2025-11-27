import { UploadHandler } from './UploadHandler';
import * as fs from 'fs/promises';
import * as path from 'path';
import { existsSync } from 'fs';
import AdmZip from 'adm-zip';

describe('UploadHandler', () => {
  let uploadHandler: UploadHandler;
  const testWorkspace = './test-workspace';

  beforeEach(() => {
    uploadHandler = new UploadHandler(testWorkspace);
  });

  afterEach(async () => {
    // Cleanup test workspace with retry for Windows
    if (existsSync(testWorkspace)) {
      try {
        await fs.rm(testWorkspace, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
      } catch (error) {
        // Ignore cleanup errors in tests
        console.warn('Failed to cleanup test workspace:', error);
      }
    }
  });

  describe('handleZipUpload', () => {
    it('should successfully extract and validate a ZIP file with source code', async () => {
      // Create a test ZIP file with source code
      const zip = new AdmZip();
      zip.addFile('test.js', Buffer.from('console.log("Hello World");'));
      zip.addFile('test.py', Buffer.from('print("Hello World")'));
      const zipBuffer = zip.toBuffer();

      const result = await uploadHandler.handleZipUpload(zipBuffer);

      expect(result.status).toBe('success');
      expect(result.sourceType).toBe('zip');
      expect(result.projectId).toBeDefined();
      expect(result.workingDirectory).toContain('test-workspace');
      expect(result.error).toBeUndefined();

      // Verify files were extracted
      const extractedFiles = await fs.readdir(result.workingDirectory);
      expect(extractedFiles).toContain('test.js');
      expect(extractedFiles).toContain('test.py');
    });

    it('should reject ZIP file with no source code files', async () => {
      // Create a ZIP with only non-source files
      const zip = new AdmZip();
      zip.addFile('readme.txt', Buffer.from('This is a readme'));
      zip.addFile('data.json', Buffer.from('{}'));
      const zipBuffer = zip.toBuffer();

      const result = await uploadHandler.handleZipUpload(zipBuffer);

      expect(result.status).toBe('error');
      expect(result.error).toContain('No recognizable source code files found');
    });

    it('should reject ZIP file exceeding size limit', async () => {
      // Create a large ZIP file (>100MB)
      const zip = new AdmZip();
      const largeBuffer = Buffer.alloc(101 * 1024 * 1024); // 101MB
      zip.addFile('large.js', largeBuffer);
      const zipBuffer = zip.toBuffer();

      const result = await uploadHandler.handleZipUpload(zipBuffer);

      expect(result.status).toBe('error');
      expect(result.error).toContain('exceeds 100MB limit');
    });

    it('should handle corrupted ZIP file gracefully', async () => {
      const corruptedBuffer = Buffer.from('not a valid zip file');

      const result = await uploadHandler.handleZipUpload(corruptedBuffer);

      expect(result.status).toBe('error');
      expect(result.error).toBeDefined();
    });
  });

  describe('validateSize', () => {
    it('should return true for directory under 100MB', async () => {
      // Create a small test directory
      const testDir = path.join(testWorkspace, 'small-test');
      await fs.mkdir(testDir, { recursive: true });
      await fs.writeFile(path.join(testDir, 'test.js'), 'console.log("test");');

      const isValid = await uploadHandler.validateSize(testDir);

      expect(isValid).toBe(true);
    });

    it('should return false for non-existent directory', async () => {
      const isValid = await uploadHandler.validateSize('./non-existent-dir');

      expect(isValid).toBe(false);
    });
  });

  describe('validateContent', () => {
    it('should return true when source files are present', async () => {
      const testDir = path.join(testWorkspace, 'with-source');
      await fs.mkdir(testDir, { recursive: true });
      await fs.writeFile(path.join(testDir, 'index.js'), 'console.log("test");');

      const isValid = await uploadHandler.validateContent(testDir);

      expect(isValid).toBe(true);
    });

    it('should return true when source files are in subdirectories', async () => {
      const testDir = path.join(testWorkspace, 'nested-source');
      const srcDir = path.join(testDir, 'src');
      await fs.mkdir(srcDir, { recursive: true });
      await fs.writeFile(path.join(srcDir, 'app.py'), 'print("test")');

      const isValid = await uploadHandler.validateContent(testDir);

      expect(isValid).toBe(true);
    });

    it('should return false when no source files are present', async () => {
      const testDir = path.join(testWorkspace, 'no-source');
      await fs.mkdir(testDir, { recursive: true });
      await fs.writeFile(path.join(testDir, 'readme.txt'), 'Just a readme');

      const isValid = await uploadHandler.validateContent(testDir);

      expect(isValid).toBe(false);
    });

    it('should skip node_modules and other common directories', async () => {
      const testDir = path.join(testWorkspace, 'with-node-modules');
      const nodeModulesDir = path.join(testDir, 'node_modules');
      await fs.mkdir(nodeModulesDir, { recursive: true });
      await fs.writeFile(path.join(nodeModulesDir, 'package.js'), 'module.exports = {}');

      const isValid = await uploadHandler.validateContent(testDir);

      expect(isValid).toBe(false);
    });

    it('should return false for non-existent directory', async () => {
      const isValid = await uploadHandler.validateContent('./non-existent-dir');

      expect(isValid).toBe(false);
    });
  });

  describe('handleGitHubUpload', () => {
    it('should reject invalid GitHub URL', async () => {
      const result = await uploadHandler.handleGitHubUpload('not-a-valid-url');

      expect(result.status).toBe('error');
      expect(result.error).toContain('Invalid GitHub URL format');
    });

    it('should reject non-GitHub URL', async () => {
      const result = await uploadHandler.handleGitHubUpload('https://gitlab.com/user/repo');

      expect(result.status).toBe('error');
      expect(result.error).toContain('Invalid GitHub URL format');
    });

    // Note: Testing actual GitHub cloning requires network access and a real repository
    // These tests would be better suited for integration tests
  });
});
