# Documentation Generator Module

This module provides AI-powered documentation generation for legacy codebases.

## Structure

```
documentation/
├── ai/              # AI client configuration and utilities
├── parsers/         # Code parsing for different languages
├── generators/      # Documentation generators (README, API, Architecture, Comments)
├── templates/       # Documentation templates
├── utils/           # Utility functions
├── types.ts         # TypeScript type definitions
└── index.ts         # Main module exports
```

## Setup

### Environment Variables

Add the following to your `.env` file:

```
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

### Dependencies

The module uses the following key dependencies:
- `openai` - OpenAI API client
- `@anthropic-ai/sdk` - Anthropic Claude API client
- `@babel/parser` - JavaScript/TypeScript parsing
- `tree-sitter` & `tree-sitter-python` - Python parsing
- `marked` - Markdown processing
- `markdown-it` - Markdown to HTML conversion
- `mermaid` - Diagram generation
- `archiver` - ZIP archive creation

## Usage

```typescript
import { AIClient } from './documentation/ai';
import { CodeParser } from './documentation/parsers';

// Initialize AI client
const aiClient = new AIClient();

// Parse code
const parser = new CodeParser();
const parsedCode = await parser.parseFile('path/to/file.ts', 'typescript');
```

## Testing

The module uses Jest for unit testing and fast-check for property-based testing.

Run tests:
```bash
npm test
```

## Implementation Status

- [x] Task 1: Project structure and dependencies setup
- [ ] Task 2: Code Parser implementation
- [ ] Task 3: Context Builder implementation
- [ ] Task 4: AI Documentation Engine implementation
- [ ] Task 5: README Generator implementation
- [ ] Task 6: Comment Generator implementation
- [ ] Task 7: Architecture Generator implementation
- [ ] Task 8: API Documentation Generator implementation
- [ ] Task 9: Documentation validation implementation
- [ ] Task 10: Configuration and customization implementation
- [ ] Task 11: Resilience and progress tracking implementation
- [ ] Task 12: Documentation Packager implementation
- [ ] Task 13: API endpoints implementation
