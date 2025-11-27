// Test Validator
// Validates generated tests can compile and run

import * as ts from 'typescript';
import {
  ValidationResult,
  ValidationError,
  Fix,
} from '../types';

export interface ITestValidator {
  validateSyntax(testCode: string, language: string): ValidationResult;
  validateImports(testCode: string, codebase: string): ValidationResult;
  attemptCompilation(testCode: string): ValidationResult;
  suggestFixes(errors: ValidationError[]): Fix[];
}

export class TestValidator implements ITestValidator {
  /**
   * Validates the syntax of generated test code
   * @param testCode The test code to validate
   * @param language The programming language (typescript, javascript, python, java)
   * @returns ValidationResult with any syntax errors found
   */
  validateSyntax(testCode: string, language: string): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    if (!testCode || testCode.trim().length === 0) {
      errors.push({
        message: 'Test code is empty',
        severity: 'error',
      });
      return { valid: false, errors, warnings: [] };
    }

    // Language-specific syntax validation
    switch (language.toLowerCase()) {
      case 'typescript':
      case 'javascript':
        return this.validateTypeScriptSyntax(testCode);
      
      case 'python':
        return this.validatePythonSyntax(testCode);
      
      case 'java':
        return this.validateJavaSyntax(testCode);
      
      default:
        warnings.push({
          message: `Syntax validation not implemented for language: ${language}`,
          severity: 'warning',
        });
        return { valid: true, errors: [], warnings };
    }
  }

  /**
   * Validates that all imports in the test code are available
   * @param testCode The test code to validate
   * @param codebase The codebase context (file paths, available modules)
   * @returns ValidationResult with any import errors found
   */
  validateImports(testCode: string, codebase: string): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // Extract import statements
    const importRegex = /import\s+(?:{[^}]+}|[\w*]+)(?:\s+as\s+\w+)?\s+from\s+['"]([^'"]+)['"]/gm;
    const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
    
    const imports = new Set<string>();
    let match;

    // Find ES6 imports
    while ((match = importRegex.exec(testCode)) !== null) {
      imports.add(match[1]);
    }

    // Find CommonJS requires
    while ((match = requireRegex.exec(testCode)) !== null) {
      imports.add(match[1]);
    }

    // Check each import
    for (const importPath of imports) {
      // Check if it's a relative import
      if (importPath.startsWith('.') || importPath.startsWith('/')) {
        // Validate relative imports exist in codebase
        const normalizedPath = importPath.replace(/^\.\//, '');
        if (!codebase.includes(normalizedPath)) {
          errors.push({
            message: `Cannot find module '${importPath}'`,
            severity: 'error',
          });
        }
      } else {
        // For node_modules, check common testing libraries
        const commonTestLibraries = [
          'jest', '@jest/globals', 'mocha', 'chai', 'sinon',
          'pytest', 'unittest', 'junit', 'rspec',
          '@testing-library/react', '@testing-library/jest-dom'
        ];
        
        const isCommonLibrary = commonTestLibraries.some(lib => 
          importPath === lib || importPath.startsWith(`${lib}/`)
        );

        if (!isCommonLibrary) {
          warnings.push({
            message: `External dependency '${importPath}' may not be installed`,
            severity: 'warning',
          });
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Attempts to compile the test code to verify it's valid
   * @param testCode The test code to compile
   * @returns ValidationResult with any compilation errors
   */
  attemptCompilation(testCode: string): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    try {
      // Create a source file for full type checking
      const sourceFile = ts.createSourceFile(
        'test.ts',
        testCode,
        ts.ScriptTarget.Latest,
        true
      );

      // Create a program for type checking
      const compilerOptions: ts.CompilerOptions = {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        jsx: ts.JsxEmit.React,
        esModuleInterop: true,
        skipLibCheck: true,
        noEmit: true,
        strict: false,
        noImplicitAny: false,
      };

      const host = ts.createCompilerHost(compilerOptions);
      const originalGetSourceFile = host.getSourceFile;
      
      host.getSourceFile = (fileName, languageVersion) => {
        if (fileName === 'test.ts') {
          return sourceFile;
        }
        return originalGetSourceFile.call(host, fileName, languageVersion);
      };

      const program = ts.createProgram(['test.ts'], compilerOptions, host);
      const diagnostics = ts.getPreEmitDiagnostics(program, sourceFile);

      // Process diagnostics
      for (const diagnostic of diagnostics) {
        const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
        
        let line: number | undefined;
        let column: number | undefined;
        
        if (diagnostic.file && diagnostic.start !== undefined) {
          const { line: lineNum, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
          line = lineNum + 1;
          column = character + 1;
        }

        const severity = diagnostic.category === ts.DiagnosticCategory.Error ? 'error' : 'warning';
        
        if (severity === 'error') {
          errors.push({ message, line, column, severity });
        } else {
          warnings.push({ message, line, column, severity: 'warning' });
        }
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings,
      };
    } catch (error) {
      errors.push({
        message: `Compilation failed: ${error instanceof Error ? error.message : String(error)}`,
        severity: 'error',
      });
      
      return {
        valid: false,
        errors,
        warnings,
      };
    }
  }

  /**
   * Suggests fixes for common validation errors
   * @param errors Array of validation errors
   * @returns Array of suggested fixes
   */
  suggestFixes(errors: ValidationError[]): Fix[] {
    const fixes: Fix[] = [];

    for (const error of errors) {
      const message = error.message.toLowerCase();

      // Missing import fixes
      if (message.includes('cannot find name') || message.includes('is not defined')) {
        const match = error.message.match(/['"]([^'"]+)['"]/);
        if (match) {
          const identifier = match[1];
          fixes.push({
            description: `Add import for '${identifier}'`,
            code: this.generateImportFix(identifier),
            location: error.line ? { line: 1, column: 0 } : undefined,
          });
        }
      }

      // Missing module fixes
      if (message.includes('cannot find module')) {
        const match = error.message.match(/['"]([^'"]+)['"]/);
        if (match) {
          const modulePath = match[1];
          fixes.push({
            description: `Install or verify module '${modulePath}'`,
            code: `// Ensure '${modulePath}' is installed: npm install ${modulePath}`,
          });
        }
      }

      // Type error fixes
      if (message.includes('type') && message.includes('is not assignable')) {
        fixes.push({
          description: 'Add type assertion or fix type mismatch',
          code: '// Consider using type assertion: value as ExpectedType',
          location: error.line ? { line: error.line, column: error.column || 0 } : undefined,
        });
      }

      // Missing semicolon
      if (message.includes('expected') && message.includes(';')) {
        fixes.push({
          description: 'Add missing semicolon',
          code: ';',
          location: error.line ? { line: error.line, column: error.column || 0 } : undefined,
        });
      }

      // Async/await issues
      if (message.includes('await') && message.includes('async')) {
        fixes.push({
          description: 'Mark function as async',
          code: '// Add async keyword to function declaration',
          location: error.line ? { line: error.line, column: 0 } : undefined,
        });
      }

      // Undefined variable - check if it's not already handled as an import
      if ((message.includes('undefined') || message.includes('not defined')) && 
          !message.includes('cannot find name')) {
        fixes.push({
          description: 'Initialize variable or add declaration',
          code: '// Declare variable before use: const variableName = value;',
          location: error.line ? { line: error.line, column: 0 } : undefined,
        });
      }
    }

    return fixes;
  }

  /**
   * Validates TypeScript/JavaScript syntax using TypeScript compiler
   */
  private validateTypeScriptSyntax(testCode: string): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // Create a source file for syntax checking
    const sourceFile = ts.createSourceFile(
      'test.ts',
      testCode,
      ts.ScriptTarget.Latest,
      true
    );

    // Check for parse errors
    const diagnostics = (sourceFile as any).parseDiagnostics || [];
    
    for (const diagnostic of diagnostics) {
      const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
      
      let line: number | undefined;
      let column: number | undefined;
      
      if (diagnostic.start !== undefined) {
        const { line: lineNum, character } = sourceFile.getLineAndCharacterOfPosition(diagnostic.start);
        line = lineNum + 1;
        column = character + 1;
      }

      errors.push({
        message,
        line,
        column,
        severity: 'error',
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validates Python syntax (basic validation)
   */
  private validatePythonSyntax(testCode: string): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // Basic Python syntax checks
    const lines = testCode.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      
      // Check for common syntax errors
      if (trimmed.endsWith(':') && i < lines.length - 1) {
        const nextLine = lines[i + 1];
        const currentIndent = line.length - line.trimStart().length;
        const nextIndent = nextLine.length - nextLine.trimStart().length;
        
        if (nextLine.trim() && nextIndent <= currentIndent) {
          errors.push({
            message: 'Expected an indented block',
            line: i + 2,
            severity: 'error',
          });
        }
      }

      // Check for unmatched parentheses/brackets
      const openCount = (line.match(/[([{]/g) || []).length;
      const closeCount = (line.match(/[)\]}]/g) || []).length;
      
      if (openCount !== closeCount) {
        warnings.push({
          message: 'Possibly unmatched parentheses or brackets',
          line: i + 1,
          severity: 'warning',
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validates Java syntax (basic validation)
   */
  private validateJavaSyntax(testCode: string): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // Basic Java syntax checks
    const lines = testCode.split('\n');
    let braceCount = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      
      // Count braces
      braceCount += (line.match(/{/g) || []).length;
      braceCount -= (line.match(/}/g) || []).length;
      
      // Check for statements without semicolons (excluding control structures)
      if (trimmed && 
          !trimmed.startsWith('//') && 
          !trimmed.startsWith('/*') &&
          !trimmed.endsWith('{') &&
          !trimmed.endsWith('}') &&
          !trimmed.endsWith(';') &&
          !trimmed.startsWith('@') &&
          !trimmed.match(/^(public|private|protected|class|interface|if|else|for|while|do|switch|case|default|try|catch|finally)/)) {
        warnings.push({
          message: 'Statement may be missing semicolon',
          line: i + 1,
          severity: 'warning',
        });
      }
    }

    if (braceCount !== 0) {
      errors.push({
        message: 'Unmatched braces in code',
        severity: 'error',
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Generates an import statement for a common identifier
   */
  private generateImportFix(identifier: string): string {
    const commonImports: Record<string, string> = {
      'describe': "import { describe } from '@jest/globals';",
      'it': "import { it } from '@jest/globals';",
      'test': "import { test } from '@jest/globals';",
      'expect': "import { expect } from '@jest/globals';",
      'jest': "import jest from 'jest';",
      'beforeEach': "import { beforeEach } from '@jest/globals';",
      'afterEach': "import { afterEach } from '@jest/globals';",
      'beforeAll': "import { beforeAll } from '@jest/globals';",
      'afterAll': "import { afterAll } from '@jest/globals';",
    };

    return commonImports[identifier] || `import { ${identifier} } from 'module-name';`;
  }
}
