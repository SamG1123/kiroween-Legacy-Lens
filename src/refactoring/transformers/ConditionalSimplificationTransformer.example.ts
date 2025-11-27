/**
 * Example usage of ConditionalSimplificationTransformer
 * 
 * This file demonstrates how to use the ConditionalSimplificationTransformer
 * to simplify complex conditionals in various ways.
 */

import { ConditionalSimplificationTransformer } from './ConditionalSimplificationTransformer';
import { Location } from '../types';

async function demonstrateConditionalSimplification() {
  const transformer = new ConditionalSimplificationTransformer();

  // Example 1: Introduce guard clause for nested conditionals
  console.log('=== Example 1: Guard Clause ===');
  const nestedCode = `
function validateUser(user) {
  if (user) {
    if (user.age >= 18) {
      if (user.verified) {
        return true;
      }
    }
  }
  return false;
}
`;

  const nestedLocation: Location = {
    file: 'example.ts',
    startLine: 3,
    endLine: 9,
    startColumn: 2,
    endColumn: 3,
  };

  const guardResult = await transformer.simplifyConditional(
    nestedCode,
    nestedLocation,
    'guard_clause'
  );

  if (guardResult.success) {
    console.log('Original code:');
    console.log(nestedCode);
    console.log('\nTransformed code:');
    console.log(guardResult.transformedCode);
    console.log('\nChanges:', guardResult.changes.length);
  }

  // Example 2: Extract complex boolean expression to variable
  console.log('\n=== Example 2: Extract Boolean Expression ===');
  const complexConditionCode = `
function checkEligibility(user) {
  if (user && user.age >= 18 && user.verified === true && user.country === 'US') {
    return 'eligible';
  }
  return 'not eligible';
}
`;

  const complexLocation: Location = {
    file: 'example.ts',
    startLine: 3,
    endLine: 5,
    startColumn: 2,
    endColumn: 3,
  };

  const extractResult = await transformer.simplifyConditional(
    complexConditionCode,
    complexLocation,
    'extract_variable'
  );

  if (extractResult.success) {
    console.log('Original code:');
    console.log(complexConditionCode);
    console.log('\nTransformed code:');
    console.log(extractResult.transformedCode);
    console.log('\nChanges:', extractResult.changes.length);
  }

  // Example 3: Auto-detect best simplification strategy
  console.log('\n=== Example 3: Auto Strategy ===');
  const autoCode = `
function processData(data) {
  if (data !== null && data !== undefined) {
    if (data.length > 0 && data.length < 1000) {
      return data.map(item => item * 2);
    }
  }
  return [];
}
`;

  const autoLocation: Location = {
    file: 'example.ts',
    startLine: 3,
    endLine: 7,
    startColumn: 2,
    endColumn: 3,
  };

  const autoResult = await transformer.simplifyConditional(
    autoCode,
    autoLocation,
    'auto'
  );

  if (autoResult.success) {
    console.log('Original code:');
    console.log(autoCode);
    console.log('\nTransformed code:');
    console.log(autoResult.transformedCode);
    console.log('\nChanges:', autoResult.changes.length);
  }

  // Example 4: Simplify with early return pattern
  console.log('\n=== Example 4: Early Return Pattern ===');
  const earlyReturnCode = `
function authenticate(credentials) {
  if (credentials) {
    if (credentials.username && credentials.password) {
      return verifyCredentials(credentials);
    } else {
      return false;
    }
  } else {
    return false;
  }
}
`;

  const earlyReturnLocation: Location = {
    file: 'example.ts',
    startLine: 3,
    endLine: 11,
    startColumn: 2,
    endColumn: 3,
  };

  const earlyReturnResult = await transformer.simplifyConditional(
    earlyReturnCode,
    earlyReturnLocation,
    'guard_clause'
  );

  if (earlyReturnResult.success) {
    console.log('Original code:');
    console.log(earlyReturnCode);
    console.log('\nTransformed code:');
    console.log(earlyReturnResult.transformedCode);
    console.log('\nChanges:', earlyReturnResult.changes.length);
  }
}

// Run the examples
if (require.main === module) {
  demonstrateConditionalSimplification().catch(console.error);
}

export { demonstrateConditionalSimplification };
