/**
 * Example usage of ExtractMethodTransformer
 * Demonstrates how to extract methods from code blocks
 */

import { ExtractMethodTransformer } from './ExtractMethodTransformer';
import { CodeBlock } from '../types';

async function demonstrateExtractMethod() {
  const transformer = new ExtractMethodTransformer();

  // Example 1: Extract a calculation into a method
  const code1 = `
function processOrder(order) {
  const subtotal = order.items.reduce((sum, item) => sum + item.price, 0);
  const tax = subtotal * 0.08;
  const shipping = subtotal > 50 ? 0 : 5.99;
  const total = subtotal + tax + shipping;
  
  console.log('Order total:', total);
  return total;
}
`;

  const block1: CodeBlock = {
    code: `const subtotal = order.items.reduce((sum, item) => sum + item.price, 0);
const tax = subtotal * 0.08;
const shipping = subtotal > 50 ? 0 : 5.99;
const total = subtotal + tax + shipping;`,
    location: {
      file: 'order.ts',
      startLine: 3,
      endLine: 6,
      startColumn: 2,
      endColumn: 50,
    },
  };

  console.log('=== Example 1: Extract Order Calculation ===');
  const result1 = await transformer.extractMethod(code1, block1, 'calculateOrderTotal');
  console.log('Success:', result1.success);
  console.log('Transformed Code:\n', result1.transformedCode);
  console.log('Changes:', result1.changes.length);

  // Example 2: Extract validation logic
  const code2 = `
function validateUser(user) {
  if (!user.email || !user.email.includes('@')) {
    throw new Error('Invalid email');
  }
  if (!user.password || user.password.length < 8) {
    throw new Error('Password too short');
  }
  if (!user.name || user.name.trim().length === 0) {
    throw new Error('Name required');
  }
  
  return true;
}
`;

  const block2: CodeBlock = {
    code: `if (!user.email || !user.email.includes('@')) {
    throw new Error('Invalid email');
  }
  if (!user.password || user.password.length < 8) {
    throw new Error('Password too short');
  }
  if (!user.name || user.name.trim().length === 0) {
    throw new Error('Name required');
  }`,
    location: {
      file: 'validation.ts',
      startLine: 3,
      endLine: 11,
      startColumn: 2,
      endColumn: 3,
    },
  };

  console.log('\n=== Example 2: Extract Validation Logic ===');
  const result2 = await transformer.extractMethod(code2, block2, 'validateUserFields');
  console.log('Success:', result2.success);
  console.log('Transformed Code:\n', result2.transformedCode);

  // Example 3: Let AI suggest the method name
  const code3 = `
function analyzeData(data) {
  const filtered = data.filter(item => item.value > 0);
  const sorted = filtered.sort((a, b) => b.value - a.value);
  const top10 = sorted.slice(0, 10);
  
  return top10;
}
`;

  const block3: CodeBlock = {
    code: `const filtered = data.filter(item => item.value > 0);
const sorted = filtered.sort((a, b) => b.value - a.value);
const top10 = sorted.slice(0, 10);`,
    location: {
      file: 'analysis.ts',
      startLine: 3,
      endLine: 5,
      startColumn: 2,
      endColumn: 32,
    },
  };

  console.log('\n=== Example 3: AI-Suggested Method Name ===');
  const result3 = await transformer.extractMethod(code3, block3);
  console.log('Success:', result3.success);
  console.log('Transformed Code:\n', result3.transformedCode);
}

// Run the examples if this file is executed directly
if (require.main === module) {
  demonstrateExtractMethod().catch(console.error);
}
