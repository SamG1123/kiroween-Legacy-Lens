import * as fs from 'fs/promises';
import * as path from 'path';
import { parse as babelParse } from '@babel/parser';
import { IMetricsCalculator } from '../interfaces/MetricsCalculator';
import { CodeMetrics, LOCCount, ComplexityMetrics } from '../types';

/**
 * MetricsCalculator Implementation
 * Calculates code metrics including LOC, complexity, and maintainability
 */
export class MetricsCalculator implements IMetricsCalculator {
  /**
   * Calculate all metrics for the codebase
   */
  async calculateMetrics(files: string[]): Promise<CodeMetrics> {
    let totalFiles = 0;
    let totalLines = 0;
    let codeLines = 0;
    let commentLines = 0;
    let blankLines = 0;
    let totalComplexity = 0;
    let functionCount = 0;

    for (const file of files) {
      try {
        // Count LOC
        const locCount = await this.countLOC(file);
        totalFiles++;
        totalLines += locCount.total;
        codeLines += locCount.code;
        commentLines += locCount.comments;
        blankLines += locCount.blank;

        // Calculate complexity for supported files
        if (this.isComplexitySupported(file)) {
          const complexity = await this.calculateComplexity(file);
          totalComplexity += complexity.averageComplexity * complexity.functions.length;
          functionCount += complexity.functions.length;
        }
      } catch (error) {
        // Skip files that can't be processed
        console.warn(`Failed to process file ${file}:`, error);
      }
    }

    const averageComplexity = functionCount > 0 ? totalComplexity / functionCount : 0;
    
    // Calculate maintainability index
    const complexityMetrics: ComplexityMetrics = {
      functions: [],
      averageComplexity
    };
    const maintainabilityIndex = this.calculateMaintainability(complexityMetrics);

    return {
      totalFiles,
      totalLines,
      codeLines,
      commentLines,
      blankLines,
      averageComplexity,
      maintainabilityIndex
    };
  }

