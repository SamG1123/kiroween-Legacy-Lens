import { ParsedCode, FunctionInfo, ClassInfo, APIEndpoint, ImportInfo, Parameter } from '../types';
import * as babelParser from '@babel/parser';
import * as fs from 'fs/promises';
import Parser from 'tree-sitter';
const Python = require('tree-sitter-python');

export interface ICodeParser {
  parseFile(filePath: string, language: string): Promise<ParsedCode>;
  extractFunctions(code: ParsedCode): FunctionInfo[];
  extractClasses(code: ParsedCode): ClassInfo[];
  extractAPIs(code: ParsedCode): APIEndpoint[];
  extractImports(code: ParsedCode): ImportInfo[];
}

export class CodeParser implements ICodeParser {
  private pythonParser: Parser;

  constructor() {
    this.pythonParser = new Parser();
    this.pythonParser.setLanguage(Python);
  }

  async parseFile(filePath: string, language: string): Promise<ParsedCode> {
    const content = await fs.readFile(filePath, 'utf-8');
    
    let ast: any;
    
    if (language === 'javascript' || language === 'typescript') {
      ast = this.parseJavaScriptTypeScript(content, language);
    } else if (language === 'python') {
      ast = this.parsePython(content);
    } else {
      throw new Error(`Unsupported language: ${language}`);
    }

    return {
      ast,
      language,
      filePath
    };
  }

  private parseJavaScriptTypeScript(content: string, language: string): any {
    try {
      return babelParser.parse(content, {
        sourceType: 'module',
        plugins: [
          'typescript',
          'jsx',
          'decorators-legacy',
          'classProperties',
          'objectRestSpread',
          'asyncGenerators',
          'dynamicImport',
          'optionalChaining',
          'nullishCoalescingOperator'
        ]
      });
    } catch (error) {
      throw new Error(`Failed to parse ${language}: ${error}`);
    }
  }

  private parsePython(content: string): any {
    const tree = this.pythonParser.parse(content);
    return tree.rootNode;
  }

  extractFunctions(code: ParsedCode): FunctionInfo[] {
    if (code.language === 'javascript' || code.language === 'typescript') {
      return this.extractJavaScriptFunctions(code.ast);
    } else if (code.language === 'python') {
      return this.extractPythonFunctions(code.ast);
    }
    return [];
  }

  private extractJavaScriptFunctions(ast: any): FunctionInfo[] {
    const functions: FunctionInfo[] = [];

    const traverse = (node: any) => {
      if (!node) return;

      if (node.type === 'FunctionDeclaration' || 
          node.type === 'ArrowFunctionExpression' ||
          node.type === 'FunctionExpression') {
        
        const funcInfo: FunctionInfo = {
          name: node.id?.name || 'anonymous',
          parameters: this.extractJavaScriptParameters(node.params),
          returnType: node.returnType?.typeAnnotation?.type || null,
          body: '', // We'll store a simplified version
          lineNumber: node.loc?.start?.line || 0,
          docstring: this.extractJavaScriptDocstring(node)
        };
        
        functions.push(funcInfo);
      }

      // Traverse child nodes
      for (const key in node) {
        if (node[key] && typeof node[key] === 'object') {
          if (Array.isArray(node[key])) {
            node[key].forEach((child: any) => traverse(child));
          } else {
            traverse(node[key]);
          }
        }
      }
    };

    traverse(ast);
    return functions;
  }

  private extractJavaScriptParameters(params: any[]): Parameter[] {
    if (!params) return [];
    
    return params.map(param => {
      let name = '';
      let type: string | null = null;
      let optional = false;

      if (param.type === 'Identifier') {
        name = param.name;
        type = param.typeAnnotation?.typeAnnotation?.type || null;
        optional = param.optional || false;
      } else if (param.type === 'AssignmentPattern') {
        name = param.left.name;
        optional = true;
      } else if (param.type === 'RestElement') {
        name = `...${param.argument.name}`;
      }

      return { name, type, optional };
    });
  }

  private extractJavaScriptDocstring(node: any): string | undefined {
    if (node.leadingComments && node.leadingComments.length > 0) {
      const lastComment = node.leadingComments[node.leadingComments.length - 1];
      if (lastComment.type === 'CommentBlock' && lastComment.value.startsWith('*')) {
        return lastComment.value;
      }
    }
    return undefined;
  }

