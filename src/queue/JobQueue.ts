import { RedisClientType } from 'redis';
import { getRedisClient } from './config';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

/**
 * Job Queue Service
 * Manages async job processing using Redis
 */

export interface AnalysisJob {
  id: string;
  projectId: string;
  workingDirectory: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress?: number;
  error?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export class JobQueue {
  private redisClient: RedisClientType | null = null;
  private readonly QUEUE_KEY = 'analysis:queue';
  private readonly JOB_PREFIX = 'analysis:job:';
  private readonly STATUS_PREFIX = 'analysis:status:';

  constructor() {}

  /**
   * Initialize the job queue
   */
  async initialize(): Promise<void> {
    this.redisClient = await getRedisClient();
  }

  /**
   * Ensure Redis client is initialized
   */
  private async ensureClient(): Promise<RedisClientType> {
    if (!this.redisClient || !this.redisClient.isOpen) {
      await this.initialize();
    }
    return this.redisClient!;
  }

  /**
   * Add a new analysis job to the queue
   */
  async enqueueJob(projectId: string, workingDirectory: string): Promise<string> {
    const client = await this.ensureClient();
    
    const jobId = uuidv4();
    const job: AnalysisJob = {
      id: jobId,
      projectId,
      workingDirectory,
      status: 'queued',
      createdAt: new Date(),
    };

    // Store job data
    await client.set(
      `${this.JOB_PREFIX}${jobId}`,
      JSON.stringify(job),
      { EX: 86400 } // Expire after 24 hours
    );

    // Add job ID to queue
    await client.rPush(this.QUEUE_KEY, jobId);

    // Store status mapping for quick lookup by project ID
    await client.set(
      `${this.STATUS_PREFIX}${projectId}`,
      jobId,
      { EX: 86400 }
    );

    return jobId;
  }

  /**
   * Get the next job from the queue
   * Blocks until a job is available
   */
  async dequeueJob(timeout: number = 0): Promise<AnalysisJob | null> {
    const client = await this.ensureClient();

    // Use BLPOP for blocking pop with timeout
    const result = await client.blPop(this.QUEUE_KEY, timeout);

    if (!result) {
      return null;
    }

    const jobId = result.element;
    const jobData = await client.get(`${this.JOB_PREFIX}${jobId}`);

    if (!jobData) {
      logger.error('Job data not found', { jobId });
      return null;
    }

    const job: AnalysisJob = JSON.parse(jobData);
    
    // Update job status to processing
    job.status = 'processing';
    job.startedAt = new Date();
    
    await client.set(
      `${this.JOB_PREFIX}${jobId}`,
      JSON.stringify(job),
      { EX: 86400 }
    );

    return job;
  }

  /**
   * Update job status
   */
  async updateJobStatus(
    jobId: string,
    status: AnalysisJob['status'],
    progress?: number,
    error?: string
  ): Promise<void> {
    const client = await this.ensureClient();

    const jobData = await client.get(`${this.JOB_PREFIX}${jobId}`);
    if (!jobData) {
      throw new Error(`Job not found: ${jobId}`);
    }

    const job: AnalysisJob = JSON.parse(jobData);
    job.status = status;
    
    if (progress !== undefined) {
      job.progress = progress;
    }
    
    if (error) {
      job.error = error;
    }
    
    if (status === 'completed' || status === 'failed') {
      job.completedAt = new Date();
    }

    await client.set(
      `${this.JOB_PREFIX}${jobId}`,
      JSON.stringify(job),
      { EX: 86400 }
    );
  }

  /**
   * Get job by ID
   */
  async getJob(jobId: string): Promise<AnalysisJob | null> {
    const client = await this.ensureClient();

    const jobData = await client.get(`${this.JOB_PREFIX}${jobId}`);
    if (!jobData) {
      return null;
    }

    return JSON.parse(jobData);
  }

  /**
   * Get job by project ID
   */
  async getJobByProjectId(projectId: string): Promise<AnalysisJob | null> {
    const client = await this.ensureClient();

    const jobId = await client.get(`${this.STATUS_PREFIX}${projectId}`);
    if (!jobId) {
      return null;
    }

    return this.getJob(jobId);
  }

  /**
   * Get queue length
   */
  async getQueueLength(): Promise<number> {
    const client = await this.ensureClient();
    return await client.lLen(this.QUEUE_KEY);
  }

  /**
   * Clear all jobs (for testing)
   */
  async clearQueue(): Promise<void> {
    const client = await this.ensureClient();
    
    // Get all job IDs from queue
    const jobIds = await client.lRange(this.QUEUE_KEY, 0, -1);
    
    // Delete all job data
    for (const jobId of jobIds) {
      await client.del(`${this.JOB_PREFIX}${jobId}`);
    }
    
    // Clear the queue
    await client.del(this.QUEUE_KEY);
  }
}
