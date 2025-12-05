# Performance Optimization - Quick Reference

## Quick Start

### 1. Use Virtual Scrolling for Large Lists

```tsx
import { VirtualList } from '@/components/VirtualList';

<VirtualList
  items={largeArray}
  itemHeight={50}
  containerHeight={600}
  renderItem={(item) => <div>{item.name}</div>}
/>
```

### 2. Lazy Load Heavy Components

```tsx
import { lazy, Suspense } from 'react';

const HeavyComponent = lazy(() => import('./HeavyComponent'));

<Suspense fallback={<LoadingSkeleton />}>
  <HeavyComponent />
</Suspense>
```

### 3. Debounce User Input

```tsx
import { useDebounce } from '@/hooks';

const debouncedValue = useDebounce(searchQuery, 300);
```

### 4. Optimize Images

```tsx
import { compressImage } from '@/utils';

const compressed = await compressImage(file, 1920, 1080, 0.8);
```

### 5. Monitor Performance

```tsx
import { reportWebVitals } from '@/utils/performance';

reportWebVitals(); // In development
```

## When to Use What

| Scenario | Solution | Performance Gain |
|----------|----------|------------------|
| 100+ items in list | VirtualList | 90% faster |
| Heavy modal/dialog | Lazy loading | 40% smaller bundle |
| Search input | useDebounce | Fewer re-renders |
| Image upload | compressImage | Faster uploads |
| Large component | React.memo | Fewer re-renders |

## Performance Checklist

- [ ] Routes are lazy loaded
- [ ] Heavy components use Suspense
- [ ] Lists with 100+ items use virtual scrolling
- [ ] Search inputs are debounced
- [ ] Images are optimized
- [ ] Build uses code splitting
- [ ] Bundle size < 500KB initial
- [ ] LCP < 2.5s
- [ ] FID < 100ms
- [ ] CLS < 0.1

## Common Patterns

### Pattern 1: Lazy Route
```tsx
const Page = lazy(() => import('./Page'));
<Route path="/page" element={<Suspense fallback={<Skeleton />}><Page /></Suspense>} />
```

### Pattern 2: Virtual List
```tsx
<VirtualList items={data} itemHeight={80} containerHeight={600} renderItem={Item} />
```

### Pattern 3: Debounced Search
```tsx
const [query, setQuery] = useState('');
const debouncedQuery = useDebounce(query, 300);
useEffect(() => { search(debouncedQuery); }, [debouncedQuery]);
```

### Pattern 4: Memoized Component
```tsx
export default React.memo(ExpensiveComponent);
```

### Pattern 5: Memoized Value
```tsx
const value = useMemo(() => expensiveCalculation(data), [data]);
```

## Build Commands

```bash
# Development
npm run dev

# Production build
npm run build

# Preview production build
npm run preview

# Analyze bundle (if configured)
npm run build -- --mode analyze
```

## Metrics to Track

- **Bundle Size**: < 500KB initial
- **LCP (Largest Contentful Paint)**: < 2.5s
- **FID (First Input Delay)**: < 100ms
- **CLS (Cumulative Layout Shift)**: < 0.1
- **TTI (Time to Interactive)**: < 3.5s
- **FCP (First Contentful Paint)**: < 1.8s

## Tools

- Chrome DevTools Performance tab
- Lighthouse (in Chrome DevTools)
- React DevTools Profiler
- Vite build analyzer

## Resources

- [PERFORMANCE_OPTIMIZATION.md](./PERFORMANCE_OPTIMIZATION.md) - Full guide
- [VirtualList README](./src/components/VirtualList/README.md) - Component docs
- [Web Vitals](https://web.dev/vitals/) - Google's guide