  private extractPythonFunctions(rootNode: any): FunctionInfo[] {
    const functions: FunctionInfo[] = [];

    const traverse = (node: any) => {
      if (!node) return;

      if (node.type === 'function_definition') {
        const nameNode = node.childForFieldName('name');
        const paramsNode = node.childForFieldName('parameters');
        const bodyNode = node.childForFieldName('body');
        
        const funcInfo: FunctionInfo = {
          name: nameNode?.text || 'unknown',
          parameters: this.extractPythonParameters(paramsNode),
          returnType: this.extractPythonReturnType(node),
          body: bodyNode?.text || '',
          lineNumber: node.startPosition.row + 1,
          docstring: this.extractPythonDocstring(bodyNode)
        };
        
        functions.push(funcInfo);
      }

      // Traverse children
      for (let i = 0; i < node.childCount; i++) {
        traverse(node.child(i));
      }
    };

    traverse(rootNode);
    return functions;
  }

  private extractPythonParameters(paramsNode: any): Parameter[] {
    if (!paramsNode) return [];
    
    const parameters: Parameter[] = [];
    
    for (let i = 0; i < paramsNode.childCount; i++) {
      const child = paramsNode.child(i);
      
      if (child.type === 'identifier') {
        parameters.push({
          name: child.text,
          type: null,
          optional: false
        });
      } else if (child.type === 'typed_parameter') {
        const nameNode = child.childForFieldName('name');
        const typeNode = child.childForFieldName('type');
        parameters.push({
          name: nameNode?.text || 'unknown',
          type: typeNode?.text || null,
          optional: false
        });
      } else if (child.type === 'default_parameter') {
        const nameNode = child.childForFieldName('name');
        parameters.push({
          name: nameNode?.text || 'unknown',
          type: null,
          optional: true
        });
      }
    }
    
    return parameters;
  }

  private extractPythonReturnType(node: any): string | null {
    const returnTypeNode = node.childForFieldName('return_type');
    return returnTypeNode?.text || null;
  }

  private extractPythonDocstring(bodyNode: any): string | undefined {
    if (!bodyNode || bodyNode.childCount === 0) return undefined;
    
    const firstChild = bodyNode.child(0);
    if (firstChild?.type === 'expression_statement') {
      const stringNode = firstChild.child(0);
      if (stringNode?.type === 'string') {
        return stringNode.text;
      }
    }
    
    return undefined;
  }

  extractClasses(code: ParsedCode): ClassInfo[] {
    if (code.language === 'javascript' || code.language === 'typescript') {
      return this.extractJavaScriptClasses(code.ast);
    } else if (code.language === 'python') {
      return this.extractPythonClasses(code.ast);
    }
    return [];
  }

  private extractJavaScriptClasses(ast: any): ClassInfo[] {
    const classes: ClassInfo[] = [];

    const traverse = (node: any) => {
      if (!node) return;

      if (node.type === 'ClassDeclaration') {
        const classInfo: ClassInfo = {
          name: node.id?.name || 'anonymous',
          methods: [],
          properties: [],
          extends: node.superClass?.name || null,
          implements: node.implements?.map((impl: any) => impl.id?.name || '') || []
        };

        // Extract methods and properties
        if (node.body?.body) {
          for (const member of node.body.body) {
            if (member.type === 'ClassMethod' || member.type === 'MethodDefinition') {
              const method: FunctionInfo = {
                name: member.key?.name || 'unknown',
                parameters: this.extractJavaScriptParameters(member.params || member.value?.params),
                returnType: member.returnType?.typeAnnotation?.type || null,
                body: '',
                lineNumber: member.loc?.start?.line || 0,
                docstring: this.extractJavaScriptDocstring(member)
              };
              classInfo.methods.push(method);
            } else if (member.type === 'ClassProperty' || member.type === 'PropertyDefinition') {
              classInfo.properties.push({
                name: member.key?.name || 'unknown',
                type: member.typeAnnotation?.typeAnnotation?.type || null,
                visibility: member.accessibility || 'public',
                static: member.static || false
              });
            }
          }
        }

        classes.push(classInfo);
      }

      // Traverse child nodes
      for (const key in node) {
        if (node[key] && typeof node[key] === 'object') {
          if (Array.isArray(node[key])) {
            node[key].forEach((child: any) => traverse(child));
          } else {
            traverse(node[key]);
          }
        }
      }
    };

    traverse(ast);
    return classes;
  }

