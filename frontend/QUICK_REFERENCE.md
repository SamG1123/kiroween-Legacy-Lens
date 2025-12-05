# Quick Reference - Legacy Code Revival AI

## 🚀 Quick Start

```bash
# Development
npm install
npm run dev

# Production
npm run build
npm run preview

# Testing
npm test
npm run test:coverage
```

## 📁 Key Files

| File | Purpose |
|------|---------|
| `src/App.tsx` | Main application component |
| `src/pages/HomePage.tsx` | Dashboard page |
| `src/pages/ProjectPage.tsx` | Project details page |
| `src/api/endpoints.ts` | API endpoint definitions |
| `src/hooks/useProjects.ts` | Projects data hook |
| `src/hooks/useWebSocket.ts` | Real-time updates hook |
| `vite.config.ts` | Build configuration |
| `tailwind.config.js` | Styling configuration |

## 🎨 Component Library

### UI Components (`src/components/ui/`)
- Button, Card, Dialog, Input, Select
- Progress, Tabs, Toast, Tooltip
- Badge, Skeleton, Spinner

### Feature Components
- `Dashboard` - Project list and filters
- `ProjectCard` - Project summary card
- `UploadModal` - Upload interface
- `ProgressTracker` - Real-time progress
- `Charts/` - Data visualizations

## 🔌 API Endpoints

```typescript
// Projects
GET    /api/projects          // List all projects
GET    /api/projects/:id      // Get project details
POST   /api/analyze           // Create new analysis
DELETE /api/projects/:id      // Delete project

// Analysis
GET    /api/analysis/:id      // Get analysis status
GET    /api/report/:id        // Get analysis report
GET    /api/report/:id/download?format=json|pdf|markdown
```

## 🎯 Key Features

### Upload Methods
1. **GitHub**: Enter repository URL
2. **ZIP**: Upload compressed codebase (max 100MB)
3. **Local**: Browse local directory (coming soon)

### Analysis Tabs
1. **Overview**: Summary and key metrics
2. **Languages**: Distribution and line counts
3. **Dependencies**: Libraries and frameworks
4. **Metrics**: Code quality scores
5. **Issues**: Code smells and problems

### Report Formats
- **JSON**: Machine-readable
- **PDF**: Professional report
- **Markdown**: Human-readable

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + K` | Open search |
| `Ctrl/Cmd + N` | New analysis |
| `Esc` | Close modal |
| `Tab` | Navigate elements |
| `Enter` | Confirm action |

## 🎨 Styling

### Tailwind Classes
```typescript
// Layout
"flex items-center justify-between"
"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"

// Spacing
"p-4 m-2 space-y-4 gap-3"

// Colors
"bg-primary text-primary-foreground"
"bg-destructive text-destructive-foreground"

// Responsive
"hidden md:block"
"text-sm md:text-base lg:text-lg"
```

### CSS Variables
```css
--primary: 221.2 83.2% 53.3%
--secondary: 210 40% 96.1%
--destructive: 0 84.2% 60.2%
--muted: 210 40% 96.1%
```

## 🧪 Testing

### Run Tests
```bash
npm test                 # Run once
npm run test:watch       # Watch mode
npm run test:coverage    # With coverage
npm run test:ui          # UI mode
```

### Test Patterns
```typescript
// Component test
import { render, screen } from '@testing-library/react';

test('renders component', () => {
  render(<MyComponent />);
  expect(screen.getByText('Hello')).toBeInTheDocument();
});

// Hook test
import { renderHook } from '@testing-library/react';

test('hook works', () => {
  const { result } = renderHook(() => useMyHook());
  expect(result.current.value).toBe(expected);
});
```

## 🔧 Common Tasks

### Add New Page
1. Create in `src/pages/`
2. Add route in `src/App.tsx`
3. Add navigation link
4. Add tests

### Add New Component
1. Create in `src/components/`
2. Export from `index.ts`
3. Add TypeScript types
4. Add tests

### Add New API Endpoint
1. Add to `src/api/endpoints.ts`
2. Create hook in `src/hooks/`
3. Use in components

### Add New Chart
1. Create in `src/components/Charts/`
2. Use Recharts components
3. Make responsive
4. Add tests

## 🐛 Debugging

### React DevTools
- Inspect component props/state
- Profile renders
- Track updates

### Network Tab
- Check API calls
- Monitor WebSocket
- View request/response

### Console
```typescript
import logger from '@/utils/logger';

logger.log('Debug info');      // Dev only
logger.error('Error occurred'); // Dev only
```

## 📦 Build & Deploy

### Build
```bash
npm run build
# Output: dist/
```

### Deploy
```bash
# Vercel
npm run deploy:vercel

# Netlify
npm run deploy:netlify

# Manual
# Upload dist/ folder to hosting
```

### Environment Variables
```bash
# .env.production
VITE_API_URL=https://api.production.com/api
VITE_WS_URL=https://api.production.com
```

## 🔍 Troubleshooting

### Build Fails
```bash
# Clear and reinstall
rm -rf node_modules package-lock.json
npm install

# Check TypeScript
npx tsc --noEmit

# Run linter
npm run lint
```

### Tests Fail
```bash
# Update snapshots
npm run test -- -u

# Run specific test
npm run test -- MyComponent.test.tsx
```

### Dev Server Issues
```bash
# Clear cache
rm -rf node_modules/.vite

# Restart server
npm run dev
```

## 📚 Documentation

- **USER_GUIDE.md**: End user documentation
- **DEVELOPER_GUIDE.md**: Developer reference
- **DEPLOYMENT.md**: Deployment instructions
- **ACCESSIBILITY.md**: Accessibility guidelines
- **PERFORMANCE_OPTIMIZATION.md**: Performance tips

## 🔗 Resources

- [React Docs](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [TanStack Query](https://tanstack.com/query/latest)
- [shadcn/ui](https://ui.shadcn.com)

## 💡 Tips

1. Use `logger` instead of `console` for production safety
2. Leverage React Query for server state
3. Use Tailwind utilities for consistent styling
4. Test with keyboard navigation
5. Check accessibility with screen readers
6. Profile performance with React DevTools
7. Keep components small and focused
8. Document complex logic
9. Write tests for critical paths
10. Review bundle size regularly

---

**Need Help?** Check the full documentation or contact the team.
