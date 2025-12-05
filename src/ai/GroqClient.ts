/**
 * Groq AI Client - Ultra-fast AI inference
 * Using Groq's LPU technology for blazing fast responses
 */

import axios, { AxiosInstance } from 'axios';

export interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GroqResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class GroqClient {
  private client: AxiosInstance;
  private model: string;

  constructor(apiKey?: string, model: string = 'llama3-8b-8192') {
    this.model = model;
    
    if (!apiKey) {
      throw new Error('Groq API key is required. Get one from https://console.groq.com/keys');
    }

    this.client = axios.create({
      baseURL: 'https://api.groq.com/openai/v1',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
  }

  async generateCompletion(
    messages: GroqMessage[],
    options: {
      temperature?: number;
      maxTokens?: number;
      model?: string;
    } = {}
  ): Promise<string> {
    try {
      const response = await this.client.post('/chat/completions', {
        model: options.model || this.model,
        messages,
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 1000,
        stream: false,
      });

      const data: GroqResponse = response.data;
      return data.choices[0]?.message?.content || '';
    } catch (error: any) {
      console.error('Groq API error:', error.response?.data || error.message);
      throw new Error(`Groq API error: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  async generateDocumentation(
    code: string,
    type: 'function' | 'class' | 'module' | 'readme'
  ): Promise<string> {
    const systemPrompts = {
      function: 'You are a code documentation expert. Generate clear, concise JSDoc comments for functions.',
      class: 'You are a code documentation expert. Generate clear, concise class documentation.',
      module: 'You are a code documentation expert. Generate clear module documentation.',
      readme: 'You are a technical writer. Generate a comprehensive README.md file.'
    };

    const messages: GroqMessage[] = [
      { role: 'system', content: systemPrompts[type] },
      { role: 'user', content: `Generate documentation for this ${type}:\n\n${code}` }
    ];

    return this.generateCompletion(messages, { temperature: 0.3 });
  }

  async generateTests(
    code: string,
    framework: 'jest' | 'mocha' | 'pytest' | 'junit' = 'jest'
  ): Promise<string> {
    const messages: GroqMessage[] = [
      {
        role: 'system',
        content: `You are a test generation expert. Generate comprehensive unit tests using ${framework}.`
      },
      { role: 'user', content: `Generate unit tests for this code:\n\n${code}` }
    ];

    return this.generateCompletion(messages, { temperature: 0.2 });
  }

  async analyzeForModernization(code: string, language: string): Promise<string> {
    const messages: GroqMessage[] = [
      {
        role: 'system',
        content: `You are a ${language} modernization expert. Analyze code and suggest modern improvements.`
      },
      { role: 'user', content: `Analyze this ${language} code and suggest modernization improvements:\n\n${code}` }
    ];

    return this.generateCompletion(messages, { temperature: 0.4 });
  }

  async suggestRefactoring(code: string, issues: string[]): Promise<string> {
    const messages: GroqMessage[] = [
      {
        role: 'system',
        content: 'You are a code refactoring expert. Suggest safe, behavior-preserving refactorings.'
      },
      {
        role: 'user',
        content: `Code:\n${code}\n\nIssues found:\n${issues.join('\n')}\n\nSuggest refactorings:`
      }
    ];

    return this.generateCompletion(messages, { temperature: 0.3 });
  }

  async explainCode(code: string, context?: string): Promise<string> {
    const messages: GroqMessage[] = [
      {
        role: 'system',
        content: 'You are a code explanation expert. Explain code functionality clearly and concisely.'
      },
      {
        role: 'user',
        content: `${context ? `Context: ${context}\n\n` : ''}Explain this code:\n\n${code}`
      }
    ];

    return this.generateCompletion(messages, { temperature: 0.2 });
  }

  async validateApiKey(): Promise<boolean> {
    try {
      await this.generateCompletion([{ role: 'user', content: 'Hello' }], { maxTokens: 5 });
      return true;
    } catch {
      return false;
    }
  }
}

let groqClient: GroqClient | null = null;

export function getGroqClient(): GroqClient {
  if (!groqClient) {
    const apiKey = process.env.GROQ_API_KEY;
    const model = process.env.AI_MODEL || 'llama3-8b-8192';
    
    if (!apiKey) {
      throw new Error('GROQ_API_KEY environment variable is required');
    }
    
    groqClient = new GroqClient(apiKey, model);
  }
  
  return groqClient;
}
