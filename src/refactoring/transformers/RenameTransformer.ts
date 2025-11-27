import * as t from '@babel/types';
import traverse, { NodePath, Binding } from '@babel/traverse';
import generate from '@babel/generator';
import { parseCode } from '../utils/astUtils';
import { AIRefactoringClient } from '../ai/AIRefactoringClient';
import { Scope, TransformResult, Change, Location } from '../types';

/**
 * Transformer for renaming identifiers (variables, methods, classes)
 * Implements Requirements 6.1, 6.2, 6.3, 6.4, 6.5
 */
export class RenameTransformer {
  private aiClient: AIRefactoringClient;

  constructor(aiClient?: AIRefactoringClient) {
    this.aiClient = aiClient || new AIRefactoringClient();
  }

  /**
   * Rename an identifier across the codebase
   * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
   */
  async rename(
    code: string,
    oldName: string,
    newName: string | undefined,
    scope: Scope,
    location?: Location
  ): Promise<TransformResult> {
    try {
      const ast = parseCode(code);

      // Find the identifier to rename
      const identifierInfo = this.findIdentifier(ast, oldName, scope, location);
      if (!identifierInfo) {
        return {
          success: false,
          transformedCode: code,
          changes: [],
          error: `Could not locate identifier "${oldName}" in the specified scope`,
        };
      }

      // Requirement 6.1 & 6.2: Suggest descriptive name using AI
      const suggestedName = newName || await this.suggestDescriptiveName(
        oldName,
        identifierInfo.type,
        identifierInfo.context
      );

      // Requirement 6.5: Verify no naming conflicts
      const hasConflict = this.checkNamingConflict(ast, suggestedName, identifierInfo.scope);
      if (hasConflict) {
        return {
          success: false,
          transformedCode: code,
          changes: [],
          error: `Naming conflict: "${suggestedName}" already exists in the target scope`,
        };
      }

      // Requirement 6.3: Find all references across codebase
      const references = this.findAllReferences(ast, oldName, identifierInfo);

      // Requirement 6.4: Handle scope correctly and update all references
      const result = this.applyRename(
        ast,
        oldName,
        suggestedName,
        references,
        identifierInfo
      );

      return result;
    } catch (error) {
      return {
        success: false,
        transformedCode: code,
        changes: [],
        error: error instanceof Error ? error.message : 'Unknown error during rename',
      };
    }
  }

  /**
   * Find the identifier to rename in the AST
   * Requirement 6.4: Handle scope correctly
   */
  private findIdentifier(
    ast: t.File,
    name: string,
    scope: Scope,
    location?: Location
  ): {
    path: NodePath;
    binding: Binding | null;
    type: 'variable' | 'function' | 'class' | 'parameter';
    context: string;
    scope: NodePath;
  } | null {
    let result: {
      path: NodePath;
      binding: Binding | null;
      type: 'variable' | 'function' | 'class' | 'parameter';
      context: string;
      scope: NodePath;
    } | null = null;

    const self = this;
    let firstMatch: {
      path: NodePath;
      binding: Binding | null;
      type: 'variable' | 'function' | 'class' | 'parameter';
      context: string;
      scope: NodePath;
    } | null = null;

    traverse(ast, {
      // Handle class methods specially
      ClassMethod(path) {
        if (t.isIdentifier(path.node.key) && path.node.key.name === name) {
          // Check if this is in the right class scope
          const classParent = path.findParent(p => t.isClassDeclaration(p.node) || t.isClassExpression(p.node));
          if (classParent) {
            const className = t.isClassDeclaration(classParent.node) && classParent.node.id
              ? classParent.node.id.name
              : 'anonymous';
            
            if (scope.type === 'class' && scope.name === className) {
              const identifierType = 'function' as const;
              const context = self.extractContext(path);
              
              result = {
                path: path.get('key') as NodePath,
                binding: null,
                type: identifierType,
                context,
                scope: path,
              };
              
              path.stop();
              return;
            }
          }
        }
      },
      Identifier(path) {
        if (path.node.name === name) {
          // Skip if this is a class method key (handled above)
          if (t.isClassMethod(path.parent) && path.key === 'key') {
            return;
          }
          
          // Check if this matches the location if provided
          if (location) {
            if (!path.node.loc ||
                path.node.loc.start.line !== location.startLine) {
              return;
            }
          }

          // Check if this matches the scope
          const identifierScope = self.getIdentifierScope(path);
          const scopeMatches = self.matchesScope(identifierScope, scope);
          
          // If we have a location, we must match it exactly
          if (location && scopeMatches) {
            // Determine the type of identifier
            const identifierType = self.determineIdentifierType(path);
            
            // Get context for AI suggestion
            const context = self.extractContext(path);

            // Get the binding
            const binding = path.scope.getBinding(name) || null;

            result = {
              path,
              binding,
              type: identifierType,
              context,
              scope: path.scope.path,
            };
            
            path.stop();
            return;
          }
          
          // If no location specified, take the first match in the right scope
          if (!location && scopeMatches && !firstMatch) {
            const identifierType = self.determineIdentifierType(path);
            const context = self.extractContext(path);
            const binding = path.scope.getBinding(name) || null;

            firstMatch = {
              path,
              binding,
              type: identifierType,
              context,
              scope: path.scope.path,
            };
          }
        }
      },
    });

    return result || firstMatch;
  }

