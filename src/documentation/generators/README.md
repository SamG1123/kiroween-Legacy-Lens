# README Generator

The READMEGenerator class creates comprehensive README.md files for projects based on code analysis.

## Features

- **AI-Powered Descriptions**: Uses AI to generate natural language project descriptions
- **Automatic Structure Detection**: Analyzes project structure and generates visual tree representations
- **Smart Installation Instructions**: Detects package managers and generates appropriate installation commands
- **Usage Examples**: Provides context-aware usage instructions based on entry points
- **Technology Detection**: Lists detected languages, frameworks, and key dependencies

## Usage

```typescript
import { READMEGenerator } from './generators';
import { ProjectContext } from './types';

// Create generator instance
const generator = new READMEGenerator();

// Generate README from project context
const projectContext: ProjectContext = {
  name: 'my-project',
  languages: ['TypeScript'],
  frameworks: ['Express'],
  dependencies: [
    { name: 'express', version: '4.18.0', type: 'production' }
  ],
  structure: {
    name: 'my-project',
    type: 'directory',
    path: '/',
    children: [
      { name: 'src', type: 'directory', path: '/src', children: [] },
      { name: 'package.json', type: 'file', path: '/package.json' }
    ]
  },
  metrics: {
    totalLines: 1000,
    codeLines: 800,
    commentLines: 100,
    complexity: 50
  },
  mainEntryPoints: ['src/index.ts']
};

const readme = await generator.generate(projectContext);
console.log(readme);
```

## Methods

### `generate(projectContext: ProjectContext): Promise<string>`

Generates a complete README.md file with all sections.

### `generateTitle(projectContext: ProjectContext): string`

Generates a properly formatted title from the project name.

### `generateDescription(projectContext: ProjectContext): Promise<string>`

Uses AI to generate a natural language description of the project.

### `generateInstallation(dependencies: Dependency[]): string`

Generates installation instructions based on detected dependencies.

### `generateUsage(entryPoints: string[]): Promise<string>`

Generates usage instructions based on main entry points.

### `generateProjectStructure(structure: DirectoryTree): string`

Generates a visual tree representation of the project structure.

## Requirements Validated

This implementation validates the following requirements:

- **1.1**: Creates README.md file in markdown format
- **1.2**: Includes project title and description
- **1.3**: Includes detected technologies and frameworks
- **1.4**: Includes project structure section
- **1.5**: Includes installation instructions when dependencies are detected
