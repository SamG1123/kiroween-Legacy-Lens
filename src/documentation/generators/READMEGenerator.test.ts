import { READMEGenerator } from './READMEGenerator';
import { ProjectContext, DirectoryTree, Dependency } from '../types';
import { AIDocumentationEngine } from '../ai/AIDocumentationEngine';

describe('READMEGenerator', () => {
  let generator: READMEGenerator;
  let mockAIEngine: jest.Mocked<AIDocumentationEngine>;

  const mockProjectContext: ProjectContext = {
    name: 'test-project',
    languages: ['TypeScript', 'JavaScript'],
    frameworks: ['Express', 'React'],
    dependencies: [
      { name: 'express', version: '4.18.0', type: 'production' },
      { name: 'react', version: '18.2.0', type: 'production' },
      { name: 'jest', version: '29.0.0', type: 'development' },
    ],
    structure: {
      name: 'test-project',
      type: 'directory',
      path: '/',
      children: [
        { name: 'src', type: 'directory', path: '/src', children: [] },
        { name: 'package.json', type: 'file', path: '/package.json' },
      ],
    },
    metrics: {
      totalLines: 1000,
      codeLines: 800,
      commentLines: 100,
      complexity: 50,
    },
    mainEntryPoints: ['src/index.ts', 'src/server.ts'],
  };

  beforeEach(() => {
    mockAIEngine = {
      generateSummary: jest.fn().mockResolvedValue('This is a test project for documentation generation.'),
      generateDescription: jest.fn(),
      generateArchitectureDescription: jest.fn(),
      improveExistingDoc: jest.fn(),
    } as any;

    generator = new READMEGenerator(mockAIEngine);
  });

  describe('generateTitle', () => {
    it('should generate a properly formatted title from project name', () => {
      const title = generator.generateTitle(mockProjectContext);
      expect(title).toBe('Test Project');
    });

    it('should handle hyphenated names', () => {
      const context = { ...mockProjectContext, name: 'my-awesome-project' };
      const title = generator.generateTitle(context);
      expect(title).toBe('My Awesome Project');
    });

    it('should handle underscored names', () => {
      const context = { ...mockProjectContext, name: 'my_awesome_project' };
      const title = generator.generateTitle(context);
      expect(title).toBe('My Awesome Project');
    });
  });

  describe('generateDescription', () => {
    it('should use AI engine to generate description', async () => {
      const description = await generator.generateDescription(mockProjectContext);
      
      expect(mockAIEngine.generateSummary).toHaveBeenCalledWith(mockProjectContext);
      expect(description).toBe('This is a test project for documentation generation.');
    });

    it('should provide fallback description if AI fails', async () => {
      mockAIEngine.generateSummary.mockRejectedValue(new Error('AI failed'));
      
      const description = await generator.generateDescription(mockProjectContext);
      
      expect(description).toContain('TypeScript/JavaScript');
      expect(description).toContain('Express, React');
    });
  });

  describe('generateInstallation', () => {
    it('should generate installation instructions for npm/yarn', () => {
      const installation = generator.generateInstallation(mockProjectContext.dependencies);
      
      expect(installation).toContain('npm install');
      expect(installation).toContain('yarn install');
    });

    it('should list key dependencies', () => {
      const installation = generator.generateInstallation(mockProjectContext.dependencies);
      
      expect(installation).toContain('express');
      expect(installation).toContain('react');
    });

    it('should handle empty dependencies', () => {
      const installation = generator.generateInstallation([]);
      
      expect(installation).toContain('No dependencies detected');
    });

    it('should limit dependency list to 10 items', () => {
      const manyDeps: Dependency[] = Array.from({ length: 15 }, (_, i) => ({
        name: `dep-${i}`,
        version: '1.0.0',
        type: 'production',
      }));
      
      const installation = generator.generateInstallation(manyDeps);
      
      expect(installation).toContain('and 5 more');
    });
  });

  describe('generateUsage', () => {
    it('should generate usage instructions for server entry points', async () => {
      const usage = await generator.generateUsage(['src/server.ts']);
      
      expect(usage).toContain('npm start');
      expect(usage).toContain('npm run dev');
    });

    it('should generate usage instructions for index entry points', async () => {
      const usage = await generator.generateUsage(['src/index.ts']);
      
      expect(usage).toContain('node src/index.ts');
    });

    it('should list all entry points', async () => {
      const usage = await generator.generateUsage(['src/index.ts', 'src/cli.ts']);
      
      expect(usage).toContain('src/index.ts');
      expect(usage).toContain('src/cli.ts');
    });
  });

  describe('generateProjectStructure', () => {
    it('should generate a tree structure', () => {
      const structure = generator.generateProjectStructure(mockProjectContext.structure);
      
      expect(structure).toContain('test-project/');
      expect(structure).toContain('src/');
      expect(structure).toContain('package.json');
      expect(structure).toContain('```');
    });

    it('should handle nested directories', () => {
      const nestedStructure: DirectoryTree = {
        name: 'root',
        type: 'directory',
        path: '/',
        children: [
          {
            name: 'src',
            type: 'directory',
            path: '/src',
            children: [
              { name: 'index.ts', type: 'file', path: '/src/index.ts' },
              { name: 'utils.ts', type: 'file', path: '/src/utils.ts' },
            ],
          },
        ],
      };
      
      const structure = generator.generateProjectStructure(nestedStructure);
      
      expect(structure).toContain('src/');
      expect(structure).toContain('index.ts');
      expect(structure).toContain('utils.ts');
    });

    it('should limit children to 20 items', () => {
      const manyChildren: DirectoryTree = {
        name: 'root',
        type: 'directory',
        path: '/',
        children: Array.from({ length: 25 }, (_, i) => ({
          name: `file-${i}.ts`,
          type: 'file' as const,
          path: `/file-${i}.ts`,
        })),
      };
      
      const structure = generator.generateProjectStructure(manyChildren);
      
      expect(structure).toContain('5 more items');
    });
  });

  describe('generate', () => {
    it('should generate a complete README with all sections', async () => {
      const readme = await generator.generate(mockProjectContext);
      
      expect(readme).toContain('# Test Project');
      expect(readme).toContain('## Technologies');
      expect(readme).toContain('## Installation');
      expect(readme).toContain('## Project Structure');
      expect(readme).toContain('## Usage');
    });

    it('should include languages and frameworks', async () => {
      const readme = await generator.generate(mockProjectContext);
      
      expect(readme).toContain('TypeScript, JavaScript');
      expect(readme).toContain('Express, React');
    });

    it('should skip installation section if no dependencies', async () => {
      const contextNoDeps = { ...mockProjectContext, dependencies: [] };
      const readme = await generator.generate(contextNoDeps);
      
      expect(readme).not.toContain('## Installation');
    });

    it('should skip usage section if no entry points', async () => {
      const contextNoEntry = { ...mockProjectContext, mainEntryPoints: [] };
      const readme = await generator.generate(contextNoEntry);
      
      expect(readme).not.toContain('## Usage');
    });
  });
});
