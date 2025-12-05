# Error Handling Visual Guide

This guide shows how error handling appears in the UI.

## 1. ErrorBoundary - Application-Level Errors

When a React component throws an error, the ErrorBoundary catches it and displays:

```
┌─────────────────────────────────────────────┐
│  ⚠️  Something went wrong                   │
│                                             │
│  An unexpected error occurred. Please try   │
│  refreshing the page.                       │
│                                             │
│  [Development Mode Only]                    │
│  Error: Cannot read property 'x' of null    │
│  Stack trace ▼                              │
│                                             │
│  [🔄 Try Again]  [🏠 Go Home]              │
└─────────────────────────────────────────────┘
```

## 2. ErrorDisplay - Data Loading Errors

When data fails to load (Dashboard, ProjectPage), ErrorDisplay shows:

```
┌─────────────────────────────────────────────┐
│  ⚠️  Failed to load projects                │
│                                             │
│  Unable to connect to the server. Please    │
│  check your internet connection and try     │
│  again.                                     │
│                                             │
│  Suggestion: Check your internet connection │
│  and try again.                             │
│                                             │
│  [🔄 Try Again]                             │
└─────────────────────────────────────────────┘
```

## 3. Toast Notifications

### Success Toast (Green)
```
┌─────────────────────────────────────┐
│ ✓ Project created successfully!    │
└─────────────────────────────────────┘
```

### Error Toast (Red)
```
┌─────────────────────────────────────┐
│ ✗ Failed to create project          │
│   Network error. Please check your  │
│   internet connection.              │
└─────────────────────────────────────┘
```

### Info Toast (Blue)
```
┌─────────────────────────────────────┐
│ ℹ️ Analysis in progress...          │
└─────────────────────────────────────┘
```

## 4. Inline Form Validation

In the UploadModal, validation errors appear below fields:

```
GitHub Repository URL
┌─────────────────────────────────────┐
│ https://github.com/invalid          │
└─────────────────────────────────────┘
⚠️ Please enter a valid GitHub repository URL

Project Name
┌─────────────────────────────────────┐
│ ab                                  │
└─────────────────────────────────────┘
⚠️ Project name must be at least 3 characters
```

## 5. Loading States

### Dashboard Loading
```
┌─────────────────────────────────────┐
│  🔄 Loading projects...             │
└─────────────────────────────────────┘
```

### Project Page Loading
```
┌─────────────────────────────────────┐
│         🔄                          │
│  Loading project details...         │
└─────────────────────────────────────┘
```

## 6. Error States by Type

### Network Error
```
Type: NETWORK
Message: "Unable to connect to the server. Please check your internet connection and try again."
Suggestion: "Check your internet connection and try again."
Retryable: ✓ Yes
```

### Validation Error
```
Type: VALIDATION
Message: "Please check your input and try again."
Suggestion: "Please review the form and correct any errors."
Retryable: ✗ No
```

### Server Error
```
Type: SERVER
Message: "The server is experiencing issues. Please try again in a few moments."
Suggestion: "Wait a few moments and try again."
Retryable: ✓ Yes
```

### Not Found Error
```
Type: NOT_FOUND
Message: "The requested item could not be found."
Suggestion: "The item may have been deleted or moved."
Retryable: ✗ No
```

## 7. WebSocket Connection Errors

When WebSocket connection fails during analysis:

```
┌─────────────────────────────────────────────┐
│  ⚠️ Connection lost. Real-time updates      │
│     unavailable.                            │
│                          [Retry Connection] │
└─────────────────────────────────────────────┘
```

## 8. Delete Confirmation Dialog

When deleting a project:

```
┌─────────────────────────────────────────────┐
│  ⚠️ Delete Project                          │
│                                             │
│  Are you sure you want to delete "My        │
│  Project"? This action cannot be undone.    │
│  All analysis data and reports associated   │
│  with this project will be permanently      │
│  removed.                                   │
│                                             │
│              [Cancel]  [Delete]             │
└─────────────────────────────────────────────┘
```

## Color Coding

- **Red** (🔴): Errors, failures, critical issues
- **Yellow** (🟡): Warnings, pending states
- **Green** (🟢): Success, completed states
- **Blue** (🔵): Info, in-progress states
- **Gray** (⚪): Neutral, disabled states

## Icons Used

- ⚠️ AlertCircle - Errors and warnings
- ✓ CheckCircle - Success
- 🔄 RefreshCw - Loading, retry
- ℹ️ Info - Information
- 🏠 Home - Navigation
- ✗ X - Close, remove

## User Flow Examples

### Example 1: Network Error Recovery
1. User tries to load dashboard
2. Network error occurs
3. ErrorDisplay shows with "Try Again" button
4. User clicks "Try Again"
5. Data loads successfully
6. Success toast appears

### Example 2: Form Validation
1. User opens Upload Modal
2. User enters invalid GitHub URL
3. Inline error appears below field
4. User corrects the URL
5. Error disappears
6. User submits form
7. Success toast appears

### Example 3: Analysis Failure
1. User uploads project
2. Analysis starts
3. Analysis fails
4. Project status shows "failed"
5. Error message explains the issue
6. User can retry by uploading again

## Accessibility

All error displays include:
- Semantic HTML (role="alert" for errors)
- ARIA labels for screen readers
- Keyboard navigation support
- High contrast colors (WCAG AA compliant)
- Focus indicators
- Clear, descriptive text

## Responsive Behavior

### Desktop (>1024px)
- Full error messages
- Side-by-side buttons
- Toast in top-right corner

### Tablet (640px-1024px)
- Condensed error messages
- Stacked buttons
- Toast in top-right corner

### Mobile (<640px)
- Compact error messages
- Full-width buttons
- Toast in top-center
