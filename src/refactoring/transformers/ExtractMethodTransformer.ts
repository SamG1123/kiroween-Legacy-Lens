import * as t from '@babel/types';
import traverse, { NodePath } from '@babel/traverse';
import generate from '@babel/generator';
import { parseCode } from '../utils/astUtils';
import { AIRefactoringClient } from '../ai/AIRefactoringClient';
import { CodeBlock, TransformResult, Change, Location } from '../types';

/**
 * Transformer for extracting methods from code blocks
 * Implements Requirements 3.1, 3.2, 3.3, 3.4, 3.5
 */
export class ExtractMethodTransformer {
  private aiClient: AIRefactoringClient;

  constructor(aiClient?: AIRefactoringClient) {
    this.aiClient = aiClient || new AIRefactoringClient();
  }

  /**
   * Extract a code block into a new method
   * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
   */
  async extractMethod(
    code: string,
    block: CodeBlock,
    suggestedName?: string
  ): Promise<TransformResult> {
    try {
      const ast = parseCode(code);
      
      // Find the code block to extract
      const blockInfo = this.findBlockToExtract(ast, block);
      if (!blockInfo) {
        return {
          success: false,
          transformedCode: code,
          changes: [],
          error: 'Could not locate the code block to extract',
        };
      }

      // Identify parameters from variable usage (Requirement 3.2)
      const parameters = this.identifyParameters(blockInfo.statements, blockInfo.scope);
      
      // Identify return value (Requirement 3.3)
      const returnInfo = this.identifyReturnValue(blockInfo.statements, blockInfo.scope);
      
      // Suggest method name using AI (Requirement 3.4)
      const methodName = suggestedName || await this.suggestMethodName(block.code);
      
      // Create the new method
      const newMethod = this.createExtractedMethod(
        methodName,
        parameters,
        returnInfo,
        blockInfo.statements
      );
      
      // Replace the original block with a method call (Requirement 3.5)
      const methodCall = this.createMethodCall(methodName, parameters, returnInfo);
      
      // Apply the transformation
      const result = this.applyTransformation(
        ast,
        blockInfo,
        newMethod,
        methodCall,
        block.location
      );
      
      return result;
    } catch (error) {
      return {
        success: false,
        transformedCode: code,
        changes: [],
        error: error instanceof Error ? error.message : 'Unknown error during extraction',
      };
    }
  }

  /**
   * Find the code block to extract in the AST
   */
  private findBlockToExtract(
    ast: t.File,
    block: CodeBlock
  ): { statements: t.Statement[]; scope: NodePath; path: NodePath } | null {
    let result: { statements: t.Statement[]; scope: NodePath; path: NodePath } | null = null;

    traverse(ast, {
      BlockStatement(path) {
        const node = path.node;
        if (node.loc &&
            node.loc.start.line === block.location.startLine &&
            node.loc.end.line === block.location.endLine) {
          result = {
            statements: node.body,
            scope: path.scope.path,
            path: path,
          };
          path.stop();
        }
      },
      // Also check for statement sequences that match
      Statement(path) {
        if (!result && path.node.loc &&
            path.node.loc.start.line >= block.location.startLine &&
            path.node.loc.end.line <= block.location.endLine) {
          // Collect consecutive statements in the range
          const parent = path.parent;
          if (t.isBlockStatement(parent) || t.isProgram(parent)) {
            const statements = parent.body.filter((stmt: any) => {
              return stmt.loc &&
                     stmt.loc.start.line >= block.location.startLine &&
                     stmt.loc.end.line <= block.location.endLine;
            });
            if (statements.length > 0) {
              result = {
                statements: statements as t.Statement[],
                scope: path.scope.path,
                path: path,
              };
            }
          }
        }
      },
    });

    return result;
  }

  /**
   * Identify parameters needed for the extracted method
   * Requirement 3.2: Identify the correct parameters to pass
   */
  private identifyParameters(
    statements: t.Statement[],
    scopePath: NodePath
  ): Array<{ name: string; type?: string }> {
    const usedVariables = new Set<string>();
    const declaredVariables = new Set<string>();
    const parameters: Array<{ name: string; type?: string }> = [];

    // Find all variable references in the statements
    statements.forEach(stmt => {
      traverse(t.file(t.program([stmt])), {
        Identifier(path) {
          if (path.isReferencedIdentifier()) {
            usedVariables.add(path.node.name);
          }
        },
        VariableDeclarator(path) {
          if (t.isIdentifier(path.node.id)) {
            declaredVariables.add(path.node.id.name);
          }
        },
      }, scopePath.scope);
    });

    // Parameters are variables used but not declared in the block
    usedVariables.forEach(varName => {
      if (!declaredVariables.has(varName)) {
        // Check if it's defined in outer scope
        const binding = scopePath.scope.getBinding(varName);
        if (binding && !this.isGlobalOrBuiltin(varName)) {
          parameters.push({ name: varName });
        }
      }
    });

    return parameters;
  }

  /**
   * Identify the return value of the extracted method
   * Requirement 3.3: Identify the correct return value
   */
  private identifyReturnValue(
    statements: t.Statement[],
    scopePath: NodePath
  ): { hasReturn: boolean; returnVar?: string; type?: string } {
    // Check if there's an explicit return statement
    let hasExplicitReturn = false;
    let returnVar: string | undefined;

    statements.forEach(stmt => {
      traverse(t.file(t.program([stmt])), {
        ReturnStatement(path) {
          hasExplicitReturn = true;
          if (t.isIdentifier(path.node.argument)) {
            returnVar = path.node.argument.name;
          }
          path.stop();
        },
      }, scopePath.scope);
    });

    if (hasExplicitReturn) {
      return { hasReturn: true, returnVar };
    }

    // Check for variables declared in the block that are used after
    // For now, we'll assume no return if no explicit return statement
    return { hasReturn: false };
  }

