import { AxiosError } from 'axios';
import toast from 'react-hot-toast';

/**
 * Error types for better error handling
 */
export enum ErrorType {
  NETWORK = 'NETWORK',
  VALIDATION = 'VALIDATION',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  NOT_FOUND = 'NOT_FOUND',
  SERVER = 'SERVER',
  UNKNOWN = 'UNKNOWN',
}

/**
 * Structured error object
 */
export interface AppError {
  type: ErrorType;
  message: string;
  originalError?: Error;
  statusCode?: number;
  details?: Record<string, unknown>;
}

/**
 * Parse error from various sources into a structured AppError
 */
export function parseError(error: unknown): AppError {
  // Handle Axios errors
  if (error instanceof AxiosError) {
    const statusCode = error.response?.status;
    const message = error.response?.data?.message || error.message;

    if (!error.response) {
      return {
        type: ErrorType.NETWORK,
        message: 'Network error. Please check your internet connection.',
        originalError: error,
      };
    }

    switch (statusCode) {
      case 400:
        return {
          type: ErrorType.VALIDATION,
          message: message || 'Invalid request. Please check your input.',
          statusCode,
          originalError: error,
          details: error.response?.data?.errors,
        };
      case 401:
        return {
          type: ErrorType.AUTHENTICATION,
          message: 'Authentication required. Please log in.',
          statusCode,
          originalError: error,
        };
      case 403:
        return {
          type: ErrorType.AUTHORIZATION,
          message: 'You do not have permission to perform this action.',
          statusCode,
          originalError: error,
        };
      case 404:
        return {
          type: ErrorType.NOT_FOUND,
          message: message || 'The requested resource was not found.',
          statusCode,
          originalError: error,
        };
      case 500:
      case 502:
      case 503:
        return {
          type: ErrorType.SERVER,
          message: 'Server error. Please try again later.',
          statusCode,
          originalError: error,
        };
      default:
        return {
          type: ErrorType.UNKNOWN,
          message: message || 'An unexpected error occurred.',
          statusCode,
          originalError: error,
        };
    }
  }

  // Handle standard Error objects
  if (error instanceof Error) {
    return {
      type: ErrorType.UNKNOWN,
      message: error.message || 'An unexpected error occurred.',
      originalError: error,
    };
  }

  // Handle string errors
  if (typeof error === 'string') {
    return {
      type: ErrorType.UNKNOWN,
      message: error,
    };
  }

  // Handle unknown error types
  return {
    type: ErrorType.UNKNOWN,
    message: 'An unexpected error occurred.',
  };
}

/**
 * Get user-friendly error message
 */
export function getUserFriendlyMessage(error: AppError): string {
  switch (error.type) {
    case ErrorType.NETWORK:
      return 'Unable to connect to the server. Please check your internet connection and try again.';
    case ErrorType.VALIDATION:
      return error.message || 'Please check your input and try again.';
    case ErrorType.AUTHENTICATION:
      return 'Your session has expired. Please log in again.';
    case ErrorType.AUTHORIZATION:
      return 'You do not have permission to perform this action.';
    case ErrorType.NOT_FOUND:
      return error.message || 'The requested item could not be found.';
    case ErrorType.SERVER:
      return 'The server is experiencing issues. Please try again in a few moments.';
    default:
      return error.message || 'Something went wrong. Please try again.';
  }
}

/**
 * Show error toast notification
 */
export function showErrorToast(error: unknown, customMessage?: string) {
  const appError = parseError(error);
  const message = customMessage || getUserFriendlyMessage(appError);
  
  toast.error(message, {
    duration: 5000,
    position: 'top-right',
  });
}

/**
 * Show success toast notification
 */
export function showSuccessToast(message: string) {
  toast.success(message, {
    duration: 3000,
    position: 'top-right',
  });
}

/**
 * Show info toast notification
 */
export function showInfoToast(message: string) {
  toast(message, {
    duration: 4000,
    position: 'top-right',
    icon: 'ℹ️',
  });
}

/**
 * Get actionable suggestion for error
 */
export function getErrorSuggestion(error: AppError): string | null {
  switch (error.type) {
    case ErrorType.NETWORK:
      return 'Check your internet connection and try again.';
    case ErrorType.VALIDATION:
      return 'Please review the form and correct any errors.';
    case ErrorType.AUTHENTICATION:
      return 'Please log in to continue.';
    case ErrorType.AUTHORIZATION:
      return 'Contact your administrator for access.';
    case ErrorType.NOT_FOUND:
      return 'The item may have been deleted or moved.';
    case ErrorType.SERVER:
      return 'Wait a few moments and try again.';
    default:
      return 'Try refreshing the page or contact support if the problem persists.';
  }
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: AppError): boolean {
  return [
    ErrorType.NETWORK,
    ErrorType.SERVER,
  ].includes(error.type);
}
