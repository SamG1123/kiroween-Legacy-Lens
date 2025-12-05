import { describe, it, expect } from 'vitest';
import { getErrorMessage, isNetworkError, handleApiError } from './errorHandling';

describe('errorHandling utils', () => {
  describe('getErrorMessage', () => {
    it('extracts message from Error object', () => {
      const error = new Error('Test error');
      expect(getErrorMessage(error)).toBe('Test error');
    });

    it('extracts message from axios error', () => {
      const error = {
        response: {
          data: {
            message: 'API error',
          },
        },
      };
      expect(getErrorMessage(error)).toBe('API error');
    });

    it('returns string error as-is', () => {
      expect(getErrorMessage('String error')).toBe('String error');
    });

    it('returns default message for unknown errors', () => {
      expect(getErrorMessage(null)).toBe('An unexpected error occurred');
      expect(getErrorMessage(undefined)).toBe('An unexpected error occurred');
      expect(getErrorMessage({})).toBe('An unexpected error occurred');
    });
  });

  describe('isNetworkError', () => {
    it('identifies network errors', () => {
      const networkError = {
        code: 'ECONNREFUSED',
        message: 'Network error',
      };
      expect(isNetworkError(networkError)).toBe(true);
    });

    it('identifies timeout errors', () => {
      const timeoutError = {
        code: 'ETIMEDOUT',
        message: 'Timeout',
      };
      expect(isNetworkError(timeoutError)).toBe(true);
    });

    it('returns false for non-network errors', () => {
      const regularError = new Error('Regular error');
      expect(isNetworkError(regularError)).toBe(false);
    });
  });

  describe('handleApiError', () => {
    it('handles 404 errors', () => {
      const error = {
        response: {
          status: 404,
        },
      };
      const result = handleApiError(error);
      expect(result).toContain('not found');
    });

    it('handles 401 errors', () => {
      const error = {
        response: {
          status: 401,
        },
      };
      const result = handleApiError(error);
      expect(result).toContain('unauthorized');
    });

    it('handles 500 errors', () => {
      const error = {
        response: {
          status: 500,
        },
      };
      const result = handleApiError(error);
      expect(result).toContain('server error');
    });

    it('handles network errors', () => {
      const error = {
        code: 'ECONNREFUSED',
      };
      const result = handleApiError(error);
      expect(result).toContain('network');
    });
  });
});