  /**
   * Suggest a method name using AI
   * Requirement 3.4: Suggest a descriptive name for the new method
   */
  private async suggestMethodName(code: string): Promise<string> {
    try {
      const name = await this.aiClient.suggestMethodName(code);
      // Sanitize the name to ensure it's a valid identifier
      return this.sanitizeMethodName(name);
    } catch (error) {
      // Fallback to a generic name if AI fails
      return 'extractedMethod';
    }
  }

  /**
   * Sanitize method name to ensure it's a valid identifier
   */
  private sanitizeMethodName(name: string): string {
    // Remove any non-alphanumeric characters except underscores
    let sanitized = name.replace(/[^a-zA-Z0-9_]/g, '');
    
    // Ensure it starts with a letter or underscore
    if (!/^[a-zA-Z_]/.test(sanitized)) {
      sanitized = '_' + sanitized;
    }
    
    // If empty after sanitization, use default
    return sanitized || 'extractedMethod';
  }

  /**
   * Create the extracted method AST node
   */
  private createExtractedMethod(
    methodName: string,
    parameters: Array<{ name: string; type?: string }>,
    returnInfo: { hasReturn: boolean; returnVar?: string; type?: string },
    statements: t.Statement[]
  ): t.FunctionDeclaration {
    const params = parameters.map(p => t.identifier(p.name));
    
    const body = t.blockStatement([...statements]);
    
    return t.functionDeclaration(
      t.identifier(methodName),
      params,
      body
    );
  }

  /**
   * Create a method call to replace the extracted block
   * Requirement 3.5: Replace call site
   */
  private createMethodCall(
    methodName: string,
    parameters: Array<{ name: string; type?: string }>,
    returnInfo: { hasReturn: boolean; returnVar?: string; type?: string }
  ): t.Statement {
    const args = parameters.map(p => t.identifier(p.name));
    const callExpr = t.callExpression(t.identifier(methodName), args);
    
    if (returnInfo.hasReturn && returnInfo.returnVar) {
      // const result = extractedMethod(params);
      return t.variableDeclaration('const', [
        t.variableDeclarator(t.identifier(returnInfo.returnVar), callExpr),
      ]);
    } else if (returnInfo.hasReturn) {
      // return extractedMethod(params);
      return t.returnStatement(callExpr);
    } else {
      // extractedMethod(params);
      return t.expressionStatement(callExpr);
    }
  }

  /**
   * Apply the transformation to the AST
   */
  private applyTransformation(
    ast: t.File,
    blockInfo: { statements: t.Statement[]; scope: NodePath; path: NodePath },
    newMethod: t.FunctionDeclaration,
    methodCall: t.Statement,
    location: Location
  ): TransformResult {
    const changes: Change[] = [];
    let transformedCode = '';

    try {
      // Find the parent function or program to insert the new method
      let insertionPoint: NodePath | null = null;
      let parentPath = blockInfo.path.parentPath;
      
      while (parentPath) {
        if (t.isProgram(parentPath.node) || 
            t.isFunctionDeclaration(parentPath.node) ||
            t.isClassMethod(parentPath.node)) {
          insertionPoint = parentPath;
          break;
        }
        parentPath = parentPath.parentPath;
      }

      if (!insertionPoint) {
        throw new Error('Could not find insertion point for extracted method');
      }

      // Replace the original statements with the method call
      const parent = blockInfo.path.parent;
      if (t.isBlockStatement(parent) || t.isProgram(parent)) {
        const startIndex = parent.body.findIndex(stmt => 
          blockInfo.statements.includes(stmt as t.Statement)
        );
        
        if (startIndex !== -1) {
          // Remove the extracted statements and insert the call
          parent.body.splice(startIndex, blockInfo.statements.length, methodCall);
          
          // Insert the new method at the appropriate location
          if (t.isProgram(insertionPoint.node)) {
            insertionPoint.node.body.push(newMethod);
          } else if (t.isFunctionDeclaration(insertionPoint.node)) {
            // Insert after the current function
            const programPath = insertionPoint.parentPath;
            if (programPath && t.isProgram(programPath.node)) {
              const funcIndex = programPath.node.body.indexOf(insertionPoint.node);
              programPath.node.body.splice(funcIndex + 1, 0, newMethod);
            }
          }
        }
      }

      // Generate the transformed code
      const output = generate(ast, {
        retainLines: false,
        compact: false,
      });
      
      transformedCode = output.code;

      // Record changes
      changes.push({
        type: 'modify',
        location: location,
        oldCode: blockInfo.statements.map(s => generate(s).code).join('\n'),
        newCode: generate(methodCall).code,
      });

      changes.push({
        type: 'add',
        location: {
          ...location,
          startLine: location.endLine + 1,
          endLine: location.endLine + 1,
        },
        oldCode: '',
        newCode: generate(newMethod).code,
      });

      return {
        success: true,
        transformedCode,
        changes,
      };
    } catch (error) {
      return {
        success: false,
        transformedCode: generate(ast).code,
        changes: [],
        error: error instanceof Error ? error.message : 'Transformation failed',
      };
    }
  }

  /**
   * Check if a variable name is a global or built-in
   */
  private isGlobalOrBuiltin(name: string): boolean {
    const builtins = new Set([
      'console', 'process', 'require', 'module', 'exports',
      'Math', 'Date', 'Array', 'Object', 'String', 'Number',
      'Boolean', 'RegExp', 'Error', 'JSON', 'Promise',
      'undefined', 'null', 'true', 'false', 'NaN', 'Infinity',
    ]);
    return builtins.has(name);
  }
}
