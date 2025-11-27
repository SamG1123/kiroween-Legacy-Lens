# Test Generation Orchestrator

The Test Generation Orchestrator coordinates all components of the test generator to produce complete, validated test suites for functions and classes.

## Overview

The orchestrator manages the entire test generation pipeline:

1. **Analysis** - Analyzes code structure and dependencies
2. **Planning** - Creates a comprehensive test strategy
3. **Generation** - Generates test cases using AI
4. **Mocking** - Creates mocks for external dependencies
5. **Writing** - Writes test code in the target framework
6. **Validation** - Validates and attempts to fix generated tests

## Features

- **Retry Logic**: Automatically retries failed operations with exponential backoff
- **Progress Tracking**: Tracks progress through all stages of generation
- **Auto-Fix**: Attempts to automatically fix common validation errors
- **Multi-Framework**: Supports Jest, Mocha, pytest, JUnit, and RSpec
- **Error Handling**: Graceful error handling with detailed error messages
- **Code Style**: Applies custom code style formatting

## Usage

### Basic Function Test Generation

```typescript
import { TestGenerationOrchestrator } from './orchestrators';
import { AITestGenerationClient } from './ai';

const aiClient = new AITestGenerationClient('api-key');
const orchestrator = new TestGenerationOrchestrator(aiClient);

const result = await orchestrator.generateTestsForFunction(
  functionInfo,
  'project-id',
  {
    framework: 'jest',
    language: 'typescript',
    maxRetries: 3,
  }
);

if (result.success) {
  console.log(result.testSuite.testCode);
}
```

### Class Test Generation

```typescript
const result = await orchestrator.generateTestsForClass(
  classInfo,
  'project-id',
  {
    framework: 'jest',
    language: 'typescript',
  }
);
```

### With Code Style

```typescript
const result = await orchestrator.generateTestsForFunction(
  functionInfo,
  'project-id',
  {
    framework: 'jest',
    language: 'typescript',
    codeStyle: {
      indentation: 2,
      quotes: 'single',
      semicolons: true,
    },
  }
);
```

### Progress Tracking

```typescript
const result = await orchestrator.generateTestsForFunction(
  functionInfo,
  'project-id',
  {
    framework: 'jest',
    language: 'typescript',
    enableProgressTracking: true,
  }
);

// Get progress history
const progress = orchestrator.getProgressHistory();
progress.forEach(p => {
  console.log(`${p.stage}: ${p.currentStep} (${p.progress}%)`);
});
```

## Options

### TestGenerationOptions

- `framework`: Target testing framework ('jest' | 'mocha' | 'pytest' | 'junit' | 'rspec')
- `language`: Programming language ('typescript' | 'javascript' | 'python' | 'java')
- `codeStyle`: Optional code style configuration
  - `indentation`: Number of spaces for indentation
  - `quotes`: Quote style ('single' | 'double')
  - `semicolons`: Whether to use semicolons
- `maxRetries`: Maximum number of retry attempts (default: 3)
- `enableProgressTracking`: Enable detailed progress tracking

## Result Structure

### TestGenerationResult

```typescript
{
  success: boolean;
  testSuite?: TestSuite;
  errors: string[];
  warnings: string[];
  progress: TestGenerationProgress[];
}
```

### TestSuite

```typescript
{
  id: string;
  projectId: string;
  targetFile: string;
  framework: TestFramework;
  testCode: string;
  testCases: TestCase[];
  mocks: Mock[];
  coverageImprovement: number;
  status: 'generated' | 'validated' | 'failed';
  createdAt: Date;
}
```

## Error Handling

The orchestrator provides comprehensive error handling:

- **Retry Logic**: Automatically retries failed AI generations
- **Auto-Fix**: Attempts to fix common validation errors
- **Graceful Degradation**: Returns partial results when possible
- **Detailed Errors**: Provides specific error messages for debugging

```typescript
const result = await orchestrator.generateTestsForFunction(...);

if (!result.success) {
  console.error('Errors:', result.errors);
}

if (result.warnings.length > 0) {
  console.warn('Warnings:', result.warnings);
}
```

## Progress Stages

The orchestrator tracks progress through these stages:

1. **analyzing** - Analyzing code structure
2. **planning** - Planning test strategy
3. **generating** - Generating test cases
4. **validating** - Validating test code
5. **complete** - Generation complete
6. **failed** - Generation failed

## Validation

Generated tests go through multiple validation steps:

1. **Syntax Validation**: Checks for syntax errors
2. **Import Validation**: Verifies all imports are available
3. **Compilation**: Attempts to compile the test code (TypeScript/JavaScript)

If validation fails, the orchestrator attempts to auto-fix common issues:

- Missing imports
- Type errors
- Missing semicolons
- Async/await issues

## Examples

See `TestGenerationOrchestrator.example.ts` for complete examples including:

- Basic function test generation
- Class test generation
- Error handling
- Multi-framework support
- Progress tracking

## Requirements

This orchestrator fulfills all requirements from the test-generator spec:

- Coordinates analysis, strategy, generation, and validation
- Implements retry logic for failed generations
- Implements progress tracking
- Handles errors gracefully
- Supports multiple testing frameworks
- Validates generated tests
