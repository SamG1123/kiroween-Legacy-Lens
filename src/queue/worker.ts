import { JobQueue, AnalysisJob } from './JobQueue';
import { AnalysisOrchestrator } from '../services/AnalysisOrchestrator';
import { initRedisClient, closeRedisClient } from './config';
import { logger } from '../utils/logger';

/**
 * Worker Process
 * Consumes analysis jobs from the queue and processes them
 */

class AnalysisWorker {
  private jobQueue: JobQueue;
  private orchestrator: AnalysisOrchestrator;
  private isRunning: boolean = false;
  private currentJob: AnalysisJob | null = null;

  constructor() {
    this.jobQueue = new JobQueue();
    this.orchestrator = new AnalysisOrchestrator();
  }

  /**
   * Start the worker
   */
  async start(): Promise<void> {
    logger.info('Starting analysis worker');
    
    // Initialize Redis connection
    await initRedisClient();
    await this.jobQueue.initialize();
    
    this.isRunning = true;
    logger.info('Analysis worker started and waiting for jobs');

    // Start processing loop
    await this.processLoop();
  }

  /**
   * Stop the worker
   */
  async stop(): Promise<void> {
    logger.info('Stopping analysis worker');
    this.isRunning = false;
    
    // Wait for current job to complete if any
    if (this.currentJob) {
      logger.info('Waiting for current job to complete', { jobId: this.currentJob.id });
      // In a production system, you might want to re-queue the job
    }
    
    await closeRedisClient();
    logger.info('Analysis worker stopped');
  }

  /**
   * Main processing loop
   */
  private async processLoop(): Promise<void> {
    while (this.isRunning) {
      try {
        // Wait for next job (5 second timeout)
        const job = await this.jobQueue.dequeueJob(5);
        
        if (!job) {
          // No job available, continue loop
          continue;
        }

        this.currentJob = job;
        logger.info('Processing job', { jobId: job.id, projectId: job.projectId });

        // Process the job
        await this.processJob(job);

        this.currentJob = null;
      } catch (error) {
        logger.error('Error in worker processing loop', {}, error as Error);
        
        // If there was a current job, mark it as failed
        if (this.currentJob) {
          try {
            await this.jobQueue.updateJobStatus(
              this.currentJob.id,
              'failed',
              undefined,
              error instanceof Error ? error.message : 'Unknown error'
            );
          } catch (updateError) {
            logger.error('Failed to update job status', {}, updateError as Error);
          }
          this.currentJob = null;
        }
        
        // Wait a bit before continuing to avoid tight error loops
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  /**
   * Process a single job
   */
  private async processJob(job: AnalysisJob): Promise<void> {
    try {
      // Update progress: starting
      await this.jobQueue.updateJobStatus(job.id, 'processing', 0);

      // Run the analysis
      // The orchestrator will handle all the pipeline stages and error handling
      await this.orchestrator.startAnalysis(job.projectId, job.workingDirectory);

      // Update progress: completed
      await this.jobQueue.updateJobStatus(job.id, 'completed', 100);
      
      logger.info('Job completed successfully', { jobId: job.id });
    } catch (error) {
      logger.error('Job failed', { jobId: job.id }, error as Error);
      
      // Update job status to failed
      await this.jobQueue.updateJobStatus(
        job.id,
        'failed',
        undefined,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }
}

/**
 * Main entry point for worker process
 */
async function main() {
  const worker = new AnalysisWorker();

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    logger.info('Received SIGINT, shutting down gracefully');
    await worker.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM, shutting down gracefully');
    await worker.stop();
    process.exit(0);
  });

  // Start the worker
  try {
    await worker.start();
  } catch (error) {
    logger.error('Failed to start worker', {}, error as Error);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (require.main === module) {
  main().catch(error => {
    logger.error('Fatal error', {}, error as Error);
    process.exit(1);
  });
}

export { AnalysisWorker };
