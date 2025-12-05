# Error Handling Implementation

This document describes the comprehensive error handling system implemented in the Web UI.

## Overview

The error handling system provides:
- **ErrorBoundary** component for catching React errors
- **Centralized error parsing** and user-friendly messages
- **Toast notifications** for user feedback
- **Retry functionality** for recoverable errors
- **Inline validation** for forms
- **API error interceptors** for consistent error handling

## Components

### 1. ErrorBoundary Component

Location: `src/components/ErrorBoundary.tsx`

A React error boundary that catches JavaScript errors anywhere in the component tree and displays a fallback UI.

**Features:**
- Catches and logs errors
- Shows user-friendly error message
- Provides "Try Again" and "Go Home" buttons
- Shows stack trace in development mode
- Can be customized with a fallback prop

**Usage:**
```tsx
import ErrorBoundary from './components/ErrorBoundary';

<ErrorBoundary>
  <YourApp />
</ErrorBoundary>
```

### 2. ErrorDisplay Component

Location: `src/components/ErrorDisplay.tsx`

A reusable component for displaying errors with retry functionality.

**Features:**
- Parses errors into user-friendly messages
- Shows actionable suggestions
- Provides retry button for retryable errors
- Customizable title and styling

**Usage:**
```tsx
import ErrorDisplay from './components/ErrorDisplay';

<ErrorDisplay 
  error={error}
  onRetry={() => refetch()}
  title="Failed to load data"
/>
```

## Utilities

### Error Handling Utilities

Location: `src/utils/errorHandling.ts`

Provides comprehensive error handling utilities:

#### Error Types
```typescript
enum ErrorType {
  NETWORK = 'NETWORK',
  VALIDATION = 'VALIDATION',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  NOT_FOUND = 'NOT_FOUND',
  SERVER = 'SERVER',
  UNKNOWN = 'UNKNOWN',
}
```

#### Key Functions

**parseError(error: unknown): AppError**
- Parses errors from various sources (Axios, Error, string)
- Returns structured AppError object
- Categorizes errors by type

**getUserFriendlyMessage(error: AppError): string**
- Converts technical errors to user-friendly messages
- Provides context-appropriate messaging

**showErrorToast(error: unknown, customMessage?: string)**
- Displays error toast notification
- Uses parsed error or custom message
- Auto-dismisses after 5 seconds

**showSuccessToast(message: string)**
- Displays success toast notification
- Auto-dismisses after 3 seconds

**showInfoToast(message: string)**
- Displays info toast notification
- Auto-dismisses after 4 seconds

**getErrorSuggestion(error: AppError): string | null**
- Provides actionable suggestions for fixing errors
- Returns null if no suggestion available

**isRetryableError(error: AppError): boolean**
- Determines if an error can be retried
- Returns true for network and server errors

## API Error Handling

Location: `src/api/client.ts`

The API client includes response interceptors that:
- Parse all API errors
- Log errors with context (URL, method, status)
- Handle specific status codes (401, 403, 404, 500, etc.)
- Maintain original error for component handling

## Form Validation

### Inline Validation

Forms include inline validation with:
- Real-time validation on input change
- Clear error messages below fields
- Visual indicators (red border, error icon)
- Validation on submit

**Example (UploadModal):**
```tsx
{errors.githubUrl && (
  <div className="flex items-center gap-2 text-sm text-red-500">
    <AlertCircle className="h-4 w-4" />
    {errors.githubUrl}
  </div>
)}
```

### Validation Functions

Each form includes validation functions:
- `validateGithubUrl()` - Validates GitHub URL format
- `validateProjectName()` - Validates project name length
- `validateFile()` - Validates file size and type
- `validateLocalPath()` - Validates local path

## Toast Notifications

Using `react-hot-toast` for user feedback:

**Configuration:**
```tsx
<Toaster position="top-right" />
```

**Types:**
- Success (green) - Operation completed successfully
- Error (red) - Operation failed
- Info (blue) - Informational message

## Error Handling Patterns

### 1. Query Error Handling

```tsx
const { data, error, refetch } = useProjects();

if (error) {
  return (
    <ErrorDisplay 
      error={error}
      onRetry={() => refetch()}
      title="Failed to load projects"
    />
  );
}
```

### 2. Mutation Error Handling

```tsx
const mutation = useMutation({
  mutationFn: createProject,
  onSuccess: () => {
    showSuccessToast('Project created successfully!');
  },
  onError: (error) => {
    showErrorToast(error, 'Failed to create project');
  },
});
```

### 3. Form Validation

```tsx
const handleSubmit = () => {
  const errors = {};
  
  const urlError = validateGithubUrl(githubUrl);
  if (urlError) errors.githubUrl = urlError;
  
  if (Object.keys(errors).length > 0) {
    setErrors(errors);
    return;
  }
  
  // Submit form
};
```

## Requirements Coverage

This implementation satisfies all requirements from Requirement 9:

### 9.1 - User-friendly error messages
✅ All errors are parsed and converted to user-friendly messages via `getUserFriendlyMessage()`

### 9.2 - Actionable suggestions
✅ Errors include suggestions via `getErrorSuggestion()` displayed in ErrorDisplay component

### 9.3 - Inline form validation
✅ All forms (UploadModal) include inline validation with error messages below fields

### 9.4 - Failure reason display
✅ Analysis failures show clear reasons in ProjectPage with appropriate error states

### 9.5 - Retry buttons
✅ ErrorDisplay component includes retry buttons for retryable errors (network, server)

## Best Practices

1. **Always use error utilities** - Use `showErrorToast()` instead of raw `toast.error()`
2. **Provide retry for recoverable errors** - Network and server errors should have retry buttons
3. **Validate early** - Validate form inputs on change, not just on submit
4. **Be specific** - Provide context-specific error messages
5. **Log errors** - All errors are logged for debugging
6. **Handle all error types** - Use try-catch and error boundaries appropriately

## Testing Error Handling

To test error handling:

1. **Network errors** - Disconnect internet or stop backend server
2. **Validation errors** - Submit forms with invalid data
3. **Server errors** - Simulate 500 errors from backend
4. **Component errors** - Throw errors in components to test ErrorBoundary
5. **Retry functionality** - Trigger errors and use retry buttons

## Future Enhancements

Potential improvements:
- Error tracking service integration (Sentry, LogRocket)
- Offline mode with queue for failed requests
- More granular error categorization
- Custom error pages for specific error types
- Error analytics and monitoring
