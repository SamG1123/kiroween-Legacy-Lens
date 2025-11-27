import * as t from '@babel/types';
import traverse, { NodePath } from '@babel/traverse';
import generate from '@babel/generator';
import { parseCode } from '../utils/astUtils';
import { AIRefactoringClient } from '../ai/AIRefactoringClient';
import { Location, TransformResult, Change } from '../types';
import { calculateSimilarity } from '../utils/codeMetrics';

/**
 * Transformer for removing code duplication
 * Implements Requirements 4.1, 4.2, 4.3, 4.4, 4.5
 */
export class DuplicationRemovalTransformer {
  private aiClient: AIRefactoringClient;

  constructor(aiClient?: AIRefactoringClient) {
    this.aiClient = aiClient || new AIRefactoringClient();
  }

  /**
   * Remove duplication by extracting to a shared method
   * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
   */
  async removeDuplication(
    code: string,
    instances: Location[],
    suggestedMethodName?: string
  ): Promise<TransformResult> {
    try {
      if (instances.length < 2) {
        return {
          success: false,
          transformedCode: code,
          changes: [],
          error: 'At least two duplicate instances are required',
        };
      }

      const ast = parseCode(code);
      
      // Requirement 4.1: Identify all instances of the duplicated code
      const duplicateBlocks = this.findDuplicateBlocks(ast, instances);
      if (duplicateBlocks.length === 0) {
        return {
          success: false,
          transformedCode: code,
          changes: [],
          error: 'Could not locate duplicate code blocks',
        };
      }

      // Requirement 4.2: Handle slight variations in the duplicated code
      const normalizedBlocks = this.normalizeVariations(duplicateBlocks);
      
      // Extract parameters from variations
      const parameters = this.extractParametersFromVariations(normalizedBlocks);
      
      // Identify return value
      const returnInfo = this.identifyReturnValue(normalizedBlocks[0].statements);
      
      // Suggest method name using AI
      const methodName = suggestedMethodName || 
        await this.suggestMethodName(normalizedBlocks[0].code);
      
      // Requirement 4.3: Extract to shared method
      const sharedMethod = this.createSharedMethod(
        methodName,
        parameters,
        returnInfo,
        normalizedBlocks[0].statements
      );
      
      // Requirement 4.4: Update all call sites to use the shared method
      const result = this.replaceAllInstances(
        ast,
        normalizedBlocks,
        sharedMethod,
        methodName,
        parameters,
        returnInfo
      );
      
      return result;
    } catch (error) {
      return {
        success: false,
        transformedCode: code,
        changes: [],
        error: error instanceof Error ? error.message : 'Unknown error during duplication removal',
      };
    }
  }

  /**
   * Find duplicate code blocks in the AST
   * Requirement 4.1: Identify all instances of the duplicated code
   */
  private findDuplicateBlocks(
    ast: t.File,
    instances: Location[]
  ): Array<{ statements: t.Statement[]; location: Location; path: NodePath; code: string }> {
    const blocks: Array<{ statements: t.Statement[]; location: Location; path: NodePath; code: string }> = [];

    for (const location of instances) {
      let found = false;

      traverse(ast, {
        BlockStatement(path) {
          if (found) return;
          
          const node = path.node;
          if (node.loc &&
              node.loc.start.line === location.startLine &&
              node.loc.end.line === location.endLine) {
            blocks.push({
              statements: node.body,
              location,
              path,
              code: generate(node).code,
            });
            found = true;
            path.stop();
          }
        },
        Statement(path) {
          if (found) return;
          
          if (path.node.loc &&
              path.node.loc.start.line >= location.startLine &&
              path.node.loc.end.line <= location.endLine) {
            const parent = path.parent;
            if (t.isBlockStatement(parent) || t.isProgram(parent)) {
              const statements = parent.body.filter((stmt: any) => {
                return stmt.loc &&
                       stmt.loc.start.line >= location.startLine &&
                       stmt.loc.end.line <= location.endLine;
              });
              
              if (statements.length > 0) {
                blocks.push({
                  statements: statements as t.Statement[],
                  location,
                  path,
                  code: statements.map((s: any) => generate(s).code).join('\n'),
                });
                found = true;
              }
            }
          }
        },
      });
    }

    return blocks;
  }

  /**
   * Normalize variations in duplicate code
   * Requirement 4.2: Handle slight variations in the duplicated code
   */
  private normalizeVariations(
    blocks: Array<{ statements: t.Statement[]; location: Location; path: NodePath; code: string }>
  ): Array<{ statements: t.Statement[]; location: Location; path: NodePath; code: string; variations: Map<string, string> }> {
    const normalized = blocks.map(block => ({
      ...block,
      variations: new Map<string, string>(),
    }));

    // Find variables that differ between blocks
    if (blocks.length < 2) return normalized;

    const firstBlock = blocks[0];
    const variableNames = this.extractVariableNames(firstBlock.statements);

    for (let i = 1; i < blocks.length; i++) {
      const currentBlock = blocks[i];
      const currentVars = this.extractVariableNames(currentBlock.statements);

      // Map variables from current block to first block
      variableNames.forEach((varName, index) => {
        if (currentVars[index] && currentVars[index] !== varName) {
          normalized[i].variations.set(currentVars[index], varName);
        }
      });
    }

    return normalized;
  }