  private extractPythonClasses(rootNode: any): ClassInfo[] {
    const classes: ClassInfo[] = [];

    const traverse = (node: any) => {
      if (!node) return;

      if (node.type === 'class_definition') {
        const nameNode = node.childForFieldName('name');
        const bodyNode = node.childForFieldName('body');
        const superclassesNode = node.childForFieldName('superclasses');
        
        const classInfo: ClassInfo = {
          name: nameNode?.text || 'unknown',
          methods: [],
          properties: [],
          extends: this.extractPythonSuperclass(superclassesNode),
          implements: []
        };

        // Extract methods from class body
        if (bodyNode) {
          for (let i = 0; i < bodyNode.childCount; i++) {
            const child = bodyNode.child(i);
            if (child.type === 'function_definition') {
              const methodNameNode = child.childForFieldName('name');
              const paramsNode = child.childForFieldName('parameters');
              const methodBodyNode = child.childForFieldName('body');
              
              classInfo.methods.push({
                name: methodNameNode?.text || 'unknown',
                parameters: this.extractPythonParameters(paramsNode),
                returnType: this.extractPythonReturnType(child),
                body: methodBodyNode?.text || '',
                lineNumber: child.startPosition.row + 1,
                docstring: this.extractPythonDocstring(methodBodyNode)
              });
            }
          }
        }

        classes.push(classInfo);
      }

      // Traverse children
      for (let i = 0; i < node.childCount; i++) {
        traverse(node.child(i));
      }
    };

    traverse(rootNode);
    return classes;
  }

  private extractPythonSuperclass(superclassesNode: any): string | null {
    if (!superclassesNode || superclassesNode.childCount === 0) return null;
    
    const firstSuperclass = superclassesNode.child(1); // Skip opening paren
    return firstSuperclass?.text || null;
  }

  extractAPIs(code: ParsedCode): APIEndpoint[] {
    if (code.language === 'javascript' || code.language === 'typescript') {
      return this.extractJavaScriptAPIs(code.ast);
    } else if (code.language === 'python') {
      return this.extractPythonAPIs(code.ast);
    }
    return [];
  }

  private extractJavaScriptAPIs(ast: any): APIEndpoint[] {
    const endpoints: APIEndpoint[] = [];

    const traverse = (node: any) => {
      if (!node) return;

      // Look for Express-style route definitions: app.get(), router.post(), etc.
      if (node.type === 'CallExpression') {
        const callee = node.callee;
        
        if (callee?.type === 'MemberExpression') {
          const method = callee.property?.name?.toUpperCase();
          const httpMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'];
          
          if (httpMethods.includes(method)) {
            const pathArg = node.arguments?.[0];
            const handlerArg = node.arguments?.[1] || node.arguments?.[2]; // Could be middleware in between
            
            if (pathArg?.type === 'StringLiteral' || pathArg?.type === 'Literal') {
              const endpoint: APIEndpoint = {
                method: method,
                path: pathArg.value,
                handler: handlerArg?.name || 'anonymous',
                parameters: this.extractRouteParameters(pathArg.value),
                responses: []
              };
              
              endpoints.push(endpoint);
            }
          }
        }
      }

      // Traverse child nodes
      for (const key in node) {
        if (node[key] && typeof node[key] === 'object') {
          if (Array.isArray(node[key])) {
            node[key].forEach((child: any) => traverse(child));
          } else {
            traverse(node[key]);
          }
        }
      }
    };

    traverse(ast);
    return endpoints;
  }

