import {
  FunctionInfo,
  ClassInfo,
  ProjectContext,
  FileContext,
  DocumentationSet
} from '../types';
import { CodeParser } from '../parsers/CodeParser';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  type: 'missing_reference' | 'broken_link' | 'invalid_element';
  message: string;
  location?: string;
  details?: any;
}

export interface ValidationWarning {
  type: 'terminology_inconsistency' | 'missing_documentation' | 'style_issue';
  message: string;
  location?: string;
  suggestions?: string[];
}

export interface TerminologyMap {
  [term: string]: {
    occurrences: Array<{
      file: string;
      context: string;
    }>;
    variants: Set<string>;
  };
}

export interface IDocumentationValidator {
  validateReferences(documentation: string, codeElements: CodeElementRegistry): ValidationResult;
  validateTerminologyConsistency(documentationSet: DocumentationSet): ValidationResult;
  validateInternalLinks(documentation: string, availableFiles: string[]): ValidationResult;
  validateAll(documentationSet: DocumentationSet, projectContext: ProjectContext, codebasePath: string): Promise<ValidationResult>;
}

/**
 * CodeElementRegistry
 * Stores all code elements (functions, classes, variables) for validation
 */
export class CodeElementRegistry {
  private functions: Set<string> = new Set();
  private classes: Set<string> = new Set();
  private variables: Set<string> = new Set();
  private files: Set<string> = new Set();
  private modules: Set<string> = new Set();

  addFunction(name: string): void {
    this.functions.add(name);
  }

  addClass(name: string): void {
    this.classes.add(name);
  }

  addVariable(name: string): void {
    this.variables.add(name);
  }

  addFile(filePath: string): void {
    this.files.add(filePath);
  }

  addModule(moduleName: string): void {
    this.modules.add(moduleName);
  }

  hasFunction(name: string): boolean {
    return this.functions.has(name);
  }

  hasClass(name: string): boolean {
    return this.classes.has(name);
  }

  hasVariable(name: string): boolean {
    return this.variables.has(name);
  }

  hasFile(filePath: string): boolean {
    return this.files.has(filePath);
  }

  hasModule(moduleName: string): boolean {
    return this.modules.has(moduleName);
  }

  hasElement(name: string): boolean {
    return this.hasFunction(name) || 
           this.hasClass(name) || 
           this.hasVariable(name) ||
           this.hasModule(name);
  }

  getAllElements(): string[] {
    return [
      ...Array.from(this.functions),
      ...Array.from(this.classes),
      ...Array.from(this.variables),
      ...Array.from(this.modules)
    ];
  }
}

/**
 * DocumentationValidator
 * Responsibility: Validate documentation accuracy, consistency, and completeness
 * Validates: Requirements 5.1, 5.3, 5.5
 */
export class DocumentationValidator implements IDocumentationValidator {
  private codeParser: CodeParser;

  constructor() {
    this.codeParser = new CodeParser();
  }

  /**
   * Validate that all referenced code elements exist in the codebase
   * Validates: Requirements 5.1, 5.5
   */
  validateReferences(documentation: string, codeElements: CodeElementRegistry): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Extract code references from documentation
    const references = this.extractCodeReferences(documentation);

