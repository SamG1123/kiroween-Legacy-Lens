import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

/**
 * AI client for generating naming suggestions and SOLID refactoring recommendations
 */
export class AIRefactoringClient {
  private openaiClient?: OpenAI;
  private anthropicClient?: Anthropic;
  private provider: 'openai' | 'anthropic';

  constructor(provider: 'openai' | 'anthropic' = 'openai') {
    this.provider = provider;
    
    if (provider === 'openai' && process.env.OPENAI_API_KEY) {
      this.openaiClient = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    } else if (provider === 'anthropic' && process.env.ANTHROPIC_API_KEY) {
      this.anthropicClient = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
    }
  }

  /**
   * Suggest a descriptive name for a method based on its code
   */
  async suggestMethodName(code: string, context?: string): Promise<string> {
    const prompt = `Given the following code${context ? ` in the context of ${context}` : ''}, suggest a clear, descriptive method name that follows naming conventions. Return only the method name, nothing else.

Code:
\`\`\`
${code}
\`\`\`

Method name:`;

    const response = await this.generateCompletion(prompt);
    return response.trim();
  }

  /**
   * Suggest a descriptive name for a variable based on its usage
   */
  async suggestVariableName(
    currentName: string,
    usage: string,
    type?: string
  ): Promise<string> {
    const prompt = `The variable "${currentName}" is used as follows${type ? ` and has type ${type}` : ''}:

${usage}

Suggest a more descriptive variable name that clearly indicates its purpose. Return only the variable name, nothing else.

Variable name:`;

    const response = await this.generateCompletion(prompt);
    return response.trim();
  }

  /**
   * Suggest SOLID principle refactorings for a class
   */
  async suggestSOLIDRefactorings(
    classCode: string,
    violationType: string
  ): Promise<{
    principle: string;
    suggestion: string;
    explanation: string;
  }> {
    const prompt = `Analyze the following class for ${violationType} violations:

\`\`\`
${classCode}
\`\`\`

Provide:
1. Which SOLID principle is violated
2. A specific refactoring suggestion
3. A brief explanation of why this improves the design

Format your response as JSON with keys: principle, suggestion, explanation`;

    const response = await this.generateCompletion(prompt);
    
    try {
      return JSON.parse(response);
    } catch {
      // Fallback if JSON parsing fails
      return {
        principle: 'Unknown',
        suggestion: response,
        explanation: 'See suggestion for details',
      };
    }
  }

  /**
   * Generate a completion using the configured AI provider
   */
  private async generateCompletion(prompt: string): Promise<string> {
    if (this.provider === 'openai' && this.openaiClient) {
      const completion = await this.openaiClient.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a code refactoring expert. Provide concise, accurate suggestions.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 500,
      });

      return completion.choices[0]?.message?.content || '';
    } else if (this.provider === 'anthropic' && this.anthropicClient) {
      const completion = await this.anthropicClient.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 500,
        temperature: 0.3,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const textContent = completion.content.find(c => c.type === 'text');
      return textContent && 'text' in textContent ? textContent.text : '';
    }

    throw new Error('No AI provider configured. Set OPENAI_API_KEY or ANTHROPIC_API_KEY.');
  }
}
