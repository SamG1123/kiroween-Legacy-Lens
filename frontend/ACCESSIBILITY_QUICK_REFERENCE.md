# Accessibility Quick Reference

Quick reference guide for developers working on the Legacy Code Revival Web UI.

## 🎯 Core Principles

1. **Perceivable**: Users must be able to perceive the information
2. **Operable**: Users must be able to operate the interface
3. **Understandable**: Users must be able to understand the information
4. **Robust**: Content must be robust enough for assistive technologies

## 🔧 Common Patterns

### Buttons

```tsx
// ✅ Good
<Button
  onClick={handleClick}
  className="focus-visible-ring"
  aria-label="Delete project"
>
  <Trash2 aria-hidden="true" />
  Delete
</Button>

// ❌ Bad
<div onClick={handleClick}>
  <Trash2 />
</div>
```

### Links

```tsx
// ✅ Good
<Link
  to="/project/123"
  className="focus-visible-ring"
  aria-label="View project details"
>
  View Details
</Link>

// ❌ Bad
<a onClick={() => navigate('/project/123')}>
  Click here
</a>
```

### Form Inputs

```tsx
// ✅ Good
<div>
  <Label htmlFor="project-name">Project Name</Label>
  <Input
    id="project-name"
    type="text"
    value={name}
    onChange={handleChange}
    className="focus-visible-ring"
    aria-invalid={!!error}
    aria-describedby={error ? "name-error" : undefined}
  />
  {error && (
    <div id="name-error" role="alert">
      {error}
    </div>
  )}
</div>

// ❌ Bad
<input
  placeholder="Project Name"
  value={name}
  onChange={handleChange}
/>
```

### Status Indicators

```tsx
// ✅ Good
<Badge
  className={getStatusClass(status)}
  aria-label={getStatusAriaLabel(status)}
>
  {status}
</Badge>

// ❌ Bad
<div className={`badge ${status}`}>
  {status}
</div>
```

### Progress Bars

```tsx
// ✅ Good
<div
  role="status"
  aria-live="polite"
  aria-label={`Analysis ${progress}% complete`}
>
  <Progress
    value={progress}
    aria-label="Analysis progress"
  />
</div>

// ❌ Bad
<div className="progress-bar" style={{ width: `${progress}%` }} />
```

### Modals/Dialogs

```tsx
// ✅ Good
<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent
    aria-describedby="dialog-description"
  >
    <DialogHeader>
      <DialogTitle>Delete Project</DialogTitle>
      <DialogDescription id="dialog-description">
        Are you sure you want to delete this project?
      </DialogDescription>
    </DialogHeader>
    {/* Content */}
  </DialogContent>
</Dialog>

// ❌ Bad
<div className="modal" style={{ display: open ? 'block' : 'none' }}>
  <h2>Delete Project</h2>
  <p>Are you sure?</p>
</div>
```

### Lists

```tsx
// ✅ Good
<ul role="list" aria-label="Project list">
  {projects.map(project => (
    <li key={project.id} role="listitem">
      {project.name}
    </li>
  ))}
</ul>

// ❌ Bad
<div>
  {projects.map(project => (
    <div key={project.id}>{project.name}</div>
  ))}
</div>
```

### Icons

```tsx
// ✅ Good - Decorative icon
<Button aria-label="Delete project">
  <Trash2 aria-hidden="true" />
  Delete
</Button>

// ✅ Good - Icon only button
<Button aria-label="Close">
  <X aria-hidden="true" />
</Button>

// ❌ Bad
<Button>
  <Trash2 />
</Button>
```

### Loading States

```tsx
// ✅ Good
<div
  role="status"
  aria-live="polite"
  aria-label="Loading projects"
>
  <Loader2 className="animate-spin" aria-hidden="true" />
  <span className="sr-only">Loading projects...</span>
</div>

// ❌ Bad
<div>
  <Loader2 className="animate-spin" />
</div>
```

### Charts

```tsx
// ✅ Good
<div
  role="img"
  aria-label="Language distribution chart showing 5 languages"
  tabIndex={0}
>
  <PieChart>{/* Chart content */}</PieChart>
  <table className="sr-only">
    <caption>Language distribution</caption>
    {/* Data table */}
  </table>
</div>

// ❌ Bad
<div>
  <PieChart>{/* Chart content */}</PieChart>
</div>
```

## 🎨 Focus Indicators

Always use the `focus-visible-ring` class for consistent focus indicators:

```tsx
<Button className="focus-visible-ring">Click me</Button>
<Link className="focus-visible-ring">Navigate</Link>
<Input className="focus-visible-ring" />
```

