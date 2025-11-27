import * as t from '@babel/types';
import traverse from '@babel/traverse';
import {
  CodeSmell,
  LongMethodSmell,
  DuplicationSmell,
  ConditionalSmell,
  NamingSmell,
  SOLIDSmell,
  Location,
  CodeBlock,
} from '../types';
import {
  parseCode,
  findFunctions,
  getFunctionLineCount,
  getFunctionName,
  calculateComplexity,
  calculateNestingLevel,
} from '../utils/astUtils';
import { calculateSimilarity } from '../utils/codeMetrics';
import { RefactoringConfig, defaultConfig } from '../config';
import { AIRefactoringClient } from '../ai/AIRefactoringClient';

/**
 * Detects code smells and refactoring opportunities
 */
export class SmellDetector {
  private config: RefactoringConfig;
  private aiClient?: AIRefactoringClient;

  constructor(config: RefactoringConfig = defaultConfig) {
    this.config = config;
    if (config.aiEnabled) {
      try {
        this.aiClient = new AIRefactoringClient(config.aiProvider);
      } catch (error) {
        // AI client initialization failed, continue without AI
        console.warn('AI client initialization failed, continuing without AI features');
      }
    }
  }

  /**
   * Detect long methods that should be extracted
   * Requirements: 1.1
   */
  detectLongMethods(code: string, filename: string = 'unknown.ts'): LongMethodSmell[] {
    const smells: LongMethodSmell[] = [];

    try {
      const ast = parseCode(code);
      const functions = findFunctions(ast);

      for (const func of functions) {
        const lineCount = getFunctionLineCount(func);
        const name = getFunctionName(func);

        if (lineCount > this.config.longMethodThreshold) {
          const extractableBlocks = this.findExtractableBlocks(func, code);

          smells.push({
            type: 'long_method',
            methodName: name,
            lineCount,
            extractableBlocks,
            location: this.getLocation(func, filename),
            severity: this.calculateSeverity(lineCount, this.config.longMethodThreshold),
            description: `Method '${name}' is ${lineCount} lines long (threshold: ${this.config.longMethodThreshold})`,
            metrics: {
              lineCount,
              threshold: this.config.longMethodThreshold,
            },
          });
        }
      }
    } catch (error) {
      console.error('Error detecting long methods:', error);
    }

    return smells;
  }

