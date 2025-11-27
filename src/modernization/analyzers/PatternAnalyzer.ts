import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import type { File, Node } from '@babel/types';
import {
  PatternMatch,
  PatternAnalysis,
  ModernizationSuggestion,
  EffortEstimate,
} from '../types';

/**
 * PatternAnalyzer identifies outdated code patterns and suggests modern alternatives
 * Supports JavaScript, TypeScript, and React patterns
 */
export class PatternAnalyzer {
  /**
   * Analyze all patterns in a codebase
   * @param codebase - Map of file paths to file contents
   * @returns Array of pattern analyses
   */
  async analyzePatterns(codebase: Map<string, string>): Promise<PatternAnalysis[]> {
    const allMatches: Map<string, PatternMatch[]> = new Map();

    // Analyze each file
    for (const [filePath, content] of codebase.entries()) {
      try {
        // Detect various patterns
        const callbackMatches = await this.detectCallbackPatterns(content, filePath);
        const varMatches = await this.detectVarDeclarations(content, filePath);
        const classComponentMatches = await this.detectClassComponents(content, filePath);
        const deprecatedMatches = await this.detectDeprecatedFeatures(
          content,
          filePath,
          this.detectLanguage(filePath)
        );

        // Group by pattern type
        this.addMatches(allMatches, 'callback-pattern', callbackMatches);
        this.addMatches(allMatches, 'var-declaration', varMatches);
        this.addMatches(allMatches, 'class-component', classComponentMatches);
        this.addMatches(allMatches, 'deprecated-feature', deprecatedMatches);
      } catch (error) {
        // Skip files that can't be parsed
        console.warn(`Failed to parse ${filePath}:`, error);
      }
    }

    // Convert matches to analyses
    const analyses: PatternAnalysis[] = [];
    for (const [patternType, matches] of allMatches.entries()) {
      if (matches.length > 0) {
        const suggestion = this.suggestModernAlternative(matches[0]);
        analyses.push({
          pattern: patternType,
          occurrences: matches,
          modernAlternative: suggestion.description,
          benefits: suggestion.benefits,
          migrationComplexity: this.estimateComplexity(patternType, matches.length),
        });
      }
    }

    return analyses;
  }

  /**
   * Detect callback-based async patterns
   * @param content - File content
   * @param filePath - File path for reporting
   * @returns Array of pattern matches
   */
  async detectCallbackPatterns(content: string, filePath: string): Promise<PatternMatch[]> {
    const matches: PatternMatch[] = [];

    try {
      const ast = this.parseCode(content, filePath);
      const lines = content.split('\n');

      traverse(ast, {
        CallExpression: (path: any) => {
          const node = path.node;
          
          // Check for common callback patterns
          if (node.callee.type === 'MemberExpression') {
            const methodName = node.callee.property?.name;
            
            // fs.readFile(path, callback), fs.writeFile(path, data, callback)
            if (
              methodName &&
              ['readFile', 'writeFile', 'readdir', 'stat', 'unlink'].includes(methodName)
            ) {
              const lastArg = node.arguments[node.arguments.length - 1];
              if (lastArg && (lastArg.type === 'FunctionExpression' || lastArg.type === 'ArrowFunctionExpression')) {
                matches.push({
                  file: filePath,
                  line: node.loc?.start.line || 0,
                  code: this.getCodeSnippet(lines, node.loc?.start.line || 0),
                  patternType: 'callback-pattern',
                });
              }
            }
          }

          // Check for any function call with callback as last argument
          const lastArg = node.arguments[node.arguments.length - 1];
          if (lastArg && (lastArg.type === 'FunctionExpression' || lastArg.type === 'ArrowFunctionExpression')) {
            // Check if this callback contains nested callbacks
            let hasNestedCallback = false;
            traverse(lastArg, {
              CallExpression: (innerPath: any) => {
                const innerNode = innerPath.node;
                const innerLastArg = innerNode.arguments[innerNode.arguments.length - 1];
                if (innerLastArg && (innerLastArg.type === 'FunctionExpression' || innerLastArg.type === 'ArrowFunctionExpression')) {
                  hasNestedCallback = true;
                }
              },
            }, path.scope, path);

            if (hasNestedCallback) {
              matches.push({
                file: filePath,
                line: node.loc?.start.line || 0,
                code: this.getCodeSnippet(lines, node.loc?.start.line || 0),
                patternType: 'callback-pattern',
              });
            }
          }
        },
      });
    } catch (error) {
      // Return empty if parsing fails
    }

    return matches;
  }

