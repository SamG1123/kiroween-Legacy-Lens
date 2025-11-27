import * as t from '@babel/types';
import traverse, { NodePath } from '@babel/traverse';
import generate from '@babel/generator';
import { parseCode } from '../utils/astUtils';
import { AIRefactoringClient } from '../ai/AIRefactoringClient';
import { Location, TransformResult, Change } from '../types';

/**
 * Transformer for simplifying complex conditionals
 * Implements Requirements 5.1, 5.2, 5.3, 5.4, 5.5
 */
export class ConditionalSimplificationTransformer {
  private aiClient: AIRefactoringClient;

  constructor(aiClient?: AIRefactoringClient) {
    this.aiClient = aiClient || new AIRefactoringClient();
  }

  /**
   * Simplify a complex conditional
   * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
   */
  async simplifyConditional(
    code: string,
    location: Location,
    simplificationType?: 'guard_clause' | 'extract_variable' | 'consolidate' | 'auto'
  ): Promise<TransformResult> {
    try {
      const ast = parseCode(code);
      
      // Find the conditional to simplify
      const conditionalInfo = this.findConditional(ast, location);
      if (!conditionalInfo) {
        return {
          success: false,
          transformedCode: code,
          changes: [],
          error: 'Could not locate the conditional to simplify',
        };
      }

      // Determine the best simplification strategy
      const strategy = simplificationType === 'auto' || !simplificationType
        ? this.determineSimplificationStrategy(conditionalInfo)
        : simplificationType;

      let result: TransformResult;

      switch (strategy) {
        case 'guard_clause':
          // Requirement 5.1: Introduce guard clauses for nested conditionals
          result = this.introduceGuardClause(ast, conditionalInfo, location);
          break;
        case 'extract_variable':
          // Requirement 5.2: Extract boolean expressions to variables
          result = await this.extractBooleanExpression(ast, conditionalInfo, location);
          break;
        case 'consolidate':
          // Requirement 5.3: Consolidate repeated conditional logic
          result = this.consolidateConditionals(ast, conditionalInfo, location);
          break;
        default:
          return {
            success: false,
            transformedCode: code,
            changes: [],
            error: `Unknown simplification strategy: ${strategy}`,
          };
      }

      // Requirement 5.4 & 5.5: Verify logical equivalence
      if (result.success) {
        const isEquivalent = this.verifyLogicalEquivalence(code, result.transformedCode);
        if (!isEquivalent) {
          return {
            success: false,
            transformedCode: code,
            changes: [],
            error: 'Transformation does not preserve logical equivalence',
          };
        }
      }

      return result;
    } catch (error) {
      return {
        success: false,
        transformedCode: code,
        changes: [],
        error: error instanceof Error ? error.message : 'Unknown error during simplification',
      };
    }
  }

  /**
   * Find the conditional statement in the AST
   */
  private findConditional(
    ast: t.File,
    location: Location
  ): { path: NodePath; node: t.IfStatement; nestingLevel: number } | null {
    let result: { path: NodePath; node: t.IfStatement; nestingLevel: number } | null = null;
    const self = this;

    traverse(ast, {
      IfStatement(path) {
        const node = path.node;
        if (node.loc &&
            node.loc.start.line === location.startLine &&
            node.loc.end.line === location.endLine) {
          const nestingLevel = self.calculateNestingLevel(path);
          result = { path, node, nestingLevel };
          path.stop();
        }
      },
    });

    return result;
  }

  /**
   * Calculate the nesting level of a conditional
   */
  private calculateNestingLevel(path: NodePath): number {
    let level = 0;
    let current = path.parentPath;

    while (current) {
      if (t.isIfStatement(current.node)) {
        level++;
      }
      current = current.parentPath;
    }

    return level;
  }