    for (const ref of references) {
      if (!codeElements.hasElement(ref.name)) {
        errors.push({
          type: 'missing_reference',
          message: `Referenced code element '${ref.name}' does not exist in the codebase`,
          location: ref.context,
          details: { referencedName: ref.name, type: ref.type }
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate terminology consistency across all documentation
   * Validates: Requirements 5.3
   */
  validateTerminologyConsistency(documentationSet: DocumentationSet): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Build terminology map from all documentation
    const terminologyMap = this.buildTerminologyMap(documentationSet);

    // Check for inconsistent terminology
    for (const [term, data] of Object.entries(terminologyMap)) {
      if (data.variants.size > 1) {
        const variantsList = Array.from(data.variants);
        
        warnings.push({
          type: 'terminology_inconsistency',
          message: `Inconsistent terminology found for '${term}': ${variantsList.join(', ')}`,
          suggestions: [
            `Use consistent terminology throughout documentation`,
            `Recommended: Choose one variant and use it consistently`
          ]
        });
      }
    }

    // Check for similar terms that might be the same concept
    const similarTerms = this.findSimilarTerms(Object.keys(terminologyMap));
    
    for (const group of similarTerms) {
      if (group.length > 1) {
        warnings.push({
          type: 'terminology_inconsistency',
          message: `Potentially inconsistent terms found: ${group.join(', ')}`,
          suggestions: [
            `Verify if these terms refer to the same concept`,
            `If so, use consistent terminology`
          ]
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate internal links in documentation
   * Validates: Requirements 5.1, 5.5
   */
  validateInternalLinks(documentation: string, availableFiles: string[]): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Extract markdown links
    const links = this.extractMarkdownLinks(documentation);

    for (const link of links) {
      // Check if it's an internal link (relative path or anchor)
      if (this.isInternalLink(link.url)) {
        // Validate file links
        if (link.url.includes('.md') || link.url.includes('.html')) {
          const linkedFile = this.resolveRelativePath(link.url);
          
          if (!availableFiles.some(file => file.includes(linkedFile))) {
            errors.push({
              type: 'broken_link',
              message: `Broken internal link: '${link.url}' (referenced as '${link.text}')`,
              location: link.context,
              details: { url: link.url, text: link.text }
            });
          }
        }
        
        // Validate anchor links
        if (link.url.includes('#')) {
          const anchor = link.url.split('#')[1];
          
          if (anchor && !this.isValidAnchor(anchor, documentation)) {
            warnings.push({
              type: 'missing_documentation',
              message: `Anchor '${anchor}' referenced but not found in documentation`,
              location: link.context,
              suggestions: [
                `Verify the anchor exists in the target document`,
                `Check for typos in the anchor name`
              ]
            });
          }
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate all aspects of documentation
   * Validates: Requirements 5.1, 5.3, 5.5
   */
  async validateAll(
    documentationSet: DocumentationSet,
    projectContext: ProjectContext,
    codebasePath: string
  ): Promise<ValidationResult> {
    const allErrors: ValidationError[] = [];
    const allWarnings: ValidationWarning[] = [];

    // Build code element registry from the codebase
    const codeElements = await this.buildCodeElementRegistry(codebasePath, projectContext);

    // Validate README references
    if (documentationSet.readme) {
      const readmeResult = this.validateReferences(documentationSet.readme, codeElements);
      allErrors.push(...readmeResult.errors);
      allWarnings.push(...readmeResult.warnings);
    }

    // Validate API documentation references
    if (documentationSet.api) {
      const apiResult = this.validateReferences(documentationSet.api, codeElements);
      allErrors.push(...apiResult.errors);
      allWarnings.push(...apiResult.warnings);
    }

    // Validate architecture documentation references
    if (documentationSet.architecture) {
      const archResult = this.validateReferences(documentationSet.architecture, codeElements);
      allErrors.push(...archResult.errors);
      allWarnings.push(...archResult.warnings);
    }

    // Validate terminology consistency across all documentation
    const terminologyResult = this.validateTerminologyConsistency(documentationSet);
    allErrors.push(...terminologyResult.errors);
    allWarnings.push(...terminologyResult.warnings);

    // Validate internal links
    const availableFiles = this.getAvailableDocFiles(documentationSet);
    
    if (documentationSet.readme) {
      const readmeLinkResult = this.validateInternalLinks(documentationSet.readme, availableFiles);
      allErrors.push(...readmeLinkResult.errors);
      allWarnings.push(...readmeLinkResult.warnings);
    }

    if (documentationSet.api) {
      const apiLinkResult = this.validateInternalLinks(documentationSet.api, availableFiles);
      allErrors.push(...apiLinkResult.errors);
      allWarnings.push(...apiLinkResult.warnings);
    }

    if (documentationSet.architecture) {
      const archLinkResult = this.validateInternalLinks(documentationSet.architecture, availableFiles);
      allErrors.push(...archLinkResult.errors);
      allWarnings.push(...archLinkResult.warnings);
    }

    return {
      isValid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings
    };
  }

  /**
   * Build a registry of all code elements in the codebase
   */
  private async buildCodeElementRegistry(
    codebasePath: string,
    projectContext: ProjectContext
  ): Promise<CodeElementRegistry> {
    const registry = new CodeElementRegistry();

    // Recursively scan the codebase
    await this.scanDirectory(codebasePath, registry, projectContext);

    return registry;
  }

  /**
   * Recursively scan directory to build code element registry
   */
  private async scanDirectory(
    dirPath: string,
    registry: CodeElementRegistry,
    projectContext: ProjectContext,
    depth: number = 0
  ): Promise<void> {
    if (depth > 5) return; // Limit recursion depth

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          // Skip common directories
          if (this.shouldSkipDirectory(entry.name)) {
            continue;
          }

          await this.scanDirectory(fullPath, registry, projectContext, depth + 1);
        } else if (entry.isFile()) {
          // Process code files
          const ext = path.extname(entry.name);
          
          if (this.isCodeFile(ext)) {
            registry.addFile(fullPath);
            await this.extractCodeElements(fullPath, registry);
          }
        }
      }
    } catch (error) {
      // Skip directories we can't access
    }
  }

  /**
   * Extract code elements from a file
   */
  private async extractCodeElements(filePath: string, registry: CodeElementRegistry): Promise<void> {
    try {
      const ext = path.extname(filePath);
      const language = this.getLanguageFromExtension(ext);

      if (!language) return;

      const parsedCode = await this.codeParser.parseFile(filePath, language);

      // Extract functions
      const functions = this.codeParser.extractFunctions(parsedCode);
      functions.forEach(func => registry.addFunction(func.name));

      // Extract classes
      const classes = this.codeParser.extractClasses(parsedCode);
      classes.forEach(cls => {
        registry.addClass(cls.name);
        // Add class methods
        cls.methods.forEach(method => registry.addFunction(`${cls.name}.${method.name}`));
      });

      // Extract imports (as modules)
      const imports = this.codeParser.extractImports(parsedCode);
      imports.forEach(imp => registry.addModule(imp.source));
    } catch (error) {
      // Skip files that can't be parsed
    }
  }

  /**
   * Extract code references from documentation text
   */
  private extractCodeReferences(documentation: string): Array<{
    name: string;
    type: string;
    context: string;
  }> {
    const references: Array<{ name: string; type: string; context: string }> = [];

    // Extract inline code references: `functionName()`, `ClassName`, etc.
    const inlineCodePattern = /`([a-zA-Z_$][a-zA-Z0-9_$]*(?:\.[a-zA-Z_$][a-zA-Z0-9_$]*)?(?:\(\))?)`/g;
    let match;

    while ((match = inlineCodePattern.exec(documentation)) !== null) {
      let name = match[1];
      let type = 'unknown';

      // Determine type based on syntax
      if (name.endsWith('()')) {
        name = name.slice(0, -2);
        type = 'function';
      } else if (name[0] === name[0].toUpperCase()) {
        type = 'class';
      } else if (name.includes('.')) {
        type = 'method';
      } else {
        type = 'variable';
      }

      // Get context (surrounding text)
      const start = Math.max(0, match.index - 50);
      const end = Math.min(documentation.length, match.index + match[0].length + 50);
      const context = documentation.substring(start, end);

      references.push({ name, type, context });
    }

    // Extract code block references (function/class definitions)
    const codeBlockPattern = /```[\w]*\n([\s\S]*?)```/g;
    
    while ((match = codeBlockPattern.exec(documentation)) !== null) {
      const codeBlock = match[1];
      
      // Extract function names from code blocks
      const functionPattern = /(?:function|def|async\s+function)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
      let funcMatch;
      
      while ((funcMatch = functionPattern.exec(codeBlock)) !== null) {
        references.push({
          name: funcMatch[1],
          type: 'function',
          context: codeBlock.substring(0, 100)
        });
      }

      // Extract class names from code blocks
      const classPattern = /class\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
      let classMatch;
      
      while ((classMatch = classPattern.exec(codeBlock)) !== null) {
        references.push({
          name: classMatch[1],
          type: 'class',
          context: codeBlock.substring(0, 100)
        });
      }
    }

    return references;
  }

  /**
   * Build terminology map from documentation set
   */
  private buildTerminologyMap(documentationSet: DocumentationSet): TerminologyMap {
    const terminologyMap: TerminologyMap = {};

    // Process README
    if (documentationSet.readme) {
      this.extractTerminology(documentationSet.readme, 'README.md', terminologyMap);
    }

    // Process API documentation
    if (documentationSet.api) {
      this.extractTerminology(documentationSet.api, 'API.md', terminologyMap);
    }

    // Process architecture documentation
    if (documentationSet.architecture) {
      this.extractTerminology(documentationSet.architecture, 'ARCHITECTURE.md', terminologyMap);
    }

    return terminologyMap;
  }

  /**
   * Extract terminology from documentation text
   */
  private extractTerminology(text: string, fileName: string, terminologyMap: TerminologyMap): void {
    // Extract technical terms (capitalized words, camelCase, PascalCase)
    const termPattern = /\b([A-Z][a-z]+(?:[A-Z][a-z]+)*|[a-z]+[A-Z][a-zA-Z]*)\b/g;
    let match;

    while ((match = termPattern.exec(text)) !== null) {
      const term = match[1];
      const normalizedTerm = term.toLowerCase();

      if (!terminologyMap[normalizedTerm]) {
        terminologyMap[normalizedTerm] = {
          occurrences: [],
          variants: new Set()
        };
      }

      terminologyMap[normalizedTerm].variants.add(term);
      
      // Get context
      const start = Math.max(0, match.index - 30);
      const end = Math.min(text.length, match.index + term.length + 30);
      const context = text.substring(start, end);

      terminologyMap[normalizedTerm].occurrences.push({
        file: fileName,
        context
      });
    }
  }

  /**
   * Find similar terms that might indicate inconsistency
   */
  private findSimilarTerms(terms: string[]): string[][] {
    const groups: string[][] = [];
    const processed = new Set<string>();

    for (const term of terms) {
      if (processed.has(term)) continue;

      const similar: string[] = [term];
      processed.add(term);

      for (const otherTerm of terms) {
        if (term === otherTerm || processed.has(otherTerm)) continue;

        if (this.areSimilar(term, otherTerm)) {
          similar.push(otherTerm);
          processed.add(otherTerm);
        }
      }

      if (similar.length > 1) {
        groups.push(similar);
      }
    }

    return groups;
  }

  /**
   * Check if two terms are similar (potential inconsistency)
   */
  private areSimilar(term1: string, term2: string): boolean {
    // Check for plural/singular variations
    if (term1 + 's' === term2 || term2 + 's' === term1) {
      return true;
    }

    // Check for common variations (e.g., "analyze" vs "analyse")
    const variations = [
      ['analyze', 'analyse'],
      ['color', 'colour'],
      ['center', 'centre']
    ];

    for (const [var1, var2] of variations) {
      if ((term1.includes(var1) && term2.includes(var2)) ||
          (term1.includes(var2) && term2.includes(var1))) {
        return true;
      }
    }

    // Check Levenshtein distance for typos
    const distance = this.levenshteinDistance(term1, term2);
    const maxLength = Math.max(term1.length, term2.length);
    
    return distance <= 2 && distance / maxLength < 0.3;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Extract markdown links from documentation
   */
  private extractMarkdownLinks(documentation: string): Array<{
    text: string;
    url: string;
    context: string;
  }> {
    const links: Array<{ text: string; url: string; context: string }> = [];
    
    // Match markdown links: [text](url)
    const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
    let match;

    while ((match = linkPattern.exec(documentation)) !== null) {
      const start = Math.max(0, match.index - 50);
      const end = Math.min(documentation.length, match.index + match[0].length + 50);
      const context = documentation.substring(start, end);

      links.push({
        text: match[1],
        url: match[2],
        context
      });
    }

    return links;
  }

  /**
   * Check if a link is internal (not external URL)
   */
  private isInternalLink(url: string): boolean {
    // External links start with http://, https://, or //
    return !url.startsWith('http://') && 
           !url.startsWith('https://') && 
           !url.startsWith('//');
  }

  /**
   * Resolve relative path from link
   */
  private resolveRelativePath(url: string): string {
    // Remove anchor if present
    const withoutAnchor = url.split('#')[0];
    
    // Remove leading ./ or ../
    return withoutAnchor.replace(/^\.\.?\//g, '');
  }

  /**
   * Check if an anchor is valid in the documentation
   */
  private isValidAnchor(anchor: string, documentation: string): boolean {
    // Convert anchor to heading format
    // Anchors are typically lowercase with hyphens
    const headingPattern = new RegExp(`#+\\s+${anchor.replace(/-/g, '\\s+')}`, 'i');
    
    return headingPattern.test(documentation);
  }

  /**
   * Get list of available documentation files
   */
  private getAvailableDocFiles(documentationSet: DocumentationSet): string[] {
    const files: string[] = [];

    if (documentationSet.readme) {
      files.push('README.md');
    }

    if (documentationSet.api) {
      files.push('API.md', 'api.md');
    }

    if (documentationSet.architecture) {
      files.push('ARCHITECTURE.md', 'architecture.md');
    }

    // Add commented files
    for (const [filePath] of documentationSet.comments) {
      files.push(filePath);
    }

    return files;
  }

  /**
   * Check if directory should be skipped
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
      '.venv',
      'vendor'
    ];
    return skipDirs.includes(name);
  }

  /**
   * Check if file extension indicates a code file
   */
  private isCodeFile(ext: string): boolean {
    const codeExtensions = [
      '.js', '.jsx', '.ts', '.tsx',
      '.py', '.java', '.cpp', '.c',
      '.cs', '.go', '.rb', '.php'
    ];
    return codeExtensions.includes(ext.toLowerCase());
  }

  /**
   * Get language from file extension
   */
  private getLanguageFromExtension(ext: string): string | null {
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

    return languageMap[ext.toLowerCase()] || null;
  }
}
