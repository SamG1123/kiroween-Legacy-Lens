# Developer Guide - Legacy Code Revival AI Web UI

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Build for production
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
frontend/
├── src/
│   ├── api/              # API client and endpoints
│   ├── components/       # React components
│   │   ├── ui/          # Reusable UI components (shadcn/ui)
│   │   ├── Dashboard/   # Dashboard feature
│   │   ├── Charts/      # Chart components
│   │   └── ...          # Other feature components
│   ├── hooks/           # Custom React hooks
│   ├── pages/           # Page components
│   ├── types/           # TypeScript type definitions
│   ├── utils/           # Utility functions
│   ├── test/            # Test utilities and setup
│   ├── App.tsx          # Main app component
│   └── main.tsx         # Entry point
├── public/              # Static assets
└── ...config files
```

## Key Technologies

- **React 18**: UI framework
- **TypeScript**: Type safety
- **Vite**: Build tool and dev server
- **Tailwind CSS**: Styling
- **shadcn/ui**: Component library
- **TanStack Query**: Server state management
- **React Router**: Routing
- **Socket.io**: Real-time updates
- **Recharts**: Data visualization
- **Vitest**: Testing framework

## Development Guidelines

### Component Creation

```typescript
// Use functional components with TypeScript
interface MyComponentProps {
  title: string;
  onAction: () => void;
}

export function MyComponent({ title, onAction }: MyComponentProps) {
  return (
    <div>
      <h2>{title}</h2>
      <button onClick={onAction}>Action</button>
    </div>
  );
}
```

### State Management

```typescript
// Use React Query for server state
import { useQuery } from '@tanstack/react-query';

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsAPI.getAll(),
  });
}

// Use useState for local component state
const [isOpen, setIsOpen] = useState(false);
```

### API Calls

```typescript
// Define endpoints in src/api/endpoints.ts
export const projectsAPI = {
  getAll: () => apiClient.get('/projects'),
  getById: (id: string) => apiClient.get(`/projects/${id}`),
};

// Use in components via hooks
const { data, isLoading, error } = useProjects();
```

### Styling

```typescript
// Use Tailwind CSS classes
<div className="flex items-center gap-4 p-4 bg-white rounded-lg shadow">
  <h2 className="text-xl font-semibold">Title</h2>
</div>

// Use cn() utility for conditional classes
import { cn } from '@/utils/cn';

<div className={cn(
  "base-classes",
  isActive && "active-classes",
  isDisabled && "disabled-classes"
)}>
```

### Error Handling

```typescript
// Use try-catch for async operations
try {
  await someAsyncOperation();
  toast.success('Operation successful');
} catch (error) {
  const appError = parseError(error);
  toast.error(appError.message);
}

// Use ErrorBoundary for component errors
<ErrorBoundary>
  <MyComponent />
</ErrorBoundary>
```

### Logging

```typescript
// Use logger utility instead of console
import logger from '@/utils/logger';

logger.log('Debug info');      // Only in development
logger.error('Error occurred'); // Only in development
logger.warn('Warning');         // Only in development
```

### Testing

```typescript
// Write tests using Vitest and React Testing Library
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent title="Test" />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });
});
```

## Common Tasks

### Adding a New Page

1. Create page component in `src/pages/`
2. Add route in `src/App.tsx`
3. Add navigation link if needed
4. Add tests

```typescript
// src/pages/NewPage.tsx
export default function NewPage() {
  return <div>New Page</div>;
}

// src/App.tsx
import NewPage from './pages/NewPage';

<Routes>
  <Route path="/new" element={<NewPage />} />
</Routes>
```

### Adding a New Component

1. Create component file in appropriate folder
2. Export from index.ts if needed
3. Add TypeScript types
4. Add tests
5. Document props if complex

```typescript
// src/components/MyFeature/MyComponent.tsx
interface MyComponentProps {
  /** The title to display */
  title: string;
  /** Callback when action is triggered */
  onAction: () => void;
}

export function MyComponent({ title, onAction }: MyComponentProps) {
  // Implementation
}

// src/components/MyFeature/index.ts
export { MyComponent } from './MyComponent';
```

### Adding a New API Endpoint

1. Add endpoint function in `src/api/endpoints.ts`
2. Create custom hook in `src/hooks/`
3. Use hook in components

```typescript
// src/api/endpoints.ts
export const myAPI = {
  getData: () => apiClient.get('/my-data'),
};

// src/hooks/useMyData.ts
export function useMyData() {
  return useQuery({
    queryKey: ['myData'],
    queryFn: () => myAPI.getData(),
  });
}

// In component
const { data, isLoading } = useMyData();
```

### Adding a New Chart

1. Create chart component in `src/components/Charts/`
2. Use Recharts components
3. Make it responsive
4. Add proper TypeScript types
5. Add tests

```typescript
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface MyChartProps {
  data: Array<{ name: string; value: number }>;
}

