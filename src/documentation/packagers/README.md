# Documentation Packager

The Documentation Packager module handles the final stage of documentation generation: packaging all generated documentation into downloadable, organized formats.

## Overview

The `DocumentationPackager` class provides functionality to:
- Package documentation into ZIP archives
- Convert markdown documentation to HTML
- Generate manifest files listing all documentation
- Organize files in a logical directory structure
- Preserve formatting and diagrams

## Features

### 1. Archive Creation
Creates compressed ZIP archives containing all documentation files in both markdown and HTML formats.

### 2. HTML Conversion
Converts markdown documentation to styled HTML with:
- Responsive design
- Syntax highlighting for code blocks
- Clean, readable typography
- GitHub-style markdown rendering

### 3. Manifest Generation
Creates a manifest file that lists all generated documentation files with metadata.

### 4. Logical Organization
Organizes files in a clear directory structure:
```
documentation.zip
├── markdown/
│   ├── README.md
│   ├── API.md
│   ├── ARCHITECTURE.md
│   └── comments/
│       └── src/
│           └── index.ts
├── html/
│   ├── README.html
│   ├── API.html
│   ├── ARCHITECTURE.html
│   └── comments/
│       └── src/
│           └── index.html
├── manifest.json
└── metadata.json
```

## Usage

### Basic Usage

```typescript
import { DocumentationPackager } from './packagers';
import { DocumentationSet } from './types';

const packager = new DocumentationPackager();

// Your documentation set
const docs: DocumentationSet = {
  readme: '# My Project\n\nProject description...',
  api: '# API\n\n## Endpoints...',
  architecture: '# Architecture\n\n## Components...',
  comments: new Map(),
  metadata: {
    projectId: 'my-project',
    generatedAt: new Date(),
    generator: 'doc-gen',
    version: '1.0.0',
    options: { /* ... */ },
    statistics: { /* ... */ }
  }
};

// Package everything
const packagedDocs = await packager.package(docs);

// Save to disk
fs.writeFileSync('docs.zip', packagedDocs.archive);
```

### Individual Operations

```typescript
// Generate manifest only
const manifest = packager.generateManifest(docs);
console.log('Files:', manifest.files);

// Convert to HTML only
const htmlDocs = await packager.convertToHTML(docs);
htmlDocs.files.forEach((html, filename) => {
  console.log(`Generated: ${filename}`);
});

// Create archive with custom manifest
const archive = await packager.createArchive(docs, manifest, htmlDocs);
```

## API Reference

### DocumentationPackager

#### `package(docs: DocumentationSet): Promise<PackagedDocs>`
Packages all documentation into a complete PackagedDocs object with archive, manifest, and HTML versions.

**Parameters:**
- `docs`: The documentation set to package

**Returns:**
- `PackagedDocs` containing:
  - `archive`: Buffer with ZIP file
  - `manifest`: Manifest listing all files
  - `htmlVersion`: HTML versions of all documentation

#### `createArchive(docs: DocumentationSet, manifest: Manifest, htmlVersion: HTMLDocs): Promise<Buffer>`
Creates a ZIP archive containing all documentation files.

**Parameters:**
- `docs`: The documentation set
- `manifest`: The manifest file
- `htmlVersion`: HTML versions of documentation

**Returns:**
- Buffer containing the ZIP archive

#### `generateManifest(docs: DocumentationSet): Manifest`
Generates a manifest file listing all generated documentation.

**Parameters:**
- `docs`: The documentation set

**Returns:**
- `Manifest` object with file list and metadata

#### `convertToHTML(docs: DocumentationSet): Promise<HTMLDocs>`
Converts markdown documentation to HTML format.

**Parameters:**
- `docs`: The documentation set with markdown content

**Returns:**
- `HTMLDocs` object with HTML versions of all files

## Implementation Details

### Archive Format
- Uses the `archiver` library for ZIP creation
- Maximum compression level (9)
- Preserves file paths and directory structure

### HTML Conversion
- Uses `markdown-it` for markdown rendering
- Includes responsive CSS styling
- GitHub-flavored markdown support
- Syntax highlighting for code blocks
- XSS protection through HTML escaping

### File Organization
- Markdown files in `markdown/` directory
- HTML files in `html/` directory
- Annotated code files in `comments/` subdirectories
- Metadata files at root level

## Testing

The module includes comprehensive unit tests covering:
- Manifest generation with various documentation types
- HTML conversion with proper styling
- Archive creation and validation
- Complete packaging workflow
- Edge cases (missing files, special characters, etc.)

Run tests:
```bash
npm test -- DocumentationPackager.test.ts
```

## Requirements Validation

This implementation satisfies the following requirements:

- **Requirement 8.1**: Packages all generated documentation files into a downloadable archive ✓
- **Requirement 8.2**: Organizes documentation files in a logical directory structure ✓
- **Requirement 8.3**: Includes a manifest file listing all generated documentation ✓
- **Requirement 8.4**: Preserves markdown formatting and diagrams ✓
- **Requirement 8.5**: Provides documentation in both markdown and HTML formats ✓

## Example

See `DocumentationPackager.example.ts` for a complete working example.
