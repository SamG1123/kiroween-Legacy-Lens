# Accessibility Testing Checklist

Use this checklist to verify accessibility compliance for the Legacy Code Revival Web UI.

## ✅ Automated Testing

### Tools to Use

- [ ] **axe DevTools** - Browser extension for automated testing
- [ ] **Lighthouse** - Chrome DevTools accessibility audit
- [ ] **WAVE** - Web accessibility evaluation tool
- [ ] **Pa11y** - Command-line accessibility testing

### Expected Results

- [ ] No critical or serious issues in axe DevTools
- [ ] Lighthouse accessibility score ≥ 90
- [ ] WAVE shows no errors
- [ ] All ARIA attributes are valid

## ✅ Keyboard Navigation

### General Navigation

- [ ] Tab key moves focus forward through all interactive elements
- [ ] Shift+Tab moves focus backward
- [ ] Focus order follows visual layout
- [ ] Focus indicators are clearly visible (blue ring)
- [ ] No keyboard traps (except intentional modal traps)

### Header

- [ ] Logo link is keyboard accessible
- [ ] Dashboard link (when visible) is keyboard accessible
- [ ] All links have visible focus indicators

### Dashboard

- [ ] "New Analysis" button is keyboard accessible
- [ ] Search input is keyboard accessible
- [ ] All filter buttons are keyboard accessible
- [ ] Sort dropdown is keyboard accessible
- [ ] All project cards are keyboard accessible
- [ ] View and Delete buttons in cards are keyboard accessible

### Upload Modal

- [ ] Modal opens and focus moves to first input
- [ ] Tab cycles through modal elements only (focus trap)
- [ ] Escape key closes modal
- [ ] Tab navigation works in all three tabs (GitHub, ZIP, Local)
- [ ] File upload area is keyboard accessible (Enter/Space to activate)
- [ ] Cancel and Submit buttons are keyboard accessible
- [ ] Focus returns to trigger button when modal closes

### Project Details Page

- [ ] Back link is keyboard accessible
- [ ] Download button is keyboard accessible
- [ ] All tab triggers are keyboard accessible
- [ ] Content within tabs is keyboard accessible

### Progress Tracker

- [ ] Cancel button (if present) is keyboard accessible
- [ ] All elements are reachable via keyboard

## ✅ Screen Reader Testing

### Test with Multiple Screen Readers

- [ ] **NVDA** (Windows) - Free
- [ ] **JAWS** (Windows) - Trial available
- [ ] **VoiceOver** (macOS/iOS) - Built-in
- [ ] **TalkBack** (Android) - Built-in

### Header

- [ ] Header is announced as "banner" landmark
- [ ] Logo link announces "Legacy Code Revival - Return to home page"
- [ ] Navigation is announced as "Main navigation"
- [ ] Dashboard link announces purpose clearly

### Dashboard

- [ ] Page heading "Dashboard" is announced
- [ ] Connection status is announced (Live/Offline)
- [ ] Statistics region is announced with values
- [ ] Search input has proper label
- [ ] Filter buttons announce pressed state
- [ ] Sort dropdown announces current selection
- [ ] Project count is announced when filtering
- [ ] Each project card announces as article with project name

### Project Card

- [ ] Project name is announced
- [ ] Status badge announces descriptive status
- [ ] Progress percentage is announced for analyzing projects
- [ ] Estimated time remaining is announced
- [ ] Created and updated dates are announced with full context
- [ ] View button announces "View details for [project name]"
- [ ] Delete button announces "Delete [project name]"

### Upload Modal

- [ ] Modal announces title and description
- [ ] Tab selection announces current tab
- [ ] Form labels are properly associated with inputs
- [ ] Validation errors are announced
- [ ] Upload progress is announced
- [ ] Success/error messages are announced

### Progress Tracker

- [ ] Progress percentage is announced
- [ ] Current stage is announced
- [ ] Estimated time remaining is announced
- [ ] Stage checklist items announce status (completed, in progress, pending, failed)

### Charts

- [ ] Chart description is announced
- [ ] Data table alternative is available for screen readers
- [ ] Tooltip information is accessible

## ✅ Color Contrast

### Text Contrast

- [ ] Normal text (< 18pt) has ≥ 4.5:1 contrast ratio
- [ ] Large text (≥ 18pt) has ≥ 3:1 contrast ratio
- [ ] Link text has sufficient contrast
- [ ] Button text has sufficient contrast

### Status Colors

- [ ] Completed (green) badge has sufficient contrast
- [ ] Analyzing (blue) badge has sufficient contrast
- [ ] Pending (yellow) badge has sufficient contrast
- [ ] Failed (red) badge has sufficient contrast
- [ ] All status colors are distinguishable without color alone

### Interactive Elements

- [ ] Focus indicators have sufficient contrast
- [ ] Hover states have sufficient contrast
- [ ] Disabled states are clearly distinguishable

### Test Tools

- [ ] Chrome DevTools contrast checker
- [ ] WebAIM Contrast Checker
- [ ] Colour Contrast Analyser (CCA)

## ✅ Semantic HTML

### Structure

- [ ] Proper heading hierarchy (h1 → h2 → h3, no skipping)
- [ ] Only one h1 per page
- [ ] Landmark regions used (header, nav, main, footer)
- [ ] Lists use proper ul/ol/li elements
- [ ] Tables use proper table/thead/tbody/tr/th/td elements

