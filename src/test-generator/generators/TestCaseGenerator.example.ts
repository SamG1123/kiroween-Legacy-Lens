// Example usage of TestCaseGenerator

import { TestCaseGenerator } from './TestCaseGenerator';
import { AITestGenerationClient } from '../ai/AITestGenerationClient';
import { FunctionAnalysis, ClassAnalysis } from '../types';

// Example: Generate test cases for a function
async function exampleFunctionTestGeneration() {
  // Initialize AI client
  const aiClient = new AITestGenerationClient({
    provider: 'openai',
    model: 'gpt-4',
    temperature: 0.7,
  });

  // Create test case generator
  const generator = new TestCaseGenerator(aiClient);

  // Define function analysis
  const functionAnalysis: FunctionAnalysis = {
    name: 'calculateDiscount',
    parameters: [
      { name: 'price', type: 'number', optional: false },
      { name: 'discountPercent', type: 'number', optional: false },
    ],
    returnType: 'number',
    hasErrorHandling: true,
    errorPaths: [
      {
        condition: 'price < 0',
        exceptionType: 'Error',
        errorMessage: 'Price cannot be negative',
      },
    ],
    dependencies: [],
    complexity: 2,
    sideEffects: [],
  };

  // Generate happy path tests
  const happyPathTests = await generator.generateHappyPathTests(functionAnalysis);
  console.log('Happy Path Tests:', happyPathTests);

  // Generate edge case tests
  const edgeCaseTests = await generator.generateEdgeCaseTests(functionAnalysis);
  console.log('Edge Case Tests:', edgeCaseTests);

  // Generate error tests
  const errorTests = await generator.generateErrorTests(functionAnalysis);
  console.log('Error Tests:', errorTests);
}

// Example: Generate test cases for a class
async function exampleClassTestGeneration() {
  const aiClient = new AITestGenerationClient({
    provider: 'openai',
  });

  const generator = new TestCaseGenerator(aiClient);

  const classAnalysis: ClassAnalysis = {
    name: 'ShoppingCart',
    constructor: {
      name: 'constructor',
      parameters: [],
      returnType: null,
      body: '',
      location: { file: 'ShoppingCart.ts', line: 1 },
    },
    publicMethods: [
      {
        name: 'addItem',
        parameters: [
          { name: 'item', type: 'Product', optional: false },
          { name: 'quantity', type: 'number', optional: false },
        ],
        returnType: 'void',
        body: '',
        location: { file: 'ShoppingCart.ts', line: 10 },
      },
      {
        name: 'getTotal',
        parameters: [],
        returnType: 'number',
        body: '',
        location: { file: 'ShoppingCart.ts', line: 20 },
      },
    ],
    privateMethods: [],
    properties: [
      {
        name: 'items',
        type: 'Product[]',
        visibility: 'private',
        isStatic: false,
      },
    ],
    hasState: true,
    inheritance: null,
  };

  // Generate class tests
  const classTests = await generator.generateClassTests(classAnalysis);
  console.log('Class Tests:', classTests);
}

// Run examples (uncomment to execute)
// exampleFunctionTestGeneration().catch(console.error);
// exampleClassTestGeneration().catch(console.error);
