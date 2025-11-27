import { DocumentationPackager } from './DocumentationPackager';
import {
  DocumentationSet,
  DocumentationMetadata,
  AnnotatedCode,
} from '../types';
import AdmZip from 'adm-zip';

describe('DocumentationPackager', () => {
  let packager: DocumentationPackager;

  beforeEach(() => {
    packager = new DocumentationPackager();
  });

  const createMockDocumentationSet = (
    includeApi = true,
    includeArchitecture = true,
    includeComments = true
  ): DocumentationSet => {
    const metadata: DocumentationMetadata = {
      projectId: 'test-project',
      generatedAt: new Date('2024-01-01T00:00:00Z'),
      generator: 'test-generator',
      version: '1.0.0',
      options: {
        types: ['readme', 'api', 'architecture', 'comments'],
        depth: 'standard',
        excludePaths: [],
        mergeExisting: false,
      },
      statistics: {
        filesDocumented: 5,
        functionsDocumented: 10,
        classesDocumented: 3,
        apiEndpointsDocumented: 4,
      },
    };

    const comments = new Map<string, AnnotatedCode>();
    if (includeComments) {
      comments.set('src/index.ts', {
        originalCode: 'function hello() {}',
        annotatedCode: '// Main entry point\nfunction hello() {}',
        comments: [{ line: 1, comment: 'Main entry point' }],
      });
      comments.set('src/utils/helper.ts', {
        originalCode: 'export const add = (a, b) => a + b;',
        annotatedCode:
          '// Adds two numbers\nexport const add = (a, b) => a + b;',
        comments: [{ line: 1, comment: 'Adds two numbers' }],
      });
    }

    return {
      readme: '# Test Project\n\nThis is a test project.',
      api: includeApi ? '# API Documentation\n\n## GET /api/test' : undefined,
      architecture: includeArchitecture
        ? '# Architecture\n\n## Components'
        : undefined,
      comments,
      metadata,
    };
  };

  describe('generateManifest', () => {
    it('should generate manifest with all file types', () => {
      const docs = createMockDocumentationSet();
      const manifest = packager.generateManifest(docs);

      expect(manifest.projectId).toBe('test-project');
      expect(manifest.version).toBe('1.0.0');
      expect(manifest.files).toContain('markdown/README.md');
      expect(manifest.files).toContain('html/README.html');
      expect(manifest.files).toContain('markdown/API.md');
      expect(manifest.files).toContain('html/API.html');
      expect(manifest.files).toContain('markdown/ARCHITECTURE.md');
      expect(manifest.files).toContain('html/ARCHITECTURE.html');
      expect(manifest.files).toContain('markdown/comments/src/index.ts');
      expect(manifest.files).toContain('html/comments/src/index.html');
      expect(manifest.files).toContain('manifest.json');
      expect(manifest.files).toContain('metadata.json');
    });

    it('should generate manifest with only README when other docs are missing', () => {
      const docs = createMockDocumentationSet(false, false, false);
      const manifest = packager.generateManifest(docs);

      expect(manifest.files).toContain('markdown/README.md');
      expect(manifest.files).toContain('html/README.html');
      expect(manifest.files).not.toContain('markdown/API.md');
      expect(manifest.files).not.toContain('markdown/ARCHITECTURE.md');
    });

    it('should sort files alphabetically', () => {
      const docs = createMockDocumentationSet();
      const manifest = packager.generateManifest(docs);

      const sortedFiles = [...manifest.files].sort();
      expect(manifest.files).toEqual(sortedFiles);
    });

    it('should handle file paths with leading slashes', () => {
      const docs = createMockDocumentationSet();
      docs.comments.set('/absolute/path/file.ts', {
        originalCode: 'code',
        annotatedCode: '// comment\ncode',
        comments: [{ line: 1, comment: 'comment' }],
      });

      const manifest = packager.generateManifest(docs);
      expect(manifest.files).toContain('markdown/comments/absolute/path/file.ts');
    });
  });

  describe('convertToHTML', () => {
    it('should convert README markdown to HTML', async () => {
      const docs = createMockDocumentationSet(false, false, false);
      const htmlDocs = await packager.convertToHTML(docs);

      expect(htmlDocs.files.has('README.html')).toBe(true);
      const html = htmlDocs.files.get('README.html')!;
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<h1>Test Project</h1>');
      expect(html).toContain('This is a test project.');
    });

    it('should convert API documentation to HTML', async () => {
      const docs = createMockDocumentationSet(true, false, false);
      const htmlDocs = await packager.convertToHTML(docs);

      expect(htmlDocs.files.has('API.html')).toBe(true);
      const html = htmlDocs.files.get('API.html')!;
      expect(html).toContain('<h1>API Documentation</h1>');
      expect(html).toContain('GET /api/test');
    });

    it('should convert architecture documentation to HTML', async () => {
      const docs = createMockDocumentationSet(false, true, false);
      const htmlDocs = await packager.convertToHTML(docs);

      expect(htmlDocs.files.has('ARCHITECTURE.html')).toBe(true);
      const html = htmlDocs.files.get('ARCHITECTURE.html')!;
      expect(html).toContain('<h1>Architecture</h1>');
    });

    it('should convert annotated code files to HTML', async () => {
      const docs = createMockDocumentationSet(false, false, true);
      const htmlDocs = await packager.convertToHTML(docs);

      expect(htmlDocs.files.has('comments/src/index.html')).toBe(true);
      expect(htmlDocs.files.has('comments/src/utils/helper.html')).toBe(true);
    });

    it('should include proper HTML structure with styling', async () => {
      const docs = createMockDocumentationSet(false, false, false);
      const htmlDocs = await packager.convertToHTML(docs);

      const html = htmlDocs.files.get('README.html')!;
      expect(html).toContain('<meta charset="UTF-8">');
      expect(html).toContain('<style>');
      expect(html).toContain('font-family:');
      expect(html).toContain('</style>');
      expect(html).toContain('</html>');
    });

    it('should escape HTML in page title attribute', async () => {
      const docs = createMockDocumentationSet(false, false, false);
      docs.metadata.projectId = 'test<script>alert("xss")</script>';
      const htmlDocs = await packager.convertToHTML(docs);

      const html = htmlDocs.files.get('README.html')!;
      // Check that the title tag has escaped HTML
      expect(html).toMatch(/<title>.*&lt;script&gt;.*<\/title>/);
      expect(html).not.toMatch(/<title>.*<script>alert.*<\/title>/);
    });
  });

  describe('createArchive', () => {
    it('should create a valid ZIP archive', async () => {
      const docs = createMockDocumentationSet();
      const manifest = packager.generateManifest(docs);
      const htmlVersion = await packager.convertToHTML(docs);

      const archive = await packager.createArchive(docs, manifest, htmlVersion);

      expect(Buffer.isBuffer(archive)).toBe(true);
      expect(archive.length).toBeGreaterThan(0);

      // Verify it's a valid ZIP
      const zip = new AdmZip(archive);
      const entries = zip.getEntries();
      expect(entries.length).toBeGreaterThan(0);
    });

    it('should include markdown files in archive', async () => {
      const docs = createMockDocumentationSet();
      const manifest = packager.generateManifest(docs);
      const htmlVersion = await packager.convertToHTML(docs);

      const archive = await packager.createArchive(docs, manifest, htmlVersion);
      const zip = new AdmZip(archive);

      const readmeEntry = zip.getEntry('markdown/README.md');
      expect(readmeEntry).toBeTruthy();
      expect(readmeEntry!.getData().toString()).toContain('Test Project');

      const apiEntry = zip.getEntry('markdown/API.md');
      expect(apiEntry).toBeTruthy();

      const archEntry = zip.getEntry('markdown/ARCHITECTURE.md');
      expect(archEntry).toBeTruthy();
    });

    it('should include HTML files in archive', async () => {
      const docs = createMockDocumentationSet();
      const manifest = packager.generateManifest(docs);
      const htmlVersion = await packager.convertToHTML(docs);

      const archive = await packager.createArchive(docs, manifest, htmlVersion);
      const zip = new AdmZip(archive);

      const htmlEntry = zip.getEntry('html/README.html');
      expect(htmlEntry).toBeTruthy();
      expect(htmlEntry!.getData().toString()).toContain('<!DOCTYPE html>');
    });

    it('should include manifest.json in archive', async () => {
      const docs = createMockDocumentationSet();
      const manifest = packager.generateManifest(docs);
      const htmlVersion = await packager.convertToHTML(docs);

      const archive = await packager.createArchive(docs, manifest, htmlVersion);
      const zip = new AdmZip(archive);

      const manifestEntry = zip.getEntry('manifest.json');
      expect(manifestEntry).toBeTruthy();

      const manifestData = JSON.parse(manifestEntry!.getData().toString());
      expect(manifestData.projectId).toBe('test-project');
      expect(manifestData.files).toBeInstanceOf(Array);
    });

    it('should include metadata.json in archive', async () => {
      const docs = createMockDocumentationSet();
      const manifest = packager.generateManifest(docs);
      const htmlVersion = await packager.convertToHTML(docs);

      const archive = await packager.createArchive(docs, manifest, htmlVersion);
      const zip = new AdmZip(archive);

      const metadataEntry = zip.getEntry('metadata.json');
      expect(metadataEntry).toBeTruthy();

      const metadata = JSON.parse(metadataEntry!.getData().toString());
      expect(metadata.projectId).toBe('test-project');
      expect(metadata.version).toBe('1.0.0');
    });

    it('should include annotated code files in archive', async () => {
      const docs = createMockDocumentationSet();
      const manifest = packager.generateManifest(docs);
      const htmlVersion = await packager.convertToHTML(docs);

      const archive = await packager.createArchive(docs, manifest, htmlVersion);
      const zip = new AdmZip(archive);

      const codeEntry = zip.getEntry('markdown/comments/src/index.ts');
      expect(codeEntry).toBeTruthy();
      expect(codeEntry!.getData().toString()).toContain('Main entry point');
    });
  });

  describe('package', () => {
    it('should create complete packaged documentation', async () => {
      const docs = createMockDocumentationSet();
      const packagedDocs = await packager.package(docs);

      expect(packagedDocs.archive).toBeInstanceOf(Buffer);
      expect(packagedDocs.manifest).toBeDefined();
      expect(packagedDocs.manifest.projectId).toBe('test-project');
      expect(packagedDocs.htmlVersion).toBeDefined();
      expect(packagedDocs.htmlVersion.files.size).toBeGreaterThan(0);
    });

    it('should create archive with all components', async () => {
      const docs = createMockDocumentationSet();
      const packagedDocs = await packager.package(docs);

      const zip = new AdmZip(packagedDocs.archive);
      const entries = zip.getEntries();

      // Should have markdown files, HTML files, manifest, and metadata
      expect(entries.length).toBeGreaterThan(5);
    });

    it('should handle minimal documentation set', async () => {
      const docs = createMockDocumentationSet(false, false, false);
      const packagedDocs = await packager.package(docs);

      expect(packagedDocs.archive).toBeInstanceOf(Buffer);
      expect(packagedDocs.manifest.files).toContain('markdown/README.md');
      expect(packagedDocs.htmlVersion.files.has('README.html')).toBe(true);
    });
  });
});
