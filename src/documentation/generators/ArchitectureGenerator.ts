import { AIDocumentationEngine } from '../ai/AIDocumentationEngine';
import {
  ProjectContext,
  Component,
  ArchitectureDoc,
  ComponentDescription,
  DirectoryTree,
} from '../types';
import * as path from 'path';

export class ArchitectureGenerator {
  private aiEngine: AIDocumentationEngine;

  constructor(aiEngine?: AIDocumentationEngine) {
    this.aiEngine = aiEngine || new AIDocumentationEngine();
  }

  /**
   * Generate complete architecture documentation
   */
  async generate(projectContext: ProjectContext): Promise<ArchitectureDoc> {
    // Identify components from codebase structure
    const components = this.identifyComponents(projectContext);

    // Generate diagrams
    const componentDiagram = this.generateComponentDiagram(components);
    const dataFlowDiagram = this.generateDataFlowDiagram(components);

    // Generate AI-powered descriptions
    const overview = await this.aiEngine.generateArchitectureDescription(components);
    const patterns = await this.describeArchitecturalPatterns(components);

    // Build component descriptions
    const componentDescriptions: ComponentDescription[] = await Promise.all(
      components.map(async (component) => ({
        component,
        description: await this.generateComponentDescription(component),
      }))
    );

    return {
      overview,
      components: componentDescriptions,
      diagrams: {
        component: componentDiagram,
        dataFlow: dataFlowDiagram,
      },
      patterns: patterns,
    };
  }

  /**
   * Identify components from codebase structure
   */
  identifyComponents(projectContext: ProjectContext): Component[] {
    const components: Component[] = [];
    const structure = projectContext.structure;

    // Analyze directory structure to identify components
    this.analyzeDirectory(structure, components, projectContext);

    // Deduplicate and refine components
    return this.refineComponents(components);
  }

  /**
   * Generate a Mermaid component diagram
   */
  generateComponentDiagram(components: Component[]): string {
    const lines: string[] = [];
    
    lines.push('```mermaid');
    lines.push('graph TB');
    lines.push('');

    // Add component nodes
    components.forEach((component, index) => {
      const nodeId = `C${index}`;
      const label = `${component.name}<br/>[${component.type}]`;
      
      // Style based on component type
      const shape = this.getNodeShape(component.type);
      lines.push(`    ${nodeId}${shape.start}"${label}"${shape.end}`);
    });

    lines.push('');

    // Add dependency edges
    components.forEach((component, index) => {
      const sourceId = `C${index}`;
      
      component.dependencies.forEach(depName => {
        const depIndex = components.findIndex(c => c.name === depName);
        if (depIndex !== -1) {
          const targetId = `C${depIndex}`;
          lines.push(`    ${sourceId} --> ${targetId}`);
        }
      });
    });

    lines.push('```');
    return lines.join('\n');
  }

  /**
   * Generate a Mermaid data flow diagram
   */
  generateDataFlowDiagram(components: Component[]): string {
    const lines: string[] = [];
    
    lines.push('```mermaid');
    lines.push('flowchart LR');
    lines.push('');

    // Identify entry points (controllers, API handlers)
    const entryPoints = components.filter(c => 
      c.type === 'controller' || c.name.toLowerCase().includes('api')
    );

    // Identify services
    const services = components.filter(c => c.type === 'service');

    // Identify models/data layer
    const models = components.filter(c => c.type === 'model');

    // Build data flow
    if (entryPoints.length > 0) {
      lines.push('    Client[Client/User]');
      lines.push('');
      
      entryPoints.forEach((ep, index) => {
        const epId = `EP${index}`;
        lines.push(`    ${epId}["${ep.name}"]`);
        lines.push(`    Client --> ${epId}`);
        
        // Connect to services
        ep.dependencies.forEach(depName => {
          const serviceIndex = services.findIndex(s => s.name === depName);
          if (serviceIndex !== -1) {
            const sId = `S${serviceIndex}`;
            lines.push(`    ${epId} --> ${sId}["${depName}"]`);
            
            // Connect services to models
            const service = services[serviceIndex];
            service.dependencies.forEach(modelDep => {
              const modelIndex = models.findIndex(m => m.name === modelDep);
              if (modelIndex !== -1) {
                const mId = `M${modelIndex}`;
                lines.push(`    ${sId} --> ${mId}["${modelDep}"]`);
              }
            });
          }
        });
      });

      // Add database if models exist
      if (models.length > 0) {
        lines.push('');
        lines.push('    DB[(Database)]');
        models.forEach((_, index) => {
          lines.push(`    M${index} --> DB`);
        });
      }
    } else {
      // Fallback: show general component flow
      lines.push('    Input[Input]');
      
      components.forEach((component, index) => {
        const nodeId = `N${index}`;
        lines.push(`    ${nodeId}["${component.name}"]`);
        
        if (index === 0) {
          lines.push(`    Input --> ${nodeId}`);
        }
        
        component.dependencies.forEach(depName => {
          const depIndex = components.findIndex(c => c.name === depName);
          if (depIndex !== -1) {
            lines.push(`    ${nodeId} --> N${depIndex}`);
          }
        });
      });
      
      // Add database if models exist
      if (models.length > 0) {
        lines.push('');
        lines.push('    DB[(Database)]');
        models.forEach((_, index) => {
          lines.push(`    N${index} --> DB`);
        });
      } else {
        lines.push('    Output[Output]');
        if (components.length > 0) {
          lines.push(`    N${components.length - 1} --> Output`);
        }
      }
    }

    lines.push('```');
    return lines.join('\n');
  }

