import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

export interface AIConfig {
  model: 'gpt-4' | 'gpt-4-turbo' | 'claude-3-opus' | 'claude-3-sonnet' | 'gpt-3.5-turbo';
  temperature: number;
  maxTokens: number;
}

export interface AIResponse {
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export class AIClient {
  private openai: OpenAI | null = null;
  private anthropic: Anthropic | null = null;

  constructor() {
    // Initialize OpenAI client if API key is available
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }

    // Initialize Anthropic client if API key is available
    if (process.env.ANTHROPIC_API_KEY) {
      this.anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
    }
  }

  async generateCompletion(
    prompt: string,
    systemPrompt: string,
    config: AIConfig
  ): Promise<AIResponse> {
    const isClaudeModel = config.model.startsWith('claude');

    if (isClaudeModel) {
      return this.generateClaudeCompletion(prompt, systemPrompt, config);
    } else {
      return this.generateOpenAICompletion(prompt, systemPrompt, config);
    }
  }

  private async generateOpenAICompletion(
    prompt: string,
    systemPrompt: string,
    config: AIConfig
  ): Promise<AIResponse> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized. Please set OPENAI_API_KEY environment variable.');
    }

    const response = await this.openai.chat.completions.create({
      model: config.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      temperature: config.temperature,
      max_tokens: config.maxTokens,
    });

    return {
      content: response.choices[0]?.message?.content || '',
      model: response.model,
      usage: response.usage ? {
        promptTokens: response.usage.prompt_tokens,
        completionTokens: response.usage.completion_tokens,
        totalTokens: response.usage.total_tokens,
      } : undefined,
    };
  }

  private async generateClaudeCompletion(
    prompt: string,
    systemPrompt: string,
    config: AIConfig
  ): Promise<AIResponse> {
    if (!this.anthropic) {
      throw new Error('Anthropic client not initialized. Please set ANTHROPIC_API_KEY environment variable.');
    }

    const response = await this.anthropic.messages.create({
      model: config.model,
      max_tokens: config.maxTokens,
      temperature: config.temperature,
      system: systemPrompt,
      messages: [
        { role: 'user', content: prompt },
      ],
    });

    const content = response.content[0];
    const textContent = content.type === 'text' ? content.text : '';

    return {
      content: textContent,
      model: response.model,
      usage: {
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
      },
    };
  }

  async generateCompletionWithRetry(
    prompt: string,
    systemPrompt: string,
    config: AIConfig,
    maxRetries: number = 3
  ): Promise<AIResponse> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await this.generateCompletion(prompt, systemPrompt, config);
      } catch (error) {
        lastError = error as Error;
        
        // Exponential backoff
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw new Error(`Failed after ${maxRetries} attempts: ${lastError?.message}`);
  }
}