  /**
   * Get the scope of an identifier
   */
  private getIdentifierScope(path: NodePath): Scope {
    if (!t.isIdentifier(path.node)) {
      return { type: 'global', name: 'global' };
    }

    const binding = path.scope.getBinding(path.node.name);
    
    if (!binding) {
      return { type: 'global', name: 'global' };
    }

    // Check if it's a class member
    const classParent = path.findParent(p => t.isClassDeclaration(p.node) || t.isClassExpression(p.node));
    if (classParent) {
      const className = t.isClassDeclaration(classParent.node) && classParent.node.id
        ? classParent.node.id.name
        : 'anonymous';
      return { type: 'class', name: className };
    }

    // Check if it's a function parameter or local variable
    const functionParent = path.getFunctionParent();
    if (functionParent) {
      const functionName = this.getFunctionName(functionParent.node);
      return { type: 'local', name: functionName };
    }

    // Check if it's module-level
    const programParent = path.findParent(p => t.isProgram(p.node));
    if (programParent) {
      return { type: 'module', name: 'module' };
    }

    return { type: 'global', name: 'global' };
  }

  /**
   * Get the name of a function node
   */
  private getFunctionName(node: t.Node): string {
    if (t.isFunctionDeclaration(node) && node.id) {
      return node.id.name;
    }
    if (t.isArrowFunctionExpression(node) || t.isFunctionExpression(node)) {
      return 'anonymous';
    }
    if (t.isClassMethod(node) || t.isObjectMethod(node)) {
      if (t.isIdentifier(node.key)) {
        return node.key.name;
      }
    }
    return 'unknown';
  }

  /**
   * Check if an identifier scope matches the target scope
   */
  private matchesScope(identifierScope: Scope, targetScope: Scope): boolean {
    // If target scope is global, match any
    if (targetScope.type === 'global') {
      return true;
    }

    // Otherwise, must match type and name
    return identifierScope.type === targetScope.type &&
           identifierScope.name === targetScope.name;
  }

  /**
   * Determine the type of an identifier
   */
  private determineIdentifierType(path: NodePath): 'variable' | 'function' | 'class' | 'parameter' {
    const parent = path.parent;

    // Check if it's a function declaration
    if (t.isFunctionDeclaration(parent) && parent.id === path.node) {
      return 'function';
    }

    // Check if it's a class declaration
    if (t.isClassDeclaration(parent) && parent.id === path.node) {
      return 'class';
    }

    // Check if it's a parameter
    const functionParent = path.getFunctionParent();
    if (functionParent && t.isFunction(functionParent.node)) {
      const params = functionParent.node.params;
      for (const param of params) {
        if (t.isIdentifier(param) && param === path.node) {
          return 'parameter';
        }
      }
    }

    // Default to variable
    return 'variable';
  }

  /**
   * Extract context around an identifier for AI suggestion
   */
  private extractContext(path: NodePath): string {
    const parent = path.parent;
    
    // Get the parent statement or expression
    let contextNode: t.Node = parent;
    let currentPath = path.parentPath;
    
    while (currentPath && !t.isStatement(currentPath.node) && !t.isDeclaration(currentPath.node)) {
      contextNode = currentPath.node;
      currentPath = currentPath.parentPath;
    }

    if (currentPath) {
      contextNode = currentPath.node;
    }

    return generate(contextNode).code;
  }

