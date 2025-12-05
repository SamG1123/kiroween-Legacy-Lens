/**
 * AI Orchestrator
 * Coordinates all AI-powered features
 */

import { DocumentationGenerator } from '../documentation/DocumentationGenerator';
import { TestGenerator } from '../test-generator/TestGenerator';
import { ModernizationAdvisor } from '../modernization/ModernizationAdvisor';
import { RefactoringEngine } from '../refactoring/RefactoringEngine';
import { logger } from '../utils/logger';

export interface AIAnalysisOptions {
  generateDocs?: boolean;
  generateTests?: boolean;
  analyzeModernization?: boolean;
  suggestRefactorings?: boolean;
}

export interface AIAnalysisResult {
  documentation?: any;
  tests?: any;
  modernization?: any;
  refactoring?: any;
  summary: {
    completedTasks: string[];
    failedTasks: string[];
    totalTime: number;
  };
}

export class AIOrchestrator {
  private docGenerator = new DocumentationGenerator();
  private testGenerator = new TestGenerator();
  private modernizationAdvisor = new ModernizationAdvisor();
  private refactoringEngine = new RefactoringEngine();

  async runFullAnalysis(
    projectPath: string,
    analysisData: any,
    options: AIAnalysisOptions = {}
  ): Promise<AIAnalysisResult> {
    const startTime = Date.now();
    logger.info('Starting full AI analysis', { projectPath, options });

    const result: AIAnalysisResult = {
      summary: {
        completedTasks: [],
        failedTasks: [],
        totalTime: 0,
      },
    };

    // Default to all features enabled
    const opts = {
      generateDocs: options.generateDocs !== false,
      generateTests: options.generateTests !== false,
      analyzeModernization: options.analyzeModernization !== false,
      suggestRefactorings: options.suggestRefactorings !== false,
    };

    // Run all analyses in parallel for speed
    const tasks = [];

    if (opts.generateDocs) {
      tasks.push(
        this.runTask('documentation', async () => {
          result.documentation = await this.docGenerator.generateDocumentation(
            projectPath,
            analysisData
          );
        })
      );
    }

    if (opts.generateTests) {
      tasks.push(
        this.runTask('tests', async () => {
          result.tests = await this.testGenerator.generateTests(
            projectPath,
            analysisData
          );
        })
      );
    }

    if (opts.analyzeModernization) {
      tasks.push(
        this.runTask('modernization', async () => {
          result.modernization = await this.modernizationAdvisor.analyzeForModernization(
            projectPath,
            analysisData
          );
        })
      );
    }

    if (opts.suggestRefactorings) {
      tasks.push(
        this.runTask('refactoring', async () => {
          result.refactoring = await this.refactoringEngine.analyzeForRefactoring(
            projectPath,
            analysisData
          );
        })
      );
    }

    // Wait for all tasks to complete
    const taskResults = await Promise.allSettled(tasks);

    // Process results
    taskResults.forEach((taskResult, index) => {
      const taskName = ['documentation', 'tests', 'modernization', 'refactoring'][index];
      if (taskResult.status === 'fulfilled') {
        result.summary.completedTasks.push(taskName);
      } else {
        result.summary.failedTasks.push(taskName);
        logger.error(`Task ${taskName} failed`, { error: taskResult.reason });
      }
    });

    result.summary.totalTime = Date.now() - startTime;
    logger.info('AI analysis completed', result.summary);

    return result;
  }

  private async runTask(name: string, task: () => Promise<void>): Promise<void> {
    logger.info(`Starting task: ${name}`);
    const start = Date.now();
    
    try {
      await task();
      logger.info(`Task ${name} completed`, { duration: Date.now() - start });
    } catch (error) {
      logger.error(`Task ${name} failed`, { error, duration: Date.now() - start });
      throw error;
    }
  }
}
