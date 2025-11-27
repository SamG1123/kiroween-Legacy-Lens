/**
 * Example usage of DocumentationValidator
 * 
 * This file demonstrates how to use the DocumentationValidator
 * to validate documentation accuracy and consistency.
 */

import {
  DocumentationValidator,
  CodeElementRegistry
} from './DocumentationValidator';
import { DocumentationSet, DocumentationMetadata } from '../types';

// Example 1: Validate code references
function exampleValidateReferences() {
  const validator = new DocumentationValidator();
  
  // Build a registry of code elements
  const registry = new CodeElementRegistry();
  registry.addFunction('calculateTotal');
  registry.addFunction('processOrder');
  registry.addClass('OrderService');
  registry.addClass('PaymentProcessor');
  
  // Documentation that references these elements
  const documentation = `
    # Order Processing System
    
    The \`OrderService\` class handles order management.
    Use \`calculateTotal()\` to compute order totals.
    The \`processOrder()\` function processes payments via \`PaymentProcessor\`.
  `;
  
  // Validate references
  const result = validator.validateReferences(documentation, registry);
  
  if (result.isValid) {
    console.log('✓ All code references are valid');
  } else {
    console.log('✗ Found invalid references:');
    result.errors.forEach(error => {
      console.log(`  - ${error.message}`);
    });
  }
}

// Example 2: Validate terminology consistency
function exampleValidateTerminology() {
  const validator = new DocumentationValidator();
  
  const docSet: DocumentationSet = {
    readme: `
      # User Management System
      
      The UserService handles user operations.
    `,
    api: `
      # API Documentation
      
      The userService provides user management endpoints.
    `,
    architecture: `
      # Architecture
      
      The user_service component manages users.
    `,
    comments: new Map(),
    metadata: {
      projectId: 'example',
      generatedAt: new Date(),
      generator: 'example',
      version: '1.0.0',
      options: {
        types: ['readme', 'api', 'architecture'],
        depth: 'standard',
        excludePaths: [],
        mergeExisting: false
      },
      statistics: {
        filesDocumented: 3,
        functionsDocumented: 0,
        classesDocumented: 0,
        apiEndpointsDocumented: 0
      }
    }
  };
  
  const result = validator.validateTerminologyConsistency(docSet);
  
  if (result.warnings.length > 0) {
    console.log('⚠ Terminology inconsistencies found:');
    result.warnings.forEach(warning => {
      console.log(`  - ${warning.message}`);
      if (warning.suggestions) {
        warning.suggestions.forEach(suggestion => {
          console.log(`    → ${suggestion}`);
        });
      }
    });
  } else {
    console.log('✓ Terminology is consistent');
  }
}

// Example 3: Validate internal links
function exampleValidateLinks() {
  const validator = new DocumentationValidator();
  
  const documentation = `
    # Project Documentation
    
    See [API Documentation](./api.md) for endpoint details.
    Check [Architecture Overview](./architecture.md) for system design.
    Visit [Missing Doc](./missing.md) for more info.
  `;
  
  const availableFiles = ['README.md', 'api.md', 'architecture.md'];
  
  const result = validator.validateInternalLinks(documentation, availableFiles);
  
  if (result.isValid) {
    console.log('✓ All internal links are valid');
  } else {
    console.log('✗ Found broken links:');
    result.errors.forEach(error => {
      console.log(`  - ${error.message}`);
    });
  }
}

// Run examples
if (require.main === module) {
  console.log('=== Example 1: Validate Code References ===');
  exampleValidateReferences();
  
  console.log('\n=== Example 2: Validate Terminology ===');
  exampleValidateTerminology();
  
  console.log('\n=== Example 3: Validate Internal Links ===');
  exampleValidateLinks();
}

export {
  exampleValidateReferences,
  exampleValidateTerminology,
  exampleValidateLinks
};
