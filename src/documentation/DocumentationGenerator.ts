/**
 * Documentation Generator
 * Auto-generates comprehensive documentation using Groq AI
 */

import { aiService } from '../ai';
import * as fs from 'fs/promises';
import * as path from 'path';
import { logger } from '../utils/logger';

export interface DocumentationOptions {
  includeReadme?: boolean;
  includeFunctionDocs?: boolean;
  includeArchitecture?: boolean;
  includeApiDocs?: boolean;
}

export interface GeneratedDocumentation {
  readme?: string;
  functionDocs: Map<string, string>;
  architecture?: string;
  apiDocs?: string;
}

export class DocumentationGenerator {
  async generateDocumentation(
    projectPath: string,
    analysisData: any,
    options: DocumentationOptions = {}
  ): Promise<GeneratedDocumentation> {
    logger.info('Starting documentation generation', { projectPath });

    const result: GeneratedDocumentation = {
      functionDocs: new Map(),
    };

    try {
      // Generate README
      if (options.includeReadme !== false) {
        result.readme = await this.generateReadme(projectPath, analysisData);
      }

      // Generate function documentation
      if (options.includeFunctionDocs !== false) {
        result.functionDocs = await this.generateFunctionDocs(projectPath, analysisData);
      }

      // Generate architecture overview
      if (options.includeArchitecture !== false) {
        result.architecture = await this.generateArchitecture(analysisData);
      }

      // Generate API documentation
      if (options.includeApiDocs !== false) {
        result.apiDocs = await this.generateApiDocs(projectPath, analysisData);
      }

      logger.info('Documentation generation completed');
      return result;
    } catch (error) {
      logger.error('Documentation generation failed', { error });
      throw error;
    }
  }

  private async generateReadme(projectPath: string, analysisData: any): Promise<string> {
    logger.info('Generating README');

    const projectInfo = this.extractProjectInfo(projectPath, analysisData);
    
    const prompt = `
Project Name: ${projectInfo.name}
Languages: ${projectInfo.languages.join(', ')}
Dependencies: ${projectInfo.dependencies.slice(0, 10).join(', ')}
Frameworks: ${projectInfo.frameworks.join(', ')}
Entry Points: ${projectInfo.entryPoints.join(', ')}

Generate a comprehensive README.md with:
1. Project title and description
2. Features list
3. Installation instructions
4. Usage examples
5. Project structure
6. Dependencies
7. Contributing guidelines
`;

    return await aiService.generateDocumentation(prompt, 'readme');
  }

  private async generateFunctionDocs(
    projectPath: string,
    analysisData: any
  ): Promise<Map<string, string>> {
    logger.info('Generating function documentation');
    const docs = new Map<string, string>();

    const sourceFiles = await this.findSourceFiles(projectPath);
    
    for (const file of sourceFiles.slice(0, 20)) {
      try {
        const content = await fs.readFile(file, 'utf-8');
        const functions = this.extractFunctions(content);
        
        for (const func of functions) {
          const doc = await aiService.generateDocumentation(func.code, 'function');
          docs.set(`${file}:${func.name}`, doc);
        }
      } catch (error) {
        logger.warn('Failed to document file', { file, error });
      }
    }

    return docs;
  }

  private async generateArchitecture(analysisData: any): Promise<string> {
    logger.info('Generating architecture documentation');

    const architectureData = `
Languages: ${JSON.stringify(analysisData.languages)}
Frameworks: ${JSON.stringify(analysisData.frameworks)}
File Structure: ${analysisData.totalFiles} files
Complexity: ${analysisData.metrics?.averageComplexity || 'N/A'}
`;

    return await aiService.generateDocumentation(architectureData, 'module');
  }

  private async generateApiDocs(projectPath: string, analysisData: any): Promise<string> {
    logger.info('Generating API documentation');

    const apiFiles = await this.findApiFiles(projectPath);
    if (apiFiles.length === 0) return '';

    const apiContent = await Promise.all(
      apiFiles.slice(0, 5).map(f => fs.readFile(f, 'utf-8'))
    );

    return await aiService.explainCode(apiContent.join('\n\n'), 'API endpoints');
  }

  private extractProjectInfo(projectPath: string, analysisData: any) {
    return {
      name: path.basename(projectPath),
      languages: Object.keys(analysisData.languages || {}),
      dependencies: analysisData.dependencies?.map((d: any) => d.name) || [],
      frameworks: analysisData.frameworks || [],
      entryPoints: ['index.js', 'main.py', 'app.js', 'server.ts'],
    };
  }

  private async findSourceFiles(projectPath: string): Promise<string[]> {
    const files: string[] = [];
    const extensions = ['.js', '.ts', '.py', '.java', '.rb', '.php', '.go', '.cs'];

    const walk = async (dir: string) => {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          await walk(fullPath);
        } else if (entry.isFile() && extensions.some(ext => entry.name.endsWith(ext))) {
          files.push(fullPath);
        }
      }
    };

    await walk(projectPath);
    return files;
  }

  private async findApiFiles(projectPath: string): Promise<string[]> {
    const files = await this.findSourceFiles(projectPath);
    return files.filter(f => 
      f.includes('api') || f.includes('route') || f.includes('controller')
    );
  }

  private extractFunctions(code: string): Array<{ name: string; code: string }> {
    const functions: Array<{ name: string; code: string }> = [];
    
    // Simple regex-based extraction (can be enhanced)
    const functionRegex = /(?:function|const|let|var)\s+(\w+)\s*[=\(]/g;
    let match;
    
    while ((match = functionRegex.exec(code)) !== null) {
      const name = match[1];
      const start = match.index;
      const end = Math.min(start + 500, code.length);
      functions.push({ name, code: code.substring(start, end) });
    }
    
    return functions;
  }
}
