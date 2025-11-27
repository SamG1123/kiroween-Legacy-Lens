/**
 * Example usage of DocumentationPackager
 * 
 * This example demonstrates how to use the DocumentationPackager
 * to package generated documentation into downloadable formats.
 */

import { DocumentationPackager } from './DocumentationPackager';
import {
  DocumentationSet,
  DocumentationMetadata,
  AnnotatedCode,
} from '../types';
import * as fs from 'fs';
import * as path from 'path';

async function exampleUsage() {
  // Create a packager instance
  const packager = new DocumentationPackager();

  // Create sample documentation set
  const metadata: DocumentationMetadata = {
    projectId: 'my-awesome-project',
    generatedAt: new Date(),
    generator: 'documentation-generator',
    version: '1.0.0',
    options: {
      types: ['readme', 'api', 'architecture', 'comments'],
      depth: 'comprehensive',
      excludePaths: ['node_modules', 'dist'],
      mergeExisting: false,
    },
    statistics: {
      filesDocumented: 25,
      functionsDocumented: 150,
      classesDocumented: 30,
      apiEndpointsDocumented: 12,
    },
  };

  const comments = new Map<string, AnnotatedCode>();
  comments.set('src/index.ts', {
    originalCode: 'export function main() {\n  console.log("Hello");\n}',
    annotatedCode:
      '/**\n * Main entry point\n */\nexport function main() {\n  console.log("Hello");\n}',
    comments: [{ line: 1, comment: 'Main entry point' }],
  });

  const docs: DocumentationSet = {
    readme: `# My Awesome Project

## Overview
This is a comprehensive documentation example.

## Installation
\`\`\`bash
npm install my-awesome-project
\`\`\`

## Usage
\`\`\`typescript
import { main } from 'my-awesome-project';
main();
\`\`\`
`,
    api: `# API Documentation

## Endpoints

### GET /api/users
Returns a list of users.

**Response:**
\`\`\`json
{
  "users": [
    { "id": 1, "name": "John" }
  ]
}
\`\`\`
`,
    architecture: `# Architecture

## System Overview
The system follows a layered architecture pattern.

## Components

### API Layer
Handles HTTP requests and responses.

### Service Layer
Contains business logic.

### Data Layer
Manages data persistence.
`,
    comments,
    metadata,
  };

  // Example 1: Generate manifest
  console.log('Generating manifest...');
  const manifest = packager.generateManifest(docs);
  console.log('Manifest files:', manifest.files.length);
  console.log('Project ID:', manifest.projectId);

  // Example 2: Convert to HTML
  console.log('\nConverting to HTML...');
  const htmlDocs = await packager.convertToHTML(docs);
  console.log('HTML files generated:', htmlDocs.files.size);

  // Example 3: Create archive
  console.log('\nCreating archive...');
  const archive = await packager.createArchive(docs, manifest, htmlDocs);
  console.log('Archive size:', archive.length, 'bytes');

  // Example 4: Complete packaging
  console.log('\nPackaging all documentation...');
  const packagedDocs = await packager.package(docs);
  console.log('Package complete!');
  console.log('- Archive size:', packagedDocs.archive.length, 'bytes');
  console.log('- Manifest files:', packagedDocs.manifest.files.length);
  console.log('- HTML files:', packagedDocs.htmlVersion.files.size);

  // Optional: Save to disk
  const outputPath = path.join(__dirname, 'example-docs.zip');
  fs.writeFileSync(outputPath, packagedDocs.archive);
  console.log(`\nArchive saved to: ${outputPath}`);

  return packagedDocs;
}

// Run example if executed directly
if (require.main === module) {
  exampleUsage()
    .then(() => console.log('\nExample completed successfully!'))
    .catch((error) => console.error('Example failed:', error));
}

export { exampleUsage };
