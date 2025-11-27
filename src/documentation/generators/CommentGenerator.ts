import { AIDocumentationEngine } from '../ai/AIDocumentationEngine';
import {
  FunctionInfo,
  ClassInfo,
  FunctionContext,
  AnnotatedCode,
} from '../types';

export type CommentLanguage = 
  | 'javascript'
  | 'typescript'
  | 'python'
  | 'java'
  | 'csharp'
  | 'go'
  | 'rust'
  | 'php'
  | 'ruby';

export class CommentGenerator {
  private aiEngine: AIDocumentationEngine;

  constructor(aiEngine?: AIDocumentationEngine) {
    this.aiEngine = aiEngine || new AIDocumentationEngine();
  }

  /**
   * Generate a documentation comment for a function using AI
   */
  async generateFunctionComment(
    func: FunctionInfo,
    context?: FunctionContext
  ): Promise<string> {
    try {
      // Build enhanced context for AI
      const enhancedContext = this.buildFunctionContext(func, context);
      
      // Generate description using AI
      const description = await this.aiEngine.generateDescription(
        func,
        'function'
      );

      // Parse the AI response to extract structured information
      return this.parseFunctionDocumentation(description, func);
    } catch (error) {
      throw new Error(
        `Failed to generate function comment for ${func.name}: ${(error as Error).message}`
      );
    }
  }

  /**
   * Generate a documentation comment for a class using AI
   */
  async generateClassComment(cls: ClassInfo): Promise<string> {
    try {
      // Generate description using AI
      const description = await this.aiEngine.generateDescription(
        cls,
        'class'
      );

      // Return the class documentation
      return description;
    } catch (error) {
      throw new Error(
        `Failed to generate class comment for ${cls.name}: ${(error as Error).message}`
      );
    }
  }

  /**
   * Generate inline comments for code
   */
  async generateInlineComments(
    code: string,
    language: CommentLanguage
  ): Promise<AnnotatedCode> {
    // This is a placeholder for future implementation
    // For now, return the original code without annotations
    return {
      originalCode: code,
      annotatedCode: code,
      comments: [],
    };
  }

  /**
   * Format a comment string for a specific language
   */
  formatComment(
    comment: string,
    language: CommentLanguage,
    func?: FunctionInfo,
    cls?: ClassInfo
  ): string {
    switch (language) {
      case 'javascript':
      case 'typescript':
        return this.formatJSDoc(comment, func, cls);
      
      case 'python':
        return this.formatPythonDocstring(comment, func, cls);
      
      case 'java':
        return this.formatJavaDoc(comment, func, cls);
      
      case 'csharp':
        return this.formatXMLComment(comment, func, cls);
      
      case 'go':
        return this.formatGoComment(comment, func);
      
      case 'rust':
        return this.formatRustComment(comment, func);
      
      case 'php':
        return this.formatPHPDoc(comment, func, cls);
      
      case 'ruby':
        return this.formatRubyComment(comment, func, cls);
      
      default:
        // Default to C-style block comment
        return `/**\n * ${comment.split('\n').join('\n * ')}\n */`;
    }
  }

  /**
   * Build enhanced context for function documentation
   */
  private buildFunctionContext(
    func: FunctionInfo,
    context?: FunctionContext
  ): string {
    const parts: string[] = [];

    if (context) {
      if (context.callers.length > 0) {
        parts.push(`Called by: ${context.callers.join(', ')}`);
      }
      if (context.callees.length > 0) {
        parts.push(`Calls: ${context.callees.join(', ')}`);
      }
      if (context.sideEffects.length > 0) {
        parts.push(`Side effects: ${context.sideEffects.join(', ')}`);
      }
    }

    return parts.join('\n');
  }

  /**
   * Parse AI-generated function documentation into structured format
   */
  private parseFunctionDocumentation(
    description: string,
    func: FunctionInfo
  ): string {
    // The AI response should already be well-formatted
    // Just ensure it's clean and ready to use
    return description.trim();
  }

  /**
   * Format comment as JSDoc (JavaScript/TypeScript)
   */
  private formatJSDoc(
    comment: string,
    func?: FunctionInfo,
    cls?: ClassInfo
  ): string {
    const lines: string[] = ['/**'];

    // Add main description
    const descLines = comment.split('\n');
    descLines.forEach(line => {
      lines.push(` * ${line}`);
    });

    // Add function-specific tags
    if (func) {
      lines.push(' *');
      
      // Add @param tags
      func.parameters.forEach(param => {
        const optional = param.optional ? '=' : '';
        const type = param.type ? `{${param.type}}` : '';
        const desc = param.description || '';
        lines.push(` * @param ${type} ${optional}${param.name} ${desc}`.trim());
      });

      // Add @returns tag
      if (func.returnType && func.returnType !== 'void') {
        lines.push(` * @returns {${func.returnType}}`);
      }
    }

    // Add class-specific tags
    if (cls) {
      if (cls.extends) {
        lines.push(` * @extends ${cls.extends}`);
      }
      cls.implements.forEach(impl => {
        lines.push(` * @implements ${impl}`);
      });
    }

    lines.push(' */');
    return lines.join('\n');
  }

