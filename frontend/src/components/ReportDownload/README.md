# Report Download Component

This component provides a comprehensive report download feature with multiple format support, progress tracking, error handling, and URL sharing capabilities.

## Features

- **Multiple Format Support**: Download reports in JSON, PDF, or Markdown format
- **Progress Tracking**: Visual feedback during download process
- **Error Handling**: User-friendly error messages with retry capability
- **URL Sharing**: Copy report URL to clipboard for easy sharing
- **Dropdown Menu**: Clean UI with format selection dropdown

## Components

### ReportDownloadButton

A dropdown button component that provides report download functionality.

#### Props

```typescript
interface ReportDownloadButtonProps {
  projectId: string;        // ID of the project
  projectName: string;      // Name of the project (used for filename)
  disabled?: boolean;       // Disable the button
  variant?: 'default' | 'outline' | 'ghost';  // Button variant
  size?: 'default' | 'sm' | 'lg';             // Button size
}
```

#### Usage

```tsx
import { ReportDownloadButton } from '../components/ReportDownload';

function ProjectPage() {
  return (
    <ReportDownloadButton
      projectId="123"
      projectName="My Project"
      disabled={false}
    />
  );
}
```

## Utilities

### downloadReport

Downloads a report in the specified format.

```typescript
await downloadReport(
  projectId: string,
  projectName: string,
  format: 'json' | 'pdf' | 'markdown',
  options?: {
    onProgress?: (progress: DownloadProgress) => void;
    onError?: (error: Error) => void;
    onSuccess?: () => void;
  }
);
```

### copyReportUrl

Copies the report URL to clipboard.

```typescript
await copyReportUrl(
  projectId: string,
  format?: 'json' | 'pdf' | 'markdown'
);
```

### getReportUrl

Generates the report URL for sharing.

```typescript
const url = getReportUrl(
  projectId: string,
  format?: 'json' | 'pdf' | 'markdown'
);
```

## Requirements Validation

This implementation satisfies the following requirements:

- **6.1**: Provides a "Download Report" button on the results page ✓
- **6.2**: Offers report formats: JSON, PDF, and Markdown ✓
- **6.3**: Generates the report and triggers download ✓
- **6.4**: Shows download progress for large reports ✓
- **6.5**: Allows copying report URL for sharing ✓

## Error Handling

The component handles various error scenarios:

- Network failures during download
- Invalid project IDs
- Clipboard access failures
- Large file downloads

All errors are displayed to the user via toast notifications with actionable messages.

## Accessibility

- Keyboard navigation support
- ARIA labels for screen readers
- Focus management
- Clear visual feedback

## Browser Compatibility

- Modern browsers with Clipboard API support
- Fallback for older browsers without Clipboard API
- Blob download support required
