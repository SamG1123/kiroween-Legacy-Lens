import { AIClient, AIConfig } from './AIClient';
import {
  FunctionInfo,
  ClassInfo,
  ProjectContext,
  Component,
} from '../types';

export type DocumentationType = 'function' | 'class' | 'module';

export interface AIDocumentationEngineConfig {
  defaultModel: AIConfig['model'];
  temperature: number;
  maxTokens: number;
  maxRetries: number;
}

export class AIDocumentationEngine {
  private aiClient: AIClient;
  private config: AIDocumentationEngineConfig;

  constructor(config?: Partial<AIDocumentationEngineConfig>) {
    this.aiClient = new AIClient();
    this.config = {
      defaultModel: config?.defaultModel || 'gpt-4',
      temperature: config?.temperature ?? 0.3,
      maxTokens: config?.maxTokens || 2000,
      maxRetries: config?.maxRetries || 3,
    };
  }

  /**
   * Generate a description for a function, class, or module
   */
  async generateDescription(
    context: FunctionInfo | ClassInfo | ProjectContext,
    type: DocumentationType
  ): Promise<string> {
    const systemPrompt = this.getSystemPrompt(type);
    const userPrompt = this.buildPrompt(context, type);

    const aiConfig: AIConfig = {
      model: this.config.defaultModel,
      temperature: this.config.temperature,
      maxTokens: this.config.maxTokens,
    };

    try {
      const response = await this.aiClient.generateCompletionWithRetry(
        userPrompt,
        systemPrompt,
        aiConfig,
        this.config.maxRetries
      );

      return response.content.trim();
    } catch (error) {
      throw new Error(`Failed to generate ${type} description: ${(error as Error).message}`);
    }
  }

  /**
   * Generate a project summary/overview
   */
  async generateSummary(projectContext: ProjectContext): Promise<string> {
    const systemPrompt = `You are a technical documentation expert. Generate a clear, concise project summary that explains what the project does, its main purpose, and key features. Focus on the "what" and "why" rather than implementation details.`;

    const userPrompt = `Generate a project summary for the following codebase:

Project Name: ${projectContext.name}
Languages: ${projectContext.languages.join(', ')}
Frameworks: ${projectContext.frameworks.join(', ')}
Dependencies: ${projectContext.dependencies.slice(0, 10).map(d => d.name).join(', ')}${projectContext.dependencies.length > 10 ? '...' : ''}
Entry Points: ${projectContext.mainEntryPoints.join(', ')}
Total Lines of Code: ${projectContext.metrics.totalLines}

Provide a 2-3 paragraph summary that describes:
1. What this project does
2. Who would use it and why
3. Key technologies and architectural approach

Keep it clear and accessible to developers who are new to this codebase.`;

    const aiConfig: AIConfig = {
      model: this.config.defaultModel,
      temperature: this.config.temperature,
      maxTokens: this.config.maxTokens,
    };

    try {
      const response = await this.aiClient.generateCompletionWithRetry(
        userPrompt,
        systemPrompt,
        aiConfig,
        this.config.maxRetries
      );

      return response.content.trim();
    } catch (error) {
      throw new Error(`Failed to generate project summary: ${(error as Error).message}`);
    }
  }

  /**
   * Generate architecture description from components
   */
  async generateArchitectureDescription(components: Component[]): Promise<string> {
    const systemPrompt = `You are a software architecture expert. Generate clear, structured architecture documentation that explains how system components work together. Focus on responsibilities, relationships, and data flow. Use clear, professional language.`;

    const componentDescriptions = components.map(c => 
      `- ${c.name} (${c.type}): ${c.files.length} files, depends on [${c.dependencies.join(', ')}]`
    ).join('\n');

    const userPrompt = `Generate an architecture description for a system with the following components:

${componentDescriptions}

Provide:
1. An overview of the architectural approach
2. How components interact and their responsibilities
3. Key design patterns or architectural decisions
4. Data flow between major components

Keep it clear and focused on helping developers understand the system structure.`;

    const aiConfig: AIConfig = {
      model: this.config.defaultModel,
      temperature: this.config.temperature,
      maxTokens: this.config.maxTokens,
    };

    try {
      const response = await this.aiClient.generateCompletionWithRetry(
        userPrompt,
        systemPrompt,
        aiConfig,
        this.config.maxRetries
      );

      return response.content.trim();
    } catch (error) {
      throw new Error(`Failed to generate architecture description: ${(error as Error).message}`);
    }
  }

