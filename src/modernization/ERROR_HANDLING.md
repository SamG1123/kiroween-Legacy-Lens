# Error Handling and Resilience

This document describes the error handling and resilience features implemented in the Modernization Advisor.

## Overview

The Modernization Advisor includes comprehensive error handling and resilience features to ensure reliable operation even when external APIs fail or are unavailable. The system implements:

1. **Retry Logic with Exponential Backoff** - Automatically retries failed API calls
2. **Graceful Degradation** - Continues operation with partial data when services fail
3. **Fallback Data** - Uses cached or bundled data when external APIs are unavailable
4. **Detailed Error Reporting** - Tracks and reports all errors and warnings in the analysis

## Components

### 1. RetryHandler

The `RetryHandler` provides retry logic with exponential backoff for API calls.

**Features:**
- Configurable retry attempts (default: 3)
- Exponential backoff with configurable delays
- Automatic detection of retryable errors (network timeouts, rate limits, etc.)
- Callback support for retry events

**Usage:**

```typescript
import { withRetry } from './utils/RetryHandler';

const result = await withRetry(
  () => fetchDataFromAPI(),
  {
    maxRetries: 3,
    initialDelayMs: 1000,
    maxDelayMs: 10000,
    onRetry: (error, attempt) => {
      console.log(`Retry attempt ${attempt}: ${error.message}`);
    },
  }
);
```

**Retryable Errors:**
- Network timeouts (ETIMEDOUT, ECONNRESET)
- DNS resolution failures (ENOTFOUND)
- HTTP 429 (Rate Limit)
- HTTP 502, 503, 504 (Server Errors)

### 2. ErrorHandler

The `ErrorHandler` tracks errors and warnings throughout the analysis process and supports graceful degradation.

**Features:**
- Distinguishes between recoverable and non-recoverable errors
- Tracks error context (component, operation, package name)
- Records fallback usage
- Generates error summaries for reporting

**Usage:**

```typescript
import { getErrorHandler } from './utils/ErrorHandler';

const errorHandler = getErrorHandler();

try {
  const data = await fetchData();
} catch (error) {
  errorHandler.handleError(error, {
    operation: 'fetchData',
    component: 'DataClient',
    packageName: 'example-package',
  }, 'Using cached data');
  
  // Use fallback data
  const data = getCachedData();
}

// Generate error summary
const summary = errorHandler.generateSummary();
console.log(summary);
```

**Error Classification:**
- **Recoverable**: Network errors, timeouts, rate limits, temporary server errors
- **Non-Recoverable**: Invalid configuration, malformed data, authentication failures

### 3. FallbackDataProvider

The `FallbackDataProvider` provides bundled fallback data for common packages when external APIs are unavailable.

**Features:**
- Bundled version information for popular packages
- Known security vulnerabilities for common issues
- Support for npm, PyPI, and Maven ecosystems
- Extensible with custom fallback data

**Usage:**

```typescript
import { getFallbackDataProvider } from './utils/FallbackDataProvider';

const fallbackProvider = getFallbackDataProvider();

// Check if fallback data is available
if (fallbackProvider.hasFallbackData('react', 'npm')) {
  const versionInfo = fallbackProvider.getVersionInfo('react', 'npm');
  console.log(`Latest version: ${versionInfo.latest}`);
}

// Get vulnerability data
const vulns = fallbackProvider.getVulnerabilities('lodash', '4.17.19', 'npm');
```

**Bundled Packages:**
- **npm**: react, vue, angular, express, lodash, axios, typescript, webpack, jest, eslint
- **PyPI**: django, flask, requests, numpy, pandas
- **Maven**: spring-core, hibernate-core

## Integration with Clients

All API clients (NpmRegistryClient, PyPIClient, MavenClient, SecurityDatabaseClient) have been updated to use these error handling features:

### Retry Logic

All API calls automatically retry on failure:

```typescript
// Automatically retries up to 3 times with exponential backoff
const packageInfo = await npmClient.getPackageInfo('react');
```

### Graceful Degradation

When API calls fail after retries, clients attempt to use fallback data:

```typescript
try {
  // Try to fetch from API with retries
  const data = await withRetry(() => fetchFromAPI());
  return data;
} catch (error) {
  // Log error
  errorHandler.handleError(error, context, 'Using fallback data');
  
  // Try fallback data
  const fallbackData = fallbackProvider.getVersionInfo(packageName, ecosystem);
  if (fallbackData) {
    return fallbackData;
  }
  
  // If no fallback available, throw
  throw error;
}
```

### Error Reporting

All errors and warnings are tracked and included in the modernization report:

```typescript
const report = reportGenerator.generateReport(roadmap, recommendations, compatibility);

// Report includes error summary
console.log(report.summary);
// Output:
// "Identified 15 modernization opportunities...
//  
//  Analysis Warnings:
//  Warnings (2):
//    - [NpmRegistryClient] getLatestVersion: Failed to get latest version for unknown-package
//    - [SecurityDatabaseClient] checkVulnerabilities: OSV API timeout, using cached data"
```

## Configuration

### Retry Configuration

Retry behavior can be customized per operation:

```typescript
const result = await withRetry(
  () => apiCall(),
  {
    maxRetries: 5,              // Number of retry attempts
    initialDelayMs: 500,        // Initial delay before first retry
    maxDelayMs: 30000,          // Maximum delay between retries
    backoffMultiplier: 2,       // Exponential backoff multiplier
    retryableErrors: ['CUSTOM_ERROR'], // Additional retryable error codes
  }
);
```

### Fallback Data

Custom fallback data can be added at runtime:

```typescript
const fallbackProvider = getFallbackDataProvider();

// Add package version data
fallbackProvider.addFallbackData('my-package', 'npm', {
  latest: '2.0.0',
  versions: ['2.0.0', '1.9.0', '1.8.0'],
});

// Add vulnerability data
fallbackProvider.addVulnerabilityData('my-package', '1.0.0', 'npm', [
  {
    id: 'CVE-2023-0001',
    severity: 'high',
    description: 'Security issue',
    fixedIn: '1.0.1',
  },
]);
```

## Testing

The error handling features are thoroughly tested:

- **Unit Tests**: Test individual components (RetryHandler, ErrorHandler, FallbackDataProvider)
- **Integration Tests**: Test error handling across the entire system
- **Client Tests**: Verify clients handle errors correctly

Run tests:

```bash
# Test retry handler
npm test -- src/modernization/utils/RetryHandler.test.ts

# Test error handler
npm test -- src/modernization/utils/ErrorHandler.test.ts

# Test fallback data provider
npm test -- src/modernization/utils/FallbackDataProvider.test.ts

# Test integration
npm test -- src/modernization/utils/ErrorHandling.integration.test.ts
```

## Best Practices

### 1. Always Use Error Context

Provide detailed context when handling errors:

```typescript
errorHandler.handleError(error, {
  operation: 'getPackageInfo',
  component: 'NpmRegistryClient',
  packageName: 'react',
  details: { version: '18.0.0' },
});
```

### 2. Use Appropriate Error Levels

- Use `handleError()` for failures that affect functionality
- Use `handleWarning()` for non-critical issues

### 3. Provide Fallback Information

Always indicate when fallback data is used:

```typescript
errorHandler.handleError(error, context, 'Using cached data from 2 hours ago');
```

### 4. Check for Critical Errors

Before proceeding with analysis, check for critical errors:

```typescript
if (errorHandler.hasCriticalErrors()) {
  console.error('Critical errors detected, analysis may be incomplete');
}
```

### 5. Include Error Summary in Reports

Always include error information in generated reports:

```typescript
const errorSummary = errorHandler.generateSummary();
report.summary += `\n\n${errorSummary}`;
```

## Monitoring

The error handler provides methods for monitoring system health:

```typescript
const errorHandler = getErrorHandler();

// Get all errors
const errors = errorHandler.getErrors();
console.log(`Total errors: ${errors.length}`);

// Get all warnings
const warnings = errorHandler.getWarnings();
console.log(`Total warnings: ${warnings.length}`);

// Check for critical errors
if (errorHandler.hasCriticalErrors()) {
  console.error('System has critical errors');
}

// Get detailed report
const allReports = errorHandler.getAllReports();
allReports.forEach(report => {
  console.log(`[${report.severity}] ${report.context.component}: ${report.message}`);
});
```

## Troubleshooting

### API Calls Always Failing

If API calls consistently fail:

1. Check network connectivity
2. Verify API endpoints are correct in configuration
3. Check for rate limiting
4. Review error logs for specific error messages

### Fallback Data Not Being Used

If fallback data isn't being used when expected:

1. Verify the package exists in fallback data: `fallbackProvider.hasFallbackData(name, ecosystem)`
2. Check error logs to see if fallback was attempted
3. Ensure the ecosystem parameter matches ('npm', 'pypi', 'maven')

### Too Many Retries

If retries are causing delays:

1. Reduce `maxRetries` in retry configuration
2. Decrease `initialDelayMs` for faster retries
3. Add specific error codes to skip retries for certain errors

## Future Enhancements

Potential improvements to error handling:

1. **Circuit Breaker Pattern**: Temporarily disable failing services
2. **Metrics Collection**: Track error rates and API performance
3. **Alerting**: Send notifications for critical errors
4. **Adaptive Retry**: Adjust retry strategy based on error patterns
5. **Distributed Tracing**: Track errors across service boundaries
