import { DocumentationOptions } from '../types';
import * as fs from 'fs';
import * as path from 'path';
import { minimatch } from 'minimatch';

/**
 * Handles parsing, validation, and application of documentation generation options
 */
export class DocumentationOptionsHandler {
  private options: DocumentationOptions;

  constructor(options: Partial<DocumentationOptions> = {}) {
    this.options = this.parseOptions(options);
  }

  /**
   * Parse and validate documentation options, applying defaults where needed
   */
  private parseOptions(input: Partial<DocumentationOptions>): DocumentationOptions {
    const defaults: DocumentationOptions = {
      types: ['readme', 'api', 'architecture', 'comments'],
      depth: 'standard',
      excludePaths: [],
      customTemplates: undefined,
      mergeExisting: false,
    };

    const parsed: DocumentationOptions = {
      types: this.parseDocumentationTypes(input.types ?? defaults.types),
      depth: this.parseDepthLevel(input.depth ?? defaults.depth),
      excludePaths: this.parseExclusionPatterns(input.excludePaths ?? defaults.excludePaths),
      customTemplates: input.customTemplates,
      mergeExisting: input.mergeExisting ?? defaults.mergeExisting,
    };

    return parsed;
  }

  /**
   * Validate documentation options and return validation result
   */
  validateOptions(input: any): { valid: boolean; errors?: string[] } {
    const errors: string[] = [];

    // Validate types
    if (input.types !== undefined) {
      if (!Array.isArray(input.types)) {
        errors.push('types must be an array');
      } else {
        const validTypes = ['readme', 'api', 'architecture', 'comments'];
        const invalidTypes = input.types.filter((t: any) => !validTypes.includes(t));
        if (invalidTypes.length > 0) {
          errors.push(`Invalid documentation types: ${invalidTypes.join(', ')}`);
        }
        if (input.types.length === 0) {
          errors.push('At least one documentation type must be specified');
        }
      }
    }

    // Validate depth
    if (input.depth !== undefined) {
      const validDepths = ['minimal', 'standard', 'comprehensive'];
      if (!validDepths.includes(input.depth)) {
        errors.push(`Invalid depth level: ${input.depth}. Must be one of: ${validDepths.join(', ')}`);
      }
    }

    // Validate excludePaths
    if (input.excludePaths !== undefined) {
      if (!Array.isArray(input.excludePaths)) {
        errors.push('excludePaths must be an array');
      }
    }

    // Validate mergeExisting
    if (input.mergeExisting !== undefined && typeof input.mergeExisting !== 'boolean') {
      errors.push('mergeExisting must be a boolean');
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Apply default values to partial options
   */
  applyDefaults(input: Partial<DocumentationOptions>): DocumentationOptions {
    return this.parseOptions(input);
  }

  /**
   * Parse and validate documentation types
   */
  private parseDocumentationTypes(
    types: string[] | ('readme' | 'api' | 'architecture' | 'comments')[]
  ): ('readme' | 'api' | 'architecture' | 'comments')[] {
    const validTypes = ['readme', 'api', 'architecture', 'comments'];
    const parsed = types.filter((type) => validTypes.includes(type)) as (
      | 'readme'
      | 'api'
      | 'architecture'
      | 'comments'
    )[];

    if (parsed.length === 0) {
      throw new Error('At least one documentation type must be specified');
    }

    return parsed;
  }

  /**
   * Parse and validate depth level
   */
  private parseDepthLevel(depth: string): 'minimal' | 'standard' | 'comprehensive' {
    const validDepths = ['minimal', 'standard', 'comprehensive'];
    if (!validDepths.includes(depth)) {
      throw new Error(`Invalid depth level: ${depth}. Must be one of: ${validDepths.join(', ')}`);
    }
    return depth as 'minimal' | 'standard' | 'comprehensive';
  }

  /**
   * Parse and validate exclusion patterns
   */
  private parseExclusionPatterns(patterns: string[]): string[] {
    // Validate that patterns are valid glob patterns
    return patterns.filter((pattern) => {
      try {
        minimatch('test', pattern);
        return true;
      } catch {
        console.warn(`Invalid exclusion pattern: ${pattern}`);
        return false;
      }
    });
  }

  /**
   * Get the current documentation options
   */
  getOptions(): DocumentationOptions {
    return { ...this.options };
  }

  /**
   * Check if a specific documentation type should be generated
   */
  shouldGenerateType(type: 'readme' | 'api' | 'architecture' | 'comments'): boolean {
    return this.options.types.includes(type);
  }

  /**
   * Get the depth level for documentation generation
   */
  getDepthLevel(): 'minimal' | 'standard' | 'comprehensive' {
    return this.options.depth;
  }

  /**
   * Check if a file or directory should be excluded based on exclusion patterns
   */
  shouldExclude(filePath: string): boolean {
    return this.options.excludePaths.some((pattern) => minimatch(filePath, pattern));
  }

  /**
   * Load custom template from file or use provided template string
   */
  async loadCustomTemplate(templateName: string): Promise<string | undefined> {
    if (!this.options.customTemplates) {
      return undefined;
    }

    const template = this.options.customTemplates.get(templateName);
    if (!template) {
      return undefined;
    }

    // If template looks like a file path, try to load it
    if (template.includes('/') || template.includes('\\')) {
      try {
        const templatePath = path.resolve(template);
        if (fs.existsSync(templatePath)) {
          return fs.readFileSync(templatePath, 'utf-8');
        }
      } catch (error) {
        console.warn(`Failed to load template from file: ${template}`, error);
      }
    }

    // Otherwise, treat it as a template string
    return template;
  }

  /**
   * Apply custom template to content
   */
  applyTemplate(templateContent: string, variables: Record<string, string>): string {
    let result = templateContent;

    // Simple template variable replacement: {{variableName}}
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      result = result.replace(regex, value);
    }

    return result;
  }

  /**
   * Determine how to handle existing documentation
   */
  shouldMergeExisting(): boolean {
    return this.options.mergeExisting;
  }

  /**
   * Merge new documentation with existing documentation
   */
  mergeDocumentation(existing: string, generated: string): string {
    if (!this.shouldMergeExisting()) {
      return generated;
    }

    // Simple merge strategy: preserve existing content and append new content
    // More sophisticated merging can be implemented based on specific needs
    const separator = '\n\n---\n\n';
    return `${existing}${separator}${generated}`;
  }

  /**
   * Get detail level based on depth setting
   * Returns a numeric value for comparison: minimal=1, standard=2, comprehensive=3
   */
  getDetailLevel(): number {
    const levels = {
      minimal: 1,
      standard: 2,
      comprehensive: 3,
    };
    return levels[this.options.depth];
  }

  /**
   * Check if a detail level should be included based on current depth setting
   */
  shouldIncludeDetail(requiredLevel: 'minimal' | 'standard' | 'comprehensive'): boolean {
    const levels = {
      minimal: 1,
      standard: 2,
      comprehensive: 3,
    };
    return this.getDetailLevel() >= levels[requiredLevel];
  }
}
