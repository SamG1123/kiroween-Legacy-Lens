/**
 * Example usage of RenameTransformer
 * 
 * This file demonstrates how to use the RenameTransformer to rename
 * identifiers (variables, functions, classes) in code while maintaining
 * correctness and handling scope properly.
 */

import { RenameTransformer } from './RenameTransformer';
import { Scope } from '../types';

async function demonstrateRenameTransformer() {
  const transformer = new RenameTransformer();

  // Example 1: Rename a variable in a function
  console.log('Example 1: Rename a variable');
  const code1 = `
function calculate() {
  const x = 5;
  const y = 10;
  const result = x + y;
  return result;
}
`;

  const scope1: Scope = {
    type: 'local',
    name: 'calculate',
  };

  const result1 = await transformer.rename(code1, 'x', 'firstNumber', scope1);
  console.log('Success:', result1.success);
  console.log('Transformed code:\n', result1.transformedCode);
  console.log('Changes:', result1.changes.length);
  console.log('---\n');

  // Example 2: Rename a function
  console.log('Example 2: Rename a function');
  const code2 = `
function oldFunctionName() {
  return 42;
}

const value = oldFunctionName();
console.log(value);
`;

  const scope2: Scope = {
    type: 'module',
    name: 'module',
  };

  const result2 = await transformer.rename(code2, 'oldFunctionName', 'calculateAnswer', scope2);
  console.log('Success:', result2.success);
  console.log('Transformed code:\n', result2.transformedCode);
  console.log('---\n');

  // Example 3: Rename with AI suggestion (no new name provided)
  console.log('Example 3: Rename with AI suggestion');
  const code3 = `
function process() {
  const tmp = getData();
  const res = transform(tmp);
  return res;
}
`;

  const scope3: Scope = {
    type: 'local',
    name: 'process',
  };

  const result3 = await transformer.rename(code3, 'tmp', undefined, scope3);
  console.log('Success:', result3.success);
  console.log('AI suggested name used in transformed code:\n', result3.transformedCode);
  console.log('---\n');

  // Example 4: Scope-aware renaming
  console.log('Example 4: Scope-aware renaming');
  const code4 = `
const count = 0;

function increment() {
  const count = 1;
  return count + 1;
}

function decrement() {
  return count - 1;
}
`;

  const scope4: Scope = {
    type: 'local',
    name: 'increment',
  };

  const result4 = await transformer.rename(code4, 'count', 'localCount', scope4);
  console.log('Success:', result4.success);
  console.log('Transformed code (only local count renamed):\n', result4.transformedCode);
  console.log('---\n');

  // Example 5: Detect naming conflict
  console.log('Example 5: Detect naming conflict');
  const code5 = `
function test() {
  const x = 5;
  const y = 10;
  return x + y;
}
`;

  const scope5: Scope = {
    type: 'local',
    name: 'test',
  };

  const result5 = await transformer.rename(code5, 'x', 'y', scope5);
  console.log('Success:', result5.success);
  console.log('Error:', result5.error);
  console.log('---\n');

  // Example 6: Rename class method
  console.log('Example 6: Rename class method');
  const code6 = `
class DataProcessor {
  processData(data) {
    return this.transform(data);
  }

  transform(data) {
    return data.map(x => x * 2);
  }
}
`;

  const scope6: Scope = {
    type: 'class',
    name: 'DataProcessor',
  };

  const result6 = await transformer.rename(code6, 'transform', 'transformData', scope6);
  console.log('Success:', result6.success);
  console.log('Transformed code:\n', result6.transformedCode);
  console.log('---\n');
}

// Run the examples
if (require.main === module) {
  demonstrateRenameTransformer().catch(console.error);
}
