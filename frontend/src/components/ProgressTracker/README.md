# ProgressTracker Component

The ProgressTracker component displays real-time analysis progress with a visual progress bar, stage indicators, and estimated time remaining.

## Features

- **Progress Bar (0-100%)** - Visual representation of analysis completion (Requirement 3.1)
- **Current Stage Display** - Shows which analysis stage is currently running (Requirement 3.2)
- **Stage Checklist** - Lists all stages with completion status indicators (Requirement 3.3)
- **Estimated Time Remaining** - Displays time left until completion (Requirement 3.4)
- **Cancel Button** - Allows users to cancel ongoing analysis (Requirement 3.5)

## Usage

### Basic Usage

```tsx
import { ProgressTracker } from '../components/ProgressTracker';

function MyComponent() {
  return (
    <ProgressTracker
      progress={45}
      stage="analyzing-dependencies"
      estimatedTimeRemaining={120}
      isAnalyzing={true}
      onCancel={() => console.log('Cancelled')}
    />
  );
}
```

### With WebSocket Integration

```tsx
import { ProgressTracker } from '../components/ProgressTracker';
import { useWebSocket } from '../hooks/useWebSocket';

function ProjectAnalysis({ projectId }: { projectId: string }) {
  const { progress, stage, estimatedTimeRemaining } = useWebSocket(projectId);

  return (
    <ProgressTracker
      progress={progress}
      stage={stage}
      estimatedTimeRemaining={estimatedTimeRemaining}
      isAnalyzing={true}
      onCancel={async () => {
        // Call API to cancel analysis
        await cancelAnalysis(projectId);
      }}
    />
  );
}
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `progress` | `number` | Yes | Progress percentage (0-100) |
| `stage` | `string` | Yes | Current analysis stage ID |
| `estimatedTimeRemaining` | `number` | No | Estimated seconds until completion |
| `onCancel` | `() => void` | No | Callback when cancel button is clicked |
| `isAnalyzing` | `boolean` | No | Whether analysis is currently running (default: true) |

## Analysis Stages

The component recognizes the following stage IDs:

1. `uploading` - Uploading codebase
2. `extracting` - Extracting files
3. `detecting-languages` - Detecting languages
4. `analyzing-dependencies` - Analyzing dependencies
5. `calculating-metrics` - Calculating metrics
6. `detecting-issues` - Detecting code smells
7. `generating-report` - Generating report
8. `complete` - Analysis complete

## Stage Status Indicators

- ✅ **Completed** - Green checkmark for finished stages
- 🔵 **Active** - Blue spinner for current stage
- ⭕ **Pending** - Gray circle for upcoming stages
- ❌ **Failed** - Red X for failed stages (when `isAnalyzing=false` and `progress<100`)

## Time Formatting

The component automatically formats estimated time remaining:
- Less than 60 seconds: "45s remaining"
- Less than 1 hour: "5m 30s remaining"
- 1 hour or more: "2h 15m remaining"

## Styling

The component uses Tailwind CSS and shadcn/ui components for consistent styling with the rest of the application. It includes:
- Responsive design
- Dark mode support
- Color-coded status indicators
- Smooth animations

## Examples

See `ProgressTracker.example.tsx` for complete usage examples including:
- Early stage analysis
- Mid-stage analysis
- Late stage analysis
- Complete analysis
- Without cancel button
- With WebSocket integration
