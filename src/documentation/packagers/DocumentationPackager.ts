import archiver from 'archiver';
import MarkdownIt from 'markdown-it';
import { Readable } from 'stream';
import {
  DocumentationSet,
  PackagedDocs,
  Manifest,
  HTMLDocs,
} from '../types';

/**
 * DocumentationPackager handles packaging of generated documentation
 * into downloadable formats including ZIP archives and HTML versions.
 */
export class DocumentationPackager {
  private markdown: MarkdownIt;

  constructor() {
    this.markdown = new MarkdownIt({
      html: true,
      linkify: true,
      typographer: true,
    });
  }

  /**
   * Package all documentation into a complete PackagedDocs object
   * @param docs - The documentation set to package
   * @returns Promise resolving to packaged documentation with archive, manifest, and HTML
   */
  async package(docs: DocumentationSet): Promise<PackagedDocs> {
    const manifest = this.generateManifest(docs);
    const htmlVersion = await this.convertToHTML(docs);
    const archive = await this.createArchive(docs, manifest, htmlVersion);

    return {
      archive,
      manifest,
      htmlVersion,
    };
  }

  /**
   * Create a ZIP archive containing all documentation files
   * @param docs - The documentation set
   * @param manifest - The manifest file
   * @param htmlVersion - HTML versions of documentation
   * @returns Promise resolving to Buffer containing ZIP archive
   */
  async createArchive(
    docs: DocumentationSet,
    manifest: Manifest,
    htmlVersion: HTMLDocs
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const archive = archiver('zip', {
        zlib: { level: 9 }, // Maximum compression
      });

      const chunks: Buffer[] = [];

      archive.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });

      archive.on('end', () => {
        resolve(Buffer.concat(chunks));
      });

      archive.on('error', (err: Error) => {
        reject(err);
      });

      // Add markdown files
      if (docs.readme) {
        archive.append(docs.readme, { name: 'markdown/README.md' });
      }

      if (docs.api) {
        archive.append(docs.api, { name: 'markdown/API.md' });
      }

      if (docs.architecture) {
        archive.append(docs.architecture, { name: 'markdown/ARCHITECTURE.md' });
      }

      // Add annotated code files
      if (docs.comments && docs.comments.size > 0) {
        docs.comments.forEach((annotatedCode, filePath) => {
          const safePath = filePath.replace(/^\//, '').replace(/\\/g, '/');
          archive.append(annotatedCode.annotatedCode, {
            name: `markdown/comments/${safePath}`,
          });
        });
      }

      // Add HTML files
      htmlVersion.files.forEach((html, filename) => {
        archive.append(html, { name: `html/${filename}` });
      });

      // Add manifest
      archive.append(JSON.stringify(manifest, null, 2), {
        name: 'manifest.json',
      });

      // Add metadata
      const metadataJson = JSON.stringify(
        {
          ...docs.metadata,
          generatedAt: docs.metadata.generatedAt.toISOString(),
        },
        null,
        2
      );
      archive.append(metadataJson, { name: 'metadata.json' });

      // Finalize the archive
      archive.finalize();
    });
  }

  /**
   * Generate a manifest file listing all generated documentation
   * @param docs - The documentation set
   * @returns Manifest object with file list and metadata
   */
  generateManifest(docs: DocumentationSet): Manifest {
    const files: string[] = [];

    if (docs.readme) {
      files.push('markdown/README.md', 'html/README.html');
    }

    if (docs.api) {
      files.push('markdown/API.md', 'html/API.html');
    }

    if (docs.architecture) {
      files.push('markdown/ARCHITECTURE.md', 'html/ARCHITECTURE.html');
    }

    if (docs.comments && docs.comments.size > 0) {
      docs.comments.forEach((_, filePath) => {
        const safePath = filePath.replace(/^\//, '').replace(/\\/g, '/');
        files.push(`markdown/comments/${safePath}`);
        files.push(`html/comments/${safePath.replace(/\.\w+$/, '.html')}`);
      });
    }

    files.push('manifest.json', 'metadata.json');

    return {
      files: files.sort(),
      generatedAt: new Date(),
      projectId: docs.metadata.projectId,
      version: docs.metadata.version,
    };
  }

  /**
   * Convert markdown documentation to HTML format
   * @param docs - The documentation set with markdown content
   * @returns HTMLDocs object with HTML versions of all files
   */
  async convertToHTML(docs: DocumentationSet): Promise<HTMLDocs> {
    const htmlFiles = new Map<string, string>();

    if (docs.readme) {
      const html = this.wrapInHTMLTemplate(
        this.markdown.render(docs.readme),
        'README',
        docs.metadata.projectId
      );
      htmlFiles.set('README.html', html);
    }

    if (docs.api) {
      const html = this.wrapInHTMLTemplate(
        this.markdown.render(docs.api),
        'API Documentation',
        docs.metadata.projectId
      );
      htmlFiles.set('API.html', html);
    }

    if (docs.architecture) {
      const html = this.wrapInHTMLTemplate(
        this.markdown.render(docs.architecture),
        'Architecture',
        docs.metadata.projectId
      );
      htmlFiles.set('ARCHITECTURE.html', html);
    }

    if (docs.comments && docs.comments.size > 0) {
      docs.comments.forEach((annotatedCode, filePath) => {
        const safePath = filePath.replace(/^\//, '').replace(/\\/g, '/');
        const htmlFilename = `comments/${safePath.replace(/\.\w+$/, '.html')}`;
        
        // Wrap code in markdown code block for proper rendering
        const markdownCode = `# ${filePath}\n\n\`\`\`\n${annotatedCode.annotatedCode}\n\`\`\``;
        const html = this.wrapInHTMLTemplate(
          this.markdown.render(markdownCode),
          filePath,
          docs.metadata.projectId
        );
        htmlFiles.set(htmlFilename, html);
      });
    }

    return { files: htmlFiles };
  }

  /**
   * Wrap rendered HTML content in a complete HTML document template
   * @param content - The rendered HTML content
   * @param title - The page title
   * @param projectId - The project identifier
   * @returns Complete HTML document as string
   */
  private wrapInHTMLTemplate(
    content: string,
    title: string,
    projectId: string
  ): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHtml(title)} - ${this.escapeHtml(projectId)}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      max-width: 900px;
      margin: 0 auto;
      padding: 20px;
      color: #333;
    }
    h1, h2, h3, h4, h5, h6 {
      margin-top: 24px;
      margin-bottom: 16px;
      font-weight: 600;
      line-height: 1.25;
    }
    h1 { font-size: 2em; border-bottom: 1px solid #eaecef; padding-bottom: 0.3em; }
    h2 { font-size: 1.5em; border-bottom: 1px solid #eaecef; padding-bottom: 0.3em; }
    code {
      background-color: #f6f8fa;
      padding: 0.2em 0.4em;
      border-radius: 3px;
      font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
      font-size: 85%;
    }
    pre {
      background-color: #f6f8fa;
      padding: 16px;
      overflow: auto;
      border-radius: 6px;
      line-height: 1.45;
    }
    pre code {
      background-color: transparent;
      padding: 0;
    }
    a {
      color: #0366d6;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 16px 0;
    }
    table th, table td {
      padding: 6px 13px;
      border: 1px solid #dfe2e5;
    }
    table tr:nth-child(2n) {
      background-color: #f6f8fa;
    }
    blockquote {
      padding: 0 1em;
      color: #6a737d;
      border-left: 0.25em solid #dfe2e5;
      margin: 0;
    }
    img {
      max-width: 100%;
    }
  </style>
</head>
<body>
  ${content}
</body>
</html>`;
  }

  /**
   * Escape HTML special characters to prevent XSS
   * @param text - Text to escape
   * @returns Escaped text safe for HTML
   */
  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (char) => map[char]);
  }
}
