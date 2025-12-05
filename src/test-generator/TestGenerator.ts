/**
 * Test Generator
 * Auto-generates unit tests using Groq AI
 */

import { aiService } from '../ai';
import * as fs from 'fs/promises';
import * as path from 'path';
import { logger } from '../utils/logger';

export interface TestGenerationOptions {
  framework?: 'jest' | 'mocha' | 'pytest' | 'junit';
  coverage?: 'basic' | 'comprehensive';
  includeEdgeCases?: boolean;
}

export interface GeneratedTests {
  testFiles: Map<string, string>;
  coverageGaps: string[];
  summary: {
    totalTests: number;
    filesWithTests: number;
    estimatedCoverage: number;
  };
}

export class TestGenerator {
  async generateTests(
    projectPath: string,
    analysisData: any,
    options: TestGenerationOptions = {}
  ): Promise<GeneratedTests> {
    logger.info('Starting test generation', { projectPath });

    const result: GeneratedTests = {
      testFiles: new Map(),
      coverageGaps: [],
      summary: {
        totalTests: 0,
        filesWithTests: 0,
        estimatedCoverage: 0,
      },
    };

    try {
      const language = this.detectPrimaryLanguage(analysisData);
      const framework = options.framework || this.getDefaultFramework(language);

      const sourceFiles = await this.findTestableFiles(projectPath);
      
      for (const file of sourceFiles.slice(0, 15)) {
        try {
          const code = await fs.readFile(file, 'utf-8');
          const tests = await this.generateTestsForFile(code, language, framework);
          
          const testFileName = this.getTestFileName(file, framework);
          result.testFiles.set(testFileName, tests);
          result.summary.filesWithTests++;
        } catch (error) {
          logger.warn('Failed to generate tests for file', { file, error });
          result.coverageGaps.push(file);
        }
      }

      result.summary.totalTests = result.testFiles.size;
      result.summary.estimatedCoverage = this.calculateCoverage(
        result.summary.filesWithTests,
        sourceFiles.length
      );

      logger.info('Test generation completed', result.summary);
      return result;
    } catch (error) {
      logger.error('Test generation failed', { error });
      throw error;
    }
  }

  private async generateTestsForFile(
    code: string,
    language: string,
    framework: string
  ): Promise<string> {
    return await aiService.generateTests(code, language, framework as any);
  }

  private detectPrimaryLanguage(analysisData: any): string {
    const languages = analysisData.languages || {};
    const sorted = Object.entries(languages).sort((a: any, b: any) => b[1] - a[1]);
    return sorted[0]?.[0] || 'javascript';
  }

  private getDefaultFramework(language: string): 'jest' | 'mocha' | 'pytest' | 'junit' {
    const frameworks: Record<string, any> = {
      javascript: 'jest',
      typescript: 'jest',
      python: 'pytest',
      java: 'junit',
      kotlin: 'junit',
    };
    return frameworks[language.toLowerCase()] || 'jest';
  }

  private async findTestableFiles(projectPath: string): Promise<string[]> {
    const files: string[] = [];
    const extensions = ['.js', '.ts', '.py', '.java'];

    const walk = async (dir: string) => {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory() && !this.shouldSkipDir(entry.name)) {
          await walk(fullPath);
        } else if (entry.isFile() && extensions.some(ext => entry.name.endsWith(ext))) {
          if (!this.isTestFile(entry.name)) {
            files.push(fullPath);
          }
        }
      }
    };

    await walk(projectPath);
    return files;
  }

  private shouldSkipDir(name: string): boolean {
    return name.startsWith('.') || 
           name === 'node_modules' || 
           name === '__pycache__' ||
           name === 'dist' ||
           name === 'build';
  }

  private isTestFile(name: string): boolean {
    return name.includes('.test.') || 
           name.includes('.spec.') || 
           name.includes('_test.');
  }

  private getTestFileName(sourceFile: string, framework: string): string {
    const ext = path.extname(sourceFile);
    const base = path.basename(sourceFile, ext);
    const dir = path.dirname(sourceFile);
    
    if (framework === 'pytest') {
      return path.join(dir, `test_${base}.py`);
    }
    return path.join(dir, `${base}.test${ext}`);
  }

  private calculateCoverage(tested: number, total: number): number {
    return total > 0 ? Math.round((tested / total) * 100) : 0;
  }
}
