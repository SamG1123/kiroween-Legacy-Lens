/**
 * Example usage of TestRunner
 * 
 * This demonstrates how to use the TestRunner to verify that refactorings
 * preserve behavior by running tests before and after code transformations.
 */

import { TestRunner } from './TestRunner';

async function exampleUsage() {
  const testRunner = new TestRunner();
  const codebasePath = '/path/to/project';

  // Example 1: Run all tests before refactoring
  console.log('Running tests before refactoring...');
  const beforeResults = await testRunner.runTests(codebasePath);
  console.log(`Before: ${beforeResults.passed} passed, ${beforeResults.failed} failed`);

  // Check if tests exist
  if (beforeResults.passed === 0 && beforeResults.failed === 0) {
    console.log(testRunner.generateNoTestsWarning());
    // Proceed with caution or abort refactoring
    return;
  }

  // Apply refactoring here...
  console.log('Applying refactoring...');

  // Example 2: Run tests after refactoring
  console.log('Running tests after refactoring...');
  const afterResults = await testRunner.runTests(codebasePath);
  console.log(`After: ${afterResults.passed} passed, ${afterResults.failed} failed`);

  // Example 3: Compare results
  const resultsMatch = testRunner.compareResults(beforeResults, afterResults);
  console.log(`Results match: ${resultsMatch}`);

  // Example 4: Check if reversion is needed
  if (testRunner.shouldRevert(beforeResults, afterResults)) {
    console.log('Tests failed after refactoring - reverting changes...');
    // Revert the refactoring
  } else {
    console.log('Tests passed - refactoring successful!');
  }

  // Example 5: Run specific test files
  const specificResults = await testRunner.runSpecificTests(codebasePath, [
    'src/utils/helper.test.ts',
    'src/services/api.test.ts',
  ]);
  console.log(`Specific tests: ${specificResults.passed} passed, ${specificResults.failed} failed`);
}

// Example with error handling
async function safeRefactoringExample() {
  const testRunner = new TestRunner();
  const codebasePath = '/path/to/project';

  try {
    // Run tests before
    const before = await testRunner.runTests(codebasePath);
    
    if (before.passed === 0 && before.failed === 0) {
      console.warn(testRunner.generateNoTestsWarning());
      // Ask user for confirmation before proceeding
    }

    // Apply refactoring
    // ... refactoring code ...

    // Run tests after
    const after = await testRunner.runTests(codebasePath);

    // Automatic reversion on failure
    if (testRunner.shouldRevert(before, after)) {
      console.error('Refactoring broke tests - reverting automatically');
      // Revert changes
      throw new Error('Refactoring failed test validation');
    }

    console.log('Refactoring completed successfully');
  } catch (error) {
    console.error('Refactoring failed:', error);
    // Handle error
  }
}

// Example: Integration with refactoring pipeline
async function refactoringPipelineExample() {
  const testRunner = new TestRunner();
  const codebasePath = '/path/to/project';

  // Step 1: Baseline test run
  const baseline = await testRunner.runTests(codebasePath);
  console.log(`Baseline: ${baseline.passed} passed, ${baseline.failed} failed`);

  // Step 2: Apply multiple refactorings incrementally
  const refactorings = [
    'extract-method',
    'rename-variable',
    'simplify-conditional',
  ];

  for (const refactoring of refactorings) {
    console.log(`\nApplying ${refactoring}...`);
    
    // Apply refactoring
    // ... refactoring code ...

    // Validate
    const result = await testRunner.runTests(codebasePath);
    
    if (testRunner.shouldRevert(baseline, result)) {
      console.error(`${refactoring} failed - reverting`);
      // Revert this refactoring
      continue;
    }

    console.log(`${refactoring} succeeded`);
  }

  // Final validation
  const final = await testRunner.runTests(codebasePath);
  console.log(`\nFinal: ${final.passed} passed, ${final.failed} failed`);
  console.log(`Improvement: ${final.passed - baseline.passed} more tests passing`);
}

export {
  exampleUsage,
  safeRefactoringExample,
  refactoringPipelineExample,
};