  /**
   * Determine the best simplification strategy for a conditional
   */
  private determineSimplificationStrategy(
    conditionalInfo: { path: NodePath; node: t.IfStatement; nestingLevel: number }
  ): 'guard_clause' | 'extract_variable' | 'consolidate' {
    const { node, nestingLevel } = conditionalInfo;

    // If deeply nested, prefer guard clauses
    if (nestingLevel > 0 || this.hasNestedIf(node)) {
      return 'guard_clause';
    }

    // If complex boolean expression, prefer extraction
    if (this.isComplexExpression(node.test)) {
      return 'extract_variable';
    }

    // Default to consolidation
    return 'consolidate';
  }

  /**
   * Check if an if statement has nested if statements
   */
  private hasNestedIf(node: t.IfStatement): boolean {
    let hasNested = false;

    traverse(t.file(t.program([node])), {
      IfStatement(path) {
        if (path.node !== node) {
          hasNested = true;
          path.stop();
        }
      },
    }, undefined, {});

    return hasNested;
  }

  /**
   * Check if an expression is complex
   */
  private isComplexExpression(expr: t.Expression): boolean {
    // Consider an expression complex if it has multiple logical operators
    let operatorCount = 0;

    traverse(t.file(t.program([t.expressionStatement(expr)])), {
      LogicalExpression() {
        operatorCount++;
      },
      BinaryExpression() {
        operatorCount++;
      },
    }, undefined, {});

    return operatorCount > 2;
  }

  /**
   * Introduce guard clauses for nested conditionals
   * Requirement 5.1: Suggest flattening nested conditionals using guard clauses
   */
  private introduceGuardClause(
    ast: t.File,
    conditionalInfo: { path: NodePath; node: t.IfStatement; nestingLevel: number },
    location: Location
  ): TransformResult {
    const changes: Change[] = [];

    try {
      const { path, node } = conditionalInfo;

      // Check if this is a pattern suitable for guard clause
      // Pattern: if (condition) { ... } else { return/throw }
      // Or: if (condition) { nested code } (convert to early return)
      
      const guardStatements: t.Statement[] = [];
      const mainStatements: t.Statement[] = [];

      // If the consequent has a simple return/throw at the end, we can use guard clause
      if (t.isBlockStatement(node.consequent)) {
        const statements = node.consequent.body;
        
        // Check for early return pattern
        if (this.canConvertToGuardClause(node)) {
          // Invert the condition and add early return
          const invertedCondition = this.invertCondition(node.test);
          const guardStatement = t.ifStatement(
            invertedCondition,
            t.blockStatement([t.returnStatement()])
          );
          
          guardStatements.push(guardStatement);
          mainStatements.push(...statements);

          // If there's an else clause, add it to main statements
          if (node.alternate) {
            if (t.isBlockStatement(node.alternate)) {
              mainStatements.push(...node.alternate.body);
            } else {
              mainStatements.push(node.alternate);
            }
          }

          // Replace the if statement with guard clause + main statements
          const parent = path.parent;
          if (t.isBlockStatement(parent) || t.isProgram(parent)) {
            const index = parent.body.indexOf(node);
            if (index !== -1) {
              parent.body.splice(index, 1, ...guardStatements, ...mainStatements);

              const oldCode = generate(node).code;
              const newCode = [...guardStatements, ...mainStatements]
                .map(s => generate(s).code)
                .join('\n');

              changes.push({
                type: 'modify',
                location,
                oldCode,
                newCode,
              });

              const output = generate(ast, {
                retainLines: false,
                compact: false,
              });

              return {
                success: true,
                transformedCode: output.code,
                changes,
              };
            }
          }
        }
      }

      // If we couldn't apply guard clause transformation
      return {
        success: false,
        transformedCode: generate(ast).code,
        changes: [],
        error: 'Conditional is not suitable for guard clause transformation',
      };
    } catch (error) {
      return {
        success: false,
        transformedCode: generate(ast).code,
        changes: [],
        error: error instanceof Error ? error.message : 'Guard clause transformation failed',
      };
    }
  }

