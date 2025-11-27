import {
  DocumentationValidator,
  CodeElementRegistry,
  ValidationResult
} from './DocumentationValidator';
import { DocumentationSet, DocumentationMetadata } from '../types';

describe('DocumentationValidator', () => {
  let validator: DocumentationValidator;

  beforeEach(() => {
    validator = new DocumentationValidator();
  });

  describe('CodeElementRegistry', () => {
    it('should store and retrieve functions', () => {
      const registry = new CodeElementRegistry();
      registry.addFunction('myFunction');
      
      expect(registry.hasFunction('myFunction')).toBe(true);
      expect(registry.hasFunction('nonExistent')).toBe(false);
    });

    it('should store and retrieve classes', () => {
      const registry = new CodeElementRegistry();
      registry.addClass('MyClass');
      
      expect(registry.hasClass('MyClass')).toBe(true);
      expect(registry.hasClass('NonExistent')).toBe(false);
    });

    it('should check if any element exists', () => {
      const registry = new CodeElementRegistry();
      registry.addFunction('myFunction');
      registry.addClass('MyClass');
      registry.addVariable('myVar');
      
      expect(registry.hasElement('myFunction')).toBe(true);
      expect(registry.hasElement('MyClass')).toBe(true);
      expect(registry.hasElement('myVar')).toBe(true);
      expect(registry.hasElement('nonExistent')).toBe(false);
    });

    it('should return all elements', () => {
      const registry = new CodeElementRegistry();
      registry.addFunction('func1');
      registry.addFunction('func2');
      registry.addClass('Class1');
      
      const elements = registry.getAllElements();
      expect(elements).toContain('func1');
      expect(elements).toContain('func2');
      expect(elements).toContain('Class1');
      expect(elements.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('validateReferences', () => {
    it('should validate existing code references', () => {
      const registry = new CodeElementRegistry();
      registry.addFunction('calculateTotal');
      registry.addClass('UserService');
      
      const documentation = `
        This module uses the \`calculateTotal()\` function and \`UserService\` class.
      `;
      
      const result = validator.validateReferences(documentation, registry);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing function references', () => {
      const registry = new CodeElementRegistry();
      registry.addFunction('existingFunction');
      
      const documentation = `
        This calls \`nonExistentFunction()\` which doesn't exist.
      `;
      
      const result = validator.validateReferences(documentation, registry);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].type).toBe('missing_reference');
      expect(result.errors[0].message).toContain('nonExistentFunction');
    });

    it('should detect missing class references', () => {
      const registry = new CodeElementRegistry();
      
      const documentation = `
        The \`MissingClass\` is used here.
      `;
      
      const result = validator.validateReferences(documentation, registry);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].message).toContain('MissingClass');
    });

    it('should handle code blocks with function definitions', () => {
      const registry = new CodeElementRegistry();
      registry.addFunction('exampleFunction');
      
      const documentation = `
        Example usage:
        \`\`\`javascript
        function exampleFunction() {
          return 42;
        }
        \`\`\`
      `;
      
      const result = validator.validateReferences(documentation, registry);
      
      expect(result.isValid).toBe(true);
    });

    it('should handle method references', () => {
      const registry = new CodeElementRegistry();
      registry.addFunction('MyClass.myMethod');
      
      const documentation = `
        Call \`MyClass.myMethod()\` to process data.
      `;
      
      const result = validator.validateReferences(documentation, registry);
      
      expect(result.isValid).toBe(true);
    });
  });

  describe('validateTerminologyConsistency', () => {
    it('should detect inconsistent terminology', () => {
      const docSet: DocumentationSet = {
        readme: 'The UserService handles user operations.',
        api: 'The userService provides user management.',
        architecture: 'The user_service component manages users.',
        comments: new Map(),
        metadata: createMockMetadata()
      };
      
      const result = validator.validateTerminologyConsistency(docSet);
      
      // Should have warnings about inconsistent terminology
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.type === 'terminology_inconsistency')).toBe(true);
    });

    it('should pass with consistent terminology', () => {
      const docSet: DocumentationSet = {
        readme: 'The UserService handles user operations.',
        api: 'The UserService provides user management.',
        architecture: 'The UserService component manages users.',
        comments: new Map(),
        metadata: createMockMetadata()
      };
      
      const result = validator.validateTerminologyConsistency(docSet);
      
      // Should have no errors
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle empty documentation', () => {
      const docSet: DocumentationSet = {
        readme: '',
        comments: new Map(),
        metadata: createMockMetadata()
      };
      
      const result = validator.validateTerminologyConsistency(docSet);
      
      expect(result.isValid).toBe(true);
    });
  });

  describe('validateInternalLinks', () => {
    it('should validate existing internal links', () => {
      const documentation = `
        See [API Documentation](./api.md) for details.
        Also check [Architecture](./architecture.md).
      `;
      
      const availableFiles = ['api.md', 'architecture.md', 'README.md'];
      
      const result = validator.validateInternalLinks(documentation, availableFiles);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect broken internal links', () => {
      const documentation = `
        See [Missing Doc](./missing.md) for details.
      `;
      
      const availableFiles = ['api.md', 'README.md'];
      
      const result = validator.validateInternalLinks(documentation, availableFiles);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].type).toBe('broken_link');
      expect(result.errors[0].message).toContain('missing.md');
    });

    it('should ignore external links', () => {
      const documentation = `
        Visit [GitHub](https://github.com) for more info.
        Also see [Docs](http://example.com/docs).
      `;
      
      const availableFiles = ['README.md'];
      
      const result = validator.validateInternalLinks(documentation, availableFiles);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate anchor links', () => {
      const documentation = `
        # Installation
        
        See [Getting Started](#installation) for setup.
      `;
      
      const availableFiles = ['README.md'];
      
      const result = validator.validateInternalLinks(documentation, availableFiles);
      
      expect(result.isValid).toBe(true);
    });

    it('should warn about missing anchors', () => {
      const documentation = `
        # Installation
        
        See [Missing Section](#nonexistent) for details.
      `;
      
      const availableFiles = ['README.md'];
      
      const result = validator.validateInternalLinks(documentation, availableFiles);
      
      // Should have warnings about missing anchor
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0].message).toContain('nonexistent');
    });

    it('should handle relative paths with ../', () => {
      const documentation = `
        See [Parent Doc](../docs/guide.md) for more.
      `;
      
      const availableFiles = ['docs/guide.md'];
      
      const result = validator.validateInternalLinks(documentation, availableFiles);
      
      expect(result.isValid).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle documentation with no code references', () => {
      const registry = new CodeElementRegistry();
      const documentation = 'This is plain text with no code references.';
      
      const result = validator.validateReferences(documentation, registry);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle empty documentation', () => {
      const registry = new CodeElementRegistry();
      const documentation = '';
      
      const result = validator.validateReferences(documentation, registry);
      
      expect(result.isValid).toBe(true);
    });

    it('should handle special characters in code references', () => {
      const registry = new CodeElementRegistry();
      registry.addFunction('$specialFunc');
      registry.addFunction('_privateFunc');
      
      const documentation = 'Use `$specialFunc()` and `_privateFunc()`.';
      
      const result = validator.validateReferences(documentation, registry);
      
      expect(result.isValid).toBe(true);
    });
  });
});

// Helper function to create mock metadata
function createMockMetadata(): DocumentationMetadata {
  return {
    projectId: 'test-project',
    generatedAt: new Date(),
    generator: 'test',
    version: '1.0.0',
    options: {
      types: ['readme'],
      depth: 'standard',
      excludePaths: [],
      mergeExisting: false
    },
    statistics: {
      filesDocumented: 0,
      functionsDocumented: 0,
      classesDocumented: 0,
      apiEndpointsDocumented: 0
    }
  };
}