  /**
   * Format comment as Python docstring
   */
  private formatPythonDocstring(
    comment: string,
    func?: FunctionInfo,
    cls?: ClassInfo
  ): string {
    const lines: string[] = ['"""'];

    // Add main description
    lines.push(comment);

    // Add function-specific sections
    if (func && func.parameters.length > 0) {
      lines.push('');
      lines.push('Args:');
      func.parameters.forEach(param => {
        const type = param.type ? ` (${param.type})` : '';
        const desc = param.description || '';
        lines.push(`    ${param.name}${type}: ${desc}`);
      });
    }

    // Add returns section
    if (func && func.returnType && func.returnType !== 'None') {
      lines.push('');
      lines.push('Returns:');
      lines.push(`    ${func.returnType}`);
    }

    lines.push('"""');
    return lines.join('\n');
  }

  /**
   * Format comment as JavaDoc
   */
  private formatJavaDoc(
    comment: string,
    func?: FunctionInfo,
    cls?: ClassInfo
  ): string {
    const lines: string[] = ['/**'];

    // Add main description
    const descLines = comment.split('\n');
    descLines.forEach(line => {
      lines.push(` * ${line}`);
    });

    // Add function-specific tags
    if (func) {
      lines.push(' *');
      
      // Add @param tags
      func.parameters.forEach(param => {
        const desc = param.description || '';
        lines.push(` * @param ${param.name} ${desc}`.trim());
      });

      // Add @return tag
      if (func.returnType && func.returnType !== 'void') {
        lines.push(` * @return ${func.returnType}`);
      }
    }

    lines.push(' */');
    return lines.join('\n');
  }

  /**
   * Format comment as XML documentation (C#)
   */
  private formatXMLComment(
    comment: string,
    func?: FunctionInfo,
    cls?: ClassInfo
  ): string {
    const lines: string[] = ['///'];

    // Add summary
    lines.push('/// <summary>');
    const descLines = comment.split('\n');
    descLines.forEach(line => {
      lines.push(`/// ${line}`);
    });
    lines.push('/// </summary>');

    // Add function-specific tags
    if (func) {
      // Add param tags
      func.parameters.forEach(param => {
        const desc = param.description || '';
        lines.push(`/// <param name="${param.name}">${desc}</param>`);
      });

      // Add returns tag
      if (func.returnType && func.returnType !== 'void') {
        lines.push(`/// <returns>${func.returnType}</returns>`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Format comment as Go comment
   */
  private formatGoComment(comment: string, func?: FunctionInfo): string {
    const lines: string[] = [];

    // Go comments should start with the function/type name
    if (func) {
      const firstLine = `${func.name} ${comment.split('\n')[0]}`;
      lines.push(`// ${firstLine}`);
      
      const restLines = comment.split('\n').slice(1);
      restLines.forEach(line => {
        if (line.trim()) {
          lines.push(`// ${line}`);
        }
      });
    } else {
      comment.split('\n').forEach(line => {
        lines.push(`// ${line}`);
      });
    }

    return lines.join('\n');
  }

  /**
   * Format comment as Rust documentation comment
   */
  private formatRustComment(comment: string, func?: FunctionInfo): string {
    const lines: string[] = [];

    // Add main description
    comment.split('\n').forEach(line => {
      lines.push(`/// ${line}`);
    });

    // Add function-specific sections
    if (func && func.parameters.length > 0) {
      lines.push('///');
      lines.push('/// # Arguments');
      lines.push('///');
      func.parameters.forEach(param => {
        const desc = param.description || '';
        lines.push(`/// * \`${param.name}\` - ${desc}`);
      });
    }

    // Add returns section
    if (func && func.returnType && func.returnType !== '()') {
      lines.push('///');
      lines.push('/// # Returns');
      lines.push('///');
      lines.push(`/// ${func.returnType}`);
    }

    return lines.join('\n');
  }

  /**
   * Format comment as PHPDoc
   */
  private formatPHPDoc(
    comment: string,
    func?: FunctionInfo,
    cls?: ClassInfo
  ): string {
    const lines: string[] = ['/**'];

    // Add main description
    const descLines = comment.split('\n');
    descLines.forEach(line => {
      lines.push(` * ${line}`);
    });

    // Add function-specific tags
    if (func) {
      lines.push(' *');
      
      // Add @param tags
      func.parameters.forEach(param => {
        const type = param.type || 'mixed';
        const desc = param.description || '';
        lines.push(` * @param ${type} $${param.name} ${desc}`.trim());
      });

      // Add @return tag
      if (func.returnType) {
        lines.push(` * @return ${func.returnType}`);
      }
    }

    lines.push(' */');
    return lines.join('\n');
  }

  /**
   * Format comment as Ruby documentation
   */
  private formatRubyComment(
    comment: string,
    func?: FunctionInfo,
    cls?: ClassInfo
  ): string {
    const lines: string[] = [];

    // Add main description
    comment.split('\n').forEach(line => {
      lines.push(`# ${line}`);
    });

    // Add function-specific sections
    if (func && func.parameters.length > 0) {
      lines.push('#');
      lines.push('# @param [Type] name description');
      func.parameters.forEach(param => {
        const type = param.type || 'Object';
        const desc = param.description || '';
        lines.push(`# @param [${type}] ${param.name} ${desc}`);
      });
    }

    // Add returns section
    if (func && func.returnType) {
      lines.push(`# @return [${func.returnType}]`);
    }

    return lines.join('\n');
  }
}
