/**
 * Accessibility utilities for the application
 * Provides helpers for ARIA labels, keyboard navigation, and screen reader support
 */

/**
 * Generate descriptive ARIA labels for status badges
 */
export function getStatusAriaLabel(status: string): string {
  const labels: Record<string, string> = {
    completed: 'Analysis completed successfully',
    analyzing: 'Analysis in progress',
    pending: 'Analysis pending, waiting to start',
    failed: 'Analysis failed',
  };
  return labels[status] || `Status: ${status}`;
}

/**
 * Generate ARIA label for progress indicators
 */
export function getProgressAriaLabel(progress: number, stage?: string): string {
  const progressText = `${Math.round(progress)}% complete`;
  return stage ? `${progressText}, currently ${stage}` : progressText;
}

/**
 * Generate ARIA label for file size
 */
export function getFileSizeAriaLabel(bytes: number): string {
  const mb = (bytes / 1024 / 1024).toFixed(2);
  return `File size: ${mb} megabytes`;
}

/**
 * Generate ARIA label for date/time
 */
export function getDateAriaLabel(dateString: string, prefix: string = ''): string {
  const date = new Date(dateString);
  const formatted = date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
  return prefix ? `${prefix} ${formatted}` : formatted;
}

/**
 * Generate ARIA label for severity levels
 */
export function getSeverityAriaLabel(severity: string): string {
  const labels: Record<string, string> = {
    critical: 'Critical severity issue',
    high: 'High severity issue',
    medium: 'Medium severity issue',
    low: 'Low severity issue',
    info: 'Informational issue',
  };
  return labels[severity] || `Severity: ${severity}`;
}

/**
 * Generate ARIA label for metrics
 */
export function getMetricAriaLabel(name: string, value: number | string, unit?: string): string {
  const unitText = unit ? ` ${unit}` : '';
  return `${name}: ${value}${unitText}`;
}

/**
 * Announce message to screen readers
 */
export function announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;
  
  document.body.appendChild(announcement);
  
  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

/**
 * Check if element is keyboard focusable
 */
export function isFocusable(element: HTMLElement): boolean {
  const focusableSelectors = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ];
  
  return focusableSelectors.some(selector => element.matches(selector));
}

/**
 * Trap focus within a container (useful for modals)
 */
export function trapFocus(container: HTMLElement, event: KeyboardEvent): void {
  const focusableElements = container.querySelectorAll<HTMLElement>(
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  );
  
  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];
  
  if (event.key === 'Tab') {
    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement?.focus();
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement?.focus();
    }
  }
}

/**
 * Get color contrast ratio between two colors
 * Returns ratio for WCAG compliance checking
 */
export function getContrastRatio(foreground: string, background: string): number {
  const getLuminance = (color: string): number => {
    // Simple RGB extraction (works for hex colors)
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16) / 255;
    const g = parseInt(hex.substr(2, 2), 16) / 255;
    const b = parseInt(hex.substr(4, 2), 16) / 255;
    
    const [rs, gs, bs] = [r, g, b].map(c => {
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  };
  
  const l1 = getLuminance(foreground);
  const l2 = getLuminance(background);
  
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if color combination meets WCAG AA standards
 */
export function meetsWCAGAA(foreground: string, background: string, isLargeText: boolean = false): boolean {
  const ratio = getContrastRatio(foreground, background);
  return isLargeText ? ratio >= 3 : ratio >= 4.5;
}
