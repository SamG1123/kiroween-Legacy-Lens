import { ArchitectureGenerator } from './ArchitectureGenerator';
import { ProjectContext, Component, DirectoryTree } from '../types';
import { AIDocumentationEngine } from '../ai/AIDocumentationEngine';

describe('ArchitectureGenerator', () => {
  let generator: ArchitectureGenerator;
  let mockAIEngine: jest.Mocked<AIDocumentationEngine>;

  const mockProjectContext: ProjectContext = {
    name: 'test-project',
    languages: ['TypeScript'],
    frameworks: ['Express'],
    dependencies: [],
    structure: {
      name: 'src',
      type: 'directory',
      path: '/src',
      children: [
        {
          name: 'controllers',
          type: 'directory',
          path: '/src/controllers',
          children: [
            { name: 'UserController.ts', type: 'file', path: '/src/controllers/UserController.ts' },
          ],
        },
        {
          name: 'services',
          type: 'directory',
          path: '/src/services',
          children: [
            { name: 'UserService.ts', type: 'file', path: '/src/services/UserService.ts' },
          ],
        },
        {
          name: 'models',
          type: 'directory',
          path: '/src/models',
          children: [
            { name: 'User.ts', type: 'file', path: '/src/models/User.ts' },
          ],
        },
      ],
    },
    metrics: {
      totalLines: 1000,
      codeLines: 800,
      commentLines: 100,
      complexity: 50,
    },
    mainEntryPoints: ['src/index.ts'],
  };

  beforeEach(() => {
    mockAIEngine = {
      generateSummary: jest.fn(),
      generateDescription: jest.fn(),
      generateArchitectureDescription: jest.fn().mockResolvedValue('This is a layered architecture.'),
      improveExistingDoc: jest.fn(),
    } as any;

    generator = new ArchitectureGenerator(mockAIEngine);
  });

  describe('identifyComponents', () => {
    it('should identify components from directory structure', () => {
      const components = generator.identifyComponents(mockProjectContext);
      
      expect(components.length).toBeGreaterThan(0);
      expect(components.some(c => c.type === 'controller')).toBe(true);
      expect(components.some(c => c.type === 'service')).toBe(true);
      expect(components.some(c => c.type === 'model')).toBe(true);
    });

    it('should assign correct types to components', () => {
      const components = generator.identifyComponents(mockProjectContext);
      
      const controller = components.find(c => c.name.includes('Controller'));
      expect(controller?.type).toBe('controller');
      
      const service = components.find(c => c.name.includes('Service'));
      expect(service?.type).toBe('service');
      
      const model = components.find(c => c.name.includes('Model'));
      expect(model?.type).toBe('model');
    });

    it('should collect files for each component', () => {
      const components = generator.identifyComponents(mockProjectContext);
      
      components.forEach(component => {
        expect(component.files.length).toBeGreaterThan(0);
      });
    });

    it('should assign responsibilities based on component type', () => {
      const components = generator.identifyComponents(mockProjectContext);
      
      components.forEach(component => {
        expect(component.responsibilities.length).toBeGreaterThan(0);
      });
    });
  });

  describe('generateComponentDiagram', () => {
    it('should generate valid Mermaid syntax', () => {
      const components: Component[] = [
        {
          name: 'User Controller',
          type: 'controller',
          files: ['UserController.ts'],
          dependencies: ['User Service'],
          responsibilities: ['Handle requests'],
        },
        {
          name: 'User Service',
          type: 'service',
          files: ['UserService.ts'],
          dependencies: [],
          responsibilities: ['Business logic'],
        },
      ];

      const diagram = generator.generateComponentDiagram(components);
      
      expect(diagram).toContain('```mermaid');
      expect(diagram).toContain('graph TB');
      expect(diagram).toContain('```');
    });

    it('should include all components as nodes', () => {
      const components: Component[] = [
        {
          name: 'Controller A',
          type: 'controller',
          files: ['a.ts'],
          dependencies: [],
          responsibilities: [],
        },
        {
          name: 'Service B',
          type: 'service',
          files: ['b.ts'],
          dependencies: [],
          responsibilities: [],
        },
      ];

      const diagram = generator.generateComponentDiagram(components);
      
      expect(diagram).toContain('Controller A');
      expect(diagram).toContain('Service B');
    });

    it('should show dependencies as edges', () => {
      const components: Component[] = [
        {
          name: 'Component A',
          type: 'controller',
          files: ['a.ts'],
          dependencies: ['Component B'],
          responsibilities: [],
        },
        {
          name: 'Component B',
          type: 'service',
          files: ['b.ts'],
          dependencies: [],
          responsibilities: [],
        },
      ];

      const diagram = generator.generateComponentDiagram(components);
      
      expect(diagram).toContain('-->');
    });
  });

  describe('generateDataFlowDiagram', () => {
    it('should generate valid Mermaid flowchart syntax', () => {
      const components: Component[] = [
        {
          name: 'API Controller',
          type: 'controller',
          files: ['api.ts'],
          dependencies: ['User Service'],
          responsibilities: [],
        },
        {
          name: 'User Service',
          type: 'service',
          files: ['service.ts'],
          dependencies: ['User Model'],
          responsibilities: [],
        },
        {
          name: 'User Model',
          type: 'model',
          files: ['model.ts'],
          dependencies: [],
          responsibilities: [],
        },
      ];

      const diagram = generator.generateDataFlowDiagram(components);
      
      expect(diagram).toContain('```mermaid');
      expect(diagram).toContain('flowchart');
      expect(diagram).toContain('```');
    });

    it('should include client/user as entry point when controllers exist', () => {
      const components: Component[] = [
        {
          name: 'API',
          type: 'controller',
          files: ['api.ts'],
          dependencies: [],
          responsibilities: [],
        },
      ];

      const diagram = generator.generateDataFlowDiagram(components);
      
      expect(diagram).toContain('Client');
    });

    it('should show database when models exist', () => {
      const components: Component[] = [
        {
          name: 'User',
          type: 'model',
          files: ['user.ts'],
          dependencies: [],
          responsibilities: [],
        },
      ];

      const diagram = generator.generateDataFlowDiagram(components);
      
      expect(diagram.includes('Database') || diagram.includes('DB')).toBe(true);
    });
  });

  describe('describeArchitecturalPatterns', () => {
    it('should detect MVC pattern', async () => {
      const components: Component[] = [
        { name: 'Controller', type: 'controller', files: [], dependencies: [], responsibilities: [] },
        { name: 'Service', type: 'service', files: [], dependencies: [], responsibilities: [] },
        { name: 'Model', type: 'model', files: [], dependencies: [], responsibilities: [] },
      ];

      const patterns = await generator.describeArchitecturalPatterns(components);
      
      expect(patterns.some(p => p.includes('MVC') || p.includes('Layered'))).toBe(true);
    });

    it('should detect Repository pattern', async () => {
      const components: Component[] = [
        { name: 'User Repository', type: 'service', files: [], dependencies: [], responsibilities: [] },
      ];

      const patterns = await generator.describeArchitecturalPatterns(components);
      
      expect(patterns.some(p => p.includes('Repository'))).toBe(true);
    });

    it('should return at least one pattern', async () => {
      const components: Component[] = [
        { name: 'Component', type: 'utility', files: [], dependencies: [], responsibilities: [] },
      ];

      const patterns = await generator.describeArchitecturalPatterns(components);
      
      expect(patterns.length).toBeGreaterThan(0);
    });
  });

  describe('generate', () => {
    it('should generate complete architecture documentation', async () => {
      const doc = await generator.generate(mockProjectContext);
      
      expect(doc.overview).toBeDefined();
      expect(doc.components).toBeDefined();
      expect(doc.diagrams.component).toBeDefined();
      expect(doc.diagrams.dataFlow).toBeDefined();
      expect(doc.patterns).toBeDefined();
    });

    it('should call AI engine for architecture description', async () => {
      await generator.generate(mockProjectContext);
      
      expect(mockAIEngine.generateArchitectureDescription).toHaveBeenCalled();
    });

    it('should include component descriptions', async () => {
      const doc = await generator.generate(mockProjectContext);
      
      expect(doc.components.length).toBeGreaterThan(0);
      doc.components.forEach(compDesc => {
        expect(compDesc.component).toBeDefined();
        expect(compDesc.description).toBeDefined();
      });
    });

    it('should generate valid Mermaid diagrams', async () => {
      const doc = await generator.generate(mockProjectContext);
      
      expect(doc.diagrams.component).toContain('```mermaid');
      expect(doc.diagrams.dataFlow).toContain('```mermaid');
    });

    it('should identify architectural patterns', async () => {
      const doc = await generator.generate(mockProjectContext);
      
      expect(Array.isArray(doc.patterns)).toBe(true);
      expect(doc.patterns.length).toBeGreaterThan(0);
    });
  });
});
