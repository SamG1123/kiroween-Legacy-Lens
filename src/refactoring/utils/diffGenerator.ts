import { createTwoFilesPatch } from 'diff';

/**
 * Generate a unified diff between two code strings
 */
export function generateDiff(
  beforeCode: string,
  afterCode: string,
  filename = 'code.ts'
): string {
  return createTwoFilesPatch(
    filename,
    filename,
    beforeCode,
    afterCode,
    'Before',
    'After'
  );
}

/**
 * Generate a simple line-by-line diff
 */
export function generateSimpleDiff(beforeCode: string, afterCode: string): {
  added: string[];
  removed: string[];
  unchanged: string[];
} {
  const beforeLines = beforeCode.split('\n');
  const afterLines = afterCode.split('\n');
  
  const added: string[] = [];
  const removed: string[] = [];
  const unchanged: string[] = [];
  
  // Simple line-based comparison
  const beforeSet = new Set(beforeLines);
  const afterSet = new Set(afterLines);
  
  for (const line of afterLines) {
    if (!beforeSet.has(line)) {
      added.push(line);
    } else {
      unchanged.push(line);
    }
  }
  
  for (const line of beforeLines) {
    if (!afterSet.has(line)) {
      removed.push(line);
    }
  }
  
  return { added, removed, unchanged };
}

/**
 * Format diff for display
 */
export function formatDiff(diff: string): string {
  const lines = diff.split('\n');
  const formatted: string[] = [];
  
  for (const line of lines) {
    if (line.startsWith('+') && !line.startsWith('+++')) {
      formatted.push(`\x1b[32m${line}\x1b[0m`); // Green for additions
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      formatted.push(`\x1b[31m${line}\x1b[0m`); // Red for deletions
    } else {
      formatted.push(line);
    }
  }
  
  return formatted.join('\n');
}
