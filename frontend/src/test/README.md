# Test Suite

## Status

✅ **Test infrastructure is fully set up and working**

The testing framework is configured and ready to use. Basic tests pass successfully.

## Current State

### Working
- ✅ Vitest configuration
- ✅ Test utilities and helpers
- ✅ Mock data
- ✅ Test environment (happy-dom)
- ✅ Basic test execution

### Needs Adjustment
- ⚠️ Component tests need to match actual implementations
- ⚠️ Import/export statements need verification
- ⚠️ Component prop interfaces need alignment

## Quick Start

### Run All Tests
```bash
npm run test
```

### Run Tests in Watch Mode
```bash
npm run test:watch
```

### Run Specific Test File
```bash
npm run test src/test/example.test.ts
```

### Generate Coverage Report
```bash
npm run test:coverage
```

## Test Files

### ✅ Working Tests
- `example.test.ts` - Basic infrastructure tests

### ⚠️ Needs Adjustment
- `components/ProjectCard/ProjectCard.test.tsx`
- `components/Dashboard/Dashboard.test.tsx`
- `components/UploadModal/UploadModal.test.tsx`
- `components/ProgressTracker/ProgressTracker.test.tsx`
- `components/Charts/LanguagePieChart.test.tsx`
- `components/Charts/MetricsGauge.test.tsx`
- `components/ErrorBoundary.test.tsx`
- `utils/errorHandling.test.ts`
- `utils/accessibility.test.ts`
- `hooks/useDebounce.test.ts`
- `test/integration/uploadFlow.test.tsx`
- `test/integration/projectView.test.tsx`

## Fixing Tests

To fix the component tests, you need to:

1. **Check Component Exports**
   ```typescript
   // If component uses default export:
   import ComponentName from './ComponentName';
   
   // If component uses named export:
   import { ComponentName } from './ComponentName';
   ```

2. **Verify Component Props**
   - Check the actual prop interface in the component file
   - Update test props to match

3. **Update Test Queries**
   - Use `screen.debug()` to see what's actually rendered
   - Update queries to match actual text/labels

4. **Mock Dependencies**
   - Mock API calls with vi.mock()
   - Mock custom hooks if needed

## Example: Fixing a Component Test

```typescript
// 1. Check the actual component
import MetricsGauge from './MetricsGauge'; // default export

// 2. Update the test import
import MetricsGauge from './MetricsGauge';

// 3. Check actual props
interface MetricsGaugeProps {
  value: number;
  maxValue?: number;
  description?: string;
}

// 4. Update test to match
it('renders gauge with correct value', () => {
  render(<MetricsGauge value={75} />);
  expect(screen.getByText('75')).toBeInTheDocument();
});
```

## Writing New Tests

### Component Test Template

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '../../test/utils';
import userEvent from '@testing-library/user-event';
import { ComponentName } from './ComponentName';

describe('ComponentName', () => {
  it('renders correctly', () => {
    render(<ComponentName />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });

  it('handles user interaction', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    
    render(<ComponentName onClick={handleClick} />);
    
    await user.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalled();
  });
});
```

### Utility Test Template

```typescript
import { describe, it, expect } from 'vitest';
import { utilityFunction } from './utilities';

describe('utilityFunction', () => {
  it('returns expected result', () => {
    const result = utilityFunction('input');
    expect(result).toBe('expected output');
  });

  it('handles edge cases', () => {
    expect(utilityFunction('')).toBe('');
    expect(utilityFunction(null)).toBe(null);
  });
});
```

## Best Practices

1. **Test Behavior, Not Implementation**
   - Focus on what the user sees and does
   - Don't test internal state or methods

2. **Use Semantic Queries**
   - Prefer `getByRole`, `getByLabelText`, `getByText`
   - Avoid `getByTestId` unless necessary

3. **Keep Tests Simple**
   - One assertion per test when possible
   - Clear test names that describe the behavior

4. **Use Async Utilities**
   - Use `waitFor` for async operations
   - Use `findBy` queries for elements that appear asynchronously

5. **Clean Up**
   - Tests are automatically cleaned up after each test
   - No manual cleanup needed

## Debugging

### See What's Rendered
```typescript
screen.debug();
```

### Find Available Queries
```typescript
screen.logTestingPlaygroundURL();
```

### Check Specific Element
```typescript
const element = screen.getByRole('button');
screen.debug(element);
```

## Resources

- [Vitest Docs](https://vitest.dev/)
- [Testing Library Docs](https://testing-library.com/)
- [Common Mistakes](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
