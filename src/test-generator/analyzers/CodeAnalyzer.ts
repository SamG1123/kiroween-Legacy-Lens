// Code Analyzer
// Analyzes code to extract testable units and their characteristics

import * as parser from '@babel/parser';
import traverse from '@babel/traverse';
import {
  FunctionInfo,
  FunctionAnalysis,
  ClassInfo,
  ClassAnalysis,
  Dependency,
  ErrorPath,
  SideEffect,
} from '../types';

export interface ICodeAnalyzer {
  analyzeFunction(func: FunctionInfo): FunctionAnalysis;
  analyzeClass(cls: ClassInfo): ClassAnalysis;
  identifyDependencies(code: string): Dependency[];
  identifyErrorPaths(func: FunctionInfo): ErrorPath[];
}

export class CodeAnalyzer implements ICodeAnalyzer {
  /**
   * Analyzes a function to extract its characteristics for test generation
   */
  analyzeFunction(func: FunctionInfo): FunctionAnalysis {
    const errorPaths = this.identifyErrorPaths(func);
    const dependencies = this.identifyDependencies(func.body);
    const sideEffects = this.identifySideEffects(func.body);
    const complexity = this.calculateComplexity(func.body);

    return {
      name: func.name,
      parameters: func.parameters,
      returnType: func.returnType,
      hasErrorHandling: errorPaths.length > 0,
      errorPaths,
      dependencies,
      complexity,
      sideEffects,
    };
  }

  /**
   * Analyzes a class to extract its structure for test generation
   */
  analyzeClass(cls: ClassInfo): ClassAnalysis {
    const hasState = cls.properties.length > 0;

    return {
      name: cls.name,
      constructor: cls.constructor,
      publicMethods: cls.publicMethods,
      privateMethods: cls.privateMethods,
      properties: cls.properties,
      hasState,
      inheritance: cls.inheritance,
    };
  }

  /**
   * Identifies external dependencies in code
   */
  identifyDependencies(code: string): Dependency[] {
    const dependencies: Dependency[] = [];
    
    try {
      const ast = parser.parse(code, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx'],
      });

      const self = this;
      traverse(ast, {
        ImportDeclaration(path) {
          const source = path.node.source.value;
          dependencies.push({
            name: source,
            type: self.classifyDependencyType(source),
            source,
          });
        },
        CallExpression(path) {
          const callee = path.node.callee;
          
          // Check for require() calls
          if (callee.type === 'Identifier' && callee.name === 'require') {
            const arg = path.node.arguments[0];
            if (arg && arg.type === 'StringLiteral') {
              dependencies.push({
                name: arg.value,
                type: self.classifyDependencyType(arg.value),
                source: arg.value,
              });
            }
          }
          
          // Check for database calls
          if (callee.type === 'MemberExpression') {
            const objectName = self.getObjectName(callee.object);
            if (self.isDatabaseCall(objectName)) {
              dependencies.push({
                name: objectName,
                type: 'database',
                source: objectName,
              });
            }
          }
        },
      });
    } catch (error) {
      // If parsing fails, return empty array
      console.warn('Failed to parse code for dependency analysis:', error);
    }

