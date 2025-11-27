import { EventEmitter } from 'events';
import { ProgressEvent, ProgressCallback } from '../types';

/**
 * ProgressTracker manages progress tracking for documentation generation.
 * It emits progress events at regular intervals to inform consumers about
 * the current state of the generation process.
 * 
 * Requirements: 7.4 - Progress updates during long-running documentation generation
 */
export class ProgressTracker extends EventEmitter {
  private currentStage: ProgressEvent['stage'] = 'parsing';
  private currentProgress: number = 0;
  private totalItems: number = 0;
  private lastEmitTime: number = 0;
  private readonly minEmitInterval: number = 100; // Minimum 100ms between emissions

  constructor() {
    super();
  }

  /**
   * Start tracking a new stage of documentation generation
   */
  startStage(stage: ProgressEvent['stage'], total: number, message: string): void {
    this.currentStage = stage;
    this.currentProgress = 0;
    this.totalItems = total;
    this.emitProgress(message);
  }

  /**
   * Update progress within the current stage
   */
  updateProgress(current: number, message?: string): void {
    this.currentProgress = current;
    this.emitProgress(message || `Processing ${this.currentStage}...`);
  }

  /**
   * Increment progress by one
   */
  incrementProgress(message?: string): void {
    this.currentProgress++;
    this.emitProgress(message || `Processing ${this.currentStage}...`);
  }

  /**
   * Complete the current stage
   */
  completeStage(message?: string): void {
    this.currentProgress = this.totalItems;
    this.emitProgress(message || `Completed ${this.currentStage}`);
  }

  /**
   * Register a callback for progress events
   */
  onProgress(callback: ProgressCallback): void {
    this.on('progress', callback);
  }

  /**
   * Remove a progress callback
   */
  offProgress(callback: ProgressCallback): void {
    this.off('progress', callback);
  }

  /**
   * Get current progress as a percentage
   */
  getProgressPercentage(): number {
    if (this.totalItems === 0) return 0;
    return Math.round((this.currentProgress / this.totalItems) * 100);
  }

  /**
   * Emit a progress event (throttled to avoid overwhelming consumers)
   */
  private emitProgress(message: string): void {
    const now = Date.now();
    
    // Throttle emissions unless we're at 0% or 100%
    const isComplete = this.currentProgress === this.totalItems;
    const isStart = this.currentProgress === 0;
    
    if (!isStart && !isComplete && (now - this.lastEmitTime) < this.minEmitInterval) {
      return;
    }

    const event: ProgressEvent = {
      stage: this.currentStage,
      current: this.currentProgress,
      total: this.totalItems,
      message,
      timestamp: new Date()
    };

    this.emit('progress', event);
    this.lastEmitTime = now;
  }

  /**
   * Reset the tracker to initial state
   */
  reset(): void {
    this.currentStage = 'parsing';
    this.currentProgress = 0;
    this.totalItems = 0;
    this.lastEmitTime = 0;
  }
}