  /**
   * Improve existing documentation with additional context
   */
  async improveExistingDoc(existingDoc: string, context: any): Promise<string> {
    const systemPrompt = `You are a technical documentation expert. Improve existing documentation by making it clearer, more complete, and more accurate based on additional context. Preserve the original structure and style while enhancing content quality.`;

    const userPrompt = `Improve the following documentation:

${existingDoc}

Additional context:
${JSON.stringify(context, null, 2)}

Enhance the documentation by:
1. Adding missing information from the context
2. Clarifying unclear sections
3. Ensuring technical accuracy
4. Maintaining consistent terminology

Return the improved documentation in the same format.`;

    const aiConfig: AIConfig = {
      model: this.config.defaultModel,
      temperature: this.config.temperature,
      maxTokens: this.config.maxTokens,
    };

    try {
      const response = await this.aiClient.generateCompletionWithRetry(
        userPrompt,
        systemPrompt,
        aiConfig,
        this.config.maxRetries
      );

      return response.content.trim();
    } catch (error) {
      throw new Error(`Failed to improve documentation: ${(error as Error).message}`);
    }
  }

  /**
   * Get system prompt based on documentation type
   */
  private getSystemPrompt(type: DocumentationType): string {
    switch (type) {
      case 'function':
        return `You are a technical documentation expert specializing in function documentation. Generate clear, concise documentation that explains what a function does, its parameters, return value, and any important behavior. Use professional language and focus on helping developers understand how to use the function correctly.`;
      
      case 'class':
        return `You are a technical documentation expert specializing in class documentation. Generate clear, comprehensive documentation that explains a class's purpose, its public interface, key methods, and usage patterns. Focus on helping developers understand when and how to use the class.`;
      
      case 'module':
        return `You are a technical documentation expert specializing in module documentation. Generate clear documentation that explains a module's purpose, its exports, and how it fits into the larger system. Focus on helping developers understand what the module provides and when to use it.`;
      
      default:
        return `You are a technical documentation expert. Generate clear, accurate documentation based on the provided code context.`;
    }
  }

  /**
   * Build prompt based on context and type
   */
  private buildPrompt(
    context: FunctionInfo | ClassInfo | ProjectContext,
    type: DocumentationType
  ): string {
    switch (type) {
      case 'function':
        return this.buildFunctionPrompt(context as FunctionInfo);
      
      case 'class':
        return this.buildClassPrompt(context as ClassInfo);
      
      case 'module':
        return this.buildModulePrompt(context as ProjectContext);
      
      default:
        return JSON.stringify(context, null, 2);
    }
  }

  /**
   * Build prompt for function documentation
   */
  private buildFunctionPrompt(func: FunctionInfo): string {
    const params = func.parameters.map(p => 
      `  - ${p.name}: ${p.type || 'any'}${p.optional ? ' (optional)' : ''}`
    ).join('\n');

    return `Generate documentation for the following function:

Function Name: ${func.name}
Parameters:
${params || '  (none)'}
Return Type: ${func.returnType || 'unknown'}
${func.docstring ? `Existing Documentation: ${func.docstring}` : ''}

Code:
\`\`\`
${func.body.substring(0, 500)}${func.body.length > 500 ? '...' : ''}
\`\`\`

Provide:
1. A clear description of what the function does
2. Explanation of each parameter and its purpose
3. Description of the return value
4. Any important behavior, side effects, or usage notes

Keep it concise and focused on practical usage.`;
  }

  /**
   * Build prompt for class documentation
   */
  private buildClassPrompt(cls: ClassInfo): string {
    const methods = cls.methods.slice(0, 5).map(m => 
      `  - ${m.name}(${m.parameters.map(p => p.name).join(', ')}): ${m.returnType || 'void'}`
    ).join('\n');

    const properties = cls.properties.slice(0, 5).map(p =>
      `  - ${p.name}: ${p.type || 'any'} (${p.visibility})`
    ).join('\n');

    return `Generate documentation for the following class:

Class Name: ${cls.name}
${cls.extends ? `Extends: ${cls.extends}` : ''}
${cls.implements.length > 0 ? `Implements: ${cls.implements.join(', ')}` : ''}

Properties:
${properties || '  (none)'}

Methods:
${methods || '  (none)'}
${cls.methods.length > 5 ? `  ... and ${cls.methods.length - 5} more methods` : ''}

Provide:
1. A clear description of the class's purpose and responsibility
2. When and how to use this class
3. Overview of key methods and their purposes
4. Any important usage patterns or considerations

Keep it clear and focused on helping developers use the class effectively.`;
  }

  /**
   * Build prompt for module documentation
   */
  private buildModulePrompt(context: ProjectContext): string {
    return `Generate documentation for a module/package:

Name: ${context.name}
Languages: ${context.languages.join(', ')}
Frameworks: ${context.frameworks.join(', ')}
Key Dependencies: ${context.dependencies.slice(0, 5).map(d => d.name).join(', ')}

Provide:
1. A clear description of what this module provides
2. Its main exports and functionality
3. When developers should use this module
4. Any important setup or configuration notes

Keep it concise and practical.`;
  }
}
