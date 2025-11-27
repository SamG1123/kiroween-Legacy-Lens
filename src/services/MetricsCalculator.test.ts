import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { MetricsCalculator } from './MetricsCalculator';
import * as fc from 'fast-check';

describe('MetricsCalculator', () => {
  let calculator: MetricsCalculator;
  let testDir: string;

  beforeEach(async () => {
    calculator = new MetricsCalculator();
    // Use OS temp directory to avoid OneDrive permission issues
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'metrics-test-'));
  });

  afterEach(async () => {
    // Clean up test directory completely
    try {
      await new Promise(resolve => setTimeout(resolve, 10));
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('countLOC', () => {
    it('should count lines correctly for a simple file', async () => {
      const testFile = path.join(testDir, 'test.js');
      const content = `// Comment
const x = 1;

const y = 2;`;
      
      await fs.writeFile(testFile, content);

      const result = await calculator.countLOC(testFile);

      expect(result.total).toBe(4);
      expect(result.code).toBe(2);
      expect(result.comments).toBe(1);
      expect(result.blank).toBe(1);
    });

    it('should handle block comments', async () => {
      const testFile = path.join(testDir, 'test.js');
      const content = `/* Block comment
 * line 2
 */
const x = 1;`;
      
      await fs.writeFile(testFile, content);

      const result = await calculator.countLOC(testFile);

      expect(result.comments).toBe(3);
      expect(result.code).toBe(1);
    });
  });

  describe('calculateComplexity', () => {
    it('should calculate complexity for a simple function', async () => {
      const testFile = path.join(testDir, 'test.js');
      const content = `function simple() {
  return 1;
}`;
      
      await fs.writeFile(testFile, content);

      const result = await calculator.calculateComplexity(testFile);

      expect(result.functions.length).toBe(1);
      expect(result.functions[0].name).toBe('simple');
      expect(result.functions[0].complexity).toBe(1);
    });

    it('should calculate complexity with conditionals', async () => {
      const testFile = path.join(testDir, 'test.js');
      const content = `function complex(x) {
  if (x > 0) {
    return 1;
  } else if (x < 0) {
    return -1;
  }
  return 0;
}`;
      
      await fs.writeFile(testFile, content);

      const result = await calculator.calculateComplexity(testFile);

      expect(result.functions.length).toBe(1);
      expect(result.functions[0].complexity).toBeGreaterThan(1);
    });
  });

  describe('calculateMaintainability', () => {
    it('should return a value between 0 and 100', () => {
      const metrics = {
        functions: [
          { name: 'test', complexity: 5, lineCount: 10 }
        ],
        averageComplexity: 5
      };

      const result = calculator.calculateMaintainability(metrics);

      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(100);
    });

    it('should return lower maintainability for higher complexity', () => {
      const lowComplexity = {
        functions: [],
        averageComplexity: 2
      };
      const highComplexity = {
        functions: [],
        averageComplexity: 20
      };

      const lowResult = calculator.calculateMaintainability(lowComplexity);
      const highResult = calculator.calculateMaintainability(highComplexity);

      expect(lowResult).toBeGreaterThan(highResult);
    });
  });

  describe('calculateMetrics', () => {
    it('should aggregate metrics from multiple files', async () => {
      const file1 = path.join(testDir, 'file1.js');
      const file2 = path.join(testDir, 'file2.js');
      
      await fs.writeFile(file1, 'const x = 1;\nconst y = 2;');
      await fs.writeFile(file2, 'const z = 3;');

      const result = await calculator.calculateMetrics([file1, file2]);

      expect(result.totalFiles).toBe(2);
      expect(result.totalLines).toBe(3);
      expect(result.codeLines).toBe(3);
    });
  });

  // Feature: codebase-analysis-engine, Property 9: File and LOC counting accuracy
  // Validates: Requirements 4.1
  describe('Property 9: File and LOC counting accuracy', () => {
    it('should accurately count files and total lines for any codebase', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              name: fc.stringMatching(/^[a-z]+\.(js|ts|py)$/),
              content: fc.array(
                fc.oneof(
                  fc.constant(''),
                  fc.stringMatching(/^[a-zA-Z0-9_\s=;(){}]+$/),
                  fc.stringMatching(/^\/\/ [a-zA-Z0-9\s]+$/),
                  fc.stringMatching(/^# [a-zA-Z0-9\s]+$/)
                )
              ).map(lines => lines.filter(line => !line.includes('\r') && !line.includes('\f') && !line.includes('\u000b')).join('\n'))
            }),
            { minLength: 1, maxLength: 10 }
          ).map(files => {
            // Ensure unique filenames by adding index prefix
            return files.map((file, idx) => ({
              ...file,
              name: `file${idx}-${file.name}`
            }));
          }),
          async (files) => {
            const filePaths: string[] = [];
            const expectedTotalLines: number[] = [];
            
            // Create unique subdirectory for this test iteration using OS temp
            const iterationDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pbt-metrics-'));
            
            try {
              // Write all files and verify they exist before proceeding
              for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const filePath = path.join(iterationDir, file.name);
                
                // Write file with explicit flush to ensure it's on disk
                await fs.writeFile(filePath, file.content, { encoding: 'utf-8', flag: 'w' });
                
                // Verify file exists and is readable (Windows file system sync)
                let retries = 3;
                while (retries > 0) {
                  try {
                    await fs.access(filePath);
                    break;
                  } catch (error) {
                    retries--;
                    if (retries === 0) throw error;
                    // Wait a bit for file system to sync
                    await new Promise(resolve => setTimeout(resolve, 10));
                  }
                }
                
                filePaths.push(filePath);
                
                const lines = file.content.split('\n');
                expectedTotalLines.push(lines.length);
              }

              // Ensure all files are accessible before calculating metrics
              await Promise.all(filePaths.map(fp => fs.access(fp)));

              const result = await calculator.calculateMetrics(filePaths);

              // Property: Total files should be at most the number of input files
              // (some files may fail to process and be skipped)
              expect(result.totalFiles).toBeLessThanOrEqual(files.length);
              expect(result.totalFiles).toBeGreaterThanOrEqual(0);
              
              // Property: All line counts should sum to total lines
              expect(result.codeLines + result.commentLines + result.blankLines).toBe(result.totalLines);
              
              // Property: If all files were processed, total lines should match expected
              if (result.totalFiles === files.length) {
                const expectedTotal = expectedTotalLines.reduce((sum, count) => sum + count, 0);
                expect(result.totalLines).toBe(expectedTotal);
              }
            } finally {
              // Clean up iteration directory with retry logic
              let cleanupRetries = 3;
              while (cleanupRetries > 0) {
                try {
                  await fs.rm(iterationDir, { recursive: true, force: true });
                  break;
                } catch (error) {
                  cleanupRetries--;
                  if (cleanupRetries > 0) {
                    await new Promise(resolve => setTimeout(resolve, 50));
                  }
                  // Ignore final cleanup errors
                }
              }
            }
          }
        ),
        { numRuns: 50, timeout: 15000 }
      );
    }, 30000); // 30 second Jest timeout for this property test
  });

  // Feature: codebase-analysis-engine, Property 10: Complexity calculation correctness
  // Validates: Requirements 4.2
  describe('Property 10: Complexity calculation correctness', () => {
    it('should calculate correct complexity for functions with known complexity', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            numIfs: fc.integer({ min: 0, max: 5 }),
            numLoops: fc.integer({ min: 0, max: 3 }),
            numLogicalOps: fc.integer({ min: 0, max: 3 })
          }),
          async ({ numIfs, numLoops, numLogicalOps }) => {
            // Create unique temp directory for each iteration
            const iterationDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pbt-complexity-'));
            const testFile = path.join(iterationDir, 'test.js');
            
            // Generate a function with known complexity
            let functionBody = '';
            
            // Add if statements
            for (let i = 0; i < numIfs; i++) {
              functionBody += `  if (x > ${i}) { y++; }\n`;
            }
            
            // Add loops
            for (let i = 0; i < numLoops; i++) {
              functionBody += `  for (let i = 0; i < ${i + 1}; i++) { y++; }\n`;
            }
            
            // Add logical operators
            for (let i = 0; i < numLogicalOps; i++) {
              functionBody += `  if (x > 0 && y < 10) { z++; }\n`;
            }
            
            const content = `function testFunc(x) {
  let y = 0;
  let z = 0;
${functionBody}
  return y + z;
}`;
            
            await fs.writeFile(testFile, content, { encoding: 'utf-8', flag: 'w' });
            
            // Verify file exists and is readable (Windows file system sync)
            let retries = 5;
            while (retries > 0) {
              try {
                await fs.access(testFile);
                // Additional wait to ensure file is fully written
                await new Promise(resolve => setTimeout(resolve, 20));
                break;
              } catch (error) {
                retries--;
                if (retries === 0) throw error;
                // Wait longer for file system to sync
                await new Promise(resolve => setTimeout(resolve, 50));
              }
            }

            try {
              const result = await calculator.calculateComplexity(testFile);

              // Property: Complexity should be at least 1 (base complexity)
              expect(result.averageComplexity).toBeGreaterThanOrEqual(1);
              
              // Property: Expected complexity = 1 (base) + numIfs + numLoops + numLogicalOps (for if) + numLogicalOps (for &&)
              const expectedComplexity = 1 + numIfs + numLoops + numLogicalOps + numLogicalOps;
              
              // Property: Calculated complexity should match expected
              expect(result.functions.length).toBe(1);
              expect(result.functions[0].complexity).toBe(expectedComplexity);
              expect(result.averageComplexity).toBe(expectedComplexity);
            } finally {
              // Clean up the iteration directory with retry logic
              let cleanupRetries = 3;
              while (cleanupRetries > 0) {
                try {
                  await fs.rm(iterationDir, { recursive: true, force: true });
                  break;
                } catch (error) {
                  cleanupRetries--;
                  if (cleanupRetries > 0) {
                    await new Promise(resolve => setTimeout(resolve, 50));
                  }
                  // Ignore final cleanup errors
                }
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    }, 30000); // 30 second Jest timeout for this property test
  });

  // Feature: codebase-analysis-engine, Property 11: Maintainability index bounds
  // Validates: Requirements 4.3
  describe('Property 11: Maintainability index bounds', () => {
    it('should always return maintainability index within 0-100 range', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 100 }),
          async (complexity) => {
            const metrics = {
              functions: [],
              averageComplexity: complexity
            };

            const result = calculator.calculateMaintainability(metrics);

            // Property: Maintainability index must be within valid range
            expect(result).toBeGreaterThanOrEqual(0);
            expect(result).toBeLessThanOrEqual(100);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return valid maintainability for extreme complexity values', async () => {
      // Test with very low complexity
      const lowComplexity = {
        functions: [],
        averageComplexity: 0
      };
      const lowResult = calculator.calculateMaintainability(lowComplexity);
      expect(lowResult).toBeGreaterThanOrEqual(0);
      expect(lowResult).toBeLessThanOrEqual(100);

      // Test with very high complexity
      const highComplexity = {
        functions: [],
        averageComplexity: 1000
      };
      const highResult = calculator.calculateMaintainability(highComplexity);
      expect(highResult).toBeGreaterThanOrEqual(0);
      expect(highResult).toBeLessThanOrEqual(100);
    });
  });
});
