# Test Generator

Automatically creates unit tests for untested legacy code.

## Overview

The Test Generator analyzes functions, classes, and modules to understand their behavior, then generates comprehensive test suites that verify correctness and catch regressions. This component helps teams add test coverage to legacy systems that were built without tests.

## Directory Structure

```
src/test-generator/
├── analyzers/           # Code and coverage analysis
│   ├── CodeAnalyzer.ts
│   └── CoverageAnalyzer.ts
├── generators/          # Test generation components
│   ├── TestStrategyPlanner.ts
│   ├── TestCaseGenerator.ts
│   ├── MockGenerator.ts
│   └── TestWriter.ts
├── validators/          # Test validation
│   └── TestValidator.ts
├── ai/                  # AI client configuration
│   └── AITestGenerationClient.ts
├── types.ts            # Type definitions
└── index.ts            # Module exports
```

## Components

### Analyzers
- **CodeAnalyzer**: Analyzes code to extract testable units and their characteristics
- **CoverageAnalyzer**: Analyzes existing test coverage and identifies gaps

### Generators
- **TestStrategyPlanner**: Plans comprehensive test strategy for code units
- **TestCaseGenerator**: Generates specific test cases using AI
- **MockGenerator**: Generates mocks for external dependencies
- **TestWriter**: Writes test code in the appropriate framework

### Validators
- **TestValidator**: Validates generated tests can compile and run

### AI
- **AITestGenerationClient**: Wrapper for AI API calls specific to test generation

## Usage

```typescript
import { CodeAnalyzer, TestCaseGenerator, TestWriter } from './test-generator';

// Analyze code
const analyzer = new CodeAnalyzer();
const analysis = analyzer.analyzeFunction(functionInfo);

// Generate test cases
const generator = new TestCaseGenerator();
const testCases = generator.generateHappyPathTests(analysis);

// Write tests
const writer = new TestWriter();
const testCode = writer.writeTestSuite(strategy, 'jest');
```

## Configuration

Set up environment variables for AI providers:

```bash
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
```

## Testing

Run tests with:

```bash
npm test
```

Run property-based tests with fast-check (minimum 100 iterations per property).
