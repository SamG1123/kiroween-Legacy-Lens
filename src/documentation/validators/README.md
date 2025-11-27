# Documentation Validator

The Documentation Validator ensures that generated documentation is accurate, consistent, and complete. It validates that all code references exist, terminology is used consistently, and internal links are valid.

## Features

### 1. Code Reference Validation
Validates that all code elements referenced in documentation actually exist in the codebase.

**Validates:**
- Function references (e.g., `calculateTotal()`)
- Class references (e.g., `UserService`)
- Method references (e.g., `MyClass.myMethod()`)
- Variable references
- Module references

**Requirements:** 5.1, 5.5

### 2. Terminology Consistency
Checks that the same concepts are referred to consistently across all documentation.

**Detects:**
- Inconsistent capitalization (e.g., `UserService` vs `userService`)
- Similar terms that might be the same concept
- Plural/singular variations
- Common spelling variations

**Requirements:** 5.3

### 3. Internal Link Validation
Validates that all internal links in documentation point to existing files and anchors.

**Validates:**
- Markdown file links (e.g., `[API](./api.md)`)
- Anchor links (e.g., `[Section](#heading)`)
- Relative path links

**Requirements:** 5.1, 5.5

## Usage

### Basic Usage

```typescript
import { DocumentationValidator, CodeElementRegistry } from './validators';

const validator = new DocumentationValidator();

// Build a registry of code elements
const registry = new CodeElementRegistry();
registry.addFunction('myFunction');
registry.addClass('MyClass');

// Validate documentation
const documentation = 'Use `myFunction()` and `MyClass` for processing.';
const result = validator.validateReferences(documentation, registry);

if (result.isValid) {
  console.log('Documentation is valid!');
} else {
  result.errors.forEach(error => {
    console.log(`Error: ${error.message}`);
  });
}
```

### Validate Terminology Consistency

```typescript
import { DocumentationValidator } from './validators';
import { DocumentationSet } from '../types';

const validator = new DocumentationValidator();

const docSet: DocumentationSet = {
  readme: 'The UserService handles users.',
  api: 'The userService provides endpoints.',
  architecture: 'The user_service manages data.',
  comments: new Map(),
  metadata: { /* ... */ }
};

const result = validator.validateTerminologyConsistency(docSet);

result.warnings.forEach(warning => {
  console.log(`Warning: ${warning.message}`);
  warning.suggestions?.forEach(suggestion => {
    console.log(`  → ${suggestion}`);
  });
});
```

### Validate Internal Links

```typescript
import { DocumentationValidator } from './validators';

const validator = new DocumentationValidator();

const documentation = `
  See [API Documentation](./api.md) for details.
  Check [Architecture](#system-design) for overview.
`;

const availableFiles = ['README.md', 'api.md', 'architecture.md'];

const result = validator.validateInternalLinks(documentation, availableFiles);

if (!result.isValid) {
  result.errors.forEach(error => {
    console.log(`Broken link: ${error.message}`);
  });
}
```

### Validate All Aspects

```typescript
import { DocumentationValidator } from './validators';
import { DocumentationSet, ProjectContext } from '../types';

const validator = new DocumentationValidator();

// Comprehensive validation
const result = await validator.validateAll(
  documentationSet,
  projectContext,
  '/path/to/codebase'
);

console.log(`Valid: ${result.isValid}`);
console.log(`Errors: ${result.errors.length}`);
console.log(`Warnings: ${result.warnings.length}`);

// Display all issues
result.errors.forEach(error => {
  console.log(`❌ ${error.type}: ${error.message}`);
});

result.warnings.forEach(warning => {
  console.log(`⚠️  ${warning.type}: ${warning.message}`);
});
```

## API Reference

### DocumentationValidator

Main validator class that provides validation methods.

#### Methods

##### `validateReferences(documentation: string, codeElements: CodeElementRegistry): ValidationResult`
Validates that all code references in documentation exist in the codebase.

##### `validateTerminologyConsistency(documentationSet: DocumentationSet): ValidationResult`
Checks for consistent terminology usage across all documentation.

##### `validateInternalLinks(documentation: string, availableFiles: string[]): ValidationResult`
Validates that all internal links point to existing files and anchors.

##### `validateAll(documentationSet: DocumentationSet, projectContext: ProjectContext, codebasePath: string): Promise<ValidationResult>`
Performs comprehensive validation of all aspects.

### CodeElementRegistry

Registry for storing and querying code elements.

#### Methods

- `addFunction(name: string): void` - Register a function
- `addClass(name: string): void` - Register a class
- `addVariable(name: string): void` - Register a variable
- `addFile(filePath: string): void` - Register a file
- `addModule(moduleName: string): void` - Register a module
- `hasFunction(name: string): boolean` - Check if function exists
- `hasClass(name: string): boolean` - Check if class exists
- `hasElement(name: string): boolean` - Check if any element exists
- `getAllElements(): string[]` - Get all registered elements

### ValidationResult

Result object returned by validation methods.

```typescript
interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}
```

### ValidationError

Error object for validation failures.

```typescript
interface ValidationError {
  type: 'missing_reference' | 'broken_link' | 'invalid_element';
  message: string;
  location?: string;
  details?: any;
}
```

### ValidationWarning

Warning object for potential issues.

```typescript
interface ValidationWarning {
  type: 'terminology_inconsistency' | 'missing_documentation' | 'style_issue';
  message: string;
  location?: string;
  suggestions?: string[];
}
```

## Examples

See `DocumentationValidator.example.ts` for complete working examples.

## Testing

Run the test suite:

```bash
npm test -- DocumentationValidator.test.ts
```

## Implementation Notes

### Supported Languages

The validator supports code parsing for:
- JavaScript/TypeScript
- Python

Additional languages can be added by extending the CodeParser.

### Performance Considerations

- The validator scans the entire codebase to build the code element registry
- Large codebases may take longer to validate
- Caching the registry is recommended for repeated validations

### Limitations

- Code reference extraction uses regex patterns and may miss complex references
- Terminology consistency checking is heuristic-based
- Anchor validation is case-insensitive and may have false positives

## Related Components

- **CodeParser**: Parses source code to extract elements
- **ContextBuilder**: Builds context for documentation generation
- **Documentation Generators**: Generate documentation that can be validated
