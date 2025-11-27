import { QualityAssurance } from './index';
import { DocumentationSet, APIEndpoint } from '../types';

describe('QualityAssurance', () => {
  let qa: QualityAssurance;

  beforeEach(() => {
    qa = new QualityAssurance();
  });

  describe('calculateReadability', () => {
    it('should calculate readability score for simple text', () => {
      const text = 'This is a simple sentence. It is easy to read. The words are short.';
      const result = qa.calculateReadability(text);

      expect(result.score).toBeGreaterThan(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(result.grade).toBeDefined();
      expect(['excellent', 'good', 'fair', 'poor']).toContain(result.grade);
      expect(result.metrics).toBeDefined();
      expect(result.suggestions).toBeDefined();
    });

    it('should give higher scores to simpler text', () => {
      const simpleText = 'The cat sat on the mat. It was a nice day.';
      const complexText = 'The feline positioned itself upon the rectangular textile surface, experiencing an extraordinarily pleasant meteorological phenomenon.';

      const simpleResult = qa.calculateReadability(simpleText);
      const complexResult = qa.calculateReadability(complexText);

      expect(simpleResult.score).toBeGreaterThan(complexResult.score);
    });

    it('should ignore code blocks when calculating readability', () => {
      const textWithCode = `
This is readable text.

\`\`\`javascript
const complexFunction = () => {
  return somethingVeryComplicated();
};
\`\`\`

More readable text here.
      `;

      const result = qa.calculateReadability(textWithCode);
      expect(result.score).toBeGreaterThan(0);
    });

    it('should provide suggestions for improvement', () => {
      const longSentenceText = 'This is an extremely long sentence that goes on and on and on and continues to provide information without any breaks or pauses which makes it very difficult to read and understand for most people who are trying to comprehend the content.';
      
      const result = qa.calculateReadability(longSentenceText);
      expect(result.suggestions.length).toBeGreaterThan(0);
    });
  });

  describe('checkREADMECompleteness', () => {
    it('should detect complete README', () => {
      const completeReadme = `
# Project Title

## Description
This is a project description.

## Installation
Run npm install.

## Usage
Run npm start.

## Project Structure
- src/
- tests/
      `;

      const result = qa.checkREADMECompleteness(completeReadme);
      expect(result.isComplete).toBe(true);
      expect(result.score).toBe(100);
      expect(result.missingElements).toHaveLength(0);
    });

    it('should detect missing sections', () => {
      const incompleteReadme = `
# Project Title

## Description
This is a project description.
      `;

      const result = qa.checkREADMECompleteness(incompleteReadme);
      expect(result.isComplete).toBe(false);
      expect(result.score).toBeLessThan(100);
      expect(result.missingElements.length).toBeGreaterThan(0);
      expect(result.suggestions.length).toBeGreaterThan(0);
    });

    it('should recognize alternative section names', () => {
      const readme = `
# Project Title

## Overview
This is a project overview.

## Getting Started
Run npm install.

## How to Use
Run npm start.

## Directory Structure
- src/
      `;

      const result = qa.checkREADMECompleteness(readme);
      expect(result.isComplete).toBe(true);
    });
  });

  describe('checkAPICompleteness', () => {
    it('should check API documentation completeness', () => {
      const apiDoc = `
# API Documentation

## GET /api/users
Get all users.

### Parameters:
- limit: number

### Response:
Returns array of users.

### Example:
\`\`\`
GET /api/users?limit=10
\`\`\`
      `;

      const endpoints: APIEndpoint[] = [
        {
          method: 'GET',
          path: '/api/users',
          handler: 'getUsers',
          parameters: [],
          responses: []
        }
      ];

      const result = qa.checkAPICompleteness(apiDoc, endpoints);
      expect(result.score).toBeGreaterThan(0);
    });

    it('should detect missing endpoint documentation', () => {
      const apiDoc = `
# API Documentation

## GET /api/users
Get all users.
      `;

      const endpoints: APIEndpoint[] = [
        {
          method: 'GET',
          path: '/api/users',
          handler: 'getUsers',
          parameters: [],
          responses: []
        },
        {
          method: 'POST',
          path: '/api/users',
          handler: 'createUser',
          parameters: [],
          responses: []
        }
      ];

      const result = qa.checkAPICompleteness(apiDoc, endpoints);
      expect(result.missingElements.length).toBeGreaterThan(0);
    });
  });

  describe('checkArchitectureCompleteness', () => {
    it('should detect complete architecture documentation', () => {
      const archDoc = `
# Architecture

## Overview
System architecture overview.

## Components
- Service layer
- Data layer

\`\`\`mermaid
graph TD
  A --> B
\`\`\`

The data flow goes from A to B.

We use the MVC pattern.
      `;

      const result = qa.checkArchitectureCompleteness(archDoc);
      expect(result.isComplete).toBe(true);
      expect(result.score).toBe(100);
    });

    it('should detect missing architecture elements', () => {
      const archDoc = `
# Architecture

## Overview
System architecture overview.
      `;

      const result = qa.checkArchitectureCompleteness(archDoc);
      expect(result.isComplete).toBe(false);
      expect(result.missingElements.length).toBeGreaterThan(0);
    });
  });

  describe('validateCodeExamples', () => {
    it('should validate correct JSON code examples', () => {
      const doc = `
# Documentation

\`\`\`json
{
  "name": "test",
  "value": 123
}
\`\`\`
      `;

      const result = qa.validateCodeExamples(doc);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid JSON', () => {
      const doc = `
# Documentation

\`\`\`json
{
  "name": "test"
  "value": 123
}
\`\`\`
      `;

      const result = qa.validateCodeExamples(doc);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should skip non-code blocks', () => {
      const doc = `
# Documentation

\`\`\`mermaid
graph TD
  A --> B
\`\`\`
      `;

      const result = qa.validateCodeExamples(doc);
      expect(result.isValid).toBe(true);
    });

    it('should validate JavaScript code examples', () => {
      const doc = `
# Documentation

\`\`\`javascript
const x = 10;
console.log(x);
\`\`\`
      `;

      const result = qa.validateCodeExamples(doc);
      expect(result.isValid).toBe(true);
    });
  });

  describe('verifyConsistency', () => {
    it('should detect terminology inconsistencies', () => {
      const docs: DocumentationSet = {
        readme: 'This uses the API endpoint.',
        api: 'The api provides data.',
        architecture: 'The Api layer handles requests.',
        comments: new Map(),
        metadata: {
          projectId: 'test',
          generatedAt: new Date(),
          generator: 'test',
          version: '1.0',
          options: {
            types: ['readme'],
            depth: 'standard',
            excludePaths: [],
            mergeExisting: false
          },
          statistics: {
            filesDocumented: 0,
            functionsDocumented: 0,
            classesDocumented: 0,
            apiEndpointsDocumented: 0
          }
        }
      };

      const result = qa.verifyConsistency(docs);
      expect(result.issues.length).toBeGreaterThan(0);
      const terminologyIssues = result.issues.filter((i: any) => i.type === 'terminology');
      expect(terminologyIssues.length).toBeGreaterThan(0);
    });

    it('should detect format inconsistencies', () => {
      const docs: DocumentationSet = {
        readme: 'Code example:\n```javascript\nconst x = 1;\n```\nMore text\n```',
        comments: new Map(),
        metadata: {
          projectId: 'test',
          generatedAt: new Date(),
          generator: 'test',
          version: '1.0',
          options: {
            types: ['readme'],
            depth: 'standard',
            excludePaths: [],
            mergeExisting: false
          },
          statistics: {
            filesDocumented: 0,
            functionsDocumented: 0,
            classesDocumented: 0,
            apiEndpointsDocumented: 0
          }
        }
      };

      const result = qa.verifyConsistency(docs);
      const formatIssues = result.issues.filter((i: any) => i.type === 'format');
      expect(formatIssues.length).toBeGreaterThan(0);
    });

    it('should pass for consistent documentation', () => {
      const docs: DocumentationSet = {
        readme: '# Title\n\nContent with API references.',
        api: '# API\n\nThe API provides endpoints.',
        comments: new Map(),
        metadata: {
          projectId: 'test',
          generatedAt: new Date(),
          generator: 'test',
          version: '1.0',
          options: {
            types: ['readme', 'api'],
            depth: 'standard',
            excludePaths: [],
            mergeExisting: false
          },
          statistics: {
            filesDocumented: 0,
            functionsDocumented: 0,
            classesDocumented: 0,
            apiEndpointsDocumented: 0
          }
        }
      };

      const result = qa.verifyConsistency(docs);
      const errors = result.issues.filter((i: any) => i.severity === 'error');
      expect(errors).toHaveLength(0);
    });
  });

  describe('generateReport', () => {
    it('should generate complete quality assurance report', () => {
      const docs: DocumentationSet = {
        readme: `
# Test Project

## Description
A simple test project.

## Installation
Run npm install.

## Usage
Run npm start.

## Project Structure
- src/
- tests/
        `,
        api: `
# API Documentation

## GET /api/test
Test endpoint.

### Parameters:
None

### Response:
Success

### Example:
\`\`\`json
{"status": "ok"}
\`\`\`
        `,
        architecture: `
# Architecture

## Overview
Simple architecture.

## Components
- API layer
- Data layer

\`\`\`mermaid
graph TD
  A --> B
\`\`\`

Data flows from A to B.

Uses MVC pattern.
        `,
        comments: new Map(),
        metadata: {
          projectId: 'test',
          generatedAt: new Date(),
          generator: 'test',
          version: '1.0',
          options: {
            types: ['readme', 'api', 'architecture'],
            depth: 'standard',
            excludePaths: [],
            mergeExisting: false
          },
          statistics: {
            filesDocumented: 1,
            functionsDocumented: 1,
            classesDocumented: 0,
            apiEndpointsDocumented: 1
          }
        }
      };

      const endpoints: APIEndpoint[] = [
        {
          method: 'GET',
          path: '/api/test',
          handler: 'test',
          parameters: [],
          responses: []
        }
      ];

      const report = qa.generateReport(docs, endpoints);

      expect(report.readability.overall).toBeDefined();
      expect(report.completeness.overall).toBeDefined();
      expect(report.syntaxValidation).toBeDefined();
      expect(report.consistency).toBeDefined();
      expect(report.overallScore).toBeGreaterThan(0);
      expect(report.overallScore).toBeLessThanOrEqual(100);
      expect(typeof report.passed).toBe('boolean');
    });

    it('should calculate overall score correctly', () => {
      const docs: DocumentationSet = {
        readme: 'Simple text.',
        comments: new Map(),
        metadata: {
          projectId: 'test',
          generatedAt: new Date(),
          generator: 'test',
          version: '1.0',
          options: {
            types: ['readme'],
            depth: 'minimal',
            excludePaths: [],
            mergeExisting: false
          },
          statistics: {
            filesDocumented: 1,
            functionsDocumented: 0,
            classesDocumented: 0,
            apiEndpointsDocumented: 0
          }
        }
      };

      const report = qa.generateReport(docs);
      expect(report.overallScore).toBeGreaterThanOrEqual(0);
      expect(report.overallScore).toBeLessThanOrEqual(100);
    });
  });
});
