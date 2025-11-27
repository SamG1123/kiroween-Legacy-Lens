import { PerformanceMonitor, getPerformanceMonitor } from './PerformanceMonitor';

describe('PerformanceMonitor', () => {
  let monitor: PerformanceMonitor;

  beforeEach(() => {
    monitor = new PerformanceMonitor();
  });

  describe('start and end', () => {
    it('should record operation duration', () => {
      monitor.start('test-operation');
      
      // Simulate some work
      const startTime = Date.now();
      while (Date.now() - startTime < 10) {
        // Wait for at least 10ms
      }
      
      const duration = monitor.end('test-operation');
      
      expect(duration).toBeGreaterThanOrEqual(10);
    });

    it('should return 0 if operation was not started', () => {
      const duration = monitor.end('non-existent-operation');
      expect(duration).toBe(0);
    });
  });

  describe('getStats', () => {
    it('should return null for operations with no data', () => {
      const stats = monitor.getStats('non-existent-operation');
      expect(stats).toBeNull();
    });

    it('should calculate statistics correctly', () => {
      // Record multiple operations
      monitor.start('test-op');
      monitor.end('test-op'); // ~0ms
      
      monitor.start('test-op');
      const startTime = Date.now();
      while (Date.now() - startTime < 10) {
        // Wait
      }
      monitor.end('test-op'); // ~10ms
      
      const stats = monitor.getStats('test-op');
      
      expect(stats).not.toBeNull();
      expect(stats!.count).toBe(2);
      expect(stats!.total).toBeGreaterThanOrEqual(10);
      expect(stats!.average).toBeGreaterThanOrEqual(5);
      expect(stats!.min).toBeGreaterThanOrEqual(0);
      expect(stats!.max).toBeGreaterThanOrEqual(10);
    });
  });

  describe('getAllStats', () => {
    it('should return stats for all operations', () => {
      monitor.start('op1');
      monitor.end('op1');
      
      monitor.start('op2');
      monitor.end('op2');
      
      const allStats = monitor.getAllStats();
      
      expect(Object.keys(allStats)).toHaveLength(2);
      expect(allStats['op1']).not.toBeNull();
      expect(allStats['op2']).not.toBeNull();
    });
  });

  describe('clear', () => {
    it('should clear all metrics', () => {
      monitor.start('test-op');
      monitor.end('test-op');
      
      expect(monitor.getStats('test-op')).not.toBeNull();
      
      monitor.clear();
      
      expect(monitor.getStats('test-op')).toBeNull();
    });
  });

  describe('measure', () => {
    it('should measure async operations', async () => {
      const asyncOp = async () => {
        return new Promise<string>((resolve) => {
          setTimeout(() => resolve('done'), 10);
        });
      };
      
      const result = await monitor.measure('async-test', asyncOp);
      
      expect(result).toBe('done');
      
      const stats = monitor.getStats('async-test');
      expect(stats).not.toBeNull();
      expect(stats!.count).toBe(1);
      expect(stats!.total).toBeGreaterThanOrEqual(10);
    });

    it('should handle errors in measured operations', async () => {
      const failingOp = async () => {
        throw new Error('Test error');
      };
      
      await expect(monitor.measure('failing-op', failingOp)).rejects.toThrow('Test error');
      
      // Should still record the timing
      const stats = monitor.getStats('failing-op');
      expect(stats).not.toBeNull();
      expect(stats!.count).toBe(1);
    });
  });

  describe('getPerformanceMonitor', () => {
    it('should return singleton instance', () => {
      const instance1 = getPerformanceMonitor();
      const instance2 = getPerformanceMonitor();
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('logSummary', () => {
    it('should log performance summary without errors', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      monitor.start('test-op');
      monitor.end('test-op');
      
      monitor.logSummary();
      
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });
});
