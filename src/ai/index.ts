/**
 * AI Module - Unified interface for AI operations using Groq
 */

export * from './GroqClient';

import { getGroqClient } from './GroqClient';

export class AIService {
  private static instance: AIService;
  private groqClient = getGroqClient();

  static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  async generateDocumentation(
    code: string,
    type: 'function' | 'class' | 'module' | 'readme',
    language?: string
  ): Promise<string> {
    return this.groqClient.generateDocumentation(code, type);
  }

  async generateTests(
    code: string,
    language: string,
    framework?: 'jest' | 'mocha' | 'pytest' | 'junit'
  ): Promise<string> {
    const testFramework = framework || this.getDefaultTestFramework(language);
    return this.groqClient.generateTests(code, testFramework);
  }

  async analyzeForModernization(code: string, language: string): Promise<string> {
    return this.groqClient.analyzeForModernization(code, language);
  }

  async suggestRefactoring(code: string, issues: string[]): Promise<string> {
    return this.groqClient.suggestRefactoring(code, issues);
  }

  async explainCode(code: string, context?: string): Promise<string> {
    return this.groqClient.explainCode(code, context);
  }

  async generateProjectSummary(projectData: {
    languages: any;
    dependencies: any[];
    metrics: any;
    issues: any[];
  }): Promise<string> {
    const prompt = `
Project Analysis Summary:

Languages: ${JSON.stringify(projectData.languages, null, 2)}
Dependencies: ${projectData.dependencies.length} total
Metrics: ${JSON.stringify(projectData.metrics, null, 2)}
Issues: ${projectData.issues.length} total

Generate a comprehensive project summary including:
1. Technology stack overview
2. Code quality assessment
3. Key findings and recommendations
4. Suggested next steps
`;

    return this.groqClient.generateCompletion([
      {
        role: 'system',
        content: 'You are a senior software architect. Generate insightful project analysis summaries.'
      },
      { role: 'user', content: prompt }
    ], { temperature: 0.4 });
  }

  async validateConnection(): Promise<boolean> {
    return this.groqClient.validateApiKey();
  }

  private getDefaultTestFramework(language: string): 'jest' | 'mocha' | 'pytest' | 'junit' {
    const frameworks: Record<string, 'jest' | 'mocha' | 'pytest' | 'junit'> = {
      javascript: 'jest',
      typescript: 'jest',
      python: 'pytest',
      java: 'junit',
      kotlin: 'junit',
    };
    
    return frameworks[language.toLowerCase()] || 'jest';
  }
}

export const aiService = AIService.getInstance();