export function MyChart({ data }: MyChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name">
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index]} />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
}
```

## Performance Best Practices

### Code Splitting

```typescript
// Lazy load heavy components
const HeavyComponent = lazy(() => import('./HeavyComponent'));

<Suspense fallback={<LoadingSkeleton />}>
  <HeavyComponent />
</Suspense>
```

### Memoization

```typescript
// Memoize expensive calculations
const expensiveValue = useMemo(() => {
  return computeExpensiveValue(data);
}, [data]);

// Memoize callbacks
const handleClick = useCallback(() => {
  doSomething(id);
}, [id]);

// Memoize components
const MemoizedComponent = memo(MyComponent);
```

### Debouncing

```typescript
// Use debounce hook for search inputs
const debouncedSearch = useDebounce(searchTerm, 300);

useEffect(() => {
  if (debouncedSearch) {
    performSearch(debouncedSearch);
  }
}, [debouncedSearch]);
```

## Accessibility Guidelines

### Keyboard Navigation

```typescript
// Add keyboard handlers
<div
  role="button"
  tabIndex={0}
  onClick={handleClick}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleClick();
    }
  }}
>
```

### ARIA Labels

```typescript
// Add descriptive labels
<button aria-label="Close dialog">
  <X />
</button>

<input
  type="text"
  aria-label="Search projects"
  aria-describedby="search-help"
/>
<span id="search-help">Enter project name to search</span>
```

### Focus Management

```typescript
// Manage focus for modals
useEffect(() => {
  if (isOpen) {
    const firstFocusable = dialogRef.current?.querySelector('button');
    firstFocusable?.focus();
  }
}, [isOpen]);
```

## Debugging Tips

### React DevTools

- Install React DevTools browser extension
- Inspect component props and state
- Profile component renders
- Track component updates

### Network Debugging

```typescript
// API client logs all requests in development
// Check browser Network tab for API calls
// Check WebSocket tab for real-time connections
```

### Performance Profiling

```typescript
// Use React Profiler
import { Profiler } from 'react';

<Profiler id="MyComponent" onRender={onRenderCallback}>
  <MyComponent />
</Profiler>

// Use performance utilities
import { measureRender } from '@/utils/performance';

measureRender('ComponentName', () => {
  // Render logic
});
```

## Environment Variables

```bash
# .env.development
VITE_API_URL=http://localhost:3000/api
VITE_WS_URL=http://localhost:3000

# .env.production
VITE_API_URL=https://api.production.com/api
VITE_WS_URL=https://api.production.com
```

Access in code:
```typescript
const apiUrl = import.meta.env.VITE_API_URL;
const isDev = import.meta.env.DEV;
const isProd = import.meta.env.PROD;
```

## Build & Deployment

### Production Build

```bash
# Build for production
npm run build

# Output in dist/ folder
# - index.html
# - assets/ (JS, CSS, images)
```

### Bundle Analysis

```bash
# Analyze bundle size
npm run build

# Check dist/ folder sizes
# Main bundle should be < 200KB gzipped
# Vendor chunks should be < 150KB each gzipped
```

### Deployment

```bash
# Deploy to Vercel
npm run deploy:vercel

# Deploy to Netlify
npm run deploy:netlify

# Or use CI/CD pipeline
# See .github/workflows/deploy-frontend.yml
```

## Troubleshooting

### Common Issues

**Issue**: Module not found
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

**Issue**: TypeScript errors
```bash
# Check TypeScript configuration
npx tsc --noEmit

# Update types
npm install --save-dev @types/node @types/react @types/react-dom
```

**Issue**: Build fails
```bash
# Check for console.log statements (use logger instead)
# Check for unused imports
# Run linter
npm run lint
```

**Issue**: Tests fail
```bash
# Update test snapshots
npm run test -- -u

# Run specific test file
npm run test -- MyComponent.test.tsx
```

## Code Review Checklist

- [ ] TypeScript types are properly defined
- [ ] Components are properly tested
- [ ] Accessibility requirements met (ARIA, keyboard nav)
- [ ] Error handling implemented
- [ ] Loading states implemented
- [ ] Responsive design verified
- [ ] No console.log statements (use logger)
- [ ] No unused imports or variables
- [ ] Proper code formatting (Prettier)
- [ ] ESLint passes with no warnings
- [ ] Tests pass
- [ ] Documentation updated if needed

## Resources

- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [TanStack Query Docs](https://tanstack.com/query/latest)
- [Vitest Documentation](https://vitest.dev)
- [shadcn/ui Components](https://ui.shadcn.com)
- [React Router Docs](https://reactrouter.com)

## Getting Help

- Check existing documentation in the project
- Review similar components for patterns
- Check the USER_GUIDE.md for user-facing features
- Ask team members for code review
- Consult official documentation for libraries

---

**Happy Coding! 🚀**