## 📢 Live Regions

Use live regions for dynamic content updates:

```tsx
// Polite - Non-critical updates
<div role="status" aria-live="polite">
  {message}
</div>

// Assertive - Critical updates
<div role="alert" aria-live="assertive">
  {error}
</div>
```

## 🔤 Screen Reader Only Content

Use the `.sr-only` class for content that should only be available to screen readers:

```tsx
<button>
  <span className="sr-only">Close dialog</span>
  <X aria-hidden="true" />
</button>
```

## 🎭 ARIA Attributes Quick Reference

### Common ARIA Labels

- `aria-label`: Provides a label when no visible text exists
- `aria-labelledby`: References another element for the label
- `aria-describedby`: References another element for description
- `aria-hidden`: Hides element from assistive technologies

### Common ARIA States

- `aria-pressed`: For toggle buttons (true/false)
- `aria-expanded`: For expandable elements (true/false)
- `aria-selected`: For selectable items (true/false)
- `aria-current`: For current item (page/step/location/date/time/true/false)
- `aria-invalid`: For form validation (true/false)

### Common ARIA Properties

- `aria-live`: Announces updates (off/polite/assertive)
- `aria-atomic`: Announces entire region (true/false)
- `aria-busy`: Indicates loading state (true/false)
- `aria-controls`: References controlled element
- `aria-owns`: References owned elements

## 🛠️ Utility Functions

Import from `src/utils/accessibility.ts`:

```tsx
import {
  getStatusAriaLabel,
  getProgressAriaLabel,
  getDateAriaLabel,
  getSeverityAriaLabel,
  announceToScreenReader,
  meetsWCAGAA,
} from '@/utils/accessibility';

// Usage
<Badge aria-label={getStatusAriaLabel(status)}>
  {status}
</Badge>

<time aria-label={getDateAriaLabel(date, 'Created')}>
  {formatDate(date)}
</time>

// Announce to screen reader
announceToScreenReader('Project created successfully', 'polite');
```

## ✅ Checklist for New Components

When creating a new component, ensure:

- [ ] Semantic HTML elements used
- [ ] All interactive elements keyboard accessible
- [ ] Focus indicators visible
- [ ] ARIA labels for non-text content
- [ ] Color contrast meets WCAG AA
- [ ] Error messages associated with inputs
- [ ] Loading states announced
- [ ] Icons marked as decorative
- [ ] Lists use proper markup
- [ ] Headings follow hierarchy

## 🚫 Common Mistakes to Avoid

1. **Don't use divs for buttons**
   ```tsx
   // ❌ Bad
   <div onClick={handleClick}>Click me</div>
   
   // ✅ Good
   <button onClick={handleClick}>Click me</button>
   ```

2. **Don't forget labels**
   ```tsx
   // ❌ Bad
   <input placeholder="Name" />
   
   // ✅ Good
   <label htmlFor="name">Name</label>
   <input id="name" />
   ```

3. **Don't use color alone**
   ```tsx
   // ❌ Bad
   <div className="text-red-500">Error</div>
   
   // ✅ Good
   <div className="text-red-500" role="alert">
     <AlertCircle aria-hidden="true" />
     Error: Invalid input
   </div>
   ```

4. **Don't hide focus indicators**
   ```css
   /* ❌ Bad */
   button:focus {
     outline: none;
   }
   
   /* ✅ Good */
   button:focus-visible {
     outline: 2px solid blue;
   }
   ```

5. **Don't use placeholder as label**
   ```tsx
   // ❌ Bad
   <input placeholder="Email address" />
   
   // ✅ Good
   <label htmlFor="email">Email address</label>
   <input id="email" placeholder="you@example.com" />
   ```

## 📱 Mobile Considerations

- Touch targets minimum 44x44px
- Adequate spacing between interactive elements
- Test with mobile screen readers (VoiceOver, TalkBack)
- Ensure swipe gestures work correctly
- Test in both portrait and landscape

## 🧪 Testing Commands

```bash
# Run accessibility linter
npm run lint:a11y

# Run automated tests
npm run test:a11y

# Check color contrast
npm run check:contrast
```

## 📚 Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [WebAIM Resources](https://webaim.org/resources/)
- [MDN Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)

## 🆘 Need Help?

- Check the full [ACCESSIBILITY.md](./ACCESSIBILITY.md) documentation
- Review the [ACCESSIBILITY_TEST_CHECKLIST.md](./ACCESSIBILITY_TEST_CHECKLIST.md)
- Ask the team in #accessibility channel
- Consult with accessibility specialist

---

**Remember**: Accessibility is not optional. It's a core requirement for all features.
