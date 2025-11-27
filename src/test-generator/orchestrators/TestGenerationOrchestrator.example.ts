// Test Generation Orchestrator Example
// Demonstrates how to use the orchestrator to generate tests

import { TestGenerationOrchestrator } from './TestGenerationOrchestrator';
import { AITestGenerationClient } from '../ai/AITestGenerationClient';
import { FunctionInfo, ClassInfo } from '../types';

// Example 1: Generate tests for a simple function
async function generateFunctionTests() {
  // Initialize AI client
  const aiClient = new AITestGenerationClient({ provider: 'openai' });
  
  // Create orchestrator
  const orchestrator = new TestGenerationOrchestrator(aiClient);
  
  // Define the function to test
  const addFunction: FunctionInfo = {
    name: 'add',
    parameters: [
      { name: 'a', type: 'number', optional: false },
      { name: 'b', type: 'number', optional: false },
    ],
    returnType: 'number',
    body: `
      if (typeof a !== 'number' || typeof b !== 'number') {
        throw new TypeError('Both arguments must be numbers');
      }
      return a + b;
    `,
    location: { file: 'math.ts', line: 1 },
  };
  
  // Generate tests
  const result = await orchestrator.generateTestsForFunction(
    addFunction,
    'project-123',
    {
      framework: 'jest',
      language: 'typescript',
      codeStyle: {
        indentation: 2,
        quotes: 'single',
        semicolons: true,
      },
      maxRetries: 3,
      enableProgressTracking: true,
    }
  );
  
  if (result.success && result.testSuite) {
    console.log('Generated test code:');
    console.log(result.testSuite.testCode);
    console.log(`\nCoverage improvement: ${result.testSuite.coverageImprovement}%`);
    console.log(`Status: ${result.testSuite.status}`);
  } else {
    console.error('Test generation failed:');
    console.error(result.errors);
  }
  
  // View progress history
  const progress = orchestrator.getProgressHistory();
  console.log('\nProgress:');
  progress.forEach(p => {
    console.log(`- ${p.stage}: ${p.currentStep} (${p.progress}%)`);
  });
}

// Example 2: Generate tests for a class
async function generateClassTests() {
  const aiClient = new AITestGenerationClient({ provider: 'openai' });
  const orchestrator = new TestGenerationOrchestrator(aiClient);
  
  // Define the class to test
  const calculatorClass: ClassInfo = {
    name: 'Calculator',
    constructor: {
      name: 'constructor',
      parameters: [],
      returnType: null,
      body: 'this.history = [];',
      location: { file: 'Calculator.ts', line: 2 },
    },
    publicMethods: [
      {
        name: 'add',
        parameters: [
          { name: 'a', type: 'number', optional: false },
          { name: 'b', type: 'number', optional: false },
        ],
        returnType: 'number',
        body: `
          const result = a + b;
          this.history.push({ operation: 'add', result });
          return result;
        `,
        location: { file: 'Calculator.ts', line: 6 },
      },
      {
        name: 'getHistory',
        parameters: [],
        returnType: 'Array',
        body: 'return this.history;',
        location: { file: 'Calculator.ts', line: 12 },
      },
    ],
    privateMethods: [],
    properties: [
      {
        name: 'history',
        type: 'Array',
        visibility: 'private',
        isStatic: false,
      },
    ],
    inheritance: null,
    location: { file: 'Calculator.ts', line: 1 },
  };
  
  // Generate tests
  const result = await orchestrator.generateTestsForClass(
    calculatorClass,
    'project-123',
    {
      framework: 'jest',
      language: 'typescript',
      maxRetries: 3,
    }
  );
  
  if (result.success && result.testSuite) {
    console.log('Generated test code:');
    console.log(result.testSuite.testCode);
  } else {
    console.error('Test generation failed:');
    console.error(result.errors);
  }
}

// Example 3: Handle errors and warnings
async function handleErrorsAndWarnings() {
  const aiClient = new AITestGenerationClient({ provider: 'openai' });
  const orchestrator = new TestGenerationOrchestrator(aiClient);
  
  const complexFunction: FunctionInfo = {
    name: 'processData',
    parameters: [
      { name: 'data', type: 'any', optional: false },
    ],
    returnType: 'Promise<any>',
    body: `
      try {
        const result = await externalAPI.process(data);
        return result;
      } catch (error) {
        logger.error('Processing failed', error);
        throw new ProcessingError('Failed to process data');
      }
    `,
    location: { file: 'processor.ts', line: 10 },
  };
  
  const result = await orchestrator.generateTestsForFunction(
    complexFunction,
    'project-123',
    {
      framework: 'jest',
      language: 'typescript',
      maxRetries: 2,
    }
  );
  
  // Check for errors
  if (!result.success) {
    console.error('Generation failed with errors:');
    result.errors.forEach(err => console.error(`- ${err}`));
    return;
  }
  
  // Check for warnings
  if (result.warnings.length > 0) {
    console.warn('Generation completed with warnings:');
    result.warnings.forEach(warn => console.warn(`- ${warn}`));
  }
  
  // Check validation status
  if (result.testSuite?.status === 'generated') {
    console.warn('Tests generated but not validated - may have compilation issues');
  } else if (result.testSuite?.status === 'validated') {
    console.log('Tests generated and validated successfully');
  }
}

// Example 4: Different frameworks
async function generateForDifferentFrameworks() {
  const aiClient = new AITestGenerationClient({ provider: 'openai' });
  const orchestrator = new TestGenerationOrchestrator(aiClient);
  
  const simpleFunction: FunctionInfo = {
    name: 'greet',
    parameters: [{ name: 'name', type: 'string', optional: false }],
    returnType: 'string',
    body: 'return `Hello, ${name}!`;',
    location: { file: 'greet.ts', line: 1 },
  };
  
  // Generate for Jest
  const jestResult = await orchestrator.generateTestsForFunction(
    simpleFunction,
    'project-123',
    { framework: 'jest', language: 'typescript' }
  );
  
  // Generate for Mocha
  const mochaResult = await orchestrator.generateTestsForFunction(
    simpleFunction,
    'project-123',
    { framework: 'mocha', language: 'typescript' }
  );
  
  // Generate for pytest (Python)
  const pytestResult = await orchestrator.generateTestsForFunction(
    simpleFunction,
    'project-123',
    { framework: 'pytest', language: 'python' }
  );
  
  console.log('Jest tests:', jestResult.testSuite?.testCode);
  console.log('Mocha tests:', mochaResult.testSuite?.testCode);
  console.log('Pytest tests:', pytestResult.testSuite?.testCode);
}

// Run examples
if (require.main === module) {
  console.log('=== Example 1: Generate Function Tests ===');
  generateFunctionTests().catch(console.error);
  
  console.log('\n=== Example 2: Generate Class Tests ===');
  generateClassTests().catch(console.error);
  
  console.log('\n=== Example 3: Handle Errors and Warnings ===');
  handleErrorsAndWarnings().catch(console.error);
  
  console.log('\n=== Example 4: Different Frameworks ===');
  generateForDifferentFrameworks().catch(console.error);
}
