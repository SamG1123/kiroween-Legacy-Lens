# Help & Documentation Implementation

This document describes the help and documentation features implemented in the Legacy Code Revival AI web UI.

## Overview

The help system provides users with contextual assistance, comprehensive documentation, and answers to common questions. It follows accessibility best practices and integrates seamlessly with the application.

## Features Implemented

### 1. Help Dialog

A comprehensive help dialog accessible from the header navigation that includes:

#### Getting Started Tab
- Step-by-step guide for uploading codebases
- Instructions for monitoring analysis progress
- Guide for reviewing results
- Information about downloading reports

#### FAQ Tab
Answers to frequently asked questions including:
- File size limits and restrictions
- Analysis time expectations
- Supported programming languages
- Private repository handling
- Maintainability Index explanation
- Code smell detection methodology
- Project deletion process
- Error handling and recovery

#### Resources Tab
- Links to full documentation
- Issue reporting
- Keyboard shortcuts reference

### 2. Contextual Tooltips

Tooltips have been added to complex features throughout the application:

#### Upload Modal
- **GitHub URL**: Explains URL format requirements and public repository limitation
- **ZIP File Upload**: Clarifies file size limits (100MB) and content requirements

#### Metrics Tab
- **Maintainability Index**: Detailed explanation of the 0-100 scoring system and what factors contribute to the score
- **Complexity Score**: Explains cyclomatic complexity and how to interpret different score ranges

### 3. Keyboard Shortcuts

The help dialog can be opened using keyboard shortcuts:
- Press `?` to open the help dialog from anywhere in the application
- Shortcuts are disabled when typing in input fields to prevent conflicts

### 4. Accessibility Features

All help components follow WCAG AA accessibility guidelines:
- Proper ARIA labels and roles
- Keyboard navigation support
- Screen reader friendly content
- Focus management
- High contrast for readability
- Semantic HTML structure

## Component Architecture

### HelpDialog Component
- Location: `frontend/src/components/Help/HelpDialog.tsx`
- Uses shadcn/ui Dialog, Tabs, and Card components
- Implements keyboard shortcut listener
- Provides tabbed interface for organized content

### HelpTooltip Component
- Location: `frontend/src/components/Help/HelpTooltip.tsx`
- Reusable component for adding tooltips anywhere
- Uses @radix-ui/react-tooltip for accessibility
- Configurable positioning (top, right, bottom, left)

### Tooltip UI Component
- Location: `frontend/src/components/ui/tooltip.tsx`
- Base tooltip component from shadcn/ui
- Provides consistent styling across the application

## Usage Examples

### Adding a Help Button
```tsx
import { HelpDialog } from '@/components/Help';

function Navigation() {
  return (
    <nav>
      <HelpDialog />
    </nav>
  );
}
```

### Adding a Tooltip to a Feature
```tsx
import { HelpTooltip } from '@/components/Help';
import { Label } from '@/components/ui/label';

function ComplexFeature() {
  return (
    <div className="flex items-center gap-2">
      <Label htmlFor="feature">Feature Name</Label>
      <HelpTooltip 
        content="This feature does X, Y, and Z. Use it when you need to accomplish A."
        side="right"
      />
    </div>
  );
}
```

## Requirements Satisfied

This implementation satisfies the following requirements from the Web UI specification:

### Requirement 10.4
✅ **THE Web UI SHALL provide tooltips for complex features**
- Tooltips added to Maintainability Index
- Tooltips added to Complexity Score
- Tooltips added to GitHub URL input
- Tooltips added to ZIP file upload

### Requirement 10.5
✅ **THE Web UI SHALL include a help section or documentation link**
- Comprehensive help dialog with Getting Started guide
- FAQ section with common questions and answers
- Resources tab with links to documentation
- Keyboard shortcuts reference

## Testing

To test the help features:

1. **Help Dialog**
   - Click the "Help" button in the header
   - Press `?` key from any page (except when typing in inputs)
   - Navigate through all three tabs
   - Click external links to verify they open in new tabs

2. **Tooltips**
   - Hover over help icons next to complex features
   - Verify tooltip content is clear and helpful
   - Test keyboard navigation to tooltips
   - Verify tooltips work on mobile (tap to show)

3. **Accessibility**
   - Test with keyboard navigation only
   - Test with screen reader (NVDA, JAWS, or VoiceOver)
   - Verify focus management
   - Check color contrast

## Future Enhancements

Potential improvements for future iterations:

1. **Interactive Onboarding Tour**
   - First-time user walkthrough
   - Highlight key features
   - Step-by-step guidance

2. **Context-Sensitive Help**
   - Show relevant help based on current page
   - Suggest help topics based on user actions

3. **Video Tutorials**
   - Embed video guides for complex workflows
   - Screen recordings of common tasks

4. **Searchable Help Content**
   - Full-text search across all help content
   - Quick access to specific topics

5. **User Feedback**
   - "Was this helpful?" buttons
   - Collect feedback on help content
   - Improve based on user input

6. **Localization**
   - Translate help content to multiple languages
   - Support international users

## Dependencies

The help system uses the following dependencies:

- `@radix-ui/react-tooltip`: Accessible tooltip primitives
- `@radix-ui/react-dialog`: Dialog component for help modal
- `@radix-ui/react-tabs`: Tabbed interface for organized content
- `lucide-react`: Icons for visual elements

All dependencies are already included in the project's package.json.

## Maintenance

To update help content:

1. **FAQ Updates**: Edit `frontend/src/components/Help/HelpDialog.tsx` in the FAQ tab section
2. **Getting Started**: Edit the Getting Started tab content in the same file
3. **Tooltips**: Update individual tooltip content where they're used
4. **Documentation Links**: Update URLs in the Resources tab

Keep help content:
- Clear and concise
- Up-to-date with application changes
- Accessible and easy to understand
- Focused on user needs and common questions
