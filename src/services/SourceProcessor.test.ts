import { SourceProcessor } from './SourceProcessor';
import * as fs from 'fs/promises';
import * as path from 'path';
import { existsSync } from 'fs';
import AdmZip from 'adm-zip';

describe('SourceProcessor', () => {
  let processor: SourceProcessor;
  let testDir: string;

  beforeEach(async () => {
    processor = new SourceProcessor();
    testDir = path.join(__dirname, '../../test-workspace', `test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    // Cleanup test directory
    if (existsSync(testDir)) {
      await fs.rm(testDir, { recursive: true, force: true });
    }
  });

  describe('extractZip', () => {
    it('should extract a ZIP file to target directory', async () => {
      // Create a test ZIP file
      const zipPath = path.join(testDir, 'test.zip');
      const zip = new AdmZip();
      zip.addFile('test.js', Buffer.from('console.log("test");'));
      zip.addFile('src/index.ts', Buffer.from('export const test = 1;'));
      zip.writeZip(zipPath);

      // Extract the ZIP
      const extractDir = path.join(testDir, 'extracted');
      await processor.extractZip(zipPath, extractDir);

      // Verify extraction
      expect(existsSync(path.join(extractDir, 'test.js'))).toBe(true);
      expect(existsSync(path.join(extractDir, 'src', 'index.ts'))).toBe(true);
    });

    it('should throw error if ZIP file does not exist', async () => {
      const nonExistentZip = path.join(testDir, 'nonexistent.zip');
      const extractDir = path.join(testDir, 'extracted');

      await expect(processor.extractZip(nonExistentZip, extractDir)).rejects.toThrow(
        'ZIP file not found'
      );
    });
  });

  describe('cloneRepository', () => {
    it('should throw error for invalid Git URL', async () => {
      const invalidUrl = 'not-a-valid-url';
      const targetDir = path.join(testDir, 'repo');

      await expect(processor.cloneRepository(invalidUrl, targetDir)).rejects.toThrow(
        'Invalid Git repository URL'
      );
    });

    // Note: Actual cloning test would require network access and is better suited for integration tests
  });

  describe('listSourceFiles', () => {
    it('should list all files in directory recursively', async () => {
      // Create test file structure
      await fs.mkdir(path.join(testDir, 'src'), { recursive: true });
      await fs.writeFile(path.join(testDir, 'index.js'), 'test');
      await fs.writeFile(path.join(testDir, 'src', 'app.ts'), 'test');
      await fs.writeFile(path.join(testDir, 'README.md'), 'test');

      const files = await processor.listSourceFiles(testDir);

      expect(files).toHaveLength(3);
      expect(files.some(f => f.endsWith('index.js'))).toBe(true);
      expect(files.some(f => f.endsWith('app.ts'))).toBe(true);
      expect(files.some(f => f.endsWith('README.md'))).toBe(true);
    });

    it('should skip node_modules directory', async () => {
      // Create test file structure with node_modules
      await fs.mkdir(path.join(testDir, 'node_modules', 'package'), { recursive: true });
      await fs.writeFile(path.join(testDir, 'index.js'), 'test');
      await fs.writeFile(path.join(testDir, 'node_modules', 'package', 'index.js'), 'test');

      const files = await processor.listSourceFiles(testDir);

      // Filter to only .js files to avoid any leftover files from other tests
      const jsFiles = files.filter(f => f.endsWith('.js'));
      
      expect(jsFiles).toHaveLength(1);
      expect(jsFiles[0]).toContain('index.js');
      expect(jsFiles[0]).not.toContain('node_modules');
    });

    it('should skip .git directory', async () => {
      // Create test file structure with .git
      await fs.mkdir(testDir, { recursive: true });
      await fs.mkdir(path.join(testDir, '.git', 'objects'), { recursive: true });
      await fs.writeFile(path.join(testDir, 'index.js'), 'test');
      await fs.writeFile(path.join(testDir, '.git', 'config'), 'test');

      const files = await processor.listSourceFiles(testDir);

      expect(files).toHaveLength(1);
      expect(files[0]).toContain('index.js');
      expect(files[0]).not.toContain('.git');
    });

    it('should throw error if directory does not exist', async () => {
      const nonExistentDir = path.join(testDir, 'nonexistent');

      await expect(processor.listSourceFiles(nonExistentDir)).rejects.toThrow(
        'Directory not found'
      );
    });
  });

  describe('filterNonCodeFiles', () => {
    it('should filter to only source code files', () => {
      const files = [
        '/path/to/index.js',
        '/path/to/app.ts',
        '/path/to/style.css',
        '/path/to/README.md',
        '/path/to/image.png',
        '/path/to/data.json',
        '/path/to/main.py',
        '/path/to/App.java'
      ];

      const filtered = processor.filterNonCodeFiles(files);

      expect(filtered).toHaveLength(5);
      expect(filtered).toContain('/path/to/index.js');
      expect(filtered).toContain('/path/to/app.ts');
      expect(filtered).toContain('/path/to/style.css');
      expect(filtered).toContain('/path/to/main.py');
      expect(filtered).toContain('/path/to/App.java');
      expect(filtered).not.toContain('/path/to/README.md');
      expect(filtered).not.toContain('/path/to/image.png');
    });

    it('should handle empty file list', () => {
      const filtered = processor.filterNonCodeFiles([]);
      expect(filtered).toHaveLength(0);
    });

    it('should be case-insensitive for extensions', () => {
      const files = [
        '/path/to/App.JS',
        '/path/to/Main.PY',
        '/path/to/Style.CSS'
      ];

      const filtered = processor.filterNonCodeFiles(files);

      expect(filtered).toHaveLength(3);
    });
  });
});
