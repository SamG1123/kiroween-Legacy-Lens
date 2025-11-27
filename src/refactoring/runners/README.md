# Test Runner

The TestRunner component is responsible for running tests to verify that refactorings preserve behavior. It supports multiple test frameworks and provides automatic reversion capabilities when tests fail.

## Features

- **Multi-Framework Support**: Automatically detects and runs Jest, pytest, and JUnit tests
- **Test Result Comparison**: Compares test results before and after refactoring
- **Automatic Reversion Detection**: Identifies when changes should be reverted
- **No-Test Warning**: Warns when no tests exist in the codebase
- **Specific Test Execution**: Can run specific test files for targeted validation

## Supported Test Frameworks

### Jest (JavaScript/TypeScript)
- Detects via `package.json` dependencies
- Runs with `npm test`
- Parses JSON output for detailed results

### pytest (Python)
- Detects via `pytest.ini`, `setup.cfg`, `pyproject.toml`, or test file patterns
- Runs with `pytest` command
- Supports JSON report output

### JUnit (Java)
- Detects via `pom.xml` (Maven) or `build.gradle` (Gradle)
- Runs with `mvn test` or `gradle test`
- Parses XML test reports

## Usage

### Basic Usage

```typescript
import { TestRunner } from './runners/TestRunner';

const testRunner = new TestRunner();
const codebasePath = '/path/to/project';

// Run all tests
const results = await testRunner.runTests(codebasePath);
console.log(`${results.passed} passed, ${results.failed} failed`);
```

### Safe Refactoring Pattern

```typescript
// Run tests before refactoring
const before = await testRunner.runTests(codebasePath);

// Check if tests exist
if (before.passed === 0 && before.failed === 0) {
  console.warn(testRunner.generateNoTestsWarning());
}

// Apply refactoring
// ... refactoring code ...

// Run tests after refactoring
const after = await testRunner.runTests(codebasePath);

// Check if reversion is needed
if (testRunner.shouldRevert(before, after)) {
  console.error('Tests failed - reverting changes');
  // Revert the refactoring
} else {
  console.log('Refactoring successful!');
}
```

### Running Specific Tests

```typescript
// Run only specific test files
const results = await testRunner.runSpecificTests(codebasePath, [
  'src/utils/helper.test.ts',
  'src/services/api.test.ts',
]);
```

### Comparing Results

```typescript
const before = await testRunner.runTests(codebasePath);
// ... apply refactoring ...
const after = await testRunner.runTests(codebasePath);

// Returns true if results are equivalent or better
const isValid = testRunner.compareResults(before, after);
```

## API Reference

### `runTests(codebase: string): Promise<TestResult>`

Runs all tests in the codebase.

**Parameters:**
- `codebase`: Path to the project directory

**Returns:** Promise resolving to TestResult with:
- `passed`: Number of passing tests
- `failed`: Number of failing tests
- `errors`: Array of test errors
- `duration`: Test execution time in milliseconds

### `runSpecificTests(codebase: string, testFiles: string[]): Promise<TestResult>`

Runs specific test files.

**Parameters:**
- `codebase`: Path to the project directory
- `testFiles`: Array of test file paths

**Returns:** Promise resolving to TestResult

### `compareResults(before: TestResult, after: TestResult): boolean`

Compares test results before and after refactoring.

**Parameters:**
- `before`: Test results before refactoring
- `after`: Test results after refactoring

**Returns:** `true` if results are equivalent or improved, `false` otherwise

### `shouldRevert(before: TestResult, after: TestResult): boolean`

Determines if changes should be reverted based on test results.

**Parameters:**
- `before`: Test results before refactoring
- `after`: Test results after refactoring

**Returns:** `true` if reversion is recommended, `false` otherwise

### `generateNoTestsWarning(): string`

Generates a warning message when no tests are found.

**Returns:** Warning message string

## Framework Detection

The TestRunner automatically detects the test framework by:

1. **Jest**: Checking for `jest` in `package.json` dependencies
2. **pytest**: Looking for pytest config files or `test_*.py` files
3. **JUnit**: Checking for `pom.xml` or `build.gradle`

If no framework is detected, it returns an error in the test results.

## Test Result Validation

The TestRunner uses the following logic for validation:

- **Safe**: `after.passed >= before.passed && after.failed <= before.failed`
- **Revert**: `after.failed > before.failed || after.passed < before.passed`

This ensures that refactorings don't break existing functionality.

## Error Handling

The TestRunner handles various error scenarios:

- **No tests found**: Returns empty result (0 passed, 0 failed)
- **Framework not detected**: Returns error in TestResult
- **Test execution failure**: Captures error and returns in TestResult
- **Timeout**: Tests timeout after 5 minutes

## Integration with Refactoring Pipeline

The TestRunner is designed to integrate with the refactoring pipeline:

1. **Smell Detection** → Identify refactoring opportunities
2. **Suggestion Generation** → Create refactoring suggestions
3. **Planning** → Order refactorings by priority
4. **Transformation** → Apply code changes
5. **Validation** → Run SafetyValidator
6. **Test Execution** → Run TestRunner ← **You are here**
7. **Reversion** → Revert if tests fail
8. **Commit** → Apply changes if tests pass

## Requirements Validation

This implementation satisfies the following requirements:

- **Requirement 8.1**: Runs existing tests to verify behavior preservation
- **Requirement 8.2**: Supports automatic reversion when tests fail
- **Requirement 8.3**: Warns when no tests exist

## Testing

The TestRunner includes comprehensive unit tests covering:

- Result comparison logic
- Reversion detection
- Warning generation
- Framework detection
- Test execution (with mocked file system)

Run tests with:
```bash
npm test -- src/refactoring/runners/TestRunner.test.ts
```

## Future Enhancements

Potential improvements for future versions:

- Support for additional test frameworks (Mocha, RSpec, etc.)
- Parallel test execution for faster validation
- Smart test selection (only run affected tests)
- Test coverage analysis
- Performance regression detection
- Integration with CI/CD pipelines
