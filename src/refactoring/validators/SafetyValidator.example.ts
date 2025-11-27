import { SafetyValidator } from './SafetyValidator';

/**
 * Example usage of SafetyValidator
 */

const validator = new SafetyValidator();

// Example 1: Validate a simple refactoring
const original = `
function calculateTotal(items) {
  let total = 0;
  for (let i = 0; i < items.length; i++) {
    total += items[i].price;
  }
  return total;
}
`;

const refactored = `
function calculateTotal(items) {
  return items.reduce((total, item) => total + item.price, 0);
}
`;

console.log('Example 1: Valid refactoring');
const result1 = validator.validateRefactoring(original, refactored);
console.log('Safe:', result1.safe);
console.log('Issues:', result1.issues);
console.log('Warnings:', result1.warnings);
console.log('');

// Example 2: Detect syntax errors
const invalidRefactored = `
function calculateTotal(items {
  return items.reduce((total, item) => total + item.price, 0);
}
`;

console.log('Example 2: Syntax error detection');
const result2 = validator.validateRefactoring(original, invalidRefactored);
console.log('Safe:', result2.safe);
console.log('Issues:', result2.issues);
console.log('');

// Example 3: Check for naming conflicts
const codeWithConflict = `
const myVar = 10;
function test() {
  const myVar = 20; // This is OK - different scope
  return myVar;
}
`;

console.log('Example 3: Check naming conflicts');
const hasConflict = validator.checkNamingConflicts(codeWithConflict, 'myVar');
console.log('Has conflict with "myVar":', hasConflict);
const noConflict = validator.checkNamingConflicts(codeWithConflict, 'newName');
console.log('Has conflict with "newName":', noConflict);
console.log('');

// Example 4: Check syntax
console.log('Example 4: Syntax checking');
const validCode = 'function test() { return 42; }';
const invalidCode = 'function test( { return 42; }';
console.log('Valid code syntax:', validator.checkSyntax(validCode));
console.log('Invalid code syntax:', validator.checkSyntax(invalidCode));
console.log('');

// Example 5: Check behavior preservation (async)
(async () => {
  console.log('Example 5: Behavior preservation check');
  const preserved = await validator.checkBehaviorPreservation(original, refactored);
  console.log('Behavior likely preserved:', preserved);
  
  const majorChange = `
  function calculateTotal(items) {
    return helper1(items) + helper2(items);
  }
  
  function helper1(items) {
    return items.length;
  }
  
  function helper2(items) {
    return 0;
  }
  `;
  
  const notPreserved = await validator.checkBehaviorPreservation(original, majorChange);
  console.log('Major structural change detected:', !notPreserved);
})();
