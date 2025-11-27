import * as fs from 'fs/promises';
import * as path from 'path';
import { parse as babelParse } from '@babel/parser';
import { ICodeSmellDetector } from '../interfaces/CodeSmellDetector';
import { CodeSmell, Severity } from '../types';

/**
 * CodeSmellDetector Implementation
 * Identifies code smells and quality issues in codebases
 */
export class CodeSmellDetector implements ICodeSmellDetector {
  /**
   * Detect all code smells in the codebase
   */
  async detectSmells(files: string[]): Promise<CodeSmell[]> {
    const allSmells: CodeSmell[] = [];

    // Detect file-level smells
    for (const file of files) {
      try {
        const longFunctions = await this.detectLongFunctions(file);
        const complexFunctions = await this.detectComplexFunctions(file);
        const deepNesting = await this.detectDeepNesting(file);
        
        allSmells.push(...longFunctions, ...complexFunctions, ...deepNesting);
      } catch (error) {
        // Skip files that can't be processed
        console.warn(`Failed to detect smells in file ${file}:`, error);
      }
    }

    // Detect cross-file smells (duplication)
    try {
      const duplication = await this.detectDuplication(files);
      allSmells.push(...duplication);
    } catch (error) {
      console.warn('Failed to detect code duplication:', error);
    }

    return allSmells;
  }

  /**
   * Detect long functions (>50 lines)
   */
  async detectLongFunctions(file: string): Promise<CodeSmell[]> {
    const smells: CodeSmell[] = [];
    const ext = path.extname(file).toLowerCase();

    // Only process supported file types
    if (!['.js', '.jsx', '.ts', '.tsx'].includes(ext)) {
      return smells;
    }

    try {
      const content = await fs.readFile(file, 'utf-8');
      const ast = this.parseFile(content, ext);
      
      if (!ast) {
        return smells;
      }

      const functions = this.extractFunctions(ast, content);

      for (const func of functions) {
        if (func.lineCount > 50) {
          const severity = this.calculateLongFunctionSeverity(func.lineCount);
          smells.push({
            type: 'long_function',
            severity,
            file,
            line: func.line,
            description: `Function '${func.name}' is ${func.lineCount} lines long (threshold: 50)`,
            metadata: {
              functionName: func.name,
              lineCount: func.lineCount
            }
          });
        }
      }
    } catch (error) {
      console.warn(`Failed to detect long functions in ${file}:`, error);
    }

    return smells;
  }

  /**
   * Detect overly complex functions (complexity >10)
   */
  async detectComplexFunctions(file: string): Promise<CodeSmell[]> {
    const smells: CodeSmell[] = [];
    const ext = path.extname(file).toLowerCase();

    // Only process supported file types
    if (!['.js', '.jsx', '.ts', '.tsx'].includes(ext)) {
      return smells;
    }

    try {
      const content = await fs.readFile(file, 'utf-8');
      const ast = this.parseFile(content, ext);
      
      if (!ast) {
        return smells;
      }

      const functions = this.extractFunctions(ast, content);

      for (const func of functions) {
        if (func.complexity > 10) {
          const severity = this.calculateComplexitySeverity(func.complexity);
          smells.push({
            type: 'too_complex',
            severity,
            file,
            line: func.line,
            description: `Function '${func.name}' has complexity ${func.complexity} (threshold: 10)`,
            metadata: {
              functionName: func.name,
              complexity: func.complexity
            }
          });
        }
      }
    } catch (error) {
      console.warn(`Failed to detect complex functions in ${file}:`, error);
    }

    return smells;
  }

