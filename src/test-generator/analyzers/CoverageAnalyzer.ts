// Coverage Analyzer
// Analyzes existing test coverage and identifies gaps

import * as parser from '@babel/parser';
import traverse from '@babel/traverse';
import {
  CoverageReport,
  UntestedCode,
  CoverageGap,
  TestSuite,
  FunctionInfo,
  ClassInfo,
} from '../types';

export interface ICoverageAnalyzer {
  analyzeCurrentCoverage(codebase: string): CoverageReport;
  identifyUntestedCode(codebase: string): UntestedCode[];
  calculateCoverageGaps(existing: TestSuite[], code: string): CoverageGap[];
  prioritizeUntestedCode(untested: UntestedCode[]): UntestedCode[];
}

export class CoverageAnalyzer implements ICoverageAnalyzer {
  /**
   * Analyzes current test coverage of a codebase
   * Requirements: 6.1, 6.2, 6.4, 6.5
   */
  analyzeCurrentCoverage(codebase: string): CoverageReport {
    const untestedFunctions: string[] = [];
    const untestedClasses: string[] = [];
    const fileMap = new Map<string, number>();
    let totalFunctions = 0;
    let testedFunctions = 0;
    let hasCriticalPaths = false;

    try {
      // Parse the codebase to extract functions and classes
      const ast = parser.parse(codebase, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx'],
      });

      const functions: string[] = [];
      const classes: string[] = [];

      traverse(ast, {
        FunctionDeclaration(path) {
          const name = path.node.id?.name;
          if (name) {
            functions.push(name);
            totalFunctions++;
          }
        },
        FunctionExpression(path) {
          const parent = path.parent;
          if (parent.type === 'VariableDeclarator' && parent.id.type === 'Identifier') {
            functions.push(parent.id.name);
            totalFunctions++;
          }
        },
        ArrowFunctionExpression(path) {
          const parent = path.parent;
          if (parent.type === 'VariableDeclarator' && parent.id.type === 'Identifier') {
            functions.push(parent.id.name);
            totalFunctions++;
          }
        },
        ClassDeclaration(path) {
          const name = path.node.id?.name;
          if (name) {
            classes.push(name);
          }
        },
        ClassMethod(path) {
          if (path.node.kind === 'method' && path.node.key.type === 'Identifier') {
            totalFunctions++;
          }
        },
      });

      // Check for test patterns in the codebase
      const testPatterns = [
        /describe\s*\(\s*['"`](.+?)['"`]/g,
        /it\s*\(\s*['"`](.+?)['"`]/g,
        /test\s*\(\s*['"`](.+?)['"`]/g,
      ];

      const testedNames = new Set<string>();
      for (const pattern of testPatterns) {
        let match;
        while ((match = pattern.exec(codebase)) !== null) {
          testedNames.add(match[1]);
          testedFunctions++;
        }
      }

      // Identify untested functions and classes
      for (const func of functions) {
        if (!this.isNameTested(func, testedNames)) {
          untestedFunctions.push(func);
        }
      }

      for (const cls of classes) {
        if (!this.isNameTested(cls, testedNames)) {
          untestedClasses.push(cls);
        }
      }

      // Check for critical paths (main, init, constructor, etc.)
      const criticalPatterns = ['main', 'init', 'constructor', 'start', 'run'];
      hasCriticalPaths = functions.some(f => 
        criticalPatterns.some(p => f.toLowerCase().includes(p))
      );

      const overallPercentage = totalFunctions > 0 
        ? Math.round((testedFunctions / totalFunctions) * 100) 
        : 0;

      // For simplicity, set file coverage to overall percentage
      fileMap.set('analyzed-file', overallPercentage);

      return {
        overallPercentage,
        byFile: fileMap,
        untestedFunctions,
        untestedClasses,
        criticalPathsCovered: hasCriticalPaths && testedFunctions > 0,
      };
    } catch (error) {
      console.warn('Failed to analyze coverage:', error);
      return {
        overallPercentage: 0,
        byFile: new Map(),
        untestedFunctions: [],
        untestedClasses: [],
        criticalPathsCovered: false,
      };
    }
  }

  /**
   * Identifies untested code in a codebase
   * Requirements: 6.1, 6.3, 6.4
   */
  identifyUntestedCode(codebase: string): UntestedCode[] {
    const untestedCode: UntestedCode[] = [];

    try {
      const ast = parser.parse(codebase, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx'],
      });

      const self = this;
      traverse(ast, {
        FunctionDeclaration(path) {
          const name = path.node.id?.name;
          if (name && !self.hasTestForFunction(codebase, name)) {
            const complexity = self.calculateComplexity(path.node.body);
            untestedCode.push({
              type: 'function',
              name,
              file: 'analyzed-file',
              complexity,
              priority: self.determinePriority(name, complexity),
            });
          }
        },
        FunctionExpression(path) {
          const parent = path.parent;
          if (parent.type === 'VariableDeclarator' && parent.id.type === 'Identifier') {
            const name = parent.id.name;
            if (!self.hasTestForFunction(codebase, name)) {
              const complexity = self.calculateComplexity(path.node.body);
              untestedCode.push({
                type: 'function',
                name,
                file: 'analyzed-file',
                complexity,
                priority: self.determinePriority(name, complexity),
              });
            }
          }
        },
        ArrowFunctionExpression(path) {
          const parent = path.parent;
          if (parent.type === 'VariableDeclarator' && parent.id.type === 'Identifier') {
            const name = parent.id.name;
            if (!self.hasTestForFunction(codebase, name)) {
              const complexity = self.calculateComplexity(path.node.body);
              untestedCode.push({
                type: 'function',
                name,
                file: 'analyzed-file',
                complexity,
                priority: self.determinePriority(name, complexity),
              });
            }
          }
        },
        ClassDeclaration(path) {
          const name = path.node.id?.name;
          if (name && !self.hasTestForClass(codebase, name)) {
            const complexity = self.calculateClassComplexity(path.node);
            untestedCode.push({
              type: 'class',
              name,
              file: 'analyzed-file',
              complexity,
              priority: self.determinePriority(name, complexity),
            });
          }
        },
      });
    } catch (error) {
      console.warn('Failed to identify untested code:', error);
    }

    return untestedCode;
  }

  /**
   * Calculates coverage gaps in existing test suites
   * Requirements: 7.1, 7.2, 7.3
   */
  calculateCoverageGaps(existing: TestSuite[], code: string): CoverageGap[] {
    const gaps: CoverageGap[] = [];

    try {
      const ast = parser.parse(code, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx'],
      });

      const testedScenarios = this.extractTestedScenarios(existing);
      const self = this;

      traverse(ast, {
        IfStatement(path) {
          // Check for untested branches
          const hasElse = path.node.alternate !== null;
          const branchId = `branch-${path.node.loc?.start.line || 0}`;
          
          if (!testedScenarios.has(branchId)) {
            gaps.push({
              type: 'branch',
              description: 'Untested conditional branch',
              location: `line ${path.node.loc?.start.line || 0}`,
              estimatedImpact: hasElse ? 0.5 : 0.3,
            });
          }
        },
        TryStatement(path) {
          // Check for untested error paths
          const errorPathId = `error-${path.node.loc?.start.line || 0}`;
          
          if (!testedScenarios.has(errorPathId)) {
            gaps.push({
              type: 'error_path',
              description: 'Untested error handling path',
              location: `line ${path.node.loc?.start.line || 0}`,
              estimatedImpact: 0.7,
            });
          }
        },
        FunctionDeclaration(path) {
          const name = path.node.id?.name;
          if (name) {
            // Check for edge cases
            const params = path.node.params;
            if (params.length > 0 && !self.hasEdgeCaseTests(testedScenarios, name)) {
              gaps.push({
                type: 'edge_case',
                description: `Missing edge case tests for ${name}`,
                location: `function ${name}`,
                estimatedImpact: 0.6,
              });
            }
          }
        },
      });
    } catch (error) {
      console.warn('Failed to calculate coverage gaps:', error);
    }

    return gaps;
  }

  /**
   * Prioritizes untested code by complexity and importance
   * Requirements: 6.3, 6.4
   */
  prioritizeUntestedCode(untested: UntestedCode[]): UntestedCode[] {
    return untested.sort((a, b) => {
      // Sort by priority first
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      
      if (priorityDiff !== 0) {
        return priorityDiff;
      }
      
      // Then by complexity (higher complexity first)
      return b.complexity - a.complexity;
    });
  }

  /**
   * Checks if a name has associated tests
   */
  private isNameTested(name: string, testedNames: Set<string>): boolean {
    // Check exact match
    if (testedNames.has(name)) {
      return true;
    }
    
    // Check if any test name contains this name
    for (const testName of testedNames) {
      if (testName.toLowerCase().includes(name.toLowerCase())) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Checks if a function has tests
   */
  private hasTestForFunction(codebase: string, functionName: string): boolean {
    const testPatterns = [
      new RegExp(`describe\\s*\\(\\s*['"\`].*${functionName}.*['"\`]`, 'i'),
      new RegExp(`it\\s*\\(\\s*['"\`].*${functionName}.*['"\`]`, 'i'),
      new RegExp(`test\\s*\\(\\s*['"\`].*${functionName}.*['"\`]`, 'i'),
    ];

    return testPatterns.some(pattern => pattern.test(codebase));
  }

  /**
   * Checks if a class has tests
   */
  private hasTestForClass(codebase: string, className: string): boolean {
    const testPatterns = [
      new RegExp(`describe\\s*\\(\\s*['"\`].*${className}.*['"\`]`, 'i'),
      new RegExp(`describe\\s*\\(\\s*['"\`]${className}['"\`]`, 'i'),
    ];

    return testPatterns.some(pattern => pattern.test(codebase));
  }

  /**
   * Calculates cyclomatic complexity of a function body
   */
  private calculateComplexity(body: any): number {
    let complexity = 1;

    // Create a minimal AST wrapper for traversal
    const wrapper = {
      type: 'File',
      program: {
        type: 'Program',
        body: [body],
      },
    };

    traverse(wrapper as any, {
      IfStatement() {
        complexity++;
      },
      ConditionalExpression() {
        complexity++;
      },
      ForStatement() {
        complexity++;
      },
      WhileStatement() {
        complexity++;
      },
      DoWhileStatement() {
        complexity++;
      },
      SwitchCase(path) {
        if (path.node.test) {
          complexity++;
        }
      },
      LogicalExpression(path) {
        if (path.node.operator === '&&' || path.node.operator === '||') {
          complexity++;
        }
      },
      CatchClause() {
        complexity++;
      },
    });

    return complexity;
  }

  /**
   * Calculates complexity of a class
   */
  private calculateClassComplexity(classNode: any): number {
    let complexity = 1;

    // Create a minimal AST wrapper for traversal
    const wrapper = {
      type: 'File',
      program: {
        type: 'Program',
        body: [classNode],
      },
    };

    const self = this;
    traverse(wrapper as any, {
      ClassMethod(path) {
        complexity += self.calculateComplexity(path.node.body);
      },
    });

    return complexity;
  }

  /**
   * Determines priority based on name and complexity
   */
  private determinePriority(name: string, complexity: number): UntestedCode['priority'] {
    // Critical patterns
    const criticalPatterns = ['main', 'init', 'constructor', 'auth', 'security', 'payment'];
    if (criticalPatterns.some(p => name.toLowerCase().includes(p))) {
      return 'critical';
    }

    // High complexity or important patterns
    if (complexity > 10 || ['process', 'handle', 'execute', 'validate'].some(p => name.toLowerCase().includes(p))) {
      return 'high';
    }

    // Medium complexity
    if (complexity > 5) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Extracts tested scenarios from existing test suites
   */
  private extractTestedScenarios(existing: TestSuite[]): Set<string> {
    const scenarios = new Set<string>();

    for (const suite of existing) {
      for (const testCase of suite.testCases) {
        scenarios.add(testCase.name);
        scenarios.add(testCase.description);
        
        // Add type-based identifiers
        scenarios.add(`${testCase.type}-${testCase.name}`);
      }
    }

    return scenarios;
  }

  /**
   * Checks if edge case tests exist for a function
   */
  private hasEdgeCaseTests(testedScenarios: Set<string>, functionName: string): boolean {
    const edgeCasePatterns = [
      'edge',
      'boundary',
      'empty',
      'null',
      'undefined',
      'zero',
      'negative',
      'maximum',
      'minimum',
    ];

    for (const scenario of testedScenarios) {
      if (scenario.toLowerCase().includes(functionName.toLowerCase())) {
        if (edgeCasePatterns.some(pattern => scenario.toLowerCase().includes(pattern))) {
          return true;
        }
      }
    }

    return false;
  }
}
