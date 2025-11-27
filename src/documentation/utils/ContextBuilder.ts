import {
  ProjectContext,
  FileContext,
  FunctionContext,
  FunctionInfo,
  DirectoryTree,
  CodeMetrics,
  Dependency,
  ImportInfo,
  ExportInfo,
  ParsedCode
} from '../types';
import { AnalysisReport } from '../../types';
import { CodeParser } from '../parsers/CodeParser';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface IContextBuilder {
  buildProjectContext(analysisReport: AnalysisReport, codebasePath: string): Promise<ProjectContext>;
  buildFileContext(filePath: string, projectContext: ProjectContext): Promise<FileContext>;
  buildFunctionContext(func: FunctionInfo, fileContext: FileContext): Promise<FunctionContext>;
}

/**
 * ContextBuilder
 * Responsibility: Build rich context from analysis results and code structure
 */
export class ContextBuilder implements IContextBuilder {
  private codeParser: CodeParser;

  constructor() {
    this.codeParser = new CodeParser();
  }

  /**
   * Build project-level context from analysis report
   * Validates: Requirements 5.1, 5.2
   */
  async buildProjectContext(analysisReport: AnalysisReport, codebasePath: string): Promise<ProjectContext> {
    // Extract languages from analysis report
    const languages = analysisReport.languages.languages.map(lang => lang.name);

    // Extract frameworks
    const frameworks = analysisReport.frameworks.map(fw => fw.name);

    // Convert dependencies to documentation format
    const dependencies: Dependency[] = analysisReport.dependencies.map(dep => ({
      name: dep.name,
      version: dep.version,
      type: dep.type === 'runtime' ? 'production' : 'development'
    }));

    // Convert metrics to documentation format
    const metrics: CodeMetrics = {
      totalLines: analysisReport.metrics.totalLines,
      codeLines: analysisReport.metrics.codeLines,
      commentLines: analysisReport.metrics.commentLines,
      complexity: analysisReport.metrics.averageComplexity,
      maintainabilityIndex: analysisReport.metrics.maintainabilityIndex
    };

    // Build directory structure
    const structure = await this.buildDirectoryTree(codebasePath);

    // Identify main entry points
    const mainEntryPoints = await this.identifyEntryPoints(codebasePath);

    // Extract project name from path or package.json
    const name = await this.extractProjectName(codebasePath);

    return {
      name,
      languages,
      frameworks,
      dependencies,
      structure,
      metrics,
      mainEntryPoints
    };
  }

  /**
   * Build file-level context with imports and exports
   * Validates: Requirements 5.1, 5.2
   */
  async buildFileContext(filePath: string, projectContext: ProjectContext): Promise<FileContext> {
    // Determine language from file extension
    const language = this.detectLanguageFromExtension(filePath);

    // Parse the file
    const parsedCode = await this.codeParser.parseFile(filePath, language);

    // Extract imports
    const imports = this.codeParser.extractImports(parsedCode);

    // Extract exports
    const exports = await this.extractExports(parsedCode);

    // Infer file purpose from its location and content
    const purpose = this.inferFilePurpose(filePath, parsedCode, projectContext);

    // Find related files based on imports
    const relatedFiles = this.findRelatedFiles(imports, filePath);

    return {
      filePath,
      purpose,
      imports,
      exports,
      relatedFiles
    };
  }

  /**
   * Build function-level context with call graph information
   * Validates: Requirements 5.1, 5.2
   */
  async buildFunctionContext(func: FunctionInfo, fileContext: FileContext): Promise<FunctionContext> {
    // Extract function calls from the function body
    const callees = this.extractFunctionCalls(func.body);

    // Find callers by searching through the file
    // Note: This is a simplified implementation. A full implementation would
    // require analyzing the entire codebase or using a call graph library
    const callers: string[] = [];

    // Extract used variables from function body
    const usedVariables = this.extractUsedVariables(func.body);

    // Detect potential side effects
    const sideEffects = this.detectSideEffects(func.body);

    return {
      function: func,
      callers,
      callees,
      usedVariables,
      sideEffects
    };
  }

