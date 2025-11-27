import {
  CodeSmell,
  RefactoringSuggestion,
  LongMethodSmell,
  DuplicationSmell,
  ConditionalSmell,
  NamingSmell,
  SOLIDSmell,
  ExtractMethodSuggestion,
  RemoveDuplicationSuggestion,
  SimplifyConditionalSuggestion,
  RenameSuggestion,
} from '../types';
import { generateDiff } from '../utils/diffGenerator';
import { AIRefactoringClient } from '../ai/AIRefactoringClient';
import { RefactoringConfig, defaultConfig } from '../config';
import { v4 as uuidv4 } from 'uuid';
import * as t from '@babel/types';
import { parseCode } from '../utils/astUtils';
import traverse from '@babel/traverse';
import generate from '@babel/generator';

/**
 * Generates refactoring suggestions from detected code smells
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 4.1, 5.1, 5.2, 5.3, 6.1, 6.2, 7.1, 7.2, 7.3, 7.4, 7.5
 */
export class RefactoringSuggester {
  private aiClient?: AIRefactoringClient;
  private config: RefactoringConfig;

  constructor(config: RefactoringConfig = defaultConfig) {
    this.config = config;
    if (config.aiEnabled) {
      try {
        this.aiClient = new AIRefactoringClient(config.aiProvider);
      } catch (error) {
        console.warn('AI client initialization failed, continuing without AI features');
      }
    }
  }

  /**
   * Generate refactoring suggestions from all detected smells
   * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
   */
  suggestRefactorings(smells: CodeSmell[]): RefactoringSuggestion[] {
    const suggestions: RefactoringSuggestion[] = [];

    for (const smell of smells) {
      try {
        if (smell.type === 'long_method' && 'methodName' in smell) {
          suggestions.push(this.suggestExtractMethod(smell as LongMethodSmell));
        } else if (smell.type === 'duplication' && 'instances' in smell) {
          suggestions.push(this.suggestRemoveDuplication(smell as DuplicationSmell));
        } else if (smell.type === 'complex_conditional' && 'complexity' in smell) {
          suggestions.push(this.suggestSimplifyConditional(smell as ConditionalSmell));
        } else if (smell.type === 'poor_naming' && 'identifierName' in smell) {
          suggestions.push(this.suggestRename(smell as NamingSmell));
        } else if (smell.type === 'solid_violation' && 'principle' in smell) {
          const solidSuggestions = this.suggestSOLIDRefactorings(smell as SOLIDSmell);
          suggestions.push(...solidSuggestions);
        }
      } catch (error) {
        console.error(`Error generating suggestion for smell ${smell.type}:`, error);
      }
    }

    // Sort by priority (severity and impact)
    return this.prioritizeSuggestions(suggestions);
  }

  /**
   * Suggest extract method refactoring for long methods
   * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
   */
  suggestExtractMethod(smell: LongMethodSmell): ExtractMethodSuggestion {
    const { methodName, extractableBlocks, location } = smell;

    // Use the first extractable block
    const blockToExtract = extractableBlocks[0];
    if (!blockToExtract) {
      throw new Error('No extractable blocks found');
    }

    // Generate a suggested method name
    const newMethodName = this.generateExtractedMethodName(methodName, blockToExtract.code);

    // Identify parameters and return values
    const { parameters, returnType } = this.analyzeExtractedMethod(blockToExtract.code);

    // Generate before and after code
    const beforeCode = this.getCodeSnippet(smell);
    const afterCode = this.generateExtractedMethodCode(
      beforeCode,
      blockToExtract.code,
      newMethodName,
      parameters,
      returnType
    );

    const diff = generateDiff(beforeCode, afterCode, location.file);

    return {
      id: uuidv4(),
      type: 'extract_method',
      title: `Extract method '${newMethodName}' from '${methodName}'`,
      description: `Extract ${blockToExtract.code.split('\n').length} lines into a separate method to improve readability`,
      beforeCode,
      afterCode,
      diff,
      benefits: [
        'Reduces method length and complexity',
        'Improves code readability',
        'Makes code more testable',
        'Enables code reuse',
      ],
      riskLevel: 'low',
      estimatedEffort: 'low',
      priority: this.calculatePriority('low', smell.severity),
      methodName: newMethodName,
      parameters,
      returnType,
    };
  }

