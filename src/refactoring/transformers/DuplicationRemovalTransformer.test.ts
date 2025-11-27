import { DuplicationRemovalTransformer } from './DuplicationRemovalTransformer';
import { Location } from '../types';

describe('DuplicationRemovalTransformer', () => {
  let transformer: DuplicationRemovalTransformer;

  beforeEach(() => {
    transformer = new DuplicationRemovalTransformer();
  });

  describe('removeDuplication', () => {
    it('should extract duplicate code to a shared method', async () => {
      const code = `
function processUserA() {
  const user = getUser('A');
  user.validate();
  user.save();
  return user;
}

function processUserB() {
  const user = getUser('B');
  user.validate();
  user.save();
  return user;
}
`;

      const instances: Location[] = [
        {
          file: 'test.ts',
          startLine: 3,
          endLine: 5,
          startColumn: 2,
          endColumn: 15,
        },
        {
          file: 'test.ts',
          startLine: 10,
          endLine: 12,
          startColumn: 2,
          endColumn: 15,
        },
      ];

      const result = await transformer.removeDuplication(code, instances, 'processUser');

      expect(result.success).toBe(true);
      expect(result.transformedCode).toContain('function processUser');
      expect(result.transformedCode).toContain('processUser(');
      expect(result.changes.length).toBeGreaterThan(0);
    });

    it('should handle variations in duplicate code', async () => {
      const code = `
function calculateTotalA() {
  let sum = 0;
  for (let i = 0; i < items.length; i++) {
    sum += items[i].price;
  }
  return sum;
}

function calculateTotalB() {
  let total = 0;
  for (let i = 0; i < products.length; i++) {
    total += products[i].cost;
  }
  return total;
}
`;

      const instances: Location[] = [
        {
          file: 'test.ts',
          startLine: 3,
          endLine: 7,
          startColumn: 2,
          endColumn: 14,
        },
        {
          file: 'test.ts',
          startLine: 11,
          endLine: 15,
          startColumn: 2,
          endColumn: 16,
        },
      ];

      const result = await transformer.removeDuplication(code, instances);

      expect(result.success).toBe(true);
      expect(result.transformedCode).toContain('function');
    });

    it('should fail with less than 2 instances', async () => {
      const code = `
function test() {
  console.log('test');
}
`;

      const instances: Location[] = [
        {
          file: 'test.ts',
          startLine: 2,
          endLine: 3,
          startColumn: 2,
          endColumn: 25,
        },
      ];

      const result = await transformer.removeDuplication(code, instances);

      expect(result.success).toBe(false);
      expect(result.error).toContain('At least two duplicate instances');
    });

    it('should update all call sites', async () => {
      const code = `
function funcA() {
  const x = 10;
  const y = x * 2;
  console.log(y);
}

function funcB() {
  const x = 20;
  const y = x * 2;
  console.log(y);
}

function funcC() {
  const x = 30;
  const y = x * 2;
  console.log(y);
}
`;

      const instances: Location[] = [
        {
          file: 'test.ts',
          startLine: 3,
          endLine: 5,
          startColumn: 2,
          endColumn: 17,
        },
        {
          file: 'test.ts',
          startLine: 9,
          endLine: 11,
          startColumn: 2,
          endColumn: 17,
        },
        {
          file: 'test.ts',
          startLine: 15,
          endLine: 17,
          startColumn: 2,
          endColumn: 17,
        },
      ];

      const result = await transformer.removeDuplication(code, instances, 'sharedLogic');

      expect(result.success).toBe(true);
      expect(result.transformedCode).toContain('function sharedLogic');
      // Should have 3 replacements + 1 addition
      expect(result.changes.length).toBe(4);
    });

    it('should handle code with return statements', async () => {
      const code = `
function getDoubleA(value) {
  const result = value * 2;
  return result;
}

function getDoubleB(num) {
  const result = num * 2;
  return result;
}
`;

      const instances: Location[] = [
        {
          file: 'test.ts',
          startLine: 3,
          endLine: 4,
          startColumn: 2,
          endColumn: 16,
        },
        {
          file: 'test.ts',
          startLine: 8,
          endLine: 9,
          startColumn: 2,
          endColumn: 16,
        },
      ];

      const result = await transformer.removeDuplication(code, instances);

      expect(result.success).toBe(true);
      expect(result.transformedCode).toContain('return');
    });
  });
});