  /**
   * Build directory tree structure recursively
   */
  private async buildDirectoryTree(dirPath: string, maxDepth: number = 3, currentDepth: number = 0): Promise<DirectoryTree> {
    const stats = await fs.stat(dirPath);
    const name = path.basename(dirPath);

    if (stats.isFile()) {
      return {
        name,
        type: 'file',
        path: dirPath
      };
    }

    const tree: DirectoryTree = {
      name,
      type: 'directory',
      path: dirPath,
      children: []
    };

    // Don't recurse too deep or into node_modules, .git, etc.
    if (currentDepth >= maxDepth || this.shouldSkipDirectory(name)) {
      return tree;
    }

    try {
      const entries = await fs.readdir(dirPath);
      
      for (const entry of entries) {
        const entryPath = path.join(dirPath, entry);
        try {
          const childTree = await this.buildDirectoryTree(entryPath, maxDepth, currentDepth + 1);
          tree.children!.push(childTree);
        } catch (error) {
          // Skip files/directories we can't access
          continue;
        }
      }
    } catch (error) {
      // If we can't read the directory, return it without children
    }

    return tree;
  }

  /**
   * Check if a directory should be skipped
   */
  private shouldSkipDirectory(name: string): boolean {
    const skipDirs = [
      'node_modules',
      '.git',
      '.svn',
      'dist',
      'build',
      'coverage',
      '.next',
      '.nuxt',
      '__pycache__',
      'venv',
      'env',
      '.venv'
    ];
    return skipDirs.includes(name);
  }

  /**
   * Identify main entry points in the codebase
   */
  private async identifyEntryPoints(codebasePath: string): Promise<string[]> {
    const entryPoints: string[] = [];

    // Common entry point files
    const commonEntryPoints = [
      'index.js',
      'index.ts',
      'main.js',
      'main.ts',
      'app.js',
      'app.ts',
      'server.js',
      'server.ts',
      'index.py',
      'main.py',
      'app.py',
      '__init__.py'
    ];

    // Check for package.json main field
    try {
      const packageJsonPath = path.join(codebasePath, 'package.json');
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
      
      if (packageJson.main) {
        entryPoints.push(packageJson.main);
      }
      
      if (packageJson.bin) {
        if (typeof packageJson.bin === 'string') {
          entryPoints.push(packageJson.bin);
        } else {
          entryPoints.push(...Object.values(packageJson.bin).filter((v): v is string => typeof v === 'string'));
        }
      }
    } catch (error) {
      // No package.json or can't read it
    }

    // Look for common entry point files
    for (const entryFile of commonEntryPoints) {
      const entryPath = path.join(codebasePath, entryFile);
      try {
        await fs.access(entryPath);
        entryPoints.push(entryFile);
      } catch (error) {
        // File doesn't exist
      }
    }

    // Check src directory
    try {
      const srcPath = path.join(codebasePath, 'src');
      await fs.access(srcPath);
      
      for (const entryFile of commonEntryPoints) {
        const entryPath = path.join(srcPath, entryFile);
        try {
          await fs.access(entryPath);
          entryPoints.push(path.join('src', entryFile));
        } catch (error) {
          // File doesn't exist
        }
      }
    } catch (error) {
      // No src directory
    }

    return [...new Set(entryPoints)]; // Remove duplicates
  }

  /**
   * Extract project name from path or package.json
   */
  private async extractProjectName(codebasePath: string): Promise<string> {
    // Try to get name from package.json
    try {
      const packageJsonPath = path.join(codebasePath, 'package.json');
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
      
      if (packageJson.name) {
        return packageJson.name;
      }
    } catch (error) {
      // No package.json or can't read it
    }

    // Try to get name from setup.py
    try {
      const setupPyPath = path.join(codebasePath, 'setup.py');
      const setupPy = await fs.readFile(setupPyPath, 'utf-8');
      
      const nameMatch = setupPy.match(/name\s*=\s*['"]([^'"]+)['"]/);
      if (nameMatch) {
        return nameMatch[1];
      }
    } catch (error) {
      // No setup.py or can't read it
    }

    // Fall back to directory name
    return path.basename(codebasePath);
  }