  /**
   * Detect var declarations in JavaScript
   * @param content - File content
   * @param filePath - File path for reporting
   * @returns Array of pattern matches
   */
  async detectVarDeclarations(content: string, filePath: string): Promise<PatternMatch[]> {
    const matches: PatternMatch[] = [];

    try {
      const ast = this.parseCode(content, filePath);
      const lines = content.split('\n');

      traverse(ast, {
        VariableDeclaration: (path: any) => {
          const node = path.node;
          if (node.kind === 'var') {
            matches.push({
              file: filePath,
              line: node.loc?.start.line || 0,
              code: this.getCodeSnippet(lines, node.loc?.start.line || 0),
              patternType: 'var-declaration',
            });
          }
        },
      });
    } catch (error) {
      // Return empty if parsing fails
    }

    return matches;
  }

  /**
   * Detect class-based React components
   * @param content - File content
   * @param filePath - File path for reporting
   * @returns Array of pattern matches
   */
  async detectClassComponents(content: string, filePath: string): Promise<PatternMatch[]> {
    const matches: PatternMatch[] = [];

    // Only check React files
    if (!this.isReactFile(content)) {
      return matches;
    }

    try {
      const ast = this.parseCode(content, filePath);
      const lines = content.split('\n');

      traverse(ast, {
        ClassDeclaration: (path: any) => {
          const node = path.node;
          
          // Check if extends React.Component or Component
          if (node.superClass) {
            const superClassName = this.getSuperClassName(node.superClass);
            if (
              superClassName === 'Component' ||
              superClassName === 'PureComponent' ||
              superClassName === 'React.Component' ||
              superClassName === 'React.PureComponent'
            ) {
              matches.push({
                file: filePath,
                line: node.loc?.start.line || 0,
                code: this.getCodeSnippet(lines, node.loc?.start.line || 0),
                patternType: 'class-component',
              });
            }
          }
        },
      });
    } catch (error) {
      // Return empty if parsing fails
    }

    return matches;
  }

  /**
   * Detect deprecated language features
   * @param content - File content
   * @param filePath - File path for reporting
   * @param language - Programming language
   * @returns Array of pattern matches
   */
  async detectDeprecatedFeatures(
    content: string,
    filePath: string,
    language: string
  ): Promise<PatternMatch[]> {
    const matches: PatternMatch[] = [];

    if (language === 'javascript' || language === 'typescript') {
      try {
        const ast = this.parseCode(content, filePath);
        const lines = content.split('\n');

        traverse(ast, {
          // Detect arguments object usage (deprecated in favor of rest parameters)
          Identifier: (path: any) => {
            const node = path.node;
            // Check if this is the 'arguments' identifier and it's being used (not declared)
            if (node.name === 'arguments') {
              // Make sure we're in a function context and not in an arrow function
              let functionParent = path.getFunctionParent();
              if (functionParent && functionParent.node.type !== 'ArrowFunctionExpression') {
                // Check if it's actually being used (not just referenced in a property)
                if (path.parent.type !== 'MemberExpression' || path.parent.object === node) {
                  matches.push({
                    file: filePath,
                    line: node.loc?.start.line || 0,
                    code: this.getCodeSnippet(lines, node.loc?.start.line || 0),
                    patternType: 'deprecated-feature',
                  });
                }
              }
            }
          },
          
          // Detect String.prototype.substr (deprecated)
          CallExpression: (path: any) => {
            const node = path.node;
            if (
              node.callee.type === 'MemberExpression' &&
              node.callee.property?.name === 'substr'
            ) {
              matches.push({
                file: filePath,
                line: node.loc?.start.line || 0,
                code: this.getCodeSnippet(lines, node.loc?.start.line || 0),
                patternType: 'deprecated-feature',
              });
            }
          },
        });
      } catch (error) {
        // Return empty if parsing fails
      }
    }

    return matches;
  }