  /**
   * Count lines of code in a file
   */
  async countLOC(file: string): Promise<LOCCount> {
    const content = await fs.readFile(file, 'utf-8');
    const lines = content.split('\n');
    
    let code = 0;
    let comments = 0;
    let blank = 0;
    
    const ext = path.extname(file).toLowerCase();
    const isInBlockComment = { value: false };

    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed === '') {
        blank++;
      } else if (this.isCommentLine(trimmed, ext, isInBlockComment)) {
        comments++;
      } else {
        code++;
      }
    }

    return {
      total: lines.length,
      code,
      comments,
      blank
    };
  }

  /**
   * Calculate cyclomatic complexity for a file
   */
  async calculateComplexity(file: string): Promise<ComplexityMetrics> {
    const ext = path.extname(file).toLowerCase();
    
    if (ext === '.js' || ext === '.jsx' || ext === '.ts' || ext === '.tsx') {
      return this.calculateJavaScriptComplexity(file);
    }
    
    // For unsupported languages, return empty metrics
    return {
      functions: [],
      averageComplexity: 0
    };
  }

  /**
   * Calculate maintainability index
   * Formula: MI = 171 - 5.2 * ln(HV) - 0.23 * CC - 16.2 * ln(LOC)
   * Simplified version: MI = max(0, (171 - 5.2 * ln(avgComplexity + 1) - 0.23 * avgComplexity) / 171 * 100)
   */
  calculateMaintainability(metrics: ComplexityMetrics): number {
    const avgComplexity = metrics.averageComplexity;
    
    // Simplified maintainability index calculation
    // Higher complexity = lower maintainability
    const rawMI = 171 - 5.2 * Math.log(avgComplexity + 1) - 0.23 * avgComplexity;
    const normalizedMI = (rawMI / 171) * 100;
    
    // Ensure it's within 0-100 range
    return Math.max(0, Math.min(100, normalizedMI));
  }

  /**
   * Check if complexity calculation is supported for this file
   */
  private isComplexitySupported(file: string): boolean {
    const ext = path.extname(file).toLowerCase();
    return ['.js', '.jsx', '.ts', '.tsx'].includes(ext);
  }

  /**
   * Check if a line is a comment
   */
  private isCommentLine(line: string, ext: string, isInBlockComment: { value: boolean }): boolean {
    // Handle block comments
    if (isInBlockComment.value) {
      if (line.includes('*/')) {
        isInBlockComment.value = false;
      }
      return true;
    }
    
    if (line.includes('/*')) {
      isInBlockComment.value = true;
      if (line.includes('*/')) {
        isInBlockComment.value = false;
      }
      return true;
    }

    // Handle single-line comments based on file type
    if (['.js', '.jsx', '.ts', '.tsx', '.java', '.cs', '.go', '.php'].includes(ext)) {
      return line.startsWith('//');
    }
    
    if (['.py', '.rb'].includes(ext)) {
      return line.startsWith('#');
    }
    
    return false;
  }

  /**
   * Calculate complexity for JavaScript/TypeScript files
   */
  private async calculateJavaScriptComplexity(file: string): Promise<ComplexityMetrics> {
    const content = await fs.readFile(file, 'utf-8');
    const ext = path.extname(file).toLowerCase();
    
    try {
      const ast = babelParse(content, {
        sourceType: 'module',
        plugins: [
          'jsx',
          'typescript',
          'decorators-legacy',
          'classProperties',
          'objectRestSpread'
        ]
      });

      const functions: Array<{ name: string; complexity: number; lineCount: number }> = [];
      
      // Traverse AST to find functions and calculate complexity
      this.traverseAST(ast, functions, content);

      const averageComplexity = functions.length > 0
        ? functions.reduce((sum, f) => sum + f.complexity, 0) / functions.length
        : 0;

      return {
        functions,
        averageComplexity
      };
    } catch (error) {
      // If parsing fails, return empty metrics
      return {
        functions: [],
        averageComplexity: 0
      };
    }
  }

  /**
   * Traverse AST to find functions and calculate complexity
   */
  private traverseAST(node: any, functions: Array<{ name: string; complexity: number; lineCount: number }>, content: string): void {
    if (!node || typeof node !== 'object') {
      return;
    }

    // Check if this is a function node
    if (this.isFunctionNode(node)) {
      const name = this.getFunctionName(node);
      const complexity = this.calculateNodeComplexity(node);
      const lineCount = this.getNodeLineCount(node, content);
      
      functions.push({ name, complexity, lineCount });
    }

    // Recursively traverse child nodes
    for (const key in node) {
      if (key === 'loc' || key === 'range' || key === 'tokens' || key === 'comments') {
        continue;
      }
      
      const child = node[key];
      if (Array.isArray(child)) {
        child.forEach(item => this.traverseAST(item, functions, content));
      } else if (typeof child === 'object' && child !== null) {
        this.traverseAST(child, functions, content);
      }
    }
  }

  /**
   * Check if a node is a function
   */
  private isFunctionNode(node: any): boolean {
    return node.type === 'FunctionDeclaration' ||
           node.type === 'FunctionExpression' ||
           node.type === 'ArrowFunctionExpression' ||
           node.type === 'ClassMethod' ||
           node.type === 'ObjectMethod';
  }

  /**
   * Get function name from node
   */
  private getFunctionName(node: any): string {
    if (node.id && node.id.name) {
      return node.id.name;
    }
    if (node.key && node.key.name) {
      return node.key.name;
    }
    return 'anonymous';
  }

  /**
   * Calculate cyclomatic complexity for a node
   * Complexity = 1 + number of decision points
   */
  private calculateNodeComplexity(node: any): number {
    let complexity = 1; // Base complexity
    
    const countComplexity = (n: any): void => {
      if (!n || typeof n !== 'object') {
        return;
      }

      // Decision points that increase complexity
      if (n.type === 'IfStatement' ||
          n.type === 'ConditionalExpression' ||
          n.type === 'ForStatement' ||
          n.type === 'ForInStatement' ||
          n.type === 'ForOfStatement' ||
          n.type === 'WhileStatement' ||
          n.type === 'DoWhileStatement' ||
          n.type === 'CatchClause' ||
          n.type === 'SwitchCase' && n.test !== null) {
        complexity++;
      }

      // Logical operators
      if (n.type === 'LogicalExpression' && (n.operator === '&&' || n.operator === '||')) {
        complexity++;
      }

      // Recursively check children
      for (const key in n) {
        if (key === 'loc' || key === 'range' || key === 'tokens' || key === 'comments') {
          continue;
        }
        
        const child = n[key];
        if (Array.isArray(child)) {
          child.forEach(item => countComplexity(item));
        } else if (typeof child === 'object' && child !== null) {
          countComplexity(child);
        }
      }
    };

    countComplexity(node.body);
    return complexity;
  }

  /**
   * Get line count for a node
   */
  private getNodeLineCount(node: any, content: string): number {
    if (node.loc) {
      return node.loc.end.line - node.loc.start.line + 1;
    }
    return 0;
  }
}
