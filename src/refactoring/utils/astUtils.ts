import { parse } from '@babel/parser';
import * as t from '@babel/types';
import traverse from '@babel/traverse';

/**
 * Parse JavaScript/TypeScript code into an AST
 */
export function parseCode(code: string, isTypeScript = true): t.File {
  return parse(code, {
    sourceType: 'module',
    plugins: isTypeScript 
      ? ['typescript', 'jsx', 'decorators-legacy']
      : ['jsx', 'decorators-legacy'],
  });
}

/**
 * Find all function/method declarations in code
 */
export function findFunctions(ast: t.File): t.Function[] {
  const functions: t.Function[] = [];
  
  traverse(ast, {
    FunctionDeclaration(path) {
      functions.push(path.node);
    },
    FunctionExpression(path) {
      functions.push(path.node);
    },
    ArrowFunctionExpression(path) {
      functions.push(path.node);
    },
    ClassMethod(path) {
      functions.push(path.node);
    },
  });
  
  return functions;
}

/**
 * Calculate the number of lines in a function
 */
export function getFunctionLineCount(func: t.Function): number {
  if (!func.loc) return 0;
  return func.loc.end.line - func.loc.start.line + 1;
}

/**
 * Get the name of a function
 */
export function getFunctionName(func: t.Function): string {
  if ('id' in func && func.id && t.isIdentifier(func.id)) {
    return func.id.name;
  }
  if ('key' in func && t.isIdentifier(func.key)) {
    return func.key.name;
  }
  return '<anonymous>';
}

/**
 * Calculate cyclomatic complexity of a function
 */
export function calculateComplexity(func: t.Function): number {
  let complexity = 1; // Base complexity
  
  traverse(t.file(t.program([t.expressionStatement(t.functionExpression(null, [], func.body as t.BlockStatement))])), {
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
      if (path.node.test) complexity++; // Don't count default case
    },
    LogicalExpression(path) {
      if (path.node.operator === '&&' || path.node.operator === '||') {
        complexity++;
      }
    },
  }, undefined, {});
  
  return complexity;
}

/**
 * Find all variable references in a code block
 */
export function findVariableReferences(ast: t.File, variableName: string): t.Identifier[] {
  const references: t.Identifier[] = [];
  
  traverse(ast, {
    Identifier(path) {
      if (path.node.name === variableName && path.isReferencedIdentifier()) {
        references.push(path.node);
      }
    },
  });
  
  return references;
}

/**
 * Calculate nesting level of conditionals
 */
export function calculateNestingLevel(func: t.Function): number {
  let maxNesting = 0;
  let currentNesting = 0;
  
  traverse(t.file(t.program([t.expressionStatement(t.functionExpression(null, [], func.body as t.BlockStatement))])), {
    IfStatement: {
      enter() {
        currentNesting++;
        maxNesting = Math.max(maxNesting, currentNesting);
      },
      exit() {
        currentNesting--;
      },
    },
    ForStatement: {
      enter() {
        currentNesting++;
        maxNesting = Math.max(maxNesting, currentNesting);
      },
      exit() {
        currentNesting--;
      },
    },
    WhileStatement: {
      enter() {
        currentNesting++;
        maxNesting = Math.max(maxNesting, currentNesting);
      },
      exit() {
        currentNesting--;
      },
    },
  }, undefined, {});
  
  return maxNesting;
}
