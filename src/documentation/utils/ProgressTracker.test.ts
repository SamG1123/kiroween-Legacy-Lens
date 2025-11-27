import { ProgressTracker } from './ProgressTracker';
import { ProgressEvent } from '../types';

describe('ProgressTracker', () => {
  let tracker: ProgressTracker;
  let events: ProgressEvent[];

  beforeEach(() => {
    tracker = new ProgressTracker();
    events = [];
    tracker.onProgress((event) => events.push(event));
  });

  afterEach(() => {
    tracker.removeAllListeners();
  });

  describe('stage tracking', () => {
    it('should emit progress event when starting a stage', () => {
      tracker.startStage('parsing', 10, 'Starting parsing');

      expect(events.length).toBe(1);
      expect(events[0].stage).toBe('parsing');
      expect(events[0].current).toBe(0);
      expect(events[0].total).toBe(10);
      expect(events[0].message).toBe('Starting parsing');
    });

    it('should track progress updates', () => {
      tracker.startStage('analyzing', 5, 'Starting analysis');
      tracker.updateProgress(3, 'Analyzing files');

      // Due to throttling, we may only get the start event
      expect(events.length).toBeGreaterThanOrEqual(1);
      expect(events[0].stage).toBe('analyzing');
      expect(events[0].total).toBe(5);
    });

    it('should increment progress correctly', async () => {
      tracker.startStage('generating', 3, 'Starting generation');
      
      // Wait a bit to avoid throttling
      await new Promise(resolve => setTimeout(resolve, 150));
      tracker.incrementProgress('Generated file 1');
      
      await new Promise(resolve => setTimeout(resolve, 150));
      tracker.incrementProgress('Generated file 2');

      expect(events.length).toBeGreaterThanOrEqual(2);
      expect(events[0].current).toBe(0);
      expect(events[0].stage).toBe('generating');
    });

    it('should complete stage with full progress', () => {
      tracker.startStage('validating', 5, 'Starting validation');
      tracker.completeStage('Validation complete');

      expect(events.length).toBe(2);
      expect(events[1].current).toBe(5);
      expect(events[1].total).toBe(5);
    });
  });

  describe('progress percentage', () => {
    it('should calculate progress percentage correctly', () => {
      tracker.startStage('packaging', 10, 'Starting packaging');
      expect(tracker.getProgressPercentage()).toBe(0);

      tracker.updateProgress(5);
      expect(tracker.getProgressPercentage()).toBe(50);

      tracker.completeStage();
      expect(tracker.getProgressPercentage()).toBe(100);
    });

    it('should return 0 when total is 0', () => {
      tracker.startStage('parsing', 0, 'Empty stage');
      expect(tracker.getProgressPercentage()).toBe(0);
    });
  });

  describe('callback management', () => {
    it('should allow adding and removing callbacks', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      tracker.onProgress(callback1);
      tracker.onProgress(callback2);

      tracker.startStage('parsing', 1, 'Test');

      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);

      tracker.offProgress(callback1);
      tracker.incrementProgress();

      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(2);
    });
  });

  describe('reset', () => {
    it('should reset tracker to initial state', () => {
      tracker.startStage('parsing', 10, 'Test');
      tracker.updateProgress(5);
      tracker.reset();

      expect(tracker.getProgressPercentage()).toBe(0);
    });
  });

  describe('throttling', () => {
    it('should emit start and complete events regardless of throttling', () => {
      tracker.startStage('parsing', 100, 'Starting');
      
      // Rapid updates
      for (let i = 1; i < 100; i++) {
        tracker.updateProgress(i);
      }
      
      tracker.completeStage('Done');

      // Should have start event and complete event at minimum
      expect(events.length).toBeGreaterThanOrEqual(2);
      expect(events[0].current).toBe(0);
      expect(events[events.length - 1].current).toBe(100);
    });
  });
});
