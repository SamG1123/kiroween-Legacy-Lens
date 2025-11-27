/**
 * Example usage of DocumentationOptionsHandler
 */

import { DocumentationOptionsHandler } from './DocumentationOptionsHandler';

// Example 1: Basic usage with defaults
const basicHandler = new DocumentationOptionsHandler();
console.log('Default options:', basicHandler.getOptions());

// Example 2: Custom configuration
const customHandler = new DocumentationOptionsHandler({
  types: ['readme', 'api'], // Only generate README and API docs
  depth: 'comprehensive', // Maximum detail level
  excludePaths: ['node_modules/**', '**/*.test.ts', 'dist/**'], // Exclude patterns
  mergeExisting: true, // Merge with existing docs instead of replacing
});

// Check if specific documentation types should be generated
if (customHandler.shouldGenerateType('readme')) {
  console.log('Generating README...');
}

if (customHandler.shouldGenerateType('architecture')) {
  console.log('Skipping architecture docs (not in types list)');
}

// Example 3: Using exclusion patterns
const files = [
  'src/index.ts',
  'src/utils.test.ts',
  'node_modules/package/index.js',
  'dist/bundle.js',
];

files.forEach((file) => {
  if (!customHandler.shouldExclude(file)) {
    console.log(`Processing: ${file}`);
  } else {
    console.log(`Excluding: ${file}`);
  }
});

// Example 4: Depth level control
const minimalHandler = new DocumentationOptionsHandler({ depth: 'minimal' });
const comprehensiveHandler = new DocumentationOptionsHandler({ depth: 'comprehensive' });

// Check if certain details should be included based on depth
if (minimalHandler.shouldIncludeDetail('comprehensive')) {
  console.log('Include comprehensive details'); // Won't execute
}

if (comprehensiveHandler.shouldIncludeDetail('minimal')) {
  console.log('Include minimal details'); // Will execute
}

// Example 5: Custom templates
async function useCustomTemplates() {
  const templates = new Map([
    ['readme', '# {{projectName}}\n\n{{description}}\n\n## Installation\n{{installation}}'],
    ['api', '## API Documentation\n\n{{endpoints}}'],
  ]);

  const handler = new DocumentationOptionsHandler({
    customTemplates: templates,
  });

  // Load and apply template
  const readmeTemplate = await handler.loadCustomTemplate('readme');
  if (readmeTemplate) {
    const rendered = handler.applyTemplate(readmeTemplate, {
      projectName: 'My Project',
      description: 'A great project',
      installation: 'npm install',
    });
    console.log('Rendered README:', rendered);
  }
}

// Example 6: Merging existing documentation
const mergeHandler = new DocumentationOptionsHandler({ mergeExisting: true });
const replaceHandler = new DocumentationOptionsHandler({ mergeExisting: false });

const existingDoc = '# Old Documentation\n\nThis is the old content.';
const newDoc = '# New Documentation\n\nThis is the new content.';

console.log('Merged:', mergeHandler.mergeDocumentation(existingDoc, newDoc));
console.log('Replaced:', replaceHandler.mergeDocumentation(existingDoc, newDoc));

// Example 7: Complete workflow
async function completeWorkflow() {
  const handler = new DocumentationOptionsHandler({
    types: ['readme', 'api', 'architecture'],
    depth: 'standard',
    excludePaths: ['**/*.test.ts', 'node_modules/**'],
    mergeExisting: false,
  });

  // Get configuration
  const options = handler.getOptions();
  console.log('Configuration:', options);

  // Process files
  const filesToProcess = ['src/index.ts', 'src/api.ts', 'src/utils.test.ts'];
  const validFiles = filesToProcess.filter((file) => !handler.shouldExclude(file));

  console.log('Files to document:', validFiles);

  // Generate documentation for each type
  for (const type of options.types) {
    if (handler.shouldGenerateType(type)) {
      console.log(`Generating ${type} documentation...`);

      // Use depth level to determine detail
      const detailLevel = handler.getDetailLevel();
      console.log(`Detail level: ${detailLevel}`);

      // Generate content based on depth
      if (handler.shouldIncludeDetail('comprehensive')) {
        console.log('Including comprehensive details');
      } else if (handler.shouldIncludeDetail('standard')) {
        console.log('Including standard details');
      } else {
        console.log('Including minimal details');
      }
    }
  }
}

// Run examples
useCustomTemplates();
completeWorkflow();
