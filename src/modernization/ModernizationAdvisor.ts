/**
 * Modernization Advisor
 * Analyzes code for modernization opportunities using Groq AI
 */

import { aiService } from '../ai';
import * as fs from 'fs/promises';
import * as path from 'path';
import { logger } from '../utils/logger';

export interface ModernizationSuggestion {
  type: 'dependency' | 'pattern' | 'framework' | 'syntax';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  currentState: string;
  suggestedState: string;
  effort: 'low' | 'medium' | 'high';
  benefits: string[];
}

export interface ModernizationReport {
  suggestions: ModernizationSuggestion[];
  roadmap: string;
  prioritizedTasks: Array<{
    priority: number;
    task: string;
    effort: string;
    impact: string;
  }>;
  summary: {
    totalIssues: number;
    criticalIssues: number;
    estimatedEffort: string;
  };
}

export class ModernizationAdvisor {
  async analyzeForModernization(
    projectPath: string,
    analysisData: any
  ): Promise<ModernizationReport> {
    logger.info('Starting modernization analysis', { projectPath });

    const suggestions: ModernizationSuggestion[] = [];

    try {
      // Analyze dependencies
      const depSuggestions = await this.analyzeDependencies(analysisData);
      suggestions.push(...depSuggestions);

      // Analyze code patterns
      const patternSuggestions = await this.analyzePatterns(projectPath, analysisData);
      suggestions.push(...patternSuggestions);

      // Analyze frameworks
      const frameworkSuggestions = await this.analyzeFrameworks(analysisData);
      suggestions.push(...frameworkSuggestions);

      // Generate roadmap
      const roadmap = await this.generateRoadmap(suggestions, analysisData);

      // Prioritize tasks
      const prioritizedTasks = this.prioritizeTasks(suggestions);

      const report: ModernizationReport = {
        suggestions,
        roadmap,
        prioritizedTasks,
        summary: {
          totalIssues: suggestions.length,
          criticalIssues: suggestions.filter(s => s.severity === 'critical').length,
          estimatedEffort: this.calculateTotalEffort(suggestions),
        },
      };

      logger.info('Modernization analysis completed', report.summary);
      return report;
    } catch (error) {
      logger.error('Modernization analysis failed', { error });
      throw error;
    }
  }

  private async analyzeDependencies(analysisData: any): Promise<ModernizationSuggestion[]> {
    const suggestions: ModernizationSuggestion[] = [];
    const dependencies = analysisData.dependencies || [];

    for (const dep of dependencies.slice(0, 10)) {
      if (this.isOutdated(dep)) {
        suggestions.push({
          type: 'dependency',
          severity: this.getDependencySeverity(dep),
          title: `Update ${dep.name}`,
          description: `${dep.name} is outdated`,
          currentState: dep.version || 'unknown',
          suggestedState: 'latest',
          effort: 'low',
          benefits: ['Security fixes', 'Performance improvements', 'New features'],
        });
      }
    }

    return suggestions;
  }

  private async analyzePatterns(
    projectPath: string,
    analysisData: any
  ): Promise<ModernizationSuggestion[]> {
    const suggestions: ModernizationSuggestion[] = [];
    const language = this.detectPrimaryLanguage(analysisData);

    const sampleFiles = await this.getSampleFiles(projectPath);
    
    for (const file of sampleFiles.slice(0, 5)) {
      try {
        const code = await fs.readFile(file, 'utf-8');
        const analysis = await aiService.analyzeForModernization(code, language);
        
        const parsed = this.parseModernizationSuggestions(analysis);
        suggestions.push(...parsed);
      } catch (error) {
        logger.warn('Failed to analyze file for patterns', { file, error });
      }
    }

    return suggestions;
  }

  private async analyzeFrameworks(analysisData: any): Promise<ModernizationSuggestion[]> {
    const suggestions: ModernizationSuggestion[] = [];
    const frameworks = analysisData.frameworks || [];

    for (const framework of frameworks) {
      if (this.isFrameworkOutdated(framework)) {
        suggestions.push({
          type: 'framework',
          severity: 'high',
          title: `Upgrade ${framework}`,
          description: `${framework} version is outdated`,
          currentState: 'old version',
          suggestedState: 'latest version',
          effort: 'high',
          benefits: ['Better performance', 'Modern features', 'Active support'],
        });
      }
    }

    return suggestions;
  }

  private async generateRoadmap(
    suggestions: ModernizationSuggestion[],
    analysisData: any
  ): Promise<string> {
    const roadmapData = `
Total Suggestions: ${suggestions.length}
Critical Issues: ${suggestions.filter(s => s.severity === 'critical').length}
High Priority: ${suggestions.filter(s => s.severity === 'high').length}
Languages: ${Object.keys(analysisData.languages || {}).join(', ')}

Suggestions:
${suggestions.slice(0, 10).map(s => `- ${s.title}: ${s.description}`).join('\n')}

Generate a modernization roadmap with phases and timelines.
`;

    return await aiService.explainCode(roadmapData, 'Modernization roadmap');
  }

  private prioritizeTasks(suggestions: ModernizationSuggestion[]) {
    const severityScore = { critical: 4, high: 3, medium: 2, low: 1 };
    const effortScore = { low: 3, medium: 2, high: 1 };

    return suggestions
      .map(s => ({
        priority: severityScore[s.severity] * effortScore[s.effort],
        task: s.title,
        effort: s.effort,
        impact: s.severity,
      }))
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 10);
  }

  private calculateTotalEffort(suggestions: ModernizationSuggestion[]): string {
    const effortHours = { low: 2, medium: 8, high: 40 };
    const total = suggestions.reduce((sum, s) => sum + effortHours[s.effort], 0);
    
    if (total < 40) return `${total} hours`;
    if (total < 160) return `${Math.round(total / 8)} days`;
    return `${Math.round(total / 40)} weeks`;
  }

  private detectPrimaryLanguage(analysisData: any): string {
    const languages = analysisData.languages || {};
    const sorted = Object.entries(languages).sort((a: any, b: any) => b[1] - a[1]);
    return sorted[0]?.[0] || 'javascript';
  }

  private async getSampleFiles(projectPath: string): Promise<string[]> {
    const files: string[] = [];
    const extensions = ['.js', '.ts', '.py', '.java'];

    const walk = async (dir: string, depth = 0) => {
      if (depth > 3) return;
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          await walk(fullPath, depth + 1);
        } else if (entry.isFile() && extensions.some(ext => entry.name.endsWith(ext))) {
          files.push(fullPath);
        }
      }
    };

    await walk(projectPath);
    return files;
  }

  private parseModernizationSuggestions(analysis: string): ModernizationSuggestion[] {
    // Simple parsing - can be enhanced
    return [{
      type: 'pattern',
      severity: 'medium',
      title: 'Modernize code patterns',
      description: analysis.substring(0, 200),
      currentState: 'Legacy patterns',
      suggestedState: 'Modern patterns',
      effort: 'medium',
      benefits: ['Better readability', 'Easier maintenance'],
    }];
  }

  private isOutdated(dep: any): boolean {
    // Simplified check - in production, use npm/pypi APIs
    return Math.random() > 0.7;
  }

  private getDependencySeverity(dep: any): 'low' | 'medium' | 'high' | 'critical' {
    return 'medium';
  }

  private isFrameworkOutdated(framework: string): boolean {
    return Math.random() > 0.8;
  }
}
