# Loading States Components

This directory contains all loading state components used throughout the application to provide visual feedback during data fetching and processing operations.

## Components

### Skeleton
Base skeleton component with shimmer animation effect.

```tsx
import { Skeleton } from '../ui/skeleton';

<Skeleton className="h-4 w-32" />
```

### Spinner
Simple loading spinner with optional message.

```tsx
import { Spinner, LoadingSpinner } from '../ui/spinner';

<Spinner size="md" />
<LoadingSpinner message="Loading data..." size="lg" />
```

### ProjectCardSkeleton
Loading skeleton for project cards on the dashboard.

```tsx
import { ProjectCardSkeleton } from '../LoadingStates';

<ProjectCardSkeleton />
```

### DashboardSkeleton
Complete dashboard loading skeleton including header, stats, filters, and project grid.

```tsx
import { DashboardSkeleton } from '../LoadingStates';

<DashboardSkeleton />
```

### TableSkeleton
Generic table loading skeleton with configurable rows and columns.

```tsx
import { TableSkeleton } from '../LoadingStates';

<TableSkeleton rows={5} columns={4} />
```

### ChartSkeleton
Loading skeleton for chart components.

```tsx
import { ChartSkeleton, PieChartSkeleton, BarChartSkeleton } from '../LoadingStates';

<ChartSkeleton title description height="h-64" />
<PieChartSkeleton />
<BarChartSkeleton />
```

### UploadLoadingState
Specialized loading state for file uploads with progress indicator.

```tsx
import { UploadLoadingState } from '../LoadingStates';

<UploadLoadingState 
  progress={45}
  fileName="project.zip"
  status="uploading"
  message="Uploading your project..."
/>
```

### ShimmerEffect
Wrapper component that adds shimmer animation to any content.

```tsx
import { ShimmerEffect } from '../LoadingStates';

<ShimmerEffect className="h-32 w-full">
  <div>Your content here</div>
</ShimmerEffect>
```

## Usage Guidelines

### When to Use Loading States

1. **Initial Page Load**: Show skeleton loaders while fetching initial data
2. **Data Refresh**: Display spinners or maintain skeleton during refetch
3. **File Uploads**: Use UploadLoadingState with progress tracking
4. **Long Operations**: Show loading indicators for operations > 300ms

### Best Practices

1. **Match Layout**: Skeleton loaders should match the actual content layout
2. **Shimmer Effect**: Use shimmer animation for better perceived performance
3. **Progressive Loading**: Load critical content first, then secondary data
4. **Avoid Flashing**: Use minimum display time to prevent quick flashes
5. **Accessibility**: Ensure loading states are announced to screen readers

### Performance Considerations

- Skeleton components are lightweight and render quickly
- Shimmer animation uses CSS transforms for optimal performance
- Avoid nesting too many skeleton components
- Use React.Suspense boundaries for code-split components

## Animation

The shimmer effect is defined in `tailwind.config.js`:

```javascript
keyframes: {
  shimmer: {
    "100%": { transform: "translateX(100%)" },
  },
},
animation: {
  shimmer: "shimmer 2s infinite",
}
```

## Examples

### Dashboard Loading
```tsx
{isLoading ? (
  <DashboardSkeleton />
) : (
  <Dashboard projects={projects} />
)}
```

### Tab Content Loading
```tsx
<TabsContent value="languages">
  {isLoading ? (
    <PieChartSkeleton />
  ) : (
    <LanguagesTab languages={data.languages} />
  )}
</TabsContent>
```

### Upload Progress
```tsx
{uploading && (
  <UploadLoadingState
    progress={uploadProgress}
    fileName={file.name}
    status={uploadProgress < 100 ? 'uploading' : 'processing'}
  />
)}
```

## Customization

All loading components accept className props for customization:

```tsx
<ProjectCardSkeleton className="border-2 border-blue-200" />
<Skeleton className="h-8 w-full rounded-lg bg-blue-100" />
```

## Testing

Loading states should be tested for:
- Correct rendering during loading phase
- Proper cleanup after data loads
- Accessibility attributes
- Animation performance
