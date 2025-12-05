# Help & Documentation Components

This directory contains components for providing help and documentation to users.

## Components

### HelpDialog

A comprehensive help dialog that provides:
- **Getting Started Guide**: Step-by-step instructions for using the application
- **FAQ Section**: Answers to frequently asked questions
- **Resources**: Links to documentation and support

**Usage:**
```tsx
import { HelpDialog } from '@/components/Help';

function Header() {
  return (
    <nav>
      <HelpDialog />
    </nav>
  );
}
```

**Features:**
- Tabbed interface for organized content
- Keyboard shortcuts reference
- External links to documentation and issue tracker
- Accessible with proper ARIA labels

### HelpTooltip

A reusable tooltip component for adding contextual help to complex features.

**Usage:**
```tsx
import { HelpTooltip } from '@/components/Help';

function ComplexFeature() {
  return (
    <div className="flex items-center gap-2">
      <Label>Maintainability Index</Label>
      <HelpTooltip 
        content="A composite metric (0-100) that measures code maintainability"
        side="right"
      />
    </div>
  );
}
```

**Props:**
- `content` (string, required): The help text to display
- `side` ('top' | 'right' | 'bottom' | 'left', optional): Tooltip position (default: 'top')
- `className` (string, optional): Additional CSS classes

## Where Tooltips Are Used

Tooltips have been added to the following complex features:

1. **Upload Modal**
   - GitHub URL input: Explains URL format requirements
   - ZIP file upload: Explains file size limits and requirements

2. **Metrics Tab**
   - Maintainability Index: Explains the scoring system and what it measures
   - Complexity Score: Explains cyclomatic complexity and interpretation

## Accessibility

All help components follow accessibility best practices:
- Proper ARIA labels and roles
- Keyboard navigation support
- Screen reader friendly
- Focus management
- High contrast for readability

## Future Enhancements

Potential improvements for the help system:
- Interactive onboarding tour for first-time users
- Context-sensitive help based on current page
- Video tutorials
- Searchable help content
- User feedback mechanism
