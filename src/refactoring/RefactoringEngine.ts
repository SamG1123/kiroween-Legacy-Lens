/**
 * Refactoring Engine
 * Suggests and applies safe code refactorings using Groq AI
 */

import { aiService } from '../ai';
import * as fs from 'fs/promises';
import * as path from 'path';
import { logger } from '../utils/logger';

export interface RefactoringSuggestion {
  id: string;
  type: 'extract_method' | 'extract_variable' | 'rename' | 'simplify' | 'remove_duplication';
  file: string;
  lineStart: number;
  lineEnd: number;
  title: string;
  description: string;
  before: string;
  after: string;
  impact: 'low' | 'medium' | 'high';
  confidence: number;
}

export interface RefactoringReport {
  suggestions: RefactoringSuggestion[];
  summary: {
    totalSuggestions: number;
    highImpact: number;
    safeToApply: number;
  };
  appliedRefactorings: string[];
}

export class RefactoringEngine {
  async analyzeForRefactoring(
    projectPath: string,
    analysisData: any
  ): Promise<RefactoringReport> {
    logger.info('Starting refactoring analysis', { projectPath });

    const suggestions: RefactoringSuggestion[] = [];

    try {
      // Analyze code smells from analysis data
      const smells = analysisData.codeSmells || [];
      
      for (const smell of smells.slice(0, 20)) {
        const refactorings = await this.suggestRefactoringsForSmell(smell, projectPath);
        suggestions.push(...refactorings);
      }

      // Analyze for duplication
      const duplicationRefactorings = await this.analyzeDuplication(projectPath);
      suggestions.push(...duplicationRefactorings);

      // Analyze for complexity
      const complexityRefactorings = await this.analyzeComplexity(projectPath, analysisData);
      suggestions.push(...complexityRefactorings);

      const report: RefactoringReport = {
        suggestions,
        summary: {
          totalSuggestions: suggestions.length,
          highImpact: suggestions.filter(s => s.impact === 'high').length,
          safeToApply: suggestions.filter(s => s.confidence > 0.8).length,
        },
        appliedRefactorings: [],
      };

      logger.info('Refactoring analysis completed', report.summary);
      return report;
    } catch (error) {
      logger.error('Refactoring analysis failed', { error });
      throw error;
    }
  }

  async applyRefactoring(
    suggestion: RefactoringSuggestion,
    dryRun: boolean = true
  ): Promise<{ success: boolean; diff: string }> {
    logger.info('Applying refactoring', { id: suggestion.id, dryRun });

    try {
      const content = await fs.readFile(suggestion.file, 'utf-8');
      const lines = content.split('\n');
      
      // Replace the specified lines
      const before = lines.slice(suggestion.lineStart - 1, suggestion.lineEnd).join('\n');
      const after = suggestion.after;
      
      const newContent = content.replace(before, after);
      
      if (!dryRun) {
        await fs.writeFile(suggestion.file, newContent, 'utf-8');
      }

      const diff = this.generateDiff(before, after);
      
      return { success: true, diff };
    } catch (error) {
      logger.error('Failed to apply refactoring', { error });
      return { success: false, diff: '' };
    }
  }

  private async suggestRefactoringsForSmell(
    smell: any,
    projectPath: string
  ): Promise<RefactoringSuggestion[]> {
    const suggestions: RefactoringSuggestion[] = [];

    try {
      const filePath = path.join(projectPath, smell.file);
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.split('\n');
      
      const smellCode = lines.slice(smell.line - 1, smell.line + 20).join('\n');
      
      const refactoringAdvice = await aiService.suggestRefactoring(
        smellCode,
        [smell.type, smell.message]
      );

      suggestions.push({
        id: `refactor_${Date.now()}_${Math.random()}`,
        type: this.mapSmellToRefactoringType(smell.type),
        file: filePath,
        lineStart: smell.line,
        lineEnd: smell.line + 10,
        title: `Refactor ${smell.type}`,
        description: refactoringAdvice.substring(0, 200),
        before: smellCode,
        after: this.extractRefactoredCode(refactoringAdvice),
        impact: smell.severity === 'high' ? 'high' : 'medium',
        confidence: 0.7,
      });
    } catch (error) {
      logger.warn('Failed to suggest refactoring for smell', { smell, error });
    }

    return suggestions;
  }

  private async analyzeDuplication(projectPath: string): Promise<RefactoringSuggestion[]> {
    const suggestions: RefactoringSuggestion[] = [];
    
    // Simplified duplication detection
    logger.info('Analyzing for code duplication');
    
    return suggestions;
  }

  private async analyzeComplexity(
    projectPath: string,
    analysisData: any
  ): Promise<RefactoringSuggestion[]> {
    const suggestions: RefactoringSuggestion[] = [];
    
    const complexFunctions = (analysisData.metrics?.functions || [])
      .filter((f: any) => f.complexity > 10);

    for (const func of complexFunctions.slice(0, 5)) {
      try {
        const filePath = path.join(projectPath, func.file);
        const content = await fs.readFile(filePath, 'utf-8');
        
        const refactoringAdvice = await aiService.suggestRefactoring(
          content.substring(func.start, func.end),
          ['high_complexity', `Complexity: ${func.complexity}`]
        );

        suggestions.push({
          id: `complexity_${Date.now()}_${Math.random()}`,
          type: 'extract_method',
          file: filePath,
          lineStart: func.line,
          lineEnd: func.line + 30,
          title: `Simplify complex function: ${func.name}`,
          description: 'Break down complex function into smaller methods',
          before: content.substring(func.start, func.end),
          after: this.extractRefactoredCode(refactoringAdvice),
          impact: 'high',
          confidence: 0.75,
        });
      } catch (error) {
        logger.warn('Failed to analyze complex function', { func, error });
      }
    }

    return suggestions;
  }

  private mapSmellToRefactoringType(smellType: string): RefactoringSuggestion['type'] {
    const mapping: Record<string, RefactoringSuggestion['type']> = {
      long_function: 'extract_method',
      complex_function: 'simplify',
      duplicate_code: 'remove_duplication',
      deep_nesting: 'simplify',
    };
    return mapping[smellType] || 'simplify';
  }

  private extractRefactoredCode(advice: string): string {
    // Extract code blocks from AI response
    const codeBlockMatch = advice.match(/```[\w]*\n([\s\S]*?)\n```/);
    return codeBlockMatch ? codeBlockMatch[1] : advice.substring(0, 500);
  }

  private generateDiff(before: string, after: string): string {
    return `--- Before\n${before}\n\n+++ After\n${after}`;
  }
}