  /**
   * Detect language from file extension
   */
  private detectLanguageFromExtension(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    
    const languageMap: Record<string, string> = {
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.py': 'python',
      '.java': 'java',
      '.cpp': 'cpp',
      '.c': 'c',
      '.cs': 'csharp',
      '.go': 'go',
      '.rb': 'ruby',
      '.php': 'php'
    };

    return languageMap[ext] || 'unknown';
  }

  /**
   * Extract exports from parsed code
   */
  private async extractExports(parsedCode: ParsedCode): Promise<ExportInfo[]> {
    const exports: ExportInfo[] = [];

    if (parsedCode.language === 'javascript' || parsedCode.language === 'typescript') {
      this.extractJavaScriptExports(parsedCode.ast, exports);
    } else if (parsedCode.language === 'python') {
      this.extractPythonExports(parsedCode.ast, exports);
    }

    return exports;
  }

  /**
   * Extract JavaScript/TypeScript exports
   */
  private extractJavaScriptExports(ast: any, exports: ExportInfo[]): void {
    const traverse = (node: any) => {
      if (!node) return;

      if (node.type === 'ExportNamedDeclaration') {
        if (node.declaration) {
          // export function foo() {} or export class Bar {}
          if (node.declaration.type === 'FunctionDeclaration') {
            exports.push({
              name: node.declaration.id?.name || 'anonymous',
              type: 'function'
            });
          } else if (node.declaration.type === 'ClassDeclaration') {
            exports.push({
              name: node.declaration.id?.name || 'anonymous',
              type: 'class'
            });
          } else if (node.declaration.type === 'VariableDeclaration') {
            for (const declarator of node.declaration.declarations) {
              exports.push({
                name: declarator.id?.name || 'unknown',
                type: 'variable'
              });
            }
          }
        } else if (node.specifiers) {
          // export { foo, bar }
          for (const specifier of node.specifiers) {
            exports.push({
              name: specifier.exported?.name || 'unknown',
              type: 'variable'
            });
          }
        }
      } else if (node.type === 'ExportDefaultDeclaration') {
        const name = node.declaration?.id?.name || node.declaration?.name || 'default';
        const type = node.declaration?.type === 'FunctionDeclaration' ? 'function' :
                     node.declaration?.type === 'ClassDeclaration' ? 'class' : 'variable';
        exports.push({ name, type });
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
  }

  /**
   * Extract Python exports (module-level definitions)
   */
  private extractPythonExports(rootNode: any, exports: ExportInfo[]): void {
    // In Python, all top-level definitions are considered exports
    // unless they start with underscore
    const traverse = (node: any, depth: number = 0) => {
      if (!node) return;

      // Only look at top-level definitions
      if (depth === 1) {
        if (node.type === 'function_definition') {
          const nameNode = node.childForFieldName('name');
          const name = nameNode?.text || 'unknown';
          
          if (!name.startsWith('_')) {
            exports.push({ name, type: 'function' });
          }
        } else if (node.type === 'class_definition') {
          const nameNode = node.childForFieldName('name');
          const name = nameNode?.text || 'unknown';
          
          if (!name.startsWith('_')) {
            exports.push({ name, type: 'class' });
          }
        }
      }

      // Traverse children
      for (let i = 0; i < node.childCount; i++) {
        traverse(node.child(i), depth + 1);
      }
    };

    traverse(rootNode, 0);
  }

  /**
   * Infer the purpose of a file from its location and content
   */
  private inferFilePurpose(filePath: string, parsedCode: ParsedCode, projectContext: ProjectContext): string {
    const fileName = path.basename(filePath, path.extname(filePath));
    const dirName = path.basename(path.dirname(filePath));

    // Check directory-based patterns
    if (dirName.includes('test') || fileName.includes('test') || fileName.includes('spec')) {
      return 'Test file';
    }
    if (dirName.includes('model') || dirName.includes('models')) {
      return 'Data model definition';
    }
    if (dirName.includes('controller') || dirName.includes('controllers')) {
      return 'Controller handling business logic';
    }
    if (dirName.includes('service') || dirName.includes('services')) {
      return 'Service layer component';
    }
    if (dirName.includes('util') || dirName.includes('utils') || dirName.includes('helper')) {
      return 'Utility functions';
    }
    if (dirName.includes('api') || dirName.includes('route') || dirName.includes('routes')) {
      return 'API endpoint definitions';
    }
    if (dirName.includes('component') || dirName.includes('components')) {
      return 'UI component';
    }

    // Check file name patterns
    if (fileName === 'index' || fileName === 'main') {
      return 'Entry point';
    }
    if (fileName === 'config' || fileName === 'configuration') {
      return 'Configuration file';
    }

    return 'Source file';
  }

  /**
   * Find related files based on imports
   */
  private findRelatedFiles(imports: ImportInfo[], currentFilePath: string): string[] {
    const relatedFiles: string[] = [];
    const currentDir = path.dirname(currentFilePath);

    for (const importInfo of imports) {
      // Only process relative imports
      if (importInfo.source.startsWith('.')) {
        const resolvedPath = path.resolve(currentDir, importInfo.source);
        relatedFiles.push(resolvedPath);
      }
    }

    return relatedFiles;
  }

  /**
   * Extract function calls from function body
   */
  private extractFunctionCalls(body: string): string[] {
    const calls: string[] = [];
    
    // Simple regex-based extraction (could be improved with AST parsing)
    const callPattern = /(\w+)\s*\(/g;
    let match;
    
    while ((match = callPattern.exec(body)) !== null) {
      const functionName = match[1];
      // Filter out common keywords
      if (!this.isKeyword(functionName)) {
        calls.push(functionName);
      }
    }

    return [...new Set(calls)]; // Remove duplicates
  }

  /**
   * Check if a word is a language keyword
   */
  private isKeyword(word: string): boolean {
    const keywords = [
      'if', 'else', 'for', 'while', 'return', 'function', 'const', 'let', 'var',
      'class', 'new', 'this', 'super', 'import', 'export', 'from', 'as',
      'try', 'catch', 'finally', 'throw', 'async', 'await', 'yield',
      'switch', 'case', 'break', 'continue', 'default', 'typeof', 'instanceof'
    ];
    return keywords.includes(word);
  }

  /**
   * Extract variables used in function body
   */
  private extractUsedVariables(body: string): string[] {
    const variables: string[] = [];
    
    // Simple regex-based extraction
    const variablePattern = /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\b/g;
    let match;
    
    while ((match = variablePattern.exec(body)) !== null) {
      const varName = match[1];
      if (!this.isKeyword(varName)) {
        variables.push(varName);
      }
    }

    return [...new Set(variables)]; // Remove duplicates
  }

  /**
   * Detect potential side effects in function body
   */
  private detectSideEffects(body: string): string[] {
    const sideEffects: string[] = [];

    // Check for common side effect patterns
    if (body.includes('console.log') || body.includes('print(')) {
      sideEffects.push('Console output');
    }
    if (body.includes('fs.') || body.includes('file.') || body.includes('open(')) {
      sideEffects.push('File system access');
    }
    if (body.includes('fetch(') || body.includes('axios.') || body.includes('http.') || body.includes('requests.')) {
      sideEffects.push('Network request');
    }
    if (body.includes('localStorage') || body.includes('sessionStorage')) {
      sideEffects.push('Local storage access');
    }
    if (body.includes('document.') || body.includes('window.')) {
      sideEffects.push('DOM manipulation');
    }
    if (body.includes('Math.random') || body.includes('Date.now') || body.includes('new Date')) {
      sideEffects.push('Non-deterministic behavior');
    }

    return sideEffects;
  }
}
