import { ProjectContext, Dependency, DirectoryTree } from '../types';
import { AIDocumentationEngine } from '../ai/AIDocumentationEngine';

export class READMEGenerator {
  private aiEngine: AIDocumentationEngine;

  constructor(aiEngine?: AIDocumentationEngine) {
    this.aiEngine = aiEngine || new AIDocumentationEngine();
  }

  /**
   * Generate a complete README.md file
   */
  async generate(projectContext: ProjectContext): Promise<string> {
    const sections: string[] = [];

    // Title
    sections.push(`# ${this.generateTitle(projectContext)}`);
    sections.push('');

    // Description
    const description = await this.generateDescription(projectContext);
    sections.push(description);
    sections.push('');

    // Technologies section
    if (projectContext.languages.length > 0 || projectContext.frameworks.length > 0) {
      sections.push('## Technologies');
      sections.push('');
      
      if (projectContext.languages.length > 0) {
        sections.push(`**Languages:** ${projectContext.languages.join(', ')}`);
        sections.push('');
      }
      
      if (projectContext.frameworks.length > 0) {
        sections.push(`**Frameworks:** ${projectContext.frameworks.join(', ')}`);
        sections.push('');
      }
    }

    // Installation section
    if (projectContext.dependencies.length > 0) {
      sections.push('## Installation');
      sections.push('');
      sections.push(this.generateInstallation(projectContext.dependencies));
      sections.push('');
    }

    // Project Structure section
    sections.push('## Project Structure');
    sections.push('');
    sections.push(this.generateProjectStructure(projectContext.structure));
    sections.push('');

    // Usage section
    if (projectContext.mainEntryPoints.length > 0) {
      sections.push('## Usage');
      sections.push('');
      const usage = await this.generateUsage(projectContext.mainEntryPoints);
      sections.push(usage);
      sections.push('');
    }

    return sections.join('\n');
  }

  /**
   * Generate the title for the README
   */
  generateTitle(projectContext: ProjectContext): string {
    // Use the project name, capitalizing appropriately
    return projectContext.name
      .split(/[-_]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Generate the description section using AI
   */
  async generateDescription(projectContext: ProjectContext): Promise<string> {
    try {
      const summary = await this.aiEngine.generateSummary(projectContext);
      return summary;
    } catch (error) {
      // Fallback to basic description if AI fails
      return `A ${projectContext.languages.join('/')} project${
        projectContext.frameworks.length > 0 
          ? ` using ${projectContext.frameworks.join(', ')}` 
          : ''
      }.`;
    }
  }

  /**
   * Generate installation instructions based on dependencies
   */
  generateInstallation(dependencies: Dependency[]): string {
    const sections: string[] = [];

    // Group dependencies by type
    const prodDeps = dependencies.filter(d => d.type === 'production');
    const devDeps = dependencies.filter(d => d.type === 'development');

    // Detect package manager based on common patterns
    const hasPackageJson = dependencies.length > 0;
    
    if (hasPackageJson) {
      sections.push('Install dependencies using npm:');
      sections.push('');
      sections.push('```bash');
      sections.push('npm install');
      sections.push('```');
      sections.push('');
      sections.push('Or using yarn:');
      sections.push('');
      sections.push('```bash');
      sections.push('yarn install');
      sections.push('```');
    } else {
      sections.push('No dependencies detected.');
    }

    // Add dependency list if there are notable dependencies
    if (prodDeps.length > 0) {
      sections.push('');
      sections.push('### Key Dependencies');
      sections.push('');
      prodDeps.slice(0, 10).forEach(dep => {
        sections.push(`- **${dep.name}** (${dep.version})`);
      });
      
      if (prodDeps.length > 10) {
        sections.push(`- ... and ${prodDeps.length - 10} more`);
      }
    }

    return sections.join('\n');
  }

  /**
   * Generate usage instructions based on entry points
   */
  async generateUsage(entryPoints: string[]): Promise<string> {
    const sections: string[] = [];

    sections.push('The main entry points for this project are:');
    sections.push('');

    entryPoints.forEach(entryPoint => {
      sections.push(`- \`${entryPoint}\``);
    });

    sections.push('');
    
    // Provide basic usage examples based on common patterns
    const hasIndexJs = entryPoints.some(ep => ep.includes('index.js') || ep.includes('index.ts'));
    const hasMainJs = entryPoints.some(ep => ep.includes('main.js') || ep.includes('main.ts'));
    const hasServerJs = entryPoints.some(ep => ep.includes('server.js') || ep.includes('server.ts'));
    const hasAppJs = entryPoints.some(ep => ep.includes('app.js') || ep.includes('app.ts'));

    if (hasServerJs || hasAppJs) {
      sections.push('To start the application:');
      sections.push('');
      sections.push('```bash');
      sections.push('npm start');
      sections.push('```');
      sections.push('');
      sections.push('For development with auto-reload:');
      sections.push('');
      sections.push('```bash');
      sections.push('npm run dev');
      sections.push('```');
    } else if (hasIndexJs || hasMainJs) {
      sections.push('To run the application:');
      sections.push('');
      sections.push('```bash');
      sections.push(`node ${entryPoints[0]}`);
      sections.push('```');
    } else {
      sections.push('Run the application using the appropriate entry point for your use case.');
    }

    return sections.join('\n');
  }

  /**
   * Generate a visual representation of the project structure
   */
  generateProjectStructure(structure: DirectoryTree): string {
    const sections: string[] = [];
    
    sections.push('```');
    sections.push(this.renderDirectoryTree(structure, '', true));
    sections.push('```');

    return sections.join('\n');
  }

  /**
   * Recursively render directory tree structure
   */
  private renderDirectoryTree(
    node: DirectoryTree, 
    prefix: string = '', 
    isRoot: boolean = false,
    isLast: boolean = true
  ): string {
    const lines: string[] = [];
    
    // Render current node
    if (isRoot) {
      lines.push(node.name + '/');
    } else {
      const connector = isLast ? '└── ' : '├── ';
      const nodeName = node.type === 'directory' ? node.name + '/' : node.name;
      lines.push(prefix + connector + nodeName);
    }

    // Render children
    if (node.children && node.children.length > 0) {
      // Sort: directories first, then files
      const sortedChildren = [...node.children].sort((a, b) => {
        if (a.type === b.type) {
          return a.name.localeCompare(b.name);
        }
        return a.type === 'directory' ? -1 : 1;
      });

      // Limit depth and number of items to keep README readable
      const maxChildren = 20;
      const childrenToShow = sortedChildren.slice(0, maxChildren);
      const hasMore = sortedChildren.length > maxChildren;

      childrenToShow.forEach((child, index) => {
        const isLastChild = index === childrenToShow.length - 1 && !hasMore;
        const childPrefix = isRoot 
          ? '' 
          : prefix + (isLast ? '    ' : '│   ');
        
        lines.push(this.renderDirectoryTree(child, childPrefix, false, isLastChild));
      });

      if (hasMore) {
        const morePrefix = isRoot ? '' : prefix + (isLast ? '    ' : '│   ');
        lines.push(morePrefix + `└── ... (${sortedChildren.length - maxChildren} more items)`);
      }
    }

    return lines.join('\n');
  }
}
