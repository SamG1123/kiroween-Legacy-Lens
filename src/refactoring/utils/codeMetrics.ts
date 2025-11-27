/**
 * Code metrics calculation utilities
 */

/**
 * Calculate similarity between two code strings
 * Uses Levenshtein distance normalized by length
 */
export function calculateSimilarity(code1: string, code2: string): number {
  const normalized1 = normalizeCode(code1);
  const normalized2 = normalizeCode(code2);
  
  const distance = levenshteinDistance(normalized1, normalized2);
  const maxLength = Math.max(normalized1.length, normalized2.length);
  
  if (maxLength === 0) return 1.0;
  
  return 1 - (distance / maxLength);
}

/**
 * Normalize code for comparison (remove whitespace, comments)
 */
function normalizeCode(code: string): string {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
    .replace(/\/\/.*/g, '') // Remove line comments
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix: number[][] = [];
  
  // Initialize matrix
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }
  
  // Fill matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // Deletion
        matrix[i][j - 1] + 1, // Insertion
        matrix[i - 1][j - 1] + cost // Substitution
      );
    }
  }
  
  return matrix[len1][len2];
}

/**
 * Count lines of code (excluding comments and blank lines)
 */
export function countLinesOfCode(code: string): number {
  const lines = code.split('\n');
  let count = 0;
  
  for (const line of lines) {
    const trimmed = line.trim();
    // Skip blank lines and comment-only lines
    if (trimmed && !trimmed.startsWith('//') && !trimmed.startsWith('/*') && !trimmed.startsWith('*')) {
      count++;
    }
  }
  
  return count;
}

/**
 * Calculate code complexity score (simple heuristic)
 */
export function calculateComplexityScore(code: string): number {
  let score = 0;
  
  // Count control flow statements
  score += (code.match(/\bif\b/g) || []).length;
  score += (code.match(/\belse\b/g) || []).length;
  score += (code.match(/\bfor\b/g) || []).length;
  score += (code.match(/\bwhile\b/g) || []).length;
  score += (code.match(/\bswitch\b/g) || []).length;
  score += (code.match(/\bcase\b/g) || []).length;
  score += (code.match(/\bcatch\b/g) || []).length;
  
  // Count logical operators
  score += (code.match(/&&/g) || []).length;
  score += (code.match(/\|\|/g) || []).length;
  
  return score;
}