  /**
   * Suggest duplication removal refactoring
   * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
   */
  suggestRemoveDuplication(smell: DuplicationSmell): RemoveDuplicationSuggestion {
    const { instances, extractionCandidate, similarity } = smell;

    // Generate a name for the shared method
    const sharedMethodName = this.generateSharedMethodName(extractionCandidate);

    // Analyze the duplicated code
    const { parameters, returnType } = this.analyzeExtractedMethod(extractionCandidate);

    // Generate before and after code
    const beforeCode = this.getCodeSnippet(smell);
    const afterCode = this.generateDuplicationRemovalCode(
      beforeCode,
      extractionCandidate,
      sharedMethodName,
      parameters,
      returnType,
      instances
    );

    const diff = generateDiff(beforeCode, afterCode, smell.location.file);

    return {
      id: uuidv4(),
      type: 'remove_duplication',
      title: `Extract duplicated code to '${sharedMethodName}'`,
      description: `Remove ${instances.length} instances of duplicated code (${(similarity * 100).toFixed(1)}% similar)`,
      beforeCode,
      afterCode,
      diff,
      benefits: [
        'Eliminates code duplication',
        'Reduces maintenance burden',
        'Single source of truth',
        'Easier to fix bugs',
      ],
      riskLevel: this.assessDuplicationRisk(instances.length, similarity),
      estimatedEffort: instances.length > 3 ? 'medium' : 'low',
      priority: this.calculatePriority(
        this.assessDuplicationRisk(instances.length, similarity),
        smell.severity
      ),
      sharedMethodName,
      instances,
    };
  }

  /**
   * Suggest conditional simplification refactoring
   * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
   */
  suggestSimplifyConditional(smell: ConditionalSmell): SimplifyConditionalSuggestion {
    const { complexity, nestingLevel } = smell;

    // Determine the best simplification strategy
    const simplificationType = this.determineSimplificationType(complexity, nestingLevel);

    // Generate before and after code
    const beforeCode = this.getCodeSnippet(smell);
    const afterCode = this.generateSimplifiedConditional(beforeCode, simplificationType);

    const diff = generateDiff(beforeCode, afterCode, smell.location.file);

    const benefits = this.getSimplificationBenefits(simplificationType);

    return {
      id: uuidv4(),
      type: 'simplify_conditional',
      title: `Simplify conditional using ${simplificationType.replace('_', ' ')}`,
      description: `Reduce complexity from ${complexity} and nesting level from ${nestingLevel}`,
      beforeCode,
      afterCode,
      diff,
      benefits,
      riskLevel: 'low',
      estimatedEffort: 'low',
      priority: this.calculatePriority('low', smell.severity),
      simplificationType,
    };
  }

  /**
   * Suggest rename refactoring for poorly named identifiers
   * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
   */
  suggestRename(smell: NamingSmell): RenameSuggestion {
    const { identifierName, identifierType } = smell;

    // Generate a better name
    const newName = this.generateBetterName(identifierName, identifierType);

    // Determine scope
    const scope = this.determineScope(smell);

    // Generate before and after code
    const beforeCode = this.getCodeSnippet(smell);
    const afterCode = this.generateRenamedCode(beforeCode, identifierName, newName);

    const diff = generateDiff(beforeCode, afterCode, smell.location.file);

    return {
      id: uuidv4(),
      type: 'rename',
      title: `Rename ${identifierType} '${identifierName}' to '${newName}'`,
      description: `Improve code readability with a more descriptive ${identifierType} name`,
      beforeCode,
      afterCode,
      diff,
      benefits: [
        'Improves code readability',
        'Makes code self-documenting',
        'Reduces need for comments',
        'Easier for new developers to understand',
      ],
      riskLevel: 'low',
      estimatedEffort: 'low',
      priority: this.calculatePriority('low', smell.severity),
      oldName: identifierName,
      newName,
      scope,
    };
  }