  /**
   * Detect duplicate code blocks
   */
  async detectDuplication(files: string[]): Promise<CodeSmell[]> {
    const smells: CodeSmell[] = [];
    const codeBlocks: Map<string, Array<{ file: string; line: number }>> = new Map();

    // Extract code blocks from all files
    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf-8');
        const blocks = this.extractCodeBlocks(content, file);
        
        for (const block of blocks) {
          const normalized = this.normalizeCode(block.code);
          
          // Only consider blocks with at least 5 lines
          if (normalized.split('\n').length >= 5) {
            if (!codeBlocks.has(normalized)) {
              codeBlocks.set(normalized, []);
            }
            codeBlocks.get(normalized)!.push({ file, line: block.line });
          }
        }
      } catch (error) {
        console.warn(`Failed to extract code blocks from ${file}:`, error);
      }
    }

    // Find duplicates
    for (const [code, locations] of codeBlocks.entries()) {
      if (locations.length > 1) {
        const lineCount = code.split('\n').length;
        const severity = this.calculateDuplicationSeverity(lineCount, locations.length);
        
        // Create a smell for each duplicate location
        for (let i = 0; i < locations.length; i++) {
          const location = locations[i];
          const otherLocations = locations.filter((_, idx) => idx !== i);
          
          smells.push({
            type: 'duplication',
            severity,
            file: location.file,
            line: location.line,
            description: `Duplicate code block (${lineCount} lines) found in ${otherLocations.length} other location(s)`,
            metadata: {
              lineCount,
              duplicateCount: locations.length,
              otherLocations: otherLocations.map(loc => ({
                file: loc.file,
                line: loc.line
              }))
            }
          });
        }
      }
    }

    return smells;
  }

  /**
   * Detect deeply nested conditionals (>4 levels)
   */
  async detectDeepNesting(file: string): Promise<CodeSmell[]> {
    const smells: CodeSmell[] = [];
    const ext = path.extname(file).toLowerCase();

    // Only process supported file types
    if (!['.js', '.jsx', '.ts', '.tsx'].includes(ext)) {
      return smells;
    }

    try {
      const content = await fs.readFile(file, 'utf-8');
      const ast = this.parseFile(content, ext);
      
      if (!ast) {
        return smells;
      }

      const nestingIssues = this.findDeepNesting(ast);

      for (const issue of nestingIssues) {
        const severity = this.calculateNestingSeverity(issue.depth);
        smells.push({
          type: 'deep_nesting',
          severity,
          file,
          line: issue.line,
          description: `Deep nesting detected (${issue.depth} levels, threshold: 4)`,
          metadata: {
            depth: issue.depth,
            context: issue.context
          }
        });
      }
    } catch (error) {
      console.warn(`Failed to detect deep nesting in ${file}:`, error);
    }

    return smells;
  }

  /**
   * Parse a file into an AST
   */
  private parseFile(content: string, ext: string): any {
    try {
      return babelParse(content, {
        sourceType: 'module',
        plugins: [
          'jsx',
          'typescript',
          'decorators-legacy',
          'classProperties',
          'objectRestSpread'
        ]
      });
    } catch (error) {
      return null;
    }
  }

  /**
   * Extract functions from AST
   */
  private extractFunctions(ast: any, content: string): Array<{
    name: string;
    line: number;
    lineCount: number;
    complexity: number;
  }> {
    const functions: Array<{
      name: string;
      line: number;
      lineCount: number;
      complexity: number;
    }> = [];

    const traverse = (node: any): void => {
      if (!node || typeof node !== 'object') {
        return;
      }

      if (this.isFunctionNode(node)) {
        const name = this.getFunctionName(node);
        const line = node.loc?.start.line || 0;
        const lineCount = node.loc ? node.loc.end.line - node.loc.start.line + 1 : 0;
        const complexity = this.calculateComplexity(node);
        
        functions.push({ name, line, lineCount, complexity });
      }

      // Recursively traverse child nodes
      for (const key in node) {
        if (key === 'loc' || key === 'range' || key === 'tokens' || key === 'comments') {
          continue;
        }
        
        const child = node[key];
        if (Array.isArray(child)) {
          child.forEach(item => traverse(item));
        } else if (typeof child === 'object' && child !== null) {
          traverse(child);
        }
      }
    };

    traverse(ast);
    return functions;
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
   */
  private calculateComplexity(node: any): number {
    let complexity = 1;
    
    const countComplexity = (n: any): void => {
      if (!n || typeof n !== 'object') {
        return;
      }

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

      if (n.type === 'LogicalExpression' && (n.operator === '&&' || n.operator === '||')) {
        complexity++;
      }

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
   * Extract code blocks for duplication detection
   */
  private extractCodeBlocks(content: string, file: string): Array<{ code: string; line: number }> {
    const blocks: Array<{ code: string; line: number }> = [];
    const lines = content.split('\n');
    const windowSize = 10; // Look for blocks of at least 10 lines

    for (let i = 0; i <= lines.length - windowSize; i++) {
      const block = lines.slice(i, i + windowSize).join('\n');
      blocks.push({ code: block, line: i + 1 });
    }

    return blocks;
  }

  /**
   * Normalize code for comparison (remove whitespace, comments)
   */
  private normalizeCode(code: string): string {
    return code
      .replace(/\/\/.*$/gm, '') // Remove single-line comments
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove multi-line comments
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Find deep nesting in AST
   */
  private findDeepNesting(ast: any): Array<{ line: number; depth: number; context: string }> {
    const issues: Array<{ line: number; depth: number; context: string }> = [];

    const traverse = (node: any, depth: number, context: string): void => {
      if (!node || typeof node !== 'object') {
        return;
      }

      let newDepth = depth;
      let newContext = context;

      // Increment depth for control structures
      if (this.isControlStructure(node)) {
        newDepth++;
        newContext = this.getNodeContext(node);
        
        if (newDepth > 4) {
          issues.push({
            line: node.loc?.start.line || 0,
            depth: newDepth,
            context: newContext
          });
        }
      }

      // Recursively traverse child nodes
      for (const key in node) {
        if (key === 'loc' || key === 'range' || key === 'tokens' || key === 'comments') {
          continue;
        }
        
        const child = node[key];
        if (Array.isArray(child)) {
          child.forEach(item => traverse(item, newDepth, newContext));
        } else if (typeof child === 'object' && child !== null) {
          traverse(child, newDepth, newContext);
        }
      }
    };

    traverse(ast, 0, '');
    return issues;
  }

  /**
   * Check if a node is a control structure
   */
  private isControlStructure(node: any): boolean {
    return node.type === 'IfStatement' ||
           node.type === 'ForStatement' ||
           node.type === 'ForInStatement' ||
           node.type === 'ForOfStatement' ||
           node.type === 'WhileStatement' ||
           node.type === 'DoWhileStatement' ||
           node.type === 'SwitchStatement' ||
           node.type === 'TryStatement';
  }

  /**
   * Get context description for a node
   */
  private getNodeContext(node: any): string {
    return node.type || 'unknown';
  }

  /**
   * Calculate severity for long functions
   */
  private calculateLongFunctionSeverity(lineCount: number): Severity {
    if (lineCount > 100) {
      return 'high';
    } else if (lineCount > 75) {
      return 'medium';
    }
    return 'low';
  }

  /**
   * Calculate severity for complex functions
   */
  private calculateComplexitySeverity(complexity: number): Severity {
    if (complexity > 20) {
      return 'high';
    } else if (complexity > 15) {
      return 'medium';
    }
    return 'low';
  }

  /**
   * Calculate severity for code duplication
   */
  private calculateDuplicationSeverity(lineCount: number, duplicateCount: number): Severity {
    const score = lineCount * duplicateCount;
    if (score > 100) {
      return 'high';
    } else if (score > 50) {
      return 'medium';
    }
    return 'low';
  }

  /**
   * Calculate severity for deep nesting
   */
  private calculateNestingSeverity(depth: number): Severity {
    if (depth > 6) {
      return 'high';
    } else if (depth > 5) {
      return 'medium';
    }
    return 'low';
  }
}