### Forms

- [ ] All inputs have associated labels
- [ ] Related inputs grouped with fieldset/legend
- [ ] Required fields indicated
- [ ] Error messages associated with inputs

### Links and Buttons

- [ ] Links used for navigation
- [ ] Buttons used for actions
- [ ] Link text is descriptive (not "click here")
- [ ] Button text is descriptive

## ✅ ARIA Implementation

### ARIA Roles

- [ ] Roles used appropriately (not overriding semantic HTML)
- [ ] Custom widgets have proper roles
- [ ] Landmark roles supplement HTML5 landmarks

### ARIA Properties

- [ ] aria-label used for elements without visible text
- [ ] aria-labelledby used for complex labels
- [ ] aria-describedby used for additional descriptions
- [ ] aria-hidden used only for decorative elements

### ARIA States

- [ ] aria-pressed used for toggle buttons
- [ ] aria-expanded used for expandable elements
- [ ] aria-selected used for tabs
- [ ] aria-current used for current page/step

### Live Regions

- [ ] aria-live="polite" for non-critical updates
- [ ] aria-live="assertive" for critical updates
- [ ] aria-atomic used appropriately
- [ ] Updates are announced at appropriate times

## ✅ Responsive and Mobile

### Touch Targets

- [ ] All interactive elements ≥ 44x44px
- [ ] Adequate spacing between touch targets
- [ ] No overlapping touch targets

### Zoom and Magnification

- [ ] Content readable at 200% zoom
- [ ] No horizontal scrolling at 200% zoom
- [ ] Text reflows properly
- [ ] No content is cut off

### Mobile Screen Readers

- [ ] VoiceOver (iOS) works correctly
- [ ] TalkBack (Android) works correctly
- [ ] Swipe gestures work as expected
- [ ] All content is accessible via touch

## ✅ Forms and Error Handling

### Form Validation

- [ ] Errors announced to screen readers
- [ ] Error messages are descriptive
- [ ] Errors associated with inputs (aria-describedby)
- [ ] Required fields clearly indicated
- [ ] Validation happens at appropriate time

### Error Recovery

- [ ] Users can correct errors easily
- [ ] Error messages suggest solutions
- [ ] Form data is preserved after errors
- [ ] Success messages are announced

## ✅ Dynamic Content

### Loading States

- [ ] Loading indicators announced to screen readers
- [ ] Skeleton screens have proper labels
- [ ] Loading text is descriptive

### Real-time Updates

- [ ] WebSocket connection status announced
- [ ] Project status changes announced
- [ ] Progress updates announced
- [ ] New content announced appropriately

### Modals and Dialogs

- [ ] Focus moves to modal when opened
- [ ] Focus trapped within modal
- [ ] Escape key closes modal
- [ ] Focus returns to trigger when closed
- [ ] Modal has proper role and labels

## ✅ Content and Language

### Text Content

- [ ] Language attribute set on html element
- [ ] Text is clear and concise
- [ ] Abbreviations explained on first use
- [ ] Technical terms explained or linked

### Alternative Text

- [ ] All images have alt text
- [ ] Decorative images have empty alt or aria-hidden
- [ ] Complex images have long descriptions
- [ ] Icons have text alternatives

## ✅ Browser and Device Testing

### Browsers

- [ ] Chrome/Edge (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Mobile browsers (iOS Safari, Chrome Android)

### Devices

- [ ] Desktop (Windows, macOS, Linux)
- [ ] Tablet (iPad, Android tablet)
- [ ] Mobile (iPhone, Android phone)

### Assistive Technologies

- [ ] Screen readers (NVDA, JAWS, VoiceOver, TalkBack)
- [ ] Screen magnifiers (ZoomText, Windows Magnifier)
- [ ] Voice control (Dragon NaturallySpeaking, Voice Control)

## ✅ Performance

### Page Load

- [ ] Initial page load is fast
- [ ] No layout shifts during load
- [ ] Focus is not lost during load

### Interactions

- [ ] Interactions are responsive
- [ ] No lag when using keyboard
- [ ] Animations don't cause issues

## 📝 Testing Notes

### Issues Found

Document any accessibility issues found during testing:

1. **Issue**: [Description]
   - **Severity**: Critical / Serious / Moderate / Minor
   - **Component**: [Component name]
   - **Steps to Reproduce**: [Steps]
   - **Expected**: [Expected behavior]
   - **Actual**: [Actual behavior]
   - **Fix**: [Proposed fix]

### Test Results Summary

- **Date Tested**: [Date]
- **Tester**: [Name]
- **Tools Used**: [List of tools]
- **Overall Status**: Pass / Fail / Needs Improvement
- **Notes**: [Additional notes]

## 🎯 Priority Fixes

If issues are found, prioritize fixes in this order:

1. **Critical**: Blocks access to core functionality
2. **Serious**: Significantly impacts user experience
3. **Moderate**: Causes inconvenience but has workarounds
4. **Minor**: Cosmetic or minor usability issues

## 📚 Resources

- [WCAG 2.1 Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [WebAIM Articles](https://webaim.org/articles/)
- [A11y Project Checklist](https://www.a11yproject.com/checklist/)