  /**
   * Suggest SOLID principle refactorings
   * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
   */
  suggestSOLIDRefactorings(smell: SOLIDSmell): RefactoringSuggestion[] {
    const { principle, violationType } = smell;
    const suggestions: RefactoringSuggestion[] = [];

    const beforeCode = this.getCodeSnippet(smell);

    switch (principle) {
      case 'SRP': {
        // Single Responsibility Principle - suggest splitting class
        const afterCode = this.generateSplitClassCode(beforeCode);
        const diff = generateDiff(beforeCode, afterCode, smell.location.file);

        suggestions.push({
          id: uuidv4(),
          type: 'split_class',
          title: 'Split class to follow Single Responsibility Principle',
          description: `Class has multiple responsibilities: ${violationType}`,
          beforeCode,
          afterCode,
          diff,
          benefits: [
            'Each class has a single, well-defined responsibility',
            'Easier to understand and maintain',
            'Reduces coupling between concerns',
            'Improves testability',
          ],
          riskLevel: 'high',
          estimatedEffort: 'high',
          priority: this.calculatePriority('high', smell.severity),
        });
        break;
      }

      case 'DIP': {
        // Dependency Inversion Principle - suggest introducing interfaces
        const afterCode = this.generateInterfaceIntroductionCode(beforeCode);
        const diff = generateDiff(beforeCode, afterCode, smell.location.file);

        suggestions.push({
          id: uuidv4(),
          type: 'introduce_interface',
          title: 'Introduce interfaces to follow Dependency Inversion Principle',
          description: `Reduce tight coupling: ${violationType}`,
          beforeCode,
          afterCode,
          diff,
          benefits: [
            'Reduces coupling to concrete implementations',
            'Enables dependency injection',
            'Improves testability with mocks',
            'Makes code more flexible and extensible',
          ],
          riskLevel: 'medium',
          estimatedEffort: 'medium',
          priority: this.calculatePriority('medium', smell.severity),
        });
        break;
      }

      case 'ISP': {
        // Interface Segregation Principle - suggest splitting interface
        const afterCode = this.generateSplitInterfaceCode(beforeCode);
        const diff = generateDiff(beforeCode, afterCode, smell.location.file);

        suggestions.push({
          id: uuidv4(),
          type: 'split_class',
          title: 'Split interface to follow Interface Segregation Principle',
          description: `Interface is too large: ${violationType}`,
          beforeCode,
          afterCode,
          diff,
          benefits: [
            'Clients only depend on methods they use',
            'Reduces unnecessary dependencies',
            'Improves code organization',
            'Makes interfaces more focused',
          ],
          riskLevel: 'medium',
          estimatedEffort: 'medium',
          priority: this.calculatePriority('medium', smell.severity),
        });
        break;
      }

      default:
        // Generic SOLID suggestion
        suggestions.push({
          id: uuidv4(),
          type: 'split_class',
          title: `Refactor to follow ${principle} principle`,
          description: violationType,
          beforeCode,
          afterCode: beforeCode + '\n// TODO: Apply SOLID refactoring',
          diff: generateDiff(beforeCode, beforeCode + '\n// TODO: Apply SOLID refactoring', smell.location.file),
          benefits: ['Improves code design', 'Follows SOLID principles'],
          riskLevel: 'medium',
          estimatedEffort: 'medium',
          priority: this.calculatePriority('medium', smell.severity),
        });
    }

    return suggestions;
  }

  // Helper methods

  private generateExtractedMethodName(originalMethod: string, code: string): string {
    // Simple heuristic: look for key verbs or nouns in the code
    const keywords = code.match(/\b(calculate|process|validate|handle|create|update|delete|get|set|check|find|filter|map|reduce)\w*/gi);
    
    if (keywords && keywords.length > 0) {
      const keyword = keywords[0];
      return `${keyword.charAt(0).toLowerCase()}${keyword.slice(1)}Helper`;
    }

    return `extracted${originalMethod.charAt(0).toUpperCase()}${originalMethod.slice(1)}`;
  }