  /**
   * Suggest modern alternative for a pattern
   * @param pattern - Pattern match to suggest alternative for
   * @returns Modernization suggestion
   */
  suggestModernAlternative(pattern: PatternMatch): ModernizationSuggestion {
    switch (pattern.patternType) {
      case 'callback-pattern':
        return {
          description: 'Convert callback-based async code to Promises or async/await',
          beforeCode: `fs.readFile('file.txt', (err, data) => {
  if (err) throw err;
  console.log(data);
});`,
          afterCode: `const data = await fs.promises.readFile('file.txt');
console.log(data);`,
          benefits: [
            'Improved readability and maintainability',
            'Better error handling with try/catch',
            'Easier to compose async operations',
            'Avoids callback hell',
          ],
        };

      case 'var-declaration':
        return {
          description: 'Replace var with let or const for block-scoped variables',
          beforeCode: `var count = 0;
for (var i = 0; i < 10; i++) {
  var temp = i * 2;
}`,
          afterCode: `let count = 0;
for (let i = 0; i < 10; i++) {
  const temp = i * 2;
}`,
          benefits: [
            'Block-scoped variables prevent hoisting issues',
            'const prevents accidental reassignment',
            'More predictable variable behavior',
            'Aligns with modern JavaScript best practices',
          ],
        };

      case 'class-component':
        return {
          description: 'Convert class-based React components to functional components with hooks',
          beforeCode: `class MyComponent extends React.Component {
  constructor(props) {
    super(props);
    this.state = { count: 0 };
  }
  
  render() {
    return <div>{this.state.count}</div>;
  }
}`,
          afterCode: `function MyComponent(props) {
  const [count, setCount] = useState(0);
  
  return <div>{count}</div>;
}`,
          benefits: [
            'Simpler and more concise code',
            'Better code reuse with custom hooks',
            'Improved performance with React optimizations',
            'Easier to test and reason about',
          ],
        };

      case 'deprecated-feature':
        return {
          description: 'Replace deprecated language features with modern alternatives',
          beforeCode: `// Using arguments object
function sum() {
  return Array.from(arguments).reduce((a, b) => a + b);
}

// Using substr
const sub = str.substr(1, 3);`,
          afterCode: `// Using rest parameters
function sum(...numbers) {
  return numbers.reduce((a, b) => a + b);
}

// Using substring or slice
const sub = str.substring(1, 4);`,
          benefits: [
            'Future-proof code against deprecation',
            'Better performance with modern features',
            'Improved type safety',
            'Clearer intent and semantics',
          ],
        };

      default:
        return {
          description: 'Modernize code pattern',
          beforeCode: pattern.code,
          afterCode: '// Modern alternative',
          benefits: ['Improved code quality'],
        };
    }
  }

  // Helper methods

  private parseCode(content: string, filePath: string): File {
    const isTypeScript = filePath.endsWith('.ts') || filePath.endsWith('.tsx');
    const isJSX = filePath.endsWith('.jsx') || filePath.endsWith('.tsx');

    return parse(content, {
      sourceType: 'module',
      plugins: [
        isTypeScript && 'typescript',
        isJSX && 'jsx',
        'decorators-legacy',
        'classProperties',
        'objectRestSpread',
        'optionalChaining',
        'nullishCoalescingOperator',
      ].filter(Boolean) as any[],
    });
  }

  private detectLanguage(filePath: string): string {
    if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
      return 'typescript';
    }
    if (filePath.endsWith('.js') || filePath.endsWith('.jsx')) {
      return 'javascript';
    }
    if (filePath.endsWith('.py')) {
      return 'python';
    }
    if (filePath.endsWith('.java')) {
      return 'java';
    }
    return 'unknown';
  }

  private isReactFile(content: string): boolean {
    // Check for React imports
    const hasReactImport = 
      content.includes('from "react"') ||
      content.includes("from 'react'") ||
      content.includes('require("react")') ||
      content.includes("require('react')");
    
    // Check for React usage
    const hasReactUsage = 
      content.includes('React.Component') ||
      content.includes('React.PureComponent');
    
    return hasReactImport || hasReactUsage;
  }

  private getSuperClassName(superClass: any): string {
    if (superClass.type === 'Identifier') {
      return superClass.name;
    }
    if (superClass.type === 'MemberExpression') {
      const object = superClass.object?.name || '';
      const property = superClass.property?.name || '';
      return `${object}.${property}`;
    }
    return '';
  }

  private getCodeSnippet(lines: string[], lineNumber: number): string {
    if (lineNumber < 1 || lineNumber > lines.length) {
      return '';
    }
    return lines[lineNumber - 1].trim();
  }

  private addMatches(
    map: Map<string, PatternMatch[]>,
    patternType: string,
    matches: PatternMatch[]
  ): void {
    if (matches.length > 0) {
      const existing = map.get(patternType) || [];
      map.set(patternType, [...existing, ...matches]);
    }
  }

  private estimateComplexity(patternType: string, occurrences: number): EffortEstimate {
    // Base complexity by pattern type
    const baseComplexity: Record<string, number> = {
      'var-declaration': 1, // Low - simple find/replace
      'callback-pattern': 2, // Medium - requires understanding async flow
      'class-component': 3, // High - requires understanding component lifecycle
      'deprecated-feature': 2, // Medium - depends on feature
    };

    const base = baseComplexity[patternType] || 2;
    
    // Adjust for number of occurrences
    let score = base;
    if (occurrences > 50) {
      score += 1;
    } else if (occurrences > 20) {
      score += 0.5;
    }

    // Map to effort estimate
    if (score <= 1.5) return 'low';
    if (score <= 2.5) return 'medium';
    return 'high';
  }
}
