# Chart Components

This directory contains reusable chart components built with Recharts for visualizing code analysis data.

## Components

### LanguagePieChart

Displays language distribution as a pie chart with color-coded segments.

**Props:**
- `languages: LanguageStats[]` - Array of language statistics
- `height?: number` - Chart height in pixels (default: 300)

**Features:**
- Color-coded language segments with predefined colors for common languages
- Interactive tooltips showing percentage and line count
- Legend for language identification
- Responsive design

**Example:**
```tsx
import { LanguagePieChart } from '@/components/Charts';

<LanguagePieChart 
  languages={[
    { language: 'TypeScript', percentage: 65.5, lineCount: 12500 },
    { language: 'JavaScript', percentage: 34.5, lineCount: 6500 }
  ]}
  height={350}
/>
```

### MetricsGauge

Displays a maintainability index or quality score as a gauge with visual indicators.

**Props:**
- `value: number` - The metric value to display
- `maxValue?: number` - Maximum value for the gauge (default: 100)
- `description?: string` - Optional custom description

**Features:**
- Color-coded based on value (green: good, yellow: fair, red: poor)
- Progress bar visualization
- Quality badge indicator
- Automatic quality descriptions

**Example:**
```tsx
import { MetricsGauge } from '@/components/Charts';

<MetricsGauge 
  value={85}
  maxValue={100}
  description="Custom description for this metric"
/>
```

### ComplexityBarChart

Displays complexity metrics as a bar chart.

**Props:**
- `data: ComplexityData[]` - Array of complexity data points
  - `name: string` - Label for the bar
  - `value: number` - Numeric value
  - `color?: string` - Optional custom color
- `height?: number` - Chart height in pixels (default: 250)
- `showGrid?: boolean` - Show grid lines (default: true)

**Features:**
- Customizable bar colors
- Interactive tooltips with formatted values
- Responsive design
- Optional grid display

**Example:**
```tsx
import { ComplexityBarChart } from '@/components/Charts';

<ComplexityBarChart 
  data={[
    { name: 'Code', value: 15000, color: '#3b82f6' },
    { name: 'Comments', value: 3000, color: '#10b981' },
    { name: 'Blank', value: 2000, color: '#6b7280' }
  ]}
  height={300}
  showGrid={true}
/>
```

### IssuesSeverityChart

Displays code issues grouped by severity level as a bar chart.

**Props:**
- `issues: Issue[]` - Array of code issues
- `height?: number` - Chart height in pixels (default: 300)

**Features:**
- Automatically counts issues by severity
- Color-coded bars (critical: red, high: orange, medium: yellow, low: blue)
- Interactive tooltips
- Legend for severity levels
- Responsive design

**Example:**
```tsx
import { IssuesSeverityChart } from '@/components/Charts';

<IssuesSeverityChart 
  issues={[
    { type: 'code-smell', severity: 'high', file: 'app.ts', line: 42, description: 'Long method' },
    { type: 'security', severity: 'critical', file: 'auth.ts', line: 15, description: 'SQL injection' }
  ]}
  height={350}
/>
```

## Common Features

All chart components include:
- **Responsive Design**: Automatically adjust to container width
- **Tooltips**: Interactive tooltips on hover
- **Accessibility**: Proper ARIA labels and semantic HTML
- **TypeScript**: Full type safety with TypeScript interfaces
- **Customization**: Configurable heights and styling options

## Usage in Tab Components

These chart components are designed to be used in the analysis tab components:

- **LanguagesTab**: Uses `LanguagePieChart` for language distribution
- **MetricsTab**: Uses `MetricsGauge` for maintainability index and `ComplexityBarChart` for LOC breakdown
- **IssuesTab**: Can use `IssuesSeverityChart` for severity distribution visualization

## Dependencies

- `recharts` - Charting library
- `@/types` - Type definitions for data structures
- `@/components/ui` - UI components (Badge, etc.)

## Styling

Charts use Tailwind CSS for styling and follow the application's design system:
- Color palette matches the overall theme
- Responsive breakpoints align with the app
- Consistent spacing and typography