  private extractPythonAPIs(rootNode: any): APIEndpoint[] {
    const endpoints: APIEndpoint[] = [];

    const traverse = (node: any) => {
      if (!node) return;

      // Look for Flask/FastAPI-style decorators: @app.route(), @app.get(), etc.
      if (node.type === 'decorated_definition') {
        const decoratorList = node.childForFieldName('definition');
        
        for (let i = 0; i < node.childCount; i++) {
          const child = node.child(i);
          
          if (child.type === 'decorator') {
            const decoratorText = child.text;
            
            // Match patterns like @app.route('/path', methods=['GET'])
            const routeMatch = decoratorText.match(/@\w+\.(route|get|post|put|delete|patch)\(['"]([^'"]+)['"]/);
            
            if (routeMatch) {
              const method = routeMatch[1].toUpperCase() === 'ROUTE' ? 'GET' : routeMatch[1].toUpperCase();
              const path = routeMatch[2];
              
              const functionNode = node.childForFieldName('definition');
              const functionName = functionNode?.childForFieldName('name')?.text || 'anonymous';
              
              const endpoint: APIEndpoint = {
                method: method,
                path: path,
                handler: functionName,
                parameters: this.extractRouteParameters(path),
                responses: []
              };
              
              endpoints.push(endpoint);
            }
          }
        }
      }

      // Traverse children
      for (let i = 0; i < node.childCount; i++) {
        traverse(node.child(i));
      }
    };

    traverse(rootNode);
    return endpoints;
  }

  private extractRouteParameters(path: string): Parameter[] {
    const parameters: Parameter[] = [];
    
    // Match Express-style parameters: :paramName
    const expressParams = path.match(/:(\w+)/g);
    if (expressParams) {
      expressParams.forEach(param => {
        parameters.push({
          name: param.substring(1),
          type: 'string',
          optional: false
        });
      });
    }
    
    // Match Flask-style parameters: <paramName> or <type:paramName>
    const flaskParams = path.match(/<(?:(\w+):)?(\w+)>/g);
    if (flaskParams) {
      flaskParams.forEach(param => {
        const match = param.match(/<(?:(\w+):)?(\w+)>/);
        if (match) {
          parameters.push({
            name: match[2],
            type: match[1] || 'string',
            optional: false
          });
        }
      });
    }
    
    return parameters;
  }

  extractImports(code: ParsedCode): ImportInfo[] {
    if (code.language === 'javascript' || code.language === 'typescript') {
      return this.extractJavaScriptImports(code.ast);
    } else if (code.language === 'python') {
      return this.extractPythonImports(code.ast);
    }
    return [];
  }

  private extractJavaScriptImports(ast: any): ImportInfo[] {
    const imports: ImportInfo[] = [];

    const traverse = (node: any) => {
      if (!node) return;

      if (node.type === 'ImportDeclaration') {
        const source = node.source?.value;
        const importedNames: string[] = [];
        let isDefault = false;

        if (node.specifiers) {
          for (const specifier of node.specifiers) {
            if (specifier.type === 'ImportDefaultSpecifier') {
              importedNames.push(specifier.local?.name || 'default');
              isDefault = true;
            } else if (specifier.type === 'ImportSpecifier') {
              importedNames.push(specifier.imported?.name || specifier.local?.name || '');
            } else if (specifier.type === 'ImportNamespaceSpecifier') {
              importedNames.push(`* as ${specifier.local?.name || ''}`);
            }
          }
        }

        if (source) {
          imports.push({
            source,
            imports: importedNames,
            isDefault
          });
        }
      }

      // Traverse child nodes
      for (const key in node) {
        if (node[key] && typeof node[key] === 'object') {
          if (Array.isArray(node[key])) {
            node[key].forEach((child: any) => traverse(child));
          } else {
            traverse(node[key]);
          }
        }
      }
    };

    traverse(ast);
    return imports;
  }

  private extractPythonImports(rootNode: any): ImportInfo[] {
    const imports: ImportInfo[] = [];

    const traverse = (node: any) => {
      if (!node) return;

      if (node.type === 'import_statement' || node.type === 'import_from_statement') {
        if (node.type === 'import_statement') {
          // import module
          const nameNode = node.childForFieldName('name');
          if (nameNode) {
            imports.push({
              source: nameNode.text,
              imports: [nameNode.text],
              isDefault: true
            });
          }
        } else if (node.type === 'import_from_statement') {
          // from module import name1, name2
          const moduleNode = node.childForFieldName('module_name');
          const importedNames: string[] = [];
          
          for (let i = 0; i < node.childCount; i++) {
            const child = node.child(i);
            if (child.type === 'dotted_name' && child !== moduleNode) {
              importedNames.push(child.text);
            } else if (child.type === 'aliased_import') {
              const nameNode = child.childForFieldName('name');
              if (nameNode) {
                importedNames.push(nameNode.text);
              }
            }
          }
          
          if (moduleNode) {
            imports.push({
              source: moduleNode.text,
              imports: importedNames,
              isDefault: false
            });
          }
        }
      }

      // Traverse children
      for (let i = 0; i < node.childCount; i++) {
        traverse(node.child(i));
      }
    };

    traverse(rootNode);
    return imports;
  }
}