  /**
   * Extract variable names from statements
   */
  private extractVariableNames(statements: t.Statement[]): string[] {
    const names: string[] = [];

    statements.forEach(stmt => {
      traverse(t.file(t.program([stmt])), {
        Identifier(path) {
          if (path.isReferencedIdentifier()) {
            names.push(path.node.name);
          }
        },
      }, undefined, {});
    });

    return names;
  }

  /**
   * Extract parameters from variations
   * Requirement 4.2: Handle slight variations in the duplicated code
   */
  private extractParametersFromVariations(
    blocks: Array<{ statements: t.Statement[]; variations: Map<string, string> }>
  ): Array<{ name: string; type?: string }> {
    const parameters: Array<{ name: string; type?: string }> = [];
    const paramSet = new Set<string>();

    // Collect all variables that vary between blocks
    blocks.forEach(block => {
      block.variations.forEach((canonicalName, variantName) => {
        if (!paramSet.has(canonicalName)) {
          paramSet.add(canonicalName);
          parameters.push({ name: canonicalName });
        }
      });
    });

    // Also identify variables used but not declared in the first block
    const firstBlock = blocks[0];
    const usedVariables = new Set<string>();
    const declaredVariables = new Set<string>();

    firstBlock.statements.forEach(stmt => {
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
      }, undefined, {});
    });

    usedVariables.forEach(varName => {
      if (!declaredVariables.has(varName) && 
          !this.isGlobalOrBuiltin(varName) &&
          !paramSet.has(varName)) {
        paramSet.add(varName);
        parameters.push({ name: varName });
      }
    });

    return parameters;
  }

  /**
   * Identify the return value of the extracted method
   * Requirement 4.3: Extract to shared method
   */
  private identifyReturnValue(
    statements: t.Statement[]
  ): { hasReturn: boolean; returnVar?: string; type?: string } {
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
      }, undefined, {});
    });

    if (hasExplicitReturn) {
      return { hasReturn: true, returnVar };
    }

    return { hasReturn: false };
  }

  /**
   * Suggest a method name using AI
   */
  private async suggestMethodName(code: string): Promise<string> {
    try {
      const name = await this.aiClient.suggestMethodName(code);
      return this.sanitizeMethodName(name);
    } catch (error) {
      return 'extractedMethod';
    }
  }

  /**
   * Sanitize method name to ensure it's a valid identifier
   */
  private sanitizeMethodName(name: string): string {
    let sanitized = name.replace(/[^a-zA-Z0-9_]/g, '');
    
    if (!/^[a-zA-Z_]/.test(sanitized)) {
      sanitized = '_' + sanitized;
    }
    
    return sanitized || 'extractedMethod';
  }

  /**
   * Create the shared method
   * Requirement 4.3: Extract to shared method
   */
  private createSharedMethod(
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
   * Replace all duplicate instances with calls to the shared method
   * Requirement 4.4: Update all call sites to use the shared method
   */
  private replaceAllInstances(
    ast: t.File,
    blocks: Array<{ statements: t.Statement[]; location: Location; path: NodePath; code: string; variations: Map<string, string> }>,
    sharedMethod: t.FunctionDeclaration,
    methodName: string,
    parameters: Array<{ name: string; type?: string }>,
    returnInfo: { hasReturn: boolean; returnVar?: string; type?: string }
  ): TransformResult {
    const changes: Change[] = [];

    try {
      // Replace each duplicate block with a method call
      blocks.forEach((block, index) => {
        // Determine the arguments for this call site
        const args = parameters.map(p => {
          // Check if this parameter has a variation in this block
          let argName = p.name;
          block.variations.forEach((canonical, variant) => {
            if (canonical === p.name) {
              argName = variant;
            }
          });
          return t.identifier(argName);
        });

        const methodCall = this.createMethodCall(methodName, args, returnInfo);

        // Replace the statements in the AST
        const parent = block.path.parent;
        if (t.isBlockStatement(parent) || t.isProgram(parent)) {
          const startIndex = parent.body.findIndex((stmt: any) =>
            block.statements.includes(stmt as t.Statement)
          );

          if (startIndex !== -1) {
            parent.body.splice(startIndex, block.statements.length, methodCall);

            changes.push({
              type: 'modify',
              location: block.location,
              oldCode: block.code,
              newCode: generate(methodCall).code,
            });
          }
        }
      });

      // Insert the shared method at the top level
      if (t.isProgram(ast.program)) {
        ast.program.body.push(sharedMethod);

        changes.push({
          type: 'add',
          location: {
            file: blocks[0].location.file,
            startLine: ast.program.body.length,
            endLine: ast.program.body.length,
            startColumn: 0,
            endColumn: 0,
          },
          oldCode: '',
          newCode: generate(sharedMethod).code,
        });
      }

      // Generate the transformed code
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
        error: error instanceof Error ? error.message : 'Transformation failed',
      };
    }
  }

  /**
   * Create a method call to replace the duplicate code
   */
  private createMethodCall(
    methodName: string,
    args: t.Identifier[],
    returnInfo: { hasReturn: boolean; returnVar?: string; type?: string }
  ): t.Statement {
    const callExpr = t.callExpression(t.identifier(methodName), args);

    if (returnInfo.hasReturn && returnInfo.returnVar) {
      return t.variableDeclaration('const', [
        t.variableDeclarator(t.identifier(returnInfo.returnVar), callExpr),
      ]);
    } else if (returnInfo.hasReturn) {
      return t.returnStatement(callExpr);
    } else {
      return t.expressionStatement(callExpr);
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
