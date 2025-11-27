# DocumentationOptionsHandler

The `DocumentationOptionsHandler` class provides a comprehensive interface for managing documentation generation configuration. It handles parsing, validation, and application of documentation options.

## Features

- **Configuration Parsing**: Parse and validate documentation generation options
- **Type Selection**: Control which documentation types to generate (README, API, Architecture, Comments)
- **Depth Control**: Adjust detail level (minimal, standard, comprehensive)
- **Exclusion Patterns**: Use glob patterns to exclude files/directories
- **Custom Templates**: Load and apply custom documentation templates
- **Merge Strategy**: Choose between merging or replacing existing documentation

## Usage

### Basic Usage

```typescript
import { DocumentationOptionsHandler } from './utils';

// Create handler with default options
const handler = new DocumentationOptionsHandler();

// Get current options
const options = handler.getOptions();
console.log(options);
// {
//   types: ['readme', 'api', 'architecture', 'comments'],
//   depth: 'standard',
//   excludePaths: [],
//   mergeExisting: false
// }
```

### Custom Configuration

```typescript
const handler = new DocumentationOptionsHandler({
  types: ['readme', 'api'], // Only generate README and API docs
  depth: 'comprehensive', // Maximum detail
  excludePaths: ['node_modules/**', '**/*.test.ts', 'dist/**'],
  mergeExisting: true, // Merge with existing docs
});
```

### Checking Documentation Types

```typescript
if (handler.shouldGenerateType('readme')) {
  console.log('Generating README...');
}

if (handler.shouldGenerateType('architecture')) {
  console.log('Skipping architecture docs');
}
```

### Using Exclusion Patterns

```typescript
const files = [
  'src/index.ts',
  'src/utils.test.ts',
  'node_modules/package/index.js',
  'dist/bundle.js',
];

const filesToDocument = files.filter(file => !handler.shouldExclude(file));
// Result: ['src/index.ts']
```

### Depth Level Control

```typescript
const handler = new DocumentationOptionsHandler({ depth: 'comprehensive' });

// Check if specific detail levels should be included
if (handler.shouldIncludeDetail('minimal')) {
  console.log('Include basic information');
}

if (handler.shouldIncludeDetail('comprehensive')) {
  console.log('Include detailed analysis');
}

// Get numeric detail level (1=minimal, 2=standard, 3=comprehensive)
const level = handler.getDetailLevel(); // Returns 3
```

### Custom Templates

```typescript
const templates = new Map([
  ['readme', '# {{projectName}}\n\n{{description}}'],
  ['api', '## API\n\n{{endpoints}}'],
]);

const handler = new DocumentationOptionsHandler({
  customTemplates: templates,
});

// Load template
const template = await handler.loadCustomTemplate('readme');

// Apply template with variables
const rendered = handler.applyTemplate(template, {
  projectName: 'My Project',
  description: 'A great project',
});

console.log(rendered);
// # My Project
//
// A great project
```

### Merging Documentation

```typescript
const mergeHandler = new DocumentationOptionsHandler({ mergeExisting: true });
const replaceHandler = new DocumentationOptionsHandler({ mergeExisting: false });

const existing = '# Old Documentation\n\nOld content';
const generated = '# New Documentation\n\nNew content';

// Merge strategy
const merged = mergeHandler.mergeDocumentation(existing, generated);
// Result: Old content + separator + New content

// Replace strategy
const replaced = replaceHandler.mergeDocumentation(existing, generated);
// Result: New content only
```

## API Reference

### Constructor

```typescript
constructor(options?: Partial<DocumentationOptions>)
```

Creates a new handler with the specified options. Unspecified options use defaults.

### Methods

#### `getOptions(): DocumentationOptions`

Returns the current documentation options.

#### `shouldGenerateType(type: 'readme' | 'api' | 'architecture' | 'comments'): boolean`

Checks if a specific documentation type should be generated.

#### `getDepthLevel(): 'minimal' | 'standard' | 'comprehensive'`

Returns the current depth level setting.

#### `getDetailLevel(): number`

Returns a numeric representation of the depth level (1=minimal, 2=standard, 3=comprehensive).

#### `shouldIncludeDetail(requiredLevel: 'minimal' | 'standard' | 'comprehensive'): boolean`

Checks if a specific detail level should be included based on current depth setting.

#### `shouldExclude(filePath: string): boolean`

Checks if a file or directory should be excluded based on exclusion patterns.

#### `async loadCustomTemplate(templateName: string): Promise<string | undefined>`

Loads a custom template by name. Returns undefined if template doesn't exist.

#### `applyTemplate(templateContent: string, variables: Record<string, string>): string`

Applies variables to a template using `{{variableName}}` syntax.

#### `shouldMergeExisting(): boolean`

Returns whether existing documentation should be merged or replaced.

#### `mergeDocumentation(existing: string, generated: string): string`

Merges or replaces documentation based on the merge setting.

## Configuration Options

### `types`

Array of documentation types to generate.

- **Type**: `('readme' | 'api' | 'architecture' | 'comments')[]`
- **Default**: `['readme', 'api', 'architecture', 'comments']`
- **Example**: `['readme', 'api']`

### `depth`

Level of detail for generated documentation.

- **Type**: `'minimal' | 'standard' | 'comprehensive'`
- **Default**: `'standard'`
- **Values**:
  - `minimal`: Basic information only
  - `standard`: Balanced detail level
  - `comprehensive`: Maximum detail and analysis

### `excludePaths`

Glob patterns for files/directories to exclude.

- **Type**: `string[]`
- **Default**: `[]`
- **Example**: `['node_modules/**', '**/*.test.ts', 'dist/**']`

### `customTemplates`

Custom templates for documentation generation.

- **Type**: `Map<string, string> | undefined`
- **Default**: `undefined`
- **Example**: `new Map([['readme', '# {{title}}\n{{content}}']])`

### `mergeExisting`

Whether to merge with or replace existing documentation.

- **Type**: `boolean`
- **Default**: `false`
- **Values**:
  - `true`: Merge new content with existing
  - `false`: Replace existing content

## Requirements Validation

This implementation satisfies the following requirements from the specification:

- **Requirement 6.1**: Configuration parsing for documentation types ✓
- **Requirement 6.2**: Depth level handling (minimal, standard, comprehensive) ✓
- **Requirement 6.3**: Exclusion pattern matching ✓
- **Requirement 6.4**: Custom template loading and application ✓
- **Requirement 6.5**: Merge vs replace logic for existing documentation ✓

## Testing

The handler includes comprehensive unit tests covering:

- Configuration parsing and validation
- Documentation type filtering
- Depth level handling
- Exclusion pattern matching
- Custom template loading and application
- Template variable replacement
- Documentation merging strategies
- Integration scenarios

Run tests with:

```bash
npm test -- DocumentationOptionsHandler.test.ts
```