  /**
   * Suggest a descriptive name using AI
   * Requirements 6.1, 6.2: Suggest descriptive names for variables and methods
   */
  private async suggestDescriptiveName(
    oldName: string,
    type: 'variable' | 'function' | 'class' | 'parameter',
    context: string
  ): Promise<string> {
    try {
      let suggestedName: string;

      if (type === 'function') {
        suggestedName = await this.aiClient.suggestMethodName(context);
      } else {
        suggestedName = await this.aiClient.suggestVariableName(oldName, context);
      }

      return this.sanitizeIdentifierName(suggestedName);
    } catch (error) {
      // Fallback to a descriptive name based on the old name
      return this.generateFallbackName(oldName, type);
    }
  }

  /**
   * Generate a fallback name if AI suggestion fails
   */
  private generateFallbackName(oldName: string, type: 'variable' | 'function' | 'class' | 'parameter'): string {
    // If the name is already descriptive (more than 3 characters), keep it
    if (oldName.length > 3) {
      return oldName;
    }

    // Otherwise, add a descriptive prefix
    const prefixes: Record<string, string> = {
      variable: 'descriptive',
      function: 'perform',
      class: 'Enhanced',
      parameter: 'input',
    };

    return prefixes[type] + oldName.charAt(0).toUpperCase() + oldName.slice(1);
  }

  /**
   * Sanitize identifier name to ensure it's valid
   */
  private sanitizeIdentifierName(name: string): string {
    // Remove any non-alphanumeric characters except underscores
    let sanitized = name.replace(/[^a-zA-Z0-9_]/g, '');
    
    // Ensure it starts with a letter or underscore
    if (!/^[a-zA-Z_]/.test(sanitized)) {
      sanitized = '_' + sanitized;
    }
    
    // If empty after sanitization, use default
    return sanitized || 'renamed';
  }

  /**
   * Check for naming conflicts in the target scope
   * Requirement 6.5: Verify no naming conflicts
   */
  private checkNamingConflict(
    ast: t.File,
    newName: string,
    targetScope: NodePath
  ): boolean {
    // Check if the new name already exists in the scope
    const binding = targetScope.scope.getBinding(newName);
    
    if (binding) {
      return true;
    }

    // Also check for built-in names
    if (this.isReservedOrBuiltin(newName)) {
      return true;
    }

    return false;
  }

  /**
   * Check if a name is reserved or built-in
   */
  private isReservedOrBuiltin(name: string): boolean {
    const reserved = new Set([
      // JavaScript keywords
      'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger',
      'default', 'delete', 'do', 'else', 'export', 'extends', 'finally',
      'for', 'function', 'if', 'import', 'in', 'instanceof', 'let', 'new',
      'return', 'super', 'switch', 'this', 'throw', 'try', 'typeof', 'var',
      'void', 'while', 'with', 'yield',
      // Built-in objects
      'console', 'process', 'require', 'module', 'exports',
      'Math', 'Date', 'Array', 'Object', 'String', 'Number',
      'Boolean', 'RegExp', 'Error', 'JSON', 'Promise',
      'undefined', 'null', 'true', 'false', 'NaN', 'Infinity',
    ]);

    return reserved.has(name);
  }