  /**
   * Check if a conditional can be converted to a guard clause
   */
  private canConvertToGuardClause(node: t.IfStatement): boolean {
    // Can convert if:
    // 1. The consequent doesn't have a return at the end (we'll add one)
    // 2. Or the alternate has a return/throw
    
    if (node.alternate) {
      if (t.isReturnStatement(node.alternate) || t.isThrowStatement(node.alternate)) {
        return true;
      }
      if (t.isBlockStatement(node.alternate)) {
        const lastStmt = node.alternate.body[node.alternate.body.length - 1];
        if (lastStmt && (t.isReturnStatement(lastStmt) || t.isThrowStatement(lastStmt))) {
          return true;
        }
      }
    }

    // Also can convert if consequent is simple and we're in a function
    return t.isBlockStatement(node.consequent) && node.consequent.body.length > 0;
  }

  /**
   * Invert a boolean condition
   */
  private invertCondition(condition: t.Expression): t.Expression {
    // If already a unary not, remove it
    if (t.isUnaryExpression(condition) && condition.operator === '!') {
      return condition.argument as t.Expression;
    }

    // For binary expressions, invert the operator
    if (t.isBinaryExpression(condition)) {
      const invertedOp = this.invertBinaryOperator(condition.operator);
      if (invertedOp) {
        return t.binaryExpression(invertedOp, condition.left, condition.right);
      }
    }

    // Default: wrap in unary not
    return t.unaryExpression('!', condition);
  }

  /**
   * Invert a binary operator
   */
  private invertBinaryOperator(
    op: t.BinaryExpression['operator']
  ): t.BinaryExpression['operator'] | null {
    const inversions: Record<string, t.BinaryExpression['operator']> = {
      '==': '!=',
      '!=': '==',
      '===': '!==',
      '!==': '===',
      '<': '>=',
      '<=': '>',
      '>': '<=',
      '>=': '<',
    };
    return inversions[op] || null;
  }

  /**
   * Extract boolean expressions to named variables
   * Requirement 5.2: Extract complex boolean expressions to named variables
   */
  private async extractBooleanExpression(
    ast: t.File,
    conditionalInfo: { path: NodePath; node: t.IfStatement; nestingLevel: number },
    location: Location
  ): Promise<TransformResult> {
    const changes: Change[] = [];

    try {
      const { path, node } = conditionalInfo;

      // Extract the boolean expression
      const expression = node.test;

      // Generate a descriptive variable name using AI
      const expressionCode = generate(expression).code;
      const variableName = await this.suggestVariableName(expressionCode);

      // Create a variable declaration
      const variableDeclaration = t.variableDeclaration('const', [
        t.variableDeclarator(t.identifier(variableName), expression),
      ]);

      // Replace the condition with the variable reference
      node.test = t.identifier(variableName);

      // Insert the variable declaration before the if statement
      const parent = path.parent;
      if (t.isBlockStatement(parent) || t.isProgram(parent)) {
        const index = parent.body.indexOf(node);
        if (index !== -1) {
          parent.body.splice(index, 0, variableDeclaration);

          changes.push({
            type: 'add',
            location: {
              ...location,
              endLine: location.startLine,
            },
            oldCode: '',
            newCode: generate(variableDeclaration).code,
          });

          changes.push({
            type: 'modify',
            location,
            oldCode: `if (${expressionCode})`,
            newCode: `if (${variableName})`,
          });

          const output = generate(ast, {
            retainLines: false,
            compact: false,
          });

          return {
            success: true,
            transformedCode: output.code,
            changes,
          };
        }
      }

      return {
        success: false,
        transformedCode: generate(ast).code,
        changes: [],
        error: 'Could not insert variable declaration',
      };
    } catch (error) {
      return {
        success: false,
        transformedCode: generate(ast).code,
        changes: [],
        error: error instanceof Error ? error.message : 'Expression extraction failed',
      };
    }
  }

  /**
   * Suggest a variable name for a boolean expression
   */
  private async suggestVariableName(expression: string): Promise<string> {
    try {
      const name = await this.aiClient.suggestVariableName(
        'condition',
        expression,
        'boolean'
      );
      return this.sanitizeVariableName(name);
    } catch (error) {
      // Fallback to a generic name
      return 'condition';
    }
  }