  /**
   * Describe architectural patterns using AI
   */
  async describeArchitecturalPatterns(components: Component[]): Promise<string[]> {
    const patterns: string[] = [];

    // Detect common patterns based on component structure
    const hasControllers = components.some(c => c.type === 'controller');
    const hasServices = components.some(c => c.type === 'service');
    const hasModels = components.some(c => c.type === 'model');

    if (hasControllers && hasServices && hasModels) {
      patterns.push('MVC (Model-View-Controller) / Layered Architecture');
    }

    if (hasServices && components.some(c => c.name.toLowerCase().includes('repository'))) {
      patterns.push('Repository Pattern');
    }

    if (components.some(c => c.name.toLowerCase().includes('factory'))) {
      patterns.push('Factory Pattern');
    }

    if (components.some(c => c.name.toLowerCase().includes('singleton'))) {
      patterns.push('Singleton Pattern');
    }

    if (components.some(c => c.name.toLowerCase().includes('adapter'))) {
      patterns.push('Adapter Pattern');
    }

    // Check for microservices indicators
    const hasMultipleServices = components.filter(c => c.type === 'service').length > 3;
    const hasAPIGateway = components.some(c => 
      c.name.toLowerCase().includes('gateway') || c.name.toLowerCase().includes('router')
    );
    
    if (hasMultipleServices && hasAPIGateway) {
      patterns.push('Microservices Architecture');
    }

    // If no patterns detected, add a generic one
    if (patterns.length === 0) {
      patterns.push('Modular Architecture');
    }

    return patterns;
  }

  /**
   * Analyze directory structure recursively
   */
  private analyzeDirectory(
    node: DirectoryTree,
    components: Component[],
    projectContext: ProjectContext,
    parentPath: string = ''
  ): void {
    const currentPath = parentPath ? `${parentPath}/${node.name}` : node.name;

    // Check if this directory represents a component
    if (node.type === 'directory' && node.children) {
      const componentType = this.inferComponentType(node.name, currentPath);
      
      if (componentType) {
        const files = this.collectFiles(node);
        const dependencies = this.inferDependencies(files, components);
        const responsibilities = this.inferResponsibilities(node.name, componentType);

        components.push({
          name: this.formatComponentName(node.name),
          type: componentType,
          files,
          dependencies,
          responsibilities,
        });
      }

      // Recursively analyze children
      node.children.forEach(child => {
        this.analyzeDirectory(child, components, projectContext, currentPath);
      });
    }
  }

  /**
   * Infer component type from directory name
   */
  private inferComponentType(
    dirName: string,
    fullPath: string
  ): Component['type'] | null {
    const lowerName = dirName.toLowerCase();
    const lowerPath = fullPath.toLowerCase();

    // Controllers
    if (lowerName.includes('controller') || lowerName.includes('api') || lowerName.includes('route')) {
      return 'controller';
    }

    // Services
    if (lowerName.includes('service') || lowerName.includes('business') || lowerName.includes('logic')) {
      return 'service';
    }

    // Models
    if (lowerName.includes('model') || lowerName.includes('entity') || lowerName.includes('schema')) {
      return 'model';
    }

    // Utilities
    if (lowerName.includes('util') || lowerName.includes('helper') || lowerName.includes('common')) {
      return 'utility';
    }

    // Check for specific patterns in path
    if (lowerPath.includes('/services/') || lowerPath.includes('/src/services')) {
      return 'service';
    }

    if (lowerPath.includes('/models/') || lowerPath.includes('/src/models')) {
      return 'model';
    }

    if (lowerPath.includes('/controllers/') || lowerPath.includes('/src/controllers')) {
      return 'controller';
    }

    return null;
  }

