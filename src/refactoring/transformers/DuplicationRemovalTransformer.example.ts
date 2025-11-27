/**
 * Example usage of DuplicationRemovalTransformer
 * 
 * This example demonstrates how to use the DuplicationRemovalTransformer
 * to remove code duplication by extracting duplicate code blocks into a shared method.
 */

import { DuplicationRemovalTransformer } from './DuplicationRemovalTransformer';
import { Location } from '../types';

async function exampleRemoveDuplication() {
  const transformer = new DuplicationRemovalTransformer();

  // Example 1: Simple duplication with identical code
  const code1 = `
function sendEmailToAdmin() {
  const email = getAdminEmail();
  const subject = 'Notification';
  const body = 'You have a new notification';
  sendEmail(email, subject, body);
}

function sendEmailToUser() {
  const email = getUserEmail();
  const subject = 'Notification';
  const body = 'You have a new notification';
  sendEmail(email, subject, body);
}
`;

  const instances1: Location[] = [
    {
      file: 'notifications.ts',
      startLine: 3,
      endLine: 6,
      startColumn: 2,
      endColumn: 35,
    },
    {
      file: 'notifications.ts',
      startLine: 10,
      endLine: 13,
      startColumn: 2,
      endColumn: 35,
    },
  ];

  console.log('Example 1: Removing simple duplication');
  const result1 = await transformer.removeDuplication(code1, instances1, 'sendNotificationEmail');
  
  if (result1.success) {
    console.log('✓ Successfully removed duplication');
    console.log('Transformed code:');
    console.log(result1.transformedCode);
    console.log('\nChanges made:', result1.changes.length);
  } else {
    console.log('✗ Failed:', result1.error);
  }

  // Example 2: Duplication with variations
  const code2 = `
function calculateDiscountA(price) {
  const discount = price * 0.1;
  const tax = discount * 0.05;
  const total = discount - tax;
  return total;
}

function calculateDiscountB(amount) {
  const discount = amount * 0.1;
  const tax = discount * 0.05;
  const total = discount - tax;
  return total;
}
`;

  const instances2: Location[] = [
    {
      file: 'pricing.ts',
      startLine: 3,
      endLine: 6,
      startColumn: 2,
      endColumn: 15,
    },
    {
      file: 'pricing.ts',
      startLine: 10,
      endLine: 13,
      startColumn: 2,
      endColumn: 15,
    },
  ];

  console.log('\n\nExample 2: Removing duplication with variations');
  const result2 = await transformer.removeDuplication(code2, instances2, 'calculateFinalDiscount');
  
  if (result2.success) {
    console.log('✓ Successfully removed duplication with variations');
    console.log('Transformed code:');
    console.log(result2.transformedCode);
  } else {
    console.log('✗ Failed:', result2.error);
  }

  // Example 3: Multiple instances (3+ duplicates)
  const code3 = `
function logErrorA() {
  const timestamp = Date.now();
  const level = 'ERROR';
  console.log(\`[\${timestamp}] \${level}: Something went wrong\`);
}

function logErrorB() {
  const timestamp = Date.now();
  const level = 'ERROR';
  console.log(\`[\${timestamp}] \${level}: Something went wrong\`);
}

function logErrorC() {
  const timestamp = Date.now();
  const level = 'ERROR';
  console.log(\`[\${timestamp}] \${level}: Something went wrong\`);
}
`;

  const instances3: Location[] = [
    {
      file: 'logger.ts',
      startLine: 3,
      endLine: 5,
      startColumn: 2,
      endColumn: 60,
    },
    {
      file: 'logger.ts',
      startLine: 9,
      endLine: 11,
      startColumn: 2,
      endColumn: 60,
    },
    {
      file: 'logger.ts',
      startLine: 15,
      endLine: 17,
      startColumn: 2,
      endColumn: 60,
    },
  ];

  console.log('\n\nExample 3: Removing multiple duplicate instances');
  const result3 = await transformer.removeDuplication(code3, instances3, 'logErrorMessage');
  
  if (result3.success) {
    console.log('✓ Successfully removed all duplicate instances');
    console.log('Number of changes:', result3.changes.length);
    console.log('Transformed code:');
    console.log(result3.transformedCode);
  } else {
    console.log('✗ Failed:', result3.error);
  }
}

// Run the examples
if (require.main === module) {
  exampleRemoveDuplication().catch(console.error);
}