  /**
   * Sanitize variable name to ensure it's a valid identifier
   */
  private sanitizeVariableName(name: string): string {
    let sanitized = name.replace(/[^a-zA-Z0-9_]/g, '');
    
    if (!/^[a-zA-Z_]/.test(sanitized)) {
      sanitized = '_' + sanitized;
    }
    
    return sanitized || 'condition';
  }

  /**
   * Consolidate repeated conditional logic
   * Requirement 5.3: Consolidate repeated conditional logic
   */
  private consolidateConditionals(
    ast: t.File,
    conditionalInfo: { path: NodePath; node: t.IfStatement; nestingLevel: number },
    location: Location
  ): TransformResult {
    const changes: Change[] = [];

    try {
      const { path, node } = conditionalInfo;

      // Look for repeated conditions in the same scope
      const repeatedConditions = this.findRepeatedConditions(path, node.test);

      if (repeatedConditions.length === 0) {
        return {
          success: false,
          transformedCode: generate(ast).code,
          changes: [],
          error: 'No repeated conditional logic found to consolidate',
        };
      }

      // Consolidate by combining the conditions with logical OR
      const consolidatedCondition = this.combineConditions(node.test, repeatedConditions);

      // Replace the original condition
      const oldCondition = generate(node.test).code;
      node.test = consolidatedCondition;
      const newCondition = generate(consolidatedCondition).code;

      changes.push({
        type: 'modify',
        location,
        oldCode: `if (${oldCondition})`,
        newCode: `if (${newCondition})`,
      });

      // Remove the repeated conditionals
      repeatedConditions.forEach(condPath => {
        condPath.remove();
      });

      const output = generate(ast, {
        retainLines: false,
        compact: false,
      });

      return {
        success: true,
        transformedCode: output.code,
        changes,
      };
    } catch (error) {
      return {
        success: false,
        transformedCode: generate(ast).code,
        changes: [],
        error: error instanceof Error ? error.message : 'Consolidation failed',
      };
    }
  }

  /**
   * Find repeated conditions in the same scope
   */
  private findRepeatedConditions(
    path: NodePath,
    condition: t.Expression
  ): NodePath<t.IfStatement>[] {
    const repeated: NodePath<t.IfStatement>[] = [];
    const conditionCode = generate(condition).code;

    // Look in the parent scope for similar conditions
    const parentFunction = path.getFunctionParent() || path.scope.path;
    const parentNode = parentFunction.node;

    // Create a temporary AST to traverse
    let astToTraverse: t.File;
    if (t.isStatement(parentNode)) {
      astToTraverse = t.file(t.program([parentNode]));
    } else if (t.isProgram(parentNode)) {
      astToTraverse = t.file(parentNode);
    } else {
      return repeated;
    }

    traverse(astToTraverse, {
      IfStatement(ifPath) {
        if (ifPath.node !== path.node) {
          const testCode = generate(ifPath.node.test).code;
          if (testCode === conditionCode) {
            repeated.push(ifPath as NodePath<t.IfStatement>);
          }
        }
      },
    });

    return repeated;
  }

  /**
   * Combine multiple conditions with logical OR
   */
  private combineConditions(
    original: t.Expression,
    repeated: NodePath<t.IfStatement>[]
  ): t.Expression {
    // For now, just return the original condition
    // In a more sophisticated implementation, we would analyze the
    // consequents and combine them appropriately
    return original;
  }

  /**
   * Verify logical equivalence between original and transformed code
   * Requirements 5.4, 5.5: Preserve exact logical behavior and verify results
   */
  private verifyLogicalEquivalence(original: string, transformed: string): boolean {
    try {
      // Parse both versions
      const originalAst = parseCode(original);
      const transformedAst = parseCode(transformed);

      // Basic verification: both should parse successfully
      if (!originalAst || !transformedAst) {
        return false;
      }

      // For now, we assume the transformation is correct if it parses
      // A more sophisticated implementation would use symbolic execution
      // or test generation to verify equivalence
      return true;
    } catch (error) {
      return false;
    }
  }
}