  /**
   * Collect all files in a directory tree
   */
  private collectFiles(node: DirectoryTree): string[] {
    const files: string[] = [];

    if (node.type === 'file') {
      files.push(node.path);
    } else if (node.children) {
      node.children.forEach(child => {
        files.push(...this.collectFiles(child));
      });
    }

    return files;
  }

  /**
   * Infer dependencies based on file imports
   */
  private inferDependencies(files: string[], existingComponents: Component[]): string[] {
    const dependencies = new Set<string>();

    // Simple heuristic: if files reference other component names, add as dependency
    existingComponents.forEach(component => {
      const componentNameLower = component.name.toLowerCase();
      
      files.forEach(file => {
        const fileLower = file.toLowerCase();
        if (fileLower.includes(componentNameLower)) {
          dependencies.add(component.name);
        }
      });
    });

    return Array.from(dependencies);
  }

  /**
   * Infer component responsibilities
   */
  private inferResponsibilities(name: string, type: Component['type']): string[] {
    const responsibilities: string[] = [];

    switch (type) {
      case 'controller':
        responsibilities.push('Handle HTTP requests and responses');
        responsibilities.push('Route requests to appropriate services');
        responsibilities.push('Validate input data');
        break;
      
      case 'service':
        responsibilities.push('Implement business logic');
        responsibilities.push('Coordinate between different components');
        responsibilities.push('Process and transform data');
        break;
      
      case 'model':
        responsibilities.push('Define data structures and schemas');
        responsibilities.push('Manage data persistence');
        responsibilities.push('Enforce data validation rules');
        break;
      
      case 'utility':
        responsibilities.push('Provide helper functions');
        responsibilities.push('Offer reusable utilities');
        responsibilities.push('Support common operations');
        break;
    }

    return responsibilities;
  }

  /**
   * Format component name for display
   */
  private formatComponentName(name: string): string {
    // Convert kebab-case or snake_case to Title Case
    return name
      .replace(/[-_]/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Refine and deduplicate components
   */
  private refineComponents(components: Component[]): Component[] {
    // Remove duplicates based on name
    const uniqueComponents = new Map<string, Component>();

    components.forEach(component => {
      if (!uniqueComponents.has(component.name)) {
        uniqueComponents.set(component.name, component);
      } else {
        // Merge files if duplicate found
        const existing = uniqueComponents.get(component.name)!;
        existing.files = [...new Set([...existing.files, ...component.files])];
      }
    });

    return Array.from(uniqueComponents.values());
  }

  /**
   * Get Mermaid node shape based on component type
   */
  private getNodeShape(type: Component['type']): { start: string; end: string } {
    switch (type) {
      case 'controller':
        return { start: '[', end: ']' }; // Rectangle
      case 'service':
        return { start: '(', end: ')' }; // Rounded rectangle
      case 'model':
        return { start: '[(', end: ')]' }; // Cylinder (database-like)
      case 'utility':
        return { start: '{{', end: '}}' }; // Hexagon
      default:
        return { start: '[', end: ']' };
    }
  }

  /**
   * Generate description for a single component
   */
  private async generateComponentDescription(component: Component): Promise<string> {
    try {
      // Build context for AI
      const context = {
        name: component.name,
        type: component.type,
        fileCount: component.files.length,
        dependencies: component.dependencies,
        responsibilities: component.responsibilities,
      };

      // Use AI to generate a natural description
      const prompt = `Describe the following software component:

Name: ${component.name}
Type: ${component.type}
Files: ${component.files.length}
Dependencies: ${component.dependencies.join(', ') || 'none'}
Responsibilities:
${component.responsibilities.map(r => `- ${r}`).join('\n')}

Provide a 2-3 sentence description of this component's role in the system.`;

      const systemPrompt = 'You are a software architecture expert. Provide clear, concise descriptions of software components.';

      // For now, generate a simple description
      // In a full implementation, this would call the AI engine
      return `The ${component.name} component is a ${component.type} that ${component.responsibilities[0]?.toLowerCase() || 'handles specific functionality'}. It manages ${component.files.length} file${component.files.length !== 1 ? 's' : ''} and ${component.dependencies.length > 0 ? `depends on ${component.dependencies.join(', ')}` : 'operates independently'}.`;
    } catch (error) {
      return `${component.name}: A ${component.type} component with ${component.files.length} files.`;
    }
  }
}