  /**
   * Find all references to an identifier
   * Requirement 6.3: Find all references across codebase
   */
  private findAllReferences(
    ast: t.File,
    name: string,
    identifierInfo: {
      path: NodePath;
      binding: Binding | null;
      type: 'variable' | 'function' | 'class' | 'parameter';
      context: string;
      scope: NodePath;
    }
  ): NodePath<t.Identifier>[] {
    const references: NodePath<t.Identifier>[] = [];

    // If we have a binding, use it to find all references
    if (identifierInfo.binding) {
      const binding = identifierInfo.binding;
      
      // Add the declaration identifier itself
      if (t.isIdentifier(binding.identifier)) {
        // Find the identifier node in the binding path
        const bindingPath = binding.path;
        if (bindingPath) {
          // For variable declarations, the identifier is in the id property
          if (t.isVariableDeclarator(bindingPath.node) && t.isIdentifier(bindingPath.node.id)) {
            const idPath = bindingPath.get('id');
            if (Array.isArray(idPath)) {
              idPath.forEach(p => {
                if (t.isIdentifier(p.node)) {
                  references.push(p as NodePath<t.Identifier>);
                }
              });
            } else if (t.isIdentifier(idPath.node)) {
              references.push(idPath as NodePath<t.Identifier>);
            }
          } else if (t.isFunctionDeclaration(bindingPath.node) && bindingPath.node.id) {
            const idPath = bindingPath.get('id');
            if (!Array.isArray(idPath) && t.isIdentifier(idPath.node)) {
              references.push(idPath as NodePath<t.Identifier>);
            }
          } else if (t.isClassDeclaration(bindingPath.node) && bindingPath.node.id) {
            const idPath = bindingPath.get('id');
            if (!Array.isArray(idPath) && t.isIdentifier(idPath.node)) {
              references.push(idPath as NodePath<t.Identifier>);
            }
          } else if (t.isIdentifier(bindingPath.node)) {
            // For parameters, the binding path itself is the identifier
            references.push(bindingPath as NodePath<t.Identifier>);
          }
        }
      }

      // Add all references
      binding.referencePaths.forEach(refPath => {
        if (t.isIdentifier(refPath.node)) {
          references.push(refPath as NodePath<t.Identifier>);
        }
      });
    } else {
      // If no binding, manually search for all occurrences in the scope
      // This is common for class methods
      const scopePath = identifierInfo.scope;
      const self = this;
      
      // For class methods, we need to find the class scope
      let classScope: NodePath | null = null;
      if (identifierInfo.type === 'function') {
        classScope = scopePath.findParent(p => t.isClassDeclaration(p.node) || t.isClassExpression(p.node));
      }
      
      traverse(ast, {
        // Find the method definition
        ClassMethod(path) {
          if (t.isIdentifier(path.node.key) && path.node.key.name === name) {
            if (classScope) {
              const methodClass = path.findParent(p => t.isClassDeclaration(p.node) || t.isClassExpression(p.node));
              if (methodClass === classScope) {
                const keyPath = path.get('key');
                if (!Array.isArray(keyPath) && t.isIdentifier(keyPath.node)) {
                  references.push(keyPath as NodePath<t.Identifier>);
                }
              }
            }
          }
        },
        // Find member expressions like this.methodName() or obj.methodName()
        MemberExpression(path) {
          if (t.isIdentifier(path.node.property) && path.node.property.name === name) {
            if (classScope) {
              // Check if this member expression is within the class
              const memberClass = path.findParent(p => t.isClassDeclaration(p.node) || t.isClassExpression(p.node));
              if (memberClass === classScope) {
                const propPath = path.get('property');
                if (!Array.isArray(propPath) && t.isIdentifier(propPath.node)) {
                  references.push(propPath as NodePath<t.Identifier>);
                }
              }
            }
          }
        },
        // Also handle regular identifiers in the scope
        Identifier(path) {
          if (path.node.name === name) {
            // Skip if this is part of a member expression (handled above)
            if (t.isMemberExpression(path.parent) && path.key === 'property') {
              return;
            }
            // Skip if this is a class method key (handled above)
            if (t.isClassMethod(path.parent) && path.key === 'key') {
              return;
            }
            
            // Check if this identifier is in the same scope
            if (self.isInSameScope(path, scopePath)) {
              references.push(path as NodePath<t.Identifier>);
            }
          }
        },
      });
    }

    return references;
  }

  /**
   * Check if a path is in the same scope as another path
   */
  private isInSameScope(path: NodePath, targetScope: NodePath): boolean {
    let currentScope: NodePath | null = path.scope.path;
    
    while (currentScope) {
      if (currentScope === targetScope) {
        return true;
      }
      currentScope = currentScope.parentPath;
    }

    return false;
  }

  /**
   * Apply the rename transformation
   * Requirement 6.3, 6.4: Update all references and handle scope correctly
   */
  private applyRename(
    ast: t.File,
    oldName: string,
    newName: string,
    references: NodePath<t.Identifier>[],
    identifierInfo: {
      path: NodePath;
      binding: Binding | null;
      type: 'variable' | 'function' | 'class' | 'parameter';
      context: string;
      scope: NodePath;
    }
  ): TransformResult {
    const changes: Change[] = [];

    try {
      // Rename all references
      references.forEach(refPath => {
        const oldCode = generate(refPath.node).code;
        refPath.node.name = newName;
        const newCode = generate(refPath.node).code;

        if (refPath.node.loc) {
          changes.push({
            type: 'modify',
            location: {
              file: 'unknown',
              startLine: refPath.node.loc.start.line,
              endLine: refPath.node.loc.end.line,
              startColumn: refPath.node.loc.start.column,
              endColumn: refPath.node.loc.end.column,
            },
            oldCode,
            newCode,
          });
        }
      });

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
        error: error instanceof Error ? error.message : 'Rename transformation failed',
      };
    }
  }
}
