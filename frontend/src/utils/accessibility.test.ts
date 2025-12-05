import { describe, it, expect } from 'vitest';
import {
  announceToScreenReader,
  trapFocus,
  getAriaLabel,
  isKeyboardNavigable,
} from './accessibility';

describe('accessibility utils', () => {
  describe('announceToScreenReader', () => {
    it('creates announcement element', () => {
      announceToScreenReader('Test announcement');

      const announcement = document.querySelector('[role="status"]');
      expect(announcement).toBeTruthy();
      expect(announcement?.textContent).toBe('Test announcement');
    });

    it('removes announcement after delay', async () => {
      announceToScreenReader('Test', 100);

      await new Promise((resolve) => setTimeout(resolve, 150));

      const announcement = document.querySelector('[role="status"]');
      expect(announcement).toBeFalsy();
    });
  });

  describe('getAriaLabel', () => {
    it('generates aria label for status', () => {
      const label = getAriaLabel('status', 'completed');
      expect(label).toContain('completed');
    });

    it('generates aria label for progress', () => {
      const label = getAriaLabel('progress', 75);
      expect(label).toContain('75');
    });

    it('returns default label for unknown type', () => {
      const label = getAriaLabel('unknown', 'value');
      expect(label).toBeTruthy();
    });
  });

  describe('isKeyboardNavigable', () => {
    it('identifies keyboard navigable elements', () => {
      const button = document.createElement('button');
      expect(isKeyboardNavigable(button)).toBe(true);

      const link = document.createElement('a');
      link.href = '#';
      expect(isKeyboardNavigable(link)).toBe(true);

      const input = document.createElement('input');
      expect(isKeyboardNavigable(input)).toBe(true);
    });

    it('identifies non-navigable elements', () => {
      const div = document.createElement('div');
      expect(isKeyboardNavigable(div)).toBe(false);

      const span = document.createElement('span');
      expect(isKeyboardNavigable(span)).toBe(false);
    });

    it('respects tabindex attribute', () => {
      const div = document.createElement('div');
      div.tabIndex = 0;
      expect(isKeyboardNavigable(div)).toBe(true);

      div.tabIndex = -1;
      expect(isKeyboardNavigable(div)).toBe(false);
    });
  });
});
