// Fast-check configuration for property-based testing
// Ensures all property tests run with minimum 100 iterations

import * as fc from 'fast-check';

export const propertyTestConfig: fc.Parameters<unknown> = {
  numRuns: 100, // Minimum 100 iterations as per design document
  verbose: true,
  seed: Date.now(), // Use timestamp for reproducibility
};

// Helper function to run property tests with standard configuration
export function runPropertyTest<T>(
  property: fc.IProperty<T>,
  params?: Partial<fc.Parameters<T>>
): void {
  fc.assert(property, {
    ...propertyTestConfig,
    ...params,
  } as fc.Parameters<T>);
}