  private analyzeExtractedMethod(code: string): { parameters: string[]; returnType: string } {
    const parameters: string[] = [];
    let returnType = 'void';

    try {
      const ast = parseCode(`function temp() { ${code} }`);
      const usedVariables = new Set<string>();
      const declaredVariables = new Set<string>();

      traverse(ast, {
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
        ReturnStatement() {
          returnType = 'any';
        },
      });

      // Parameters are variables used but not declared
      for (const variable of usedVariables) {
        if (!declaredVariables.has(variable) && !this.isBuiltIn(variable)) {
          parameters.push(variable);
        }
      }
    } catch (error) {
      // Fallback: no parameters
    }

    return { parameters, returnType };
  }

  private isBuiltIn(name: string): boolean {
    const builtIns = ['console', 'Math', 'Date', 'Array', 'Object', 'String', 'Number', 'Boolean', 'undefined', 'null'];
    return builtIns.includes(name);
  }

  private generateExtractedMethodCode(
    originalCode: string,
    blockCode: string,
    methodName: string,
    parameters: string[],
    returnType: string
  ): string {
    const paramList = parameters.join(', ');
    const returnStmt = returnType !== 'void' ? 'return result;' : '';
    
    const extractedMethod = `
  private ${methodName}(${paramList}): ${returnType} {
${blockCode.split('\n').map(line => '    ' + line).join('\n')}
    ${returnStmt}
  }`;

    // Replace the block in original code with a method call
    const methodCall = returnType !== 'void' 
      ? `const result = this.${methodName}(${paramList});`
      : `this.${methodName}(${paramList});`;

    const modifiedCode = originalCode.replace(blockCode, `    ${methodCall}`);
    
    return modifiedCode + '\n' + extractedMethod;
  }

  private generateSharedMethodName(code: string): string {
    // Look for common patterns
    if (code.includes('validate')) return 'validateData';
    if (code.includes('calculate')) return 'calculateValue';
    if (code.includes('process')) return 'processData';
    if (code.includes('format')) return 'formatOutput';
    
    return 'extractedMethod';
  }

  private generateDuplicationRemovalCode(
    originalCode: string,
    duplicateCode: string,
    methodName: string,
    parameters: string[],
    returnType: string,
    instances: any[]
  ): string {
    const paramList = parameters.join(', ');
    const returnStmt = returnType !== 'void' ? 'return result;' : '';
    
    const sharedMethod = `
  private ${methodName}(${paramList}): ${returnType} {
${duplicateCode.split('\n').map(line => '    ' + line).join('\n')}
    ${returnStmt}
  }`;

    // Replace all instances with method calls
    let modifiedCode = originalCode;
    const methodCall = returnType !== 'void'
      ? `const result = this.${methodName}(${paramList});`
      : `this.${methodName}(${paramList});`;

    // Simple replacement (in real implementation, would use AST)
    modifiedCode = modifiedCode.replace(new RegExp(duplicateCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), methodCall);
    
    return modifiedCode + '\n' + sharedMethod;
  }

  private determineSimplificationType(complexity: number, nestingLevel: number): 'guard_clause' | 'extract_variable' | 'consolidate' {
    if (nestingLevel > 3) return 'guard_clause';
    if (complexity > 15) return 'consolidate';
    return 'extract_variable';
  }

  private generateSimplifiedConditional(code: string, type: 'guard_clause' | 'extract_variable' | 'consolidate'): string {
    switch (type) {
      case 'guard_clause':
        return this.applyGuardClauses(code);
      case 'extract_variable':
        return this.extractBooleanVariables(code);
      case 'consolidate':
        return this.consolidateConditionals(code);
    }
  }