    return this.deduplicateDependencies(dependencies);
  }

  /**
   * Identifies error handling paths in a function
   */
  identifyErrorPaths(func: FunctionInfo): ErrorPath[] {
    const errorPaths: ErrorPath[] = [];
    
    try {
      const ast = parser.parse(func.body, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx'],
      });

      const self = this;
      traverse(ast, {
        ThrowStatement(path) {
          const argument = path.node.argument;
          let exceptionType: string | null = null;
          let errorMessage: string | null = null;

          if (argument.type === 'NewExpression' && argument.callee.type === 'Identifier') {
            exceptionType = argument.callee.name;
            
            // Try to extract error message
            if (argument.arguments.length > 0) {
              const firstArg = argument.arguments[0];
              if (firstArg.type === 'StringLiteral') {
                errorMessage = firstArg.value;
              }
            }
          }

          errorPaths.push({
            condition: 'throw statement',
            exceptionType,
            errorMessage,
          });
        },
        TryStatement(path) {
          const handler = path.node.handler;
          if (handler && handler.param) {
            const exceptionType = handler.param.type === 'Identifier' 
              ? handler.param.name 
              : 'Error';
            
            errorPaths.push({
              condition: 'try-catch block',
              exceptionType,
              errorMessage: null,
            });
          }
        },
        IfStatement(path) {
          // Check if the if statement contains error handling
          const consequent = path.node.consequent;
          let hasThrow = false;
          
          traverse(consequent, {
            ThrowStatement() {
              hasThrow = true;
            },
          }, path.scope, path);

          if (hasThrow) {
            const condition = self.extractCondition(path.node.test);
            errorPaths.push({
              condition,
              exceptionType: null,
              errorMessage: null,
            });
          }
        },
      });
    } catch (error) {
      console.warn('Failed to parse function for error path analysis:', error);
    }

    return errorPaths;
  }

  /**
   * Identifies side effects in code
   */
  private identifySideEffects(code: string): SideEffect[] {
    const sideEffects: SideEffect[] = [];
    
    try {
      const ast = parser.parse(code, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx'],
      });

      const self = this;
      traverse(ast, {
        AssignmentExpression(path) {
          const left = path.node.left;
          if (left.type === 'MemberExpression') {
            sideEffects.push({
              type: 'mutation',
              description: 'Modifies object property',
            });
          }
        },
        CallExpression(path) {
          const callee = path.node.callee;
          
          if (callee.type === 'MemberExpression') {
            const objectName = self.getObjectName(callee.object);
            
            if (self.isDatabaseCall(objectName)) {
              sideEffects.push({
                type: 'database',
                description: 'Database operation',
              });
            } else if (self.isNetworkCall(objectName)) {
              sideEffects.push({
                type: 'network',
                description: 'Network request',
              });
            } else if (self.isFileSystemCall(objectName)) {
              sideEffects.push({
                type: 'io',
                description: 'File system operation',
              });
            }
          }
        },
      });
    } catch (error) {
      console.warn('Failed to identify side effects:', error);
    }

    return sideEffects;
  }

  /**
   * Calculates cyclomatic complexity of code
   */
  private calculateComplexity(code: string): number {
    let complexity = 1; // Base complexity
    
    try {
      const ast = parser.parse(code, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx'],
      });

      traverse(ast, {
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
          if (path.node.test) { // Don't count default case
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
    } catch (error) {
      console.warn('Failed to calculate complexity:', error);
    }

    return complexity;
  }

  /**
   * Classifies the type of dependency based on its name
   */
  private classifyDependencyType(source: string): Dependency['type'] {
    if (source.includes('fs') || source.includes('path')) {
      return 'filesystem';
    }
    if (source.includes('http') || source.includes('axios') || source.includes('fetch')) {
      return 'api';
    }
    if (source.includes('pg') || source.includes('mysql') || source.includes('mongodb') || source.includes('sequelize')) {
      return 'database';
    }
    if (source.startsWith('.') || source.startsWith('/')) {
      return 'module';
    }
    return 'external';
  }

  /**
   * Checks if a call is a database operation
   */
  private isDatabaseCall(objectName: string): boolean {
    const dbPatterns = ['db', 'database', 'connection', 'query', 'model', 'repository'];
    return dbPatterns.some(pattern => objectName.toLowerCase().includes(pattern));
  }

  /**
   * Checks if a call is a network operation
   */
  private isNetworkCall(objectName: string): boolean {
    const networkPatterns = ['http', 'fetch', 'axios', 'request', 'api', 'client'];
    return networkPatterns.some(pattern => objectName.toLowerCase().includes(pattern));
  }

  /**
   * Checks if a call is a file system operation
   */
  private isFileSystemCall(objectName: string): boolean {
    const fsPatterns = ['fs', 'file', 'readfile', 'writefile'];
    return fsPatterns.some(pattern => objectName.toLowerCase().includes(pattern));
  }

  /**
   * Extracts the object name from a member expression
   */
  private getObjectName(node: any): string {
    if (node.type === 'Identifier') {
      return node.name;
    }
    if (node.type === 'MemberExpression') {
      return this.getObjectName(node.object);
    }
    return '';
  }

  /**
   * Extracts a readable condition from an AST node
   */
  private extractCondition(node: any): string {
    if (node.type === 'BinaryExpression') {
      return `${this.extractCondition(node.left)} ${node.operator} ${this.extractCondition(node.right)}`;
    }
    if (node.type === 'Identifier') {
      return node.name;
    }
    if (node.type === 'UnaryExpression') {
      return `${node.operator}${this.extractCondition(node.argument)}`;
    }
    return 'condition';
  }

  /**
   * Removes duplicate dependencies
   */
  private deduplicateDependencies(dependencies: Dependency[]): Dependency[] {
    const seen = new Set<string>();
    return dependencies.filter(dep => {
      if (seen.has(dep.source)) {
        return false;
      }
      seen.add(dep.source);
      return true;
    });
  }
}
