# Resilience and Progress Tracking

This module provides comprehensive error handling, progress tracking, and caching capabilities for the documentation generator.

## Components

### ProgressTracker

Manages progress tracking for documentation generation with throttled event emission.

**Features:**
- Stage-based progress tracking (parsing, analyzing, generating, validating, packaging)
- Throttled event emission to avoid overwhelming consumers
- Progress percentage calculation
- Event-based callback system

**Usage:**
```typescript
import { ProgressTracker } from './ProgressTracker';

const tracker = new ProgressTracker();

// Register progress callback
tracker.onProgress((event) => {
  console.log(`${event.stage}: ${event.current}/${event.total} - ${event.message}`);
});

// Track a stage
tracker.startStage('parsing', 10, 'Starting file parsing');
tracker.incrementProgress('Parsed file 1');
tracker.completeStage('Parsing complete');
```

### ErrorHandler

Provides file-level error isolation and retry logic with exponential backoff.

**Features:**
- Retry logic with exponential backoff
- File-level error isolation
- Recoverable vs non-recoverable error detection
- Parallel execution with error isolation
- Error tracking and reporting

**Usage:**
```typescript
import { ErrorHandler } from './ErrorHandler';

const handler = new ErrorHandler(3, 1000); // 3 retries, 1s initial delay

// Execute with retry
const result = await handler.executeWithRetry(
  async () => await generateDocumentation(),
  { filePath: 'file.ts', stage: 'generation' }
);

if (result.success) {
  console.log('Success:', result.data);
} else {
  console.error('Failed:', result.error);
}

// Process multiple files with isolation
const results = await handler.executeAllWithIsolation([
  { operation: () => processFile('file1.ts'), context: { filePath: 'file1.ts', stage: 'parsing' } },
  { operation: () => processFile('file2.ts'), context: { filePath: 'file2.ts', stage: 'parsing' } }
]);
```

### CacheManager

Provides an LRU cache with TTL and content-based invalidation.

**Features:**
- LRU (Least Recently Used) eviction policy
- TTL (Time To Live) expiration
- Content-based cache invalidation using SHA-256 hashing
- Pattern-based invalidation
- Cache statistics

**Usage:**
```typescript
import { CacheManager } from './CacheManager';

const cache = new CacheManager({
  ttl: 3600000, // 1 hour
  maxSize: 1000
});

// Basic caching
cache.set('key', value);
const cached = cache.get('key');

// Content-aware caching
cache.set('file:test.ts', parsedAST, fileContent);
const result = cache.get('file:test.ts', computeHash(fileContent));

// Get or compute
const value = await cache.getOrCompute(
  'key',
  async () => await expensiveOperation(),
  content
);

// Pattern invalidation
cache.invalidatePattern(/^file:/);
```

### ResilientDocumentationGenerator

Orchestrates documentation generation with integrated error handling, progress tracking, and caching.

**Features:**
- Integrated progress tracking
- File-level error isolation
- Caching layer for analysis results
- Graceful degradation for AI failures
- Retry logic with fallback

**Usage:**
```typescript
import { ResilientDocumentationGenerator } from './ResilientDocumentationGenerator';

const generator = new ResilientDocumentationGenerator();

// Register progress callback
generator.onProgress((event) => {
  console.log(`Progress: ${event.stage} ${event.current}/${event.total}`);
});

// Process files with isolation
const results = await generator.processFilesWithIsolation(
  ['file1.ts', 'file2.ts', 'file3.ts'],
  async (file) => await parseFile(file),
  'parsing'
);

// Execute with caching
const result = await generator.executeWithCache(
  'parse:file.ts',
  async () => await parseFile('file.ts'),
  fileContent
);

// AI operation with fallback
const docResult = await generator.executeAIWithFallback(
  async () => await aiGenerateDoc(code),
  async () => await templateGenerateDoc(code),
  { stage: 'generation' }
);

// Check for errors
if (generator.hasErrors()) {
  console.error(generator.getErrorSummary());
}
```

## Requirements Satisfied

This implementation satisfies the following requirements:

- **Requirement 7.3**: File-level error isolation - failures in one file don't prevent processing of others
- **Requirement 7.4**: Progress updates - emits progress events during long-running operations
- **Requirement 7.5**: Caching - caches analysis results to avoid redundant processing

## Architecture

```
ResilientDocumentationGenerator
├── ProgressTracker (EventEmitter)
│   ├── Stage tracking
│   ├── Throttled events
│   └── Progress calculation
├── ErrorHandler
│   ├── Retry logic
│   ├── Error isolation
│   └── Error tracking
└── CacheManager
    ├── LRU eviction
    ├── TTL expiration
    └── Content hashing
```

## Testing

All components have comprehensive unit tests:

- **ProgressTracker.test.ts**: 9 tests covering stage tracking, callbacks, and throttling
- **ErrorHandler.test.ts**: 13 tests covering retry logic, isolation, and error tracking
- **CacheManager.test.ts**: 17 tests covering caching, eviction, and expiration
- **ResilientDocumentationGenerator.test.ts**: 18 tests covering integration of all components

Run tests with:
```bash
npm test -- --testPathPattern="ProgressTracker|ErrorHandler|CacheManager|ResilientDocumentationGenerator"
```

## Performance Considerations

- **Progress Throttling**: Events are throttled to minimum 100ms intervals to avoid overwhelming consumers
- **LRU Cache**: Automatically evicts least recently used entries when max size is reached
- **Exponential Backoff**: Retry delays increase exponentially (1s, 2s, 4s) to avoid overwhelming failing services
- **Parallel Processing**: Files are processed in parallel with error isolation for maximum throughput

## Error Recovery

The system identifies recoverable errors (rate limits, timeouts, network issues) and applies retry logic. For non-recoverable errors (syntax errors, invalid input), it fails fast and continues with other files.

**Recoverable Error Patterns:**
- Rate limit exceeded
- Timeout
- Network errors (ECONNRESET, ETIMEDOUT)
- Temporary failures

**Non-Recoverable Errors:**
- Syntax errors
- Invalid input
- Missing dependencies
- Permission denied