  /**
   * Detect duplicate code blocks
   * Requirements: 1.2
   */
  detectDuplication(code: string, filename: string = 'unknown.ts'): DuplicationSmell[] {
    const smells: DuplicationSmell[] = [];

    try {
      const ast = parseCode(code);
      const codeBlocks = this.extractCodeBlocks(ast, code, filename);

      // Compare all pairs of code blocks
      for (let i = 0; i < codeBlocks.length; i++) {
        for (let j = i + 1; j < codeBlocks.length; j++) {
          const block1 = codeBlocks[i];
          const block2 = codeBlocks[j];

          const similarity = calculateSimilarity(block1.code, block2.code);

          if (similarity >= this.config.duplicationThreshold) {
            // Check if this duplication is already detected
            const alreadyDetected = smells.some(smell =>
              smell.instances.some(loc => 
                this.locationsOverlap(loc, block1.location) || 
                this.locationsOverlap(loc, block2.location)
              )
            );

            if (!alreadyDetected) {
              smells.push({
                type: 'duplication',
                instances: [block1.location, block2.location],
                similarity,
                extractionCandidate: block1.code,
                location: block1.location,
                severity: similarity > 0.95 ? 'high' : 'medium',
                description: `Duplicate code detected with ${(similarity * 100).toFixed(1)}% similarity`,
                metrics: {
                  similarity,
                  threshold: this.config.duplicationThreshold,
                },
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('Error detecting duplication:', error);
    }

    return smells;
  }

  /**
   * Detect complex conditionals that should be simplified
   * Requirements: 1.3
   */
  detectComplexConditionals(code: string, filename: string = 'unknown.ts'): ConditionalSmell[] {
    const smells: ConditionalSmell[] = [];

    try {
      const ast = parseCode(code);

      traverse(ast, {
        IfStatement: (path) => {
          const complexity = this.calculateConditionalComplexity(path.node);
          const nestingLevel = this.getConditionalNestingLevel(path);

          if (
            complexity > this.config.complexityThreshold ||
            nestingLevel > this.config.nestingLevelThreshold
          ) {
            smells.push({
              type: 'complex_conditional',
              complexity,
              nestingLevel,
              location: this.getLocation(path.node, filename),
              severity: this.calculateComplexitySeverity(complexity, nestingLevel),
              description: `Complex conditional with complexity ${complexity} and nesting level ${nestingLevel}`,
              metrics: {
                complexity,
                nestingLevel,
                complexityThreshold: this.config.complexityThreshold,
                nestingThreshold: this.config.nestingLevelThreshold,
              },
            });
          }
        },
        SwitchStatement: (path) => {
          const caseCount = path.node.cases.length;
          if (caseCount > 10) {
            smells.push({
              type: 'complex_conditional',
              complexity: caseCount,
              nestingLevel: 1,
              location: this.getLocation(path.node, filename),
              severity: caseCount > 20 ? 'high' : 'medium',
              description: `Switch statement with ${caseCount} cases`,
              metrics: {
                caseCount,
              },
            });
          }
        },
      });
    } catch (error) {
      console.error('Error detecting complex conditionals:', error);
    }

    return smells;
  }

  /**
   * Detect poorly named variables and methods
   * Requirements: 1.4
   */
  detectPoorNaming(code: string, filename: string = 'unknown.ts'): NamingSmell[] {
    const smells: NamingSmell[] = [];

    try {
      const ast = parseCode(code);

      // Detect poor variable names
      traverse(ast, {
        VariableDeclarator: (path) => {
          if (t.isIdentifier(path.node.id)) {
            const name = path.node.id.name;
            if (this.isPoorVariableName(name)) {
              smells.push({
                type: 'poor_naming',
                identifierName: name,
                identifierType: 'variable',
                location: this.getLocation(path.node, filename),
                severity: 'low',
                description: `Variable '${name}' has a non-descriptive name`,
              });
            }
          }
        },
        FunctionDeclaration: (path) => {
          if (path.node.id) {
            const name = path.node.id.name;
            if (this.isPoorMethodName(name)) {
              smells.push({
                type: 'poor_naming',
                identifierName: name,
                identifierType: 'method',
                location: this.getLocation(path.node, filename),
                severity: 'low',
                description: `Function '${name}' has a non-descriptive name`,
              });
            }
          }
        },
        ClassMethod: (path) => {
          if (t.isIdentifier(path.node.key)) {
            const name = path.node.key.name;
            if (this.isPoorMethodName(name)) {
              smells.push({
                type: 'poor_naming',
                identifierName: name,
                identifierType: 'method',
                location: this.getLocation(path.node, filename),
                severity: 'low',
                description: `Method '${name}' has a non-descriptive name`,
              });
            }
          }
        },
        ClassDeclaration: (path) => {
          if (path.node.id) {
            const name = path.node.id.name;
            if (this.isPoorClassName(name)) {
              smells.push({
                type: 'poor_naming',
                identifierName: name,
                identifierType: 'class',
                location: this.getLocation(path.node, filename),
                severity: 'medium',
                description: `Class '${name}' has a non-descriptive name`,
              });
            }
          }
        },
      });
    } catch (error) {
      console.error('Error detecting poor naming:', error);
    }

    return smells;
  }

  /**
   * Detect SOLID principle violations
   * Requirements: 7.1, 7.2, 7.3
   */
  detectSOLIDViolations(code: string, filename: string = 'unknown.ts'): SOLIDSmell[] {
    const smells: SOLIDSmell[] = [];

    try {
      const ast = parseCode(code);

      traverse(ast, {
        ClassDeclaration: (path) => {
          const className = path.node.id?.name || 'Anonymous';
          
          // Check for Single Responsibility Principle violations
          const methods = path.node.body.body.filter(
            (member) => t.isClassMethod(member)
          );
          
          if (methods.length > 15) {
            smells.push({
              type: 'solid_violation',
              principle: 'SRP',
              violationType: 'Too many responsibilities',
              location: this.getLocation(path.node, filename),
              severity: 'high',
              description: `Class '${className}' has ${methods.length} methods, suggesting multiple responsibilities`,
              metrics: {
                methodCount: methods.length,
              },
            });
          }

          // Check for Interface Segregation Principle violations
          // Large interfaces with many methods
          if (path.node.implements && path.node.implements.length > 0) {
            const publicMethods = methods.filter(
              (m) => t.isClassMethod(m) && m.accessibility !== 'private'
            );
            
            if (publicMethods.length > 10) {
              smells.push({
                type: 'solid_violation',
                principle: 'ISP',
                violationType: 'Interface too large',
                location: this.getLocation(path.node, filename),
                severity: 'medium',
                description: `Class '${className}' implements large interface with ${publicMethods.length} public methods`,
                metrics: {
                  publicMethodCount: publicMethods.length,
                },
              });
            }
          }

          // Check for Dependency Inversion Principle violations
          // Direct instantiation of concrete classes
          let concreteInstantiations = 0;
          path.traverse({
            NewExpression: (newPath) => {
              concreteInstantiations++;
            },
          });

          if (concreteInstantiations > 5) {
            smells.push({
              type: 'solid_violation',
              principle: 'DIP',
              violationType: 'Tight coupling to concrete classes',
              location: this.getLocation(path.node, filename),
              severity: 'medium',
              description: `Class '${className}' directly instantiates ${concreteInstantiations} concrete classes`,
              metrics: {
                concreteInstantiations,
              },
            });
          }
        },
      });
    } catch (error) {
      console.error('Error detecting SOLID violations:', error);
    }

    return smells;
  }

  // Helper methods

  private findExtractableBlocks(func: t.Function, code: string): CodeBlock[] {
    const blocks: CodeBlock[] = [];

    if (!t.isBlockStatement(func.body)) {
      return blocks;
    }

    // Look for consecutive statements that could be extracted
    const statements = func.body.body;
    let currentBlock: t.Statement[] = [];

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      currentBlock.push(stmt);

      // If we have 5+ statements, consider it extractable
      if (currentBlock.length >= 5) {
        const blockCode = this.getCodeFromStatements(currentBlock, code);
        if (blockCode && currentBlock[0].loc) {
          blocks.push({
            code: blockCode,
            location: {
              file: 'unknown',
              startLine: currentBlock[0].loc.start.line,
              endLine: currentBlock[currentBlock.length - 1].loc!.end.line,
              startColumn: currentBlock[0].loc.start.column,
              endColumn: currentBlock[currentBlock.length - 1].loc!.end.column,
            },
          });
        }
        currentBlock = [];
      }
    }

    return blocks;
  }

  private extractCodeBlocks(ast: t.File, code: string, filename: string): CodeBlock[] {
    const blocks: CodeBlock[] = [];

    traverse(ast, {
      BlockStatement: (path) => {
        // Only extract blocks with at least 3 statements
        if (path.node.body.length >= 3) {
          const blockCode = this.getCodeFromStatements(path.node.body, code);
          if (blockCode && path.node.loc) {
            blocks.push({
              code: blockCode,
              location: {
                file: filename,
                startLine: path.node.loc.start.line,
                endLine: path.node.loc.end.line,
                startColumn: path.node.loc.start.column,
                endColumn: path.node.loc.end.column,
              },
            });
          }
        }
      },
    });

    return blocks;
  }

  private getCodeFromStatements(statements: t.Statement[], fullCode: string): string {
    if (statements.length === 0 || !statements[0].loc) {
      return '';
    }

    const lines = fullCode.split('\n');
    const startLine = statements[0].loc.start.line - 1;
    const endLine = statements[statements.length - 1].loc!.end.line - 1;

    return lines.slice(startLine, endLine + 1).join('\n');
  }

  private calculateConditionalComplexity(node: t.IfStatement): number {
    let complexity = 1;

    // Count nested conditions
    const countConditions = (n: t.Node): void => {
      if (t.isIfStatement(n)) {
        complexity++;
        if (n.consequent) countConditions(n.consequent);
        if (n.alternate) countConditions(n.alternate);
      } else if (t.isBlockStatement(n)) {
        n.body.forEach(countConditions);
      }
    };

    countConditions(node);
    return complexity;
  }

  private getConditionalNestingLevel(path: any): number {
    let level = 0;
    let current = path.parentPath;

    while (current) {
      if (
        current.isIfStatement() ||
        current.isForStatement() ||
        current.isWhileStatement()
      ) {
        level++;
      }
      current = current.parentPath;
    }

    return level;
  }

  private isPoorVariableName(name: string): boolean {
    // Single letter variables (except common loop counters)
    const commonSingleLetters = ['i', 'j', 'k', 'x', 'y', 'z'];
    if (name.length === 1 && !commonSingleLetters.includes(name)) {
      return true;
    }

    // Very short non-descriptive names (2 characters)
    const commonTwoLetters = ['id', 'db', 'fs', 'os', 'io'];
    if (name.length === 2 && !commonTwoLetters.includes(name)) {
      return true;
    }

    // Generic names
    const genericNames = ['data', 'temp', 'tmp', 'foo', 'bar', 'baz', 'test', 'var', 'val'];
    if (genericNames.includes(name.toLowerCase())) {
      return true;
    }

    return false;
  }

  private isPoorMethodName(name: string): boolean {
    // Very short names
    if (name.length <= 2) {
      return true;
    }

    // Generic names
    const genericNames = ['doStuff', 'handleData', 'process', 'execute', 'run', 'foo', 'bar', 'test'];
    if (genericNames.includes(name)) {
      return true;
    }

    // Single word verbs without context
    const vagueVerbs = ['do', 'handle', 'manage', 'deal'];
    if (vagueVerbs.includes(name.toLowerCase())) {
      return true;
    }

    return false;
  }

  private isPoorClassName(name: string): boolean {
    // Very short names
    if (name.length <= 2) {
      return true;
    }

    // Generic names
    const genericNames = ['Manager', 'Handler', 'Processor', 'Util', 'Helper', 'Base'];
    if (genericNames.includes(name)) {
      return true;
    }

    return false;
  }

  private getLocation(node: t.Node, filename: string): Location {
    if (!node.loc) {
      return {
        file: filename,
        startLine: 0,
        endLine: 0,
        startColumn: 0,
        endColumn: 0,
      };
    }

    return {
      file: filename,
      startLine: node.loc.start.line,
      endLine: node.loc.end.line,
      startColumn: node.loc.start.column,
      endColumn: node.loc.end.column,
    };
  }

  private calculateSeverity(value: number, threshold: number): 'low' | 'medium' | 'high' {
    const ratio = value / threshold;
    if (ratio > 2) return 'high';
    if (ratio > 1.5) return 'medium';
    return 'low';
  }

  private calculateComplexitySeverity(complexity: number, nesting: number): 'low' | 'medium' | 'high' {
    if (complexity > 20 || nesting > 6) return 'high';
    if (complexity > 15 || nesting > 5) return 'medium';
    return 'low';
  }

  private locationsOverlap(loc1: Location, loc2: Location): boolean {
    if (loc1.file !== loc2.file) return false;
    
    return !(
      loc1.endLine < loc2.startLine ||
      loc2.endLine < loc1.startLine
    );
  }
}