  private applyGuardClauses(code: string): string {
    // Simple transformation: convert nested ifs to guard clauses
    return code.replace(
      /if\s*\((.*?)\)\s*{([\s\S]*?)}/,
      'if (!($1)) return;\n$2'
    );
  }

  private extractBooleanVariables(code: string): string {
    // Extract complex boolean expressions to variables
    return code.replace(
      /if\s*\((.*?&&.*?)\)/,
      (match, condition) => {
        const varName = 'isConditionMet';
        return `const ${varName} = ${condition};\nif (${varName})`;
      }
    );
  }

  private consolidateConditionals(code: string): string {
    // Consolidate repeated conditional logic
    return code + '\n// TODO: Consolidate conditional logic';
  }

  private getSimplificationBenefits(type: 'guard_clause' | 'extract_variable' | 'consolidate'): string[] {
    const benefits = {
      guard_clause: [
        'Reduces nesting depth',
        'Improves readability with early returns',
        'Makes happy path more obvious',
      ],
      extract_variable: [
        'Makes complex conditions more readable',
        'Self-documenting code',
        'Easier to debug',
      ],
      consolidate: [
        'Reduces code duplication',
        'Simplifies logic flow',
        'Easier to maintain',
      ],
    };
    return benefits[type];
  }

  private generateBetterName(oldName: string, type: 'variable' | 'method' | 'class'): string {
    // Simple heuristic improvements
    const improvements: Record<string, string> = {
      'data': 'userData',
      'temp': 'temporaryValue',
      'tmp': 'temporaryValue',
      'x': 'value',
      'y': 'result',
      'foo': 'item',
      'bar': 'value',
      'doStuff': 'processData',
      'handleData': 'processUserData',
      'Manager': 'UserManager',
      'Handler': 'RequestHandler',
    };

    return improvements[oldName] || `${oldName}Improved`;
  }

  private determineScope(smell: NamingSmell): { type: 'local' | 'class' | 'module' | 'global'; name: string } {
    // Simple heuristic based on identifier type
    if (smell.identifierType === 'variable') {
      return { type: 'local', name: 'function' };
    } else if (smell.identifierType === 'method') {
      return { type: 'class', name: 'class' };
    } else {
      return { type: 'module', name: 'module' };
    }
  }

  private generateRenamedCode(code: string, oldName: string, newName: string): string {
    // Simple string replacement (in real implementation, would use AST)
    const regex = new RegExp(`\\b${oldName}\\b`, 'g');
    return code.replace(regex, newName);
  }

  private generateSplitClassCode(code: string): string {
    return code + '\n\n// TODO: Split class into separate classes based on responsibilities';
  }

  private generateInterfaceIntroductionCode(code: string): string {
    return code + '\n\n// TODO: Introduce interfaces for dependencies';
  }

  private generateSplitInterfaceCode(code: string): string {
    return code + '\n\n// TODO: Split interface into smaller, focused interfaces';
  }

  private getCodeSnippet(smell: CodeSmell): string {
    // In a real implementation, this would read the actual file
    // For now, return a placeholder
    return `// Code from ${smell.location.file}:${smell.location.startLine}-${smell.location.endLine}\n// ${smell.description}`;
  }

  private assessDuplicationRisk(instanceCount: number, similarity: number): 'low' | 'medium' | 'high' {
    if (similarity > 0.95 && instanceCount === 2) return 'low';
    if (similarity > 0.9 && instanceCount <= 3) return 'low';
    if (instanceCount > 5) return 'medium';
    return 'low';
  }

  private calculatePriority(riskLevel: 'low' | 'medium' | 'high', severity: 'low' | 'medium' | 'high'): number {
    const riskScore = { low: 1, medium: 2, high: 3 };
    const severityScore = { low: 1, medium: 2, high: 3 };
    
    // Higher severity and lower risk = higher priority
    return severityScore[severity] * 10 - riskScore[riskLevel];
  }

  private prioritizeSuggestions(suggestions: RefactoringSuggestion[]): RefactoringSuggestion[] {
    return suggestions.sort((a, b) => b.priority - a.priority);
  }
}
