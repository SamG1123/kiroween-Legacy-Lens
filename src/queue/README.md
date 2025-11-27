# Job Queue System

This module implements async job processing for the Codebase Analysis Engine using Redis.

## Architecture

The job queue system consists of three main components:

1. **JobQueue**: Manages job enqueueing, dequeueing, and status tracking
2. **AnalysisWorker**: Consumes jobs from the queue and processes them
3. **Redis**: Provides the backing store for the job queue

## Components

### JobQueue

The `JobQueue` class provides methods for:
- `enqueueJob(projectId, workingDirectory)`: Add a new analysis job to the queue
- `dequeueJob(timeout)`: Get the next job from the queue (blocking)
- `updateJobStatus(jobId, status, progress, error)`: Update job status and progress
- `getJob(jobId)`: Get job details by job ID
- `getJobByProjectId(projectId)`: Get job details by project ID
- `getQueueLength()`: Get the number of jobs in the queue

### AnalysisWorker

The `AnalysisWorker` class:
- Runs as a separate process
- Continuously polls the queue for new jobs
- Processes jobs using the `AnalysisOrchestrator`
- Updates job status and progress
- Handles graceful shutdown on SIGINT/SIGTERM

### Job Status Flow

Jobs progress through the following states:

```
queued → processing → completed
                   ↘ failed
```

## Configuration

Redis connection is configured via environment variables:

```bash
REDIS_HOST=localhost      # Redis server host
REDIS_PORT=6379          # Redis server port
REDIS_PASSWORD=          # Redis password (optional)
REDIS_DB=0              # Redis database number
```

## Usage

### Starting the Worker

Run the worker process:

```bash
npm run worker
```

Or in production:

```bash
node dist/queue/worker.js
```

### Enqueueing Jobs

Jobs are automatically enqueued when analysis is requested via the API:

```typescript
import { JobQueue } from './queue';

const jobQueue = new JobQueue();
await jobQueue.initialize();

const jobId = await jobQueue.enqueueJob(projectId, workingDirectory);
```

### Checking Job Status

Get job status by project ID:

```typescript
const job = await jobQueue.getJobByProjectId(projectId);
console.log(job.status, job.progress);
```

### API Integration

The API server automatically uses the job queue:

```bash
POST /api/analyze
# Returns: { projectId, jobId, status: "pending", message: "Analysis queued" }

GET /api/analysis/:id
# Returns: { projectId, status, job: { id, status, progress, ... }, ... }
```

## Job Data Structure

```typescript
interface AnalysisJob {
  id: string;                    // Unique job ID
  projectId: string;             // Associated project ID
  workingDirectory: string;      // Path to codebase
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress?: number;             // Progress percentage (0-100)
  error?: string;                // Error message if failed
  createdAt: Date;              // When job was created
  startedAt?: Date;             // When processing started
  completedAt?: Date;           // When processing completed
}
```

## Error Handling

- Jobs that fail are marked with status `'failed'` and include an error message
- The worker continues processing other jobs even if one fails
- Failed jobs remain in Redis for 24 hours for debugging
- The orchestrator handles all analysis errors and generates partial reports

## Monitoring

Check queue length:

```typescript
const length = await jobQueue.getQueueLength();
console.log(`${length} jobs in queue`);
```

## Testing

Clear the queue (for testing only):

```typescript
await jobQueue.clearQueue();
```

## Production Considerations

1. **Multiple Workers**: Run multiple worker processes for parallel processing
2. **Redis Persistence**: Configure Redis with AOF or RDB persistence
3. **Job Expiration**: Jobs expire after 24 hours to prevent memory buildup
4. **Monitoring**: Monitor queue length and job processing times
5. **Graceful Shutdown**: Workers handle SIGINT/SIGTERM for clean shutdown
6. **Error Recovery**: Failed jobs can be manually re-queued if needed
