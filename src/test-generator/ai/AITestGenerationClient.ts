// AI Test Generation Client
// Wrapper for AI API calls specific to test generation

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

export interface AITestGenerationConfig {
  provider: 'openai' | 'anthropic';
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
}

export class AIGenerationError extends Error {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'AIGenerationError';
  }
}

export class AITestGenerationClient {
  private openaiClient?: OpenAI;
  private anthropicClient?: Anthropic;
  private config: AITestGenerationConfig;

  constructor(config: AITestGenerationConfig) {
    this.config = {
      temperature: 0.7,
      maxTokens: 2000,
      timeout: 30000, // 30 seconds default
      ...config,
    };

    if (config.provider === 'openai') {
      this.openaiClient = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        timeout: this.config.timeout,
      });
    } else if (config.provider === 'anthropic') {
      this.anthropicClient = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
        timeout: this.config.timeout,
      });
    }
  }

  async generateTestLogic(prompt: string): Promise<string> {
    try {
      if (this.config.provider === 'openai' && this.openaiClient) {
        return await this.generateWithOpenAI(prompt);
      } else if (this.config.provider === 'anthropic' && this.anthropicClient) {
        return await this.generateWithAnthropic(prompt);
      }

      throw new AIGenerationError(
        'No AI client configured',
        this.config.provider
      );
    } catch (error) {
      if (error instanceof AIGenerationError) {
        throw error;
      }

      // Wrap other errors with context
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new AIGenerationError(
        `AI generation failed: ${errorMessage}`,
        this.config.provider,
        error instanceof Error ? error : undefined
      );
    }
  }

  async generateMockCode(prompt: string): Promise<string> {
    return this.generateTestLogic(prompt);
  }

  async suggestTestCases(prompt: string): Promise<string> {
    return this.generateTestLogic(prompt);
  }

  private async generateWithOpenAI(prompt: string): Promise<string> {
    try {
      const response = await this.openaiClient!.chat.completions.create({
        model: this.config.model || 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at writing comprehensive unit tests. Generate test code based on the provided requirements.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
      });

      const content = response.choices[0]?.message?.content;
      
      if (!content) {
        throw new AIGenerationError(
          'OpenAI returned empty response',
          'openai'
        );
      }

      return content;
    } catch (error) {
      // Handle specific OpenAI errors
      if (error instanceof Error) {
        const message = error.message.toLowerCase();
        
        if (message.includes('rate limit')) {
          throw new AIGenerationError(
            'OpenAI rate limit exceeded. Please wait and retry.',
            'openai',
            error
          );
        }
        
        if (message.includes('api key') || message.includes('authentication')) {
          throw new AIGenerationError(
            'OpenAI authentication failed. Check your API key.',
            'openai',
            error
          );
        }
        
        if (message.includes('timeout')) {
          throw new AIGenerationError(
            'OpenAI request timed out. Try again or increase timeout.',
            'openai',
            error
          );
        }
      }

      throw error;
    }
  }

  private async generateWithAnthropic(prompt: string): Promise<string> {
    try {
      const response = await this.anthropicClient!.messages.create({
        model: this.config.model || 'claude-3-5-sonnet-20241022',
        max_tokens: this.config.maxTokens || 2000,
        temperature: this.config.temperature,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const textContent = response.content.find((block) => block.type === 'text');
      const content = textContent && 'text' in textContent ? textContent.text : '';
      
      if (!content) {
        throw new AIGenerationError(
          'Anthropic returned empty response',
          'anthropic'
        );
      }

      return content;
    } catch (error) {
      // Handle specific Anthropic errors
      if (error instanceof Error) {
        const message = error.message.toLowerCase();
        
        if (message.includes('rate limit')) {
          throw new AIGenerationError(
            'Anthropic rate limit exceeded. Please wait and retry.',
            'anthropic',
            error
          );
        }
        
        if (message.includes('api key') || message.includes('authentication')) {
          throw new AIGenerationError(
            'Anthropic authentication failed. Check your API key.',
            'anthropic',
            error
          );
        }
        
        if (message.includes('timeout')) {
          throw new AIGenerationError(
            'Anthropic request timed out. Try again or increase timeout.',
            'anthropic',
            error
          );
        }
      }

      throw error;
    }
  }
}
