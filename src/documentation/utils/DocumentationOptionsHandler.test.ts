import { DocumentationOptionsHandler } from './DocumentationOptionsHandler';
import { DocumentationOptions } from '../types';
import * as fs from 'fs';
import * as path from 'path';

describe('DocumentationOptionsHandler', () => {
  describe('Configuration Parsing', () => {
    it('should use default options when no options provided', () => {
      const handler = new DocumentationOptionsHandler();
      const options = handler.getOptions();

      expect(options.types).toEqual(['readme', 'api', 'architecture', 'comments']);
      expect(options.depth).toBe('standard');
      expect(options.excludePaths).toEqual([]);
      expect(options.mergeExisting).toBe(false);
    });

    it('should parse custom documentation types', () => {
      const handler = new DocumentationOptionsHandler({
        types: ['readme', 'api'],
      });

      expect(handler.shouldGenerateType('readme')).toBe(true);
      expect(handler.shouldGenerateType('api')).toBe(true);
      expect(handler.shouldGenerateType('architecture')).toBe(false);
      expect(handler.shouldGenerateType('comments')).toBe(false);
    });

    it('should filter out invalid documentation types', () => {
      const handler = new DocumentationOptionsHandler({
        types: ['readme', 'invalid' as any, 'api'],
      });

      const options = handler.getOptions();
      expect(options.types).toEqual(['readme', 'api']);
    });

    it('should throw error when no valid documentation types provided', () => {
      expect(() => {
        new DocumentationOptionsHandler({
          types: ['invalid' as any],
        });
      }).toThrow('At least one documentation type must be specified');
    });
  });

  describe('Depth Level Handling', () => {
    it('should parse minimal depth level', () => {
      const handler = new DocumentationOptionsHandler({ depth: 'minimal' });
      expect(handler.getDepthLevel()).toBe('minimal');
      expect(handler.getDetailLevel()).toBe(1);
    });

    it('should parse standard depth level', () => {
      const handler = new DocumentationOptionsHandler({ depth: 'standard' });
      expect(handler.getDepthLevel()).toBe('standard');
      expect(handler.getDetailLevel()).toBe(2);
    });

    it('should parse comprehensive depth level', () => {
      const handler = new DocumentationOptionsHandler({ depth: 'comprehensive' });
      expect(handler.getDepthLevel()).toBe('comprehensive');
      expect(handler.getDetailLevel()).toBe(3);
    });

    it('should throw error for invalid depth level', () => {
      expect(() => {
        new DocumentationOptionsHandler({ depth: 'invalid' as any });
      }).toThrow('Invalid depth level');
    });

    it('should correctly determine if detail should be included', () => {
      const minimalHandler = new DocumentationOptionsHandler({ depth: 'minimal' });
      expect(minimalHandler.shouldIncludeDetail('minimal')).toBe(true);
      expect(minimalHandler.shouldIncludeDetail('standard')).toBe(false);
      expect(minimalHandler.shouldIncludeDetail('comprehensive')).toBe(false);

      const standardHandler = new DocumentationOptionsHandler({ depth: 'standard' });
      expect(standardHandler.shouldIncludeDetail('minimal')).toBe(true);
      expect(standardHandler.shouldIncludeDetail('standard')).toBe(true);
      expect(standardHandler.shouldIncludeDetail('comprehensive')).toBe(false);

      const comprehensiveHandler = new DocumentationOptionsHandler({ depth: 'comprehensive' });
      expect(comprehensiveHandler.shouldIncludeDetail('minimal')).toBe(true);
      expect(comprehensiveHandler.shouldIncludeDetail('standard')).toBe(true);
      expect(comprehensiveHandler.shouldIncludeDetail('comprehensive')).toBe(true);
    });
  });

  describe('Exclusion Pattern Matching', () => {
    it('should match files against exclusion patterns', () => {
      const handler = new DocumentationOptionsHandler({
        excludePaths: ['node_modules/**', '**/*.test.ts', 'dist/*'],
      });

      expect(handler.shouldExclude('node_modules/package/file.js')).toBe(true);
      expect(handler.shouldExclude('src/utils.test.ts')).toBe(true);
      expect(handler.shouldExclude('dist/index.js')).toBe(true);
      expect(handler.shouldExclude('src/utils.ts')).toBe(false);
    });

    it('should handle empty exclusion patterns', () => {
      const handler = new DocumentationOptionsHandler({
        excludePaths: [],
      });

      expect(handler.shouldExclude('any/file.ts')).toBe(false);
    });

    it('should filter out invalid glob patterns', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const handler = new DocumentationOptionsHandler({
        excludePaths: ['valid/**', '[invalid', 'also-valid/*'],
      });

      const options = handler.getOptions();
      // Invalid patterns should be filtered out
      expect(options.excludePaths.length).toBeLessThanOrEqual(3);

      consoleWarnSpy.mockRestore();
    });
  });

  describe('Custom Template Loading', () => {
    it('should return undefined when no custom templates configured', async () => {
      const handler = new DocumentationOptionsHandler();
      const template = await handler.loadCustomTemplate('readme');
      expect(template).toBeUndefined();
    });

    it('should return template string when provided', async () => {
      const templates = new Map([['readme', '# {{title}}\n{{content}}']]);
      const handler = new DocumentationOptionsHandler({
        customTemplates: templates,
      });

      const template = await handler.loadCustomTemplate('readme');
      expect(template).toBe('# {{title}}\n{{content}}');
    });

    it('should return undefined for non-existent template', async () => {
      const templates = new Map([['readme', '# Template']]);
      const handler = new DocumentationOptionsHandler({
        customTemplates: templates,
      });

      const template = await handler.loadCustomTemplate('api');
      expect(template).toBeUndefined();
    });
  });

  describe('Template Application', () => {
    it('should replace template variables', () => {
      const handler = new DocumentationOptionsHandler();
      const template = '# {{title}}\n\n{{description}}\n\nVersion: {{version}}';
      const variables = {
        title: 'My Project',
        description: 'A great project',
        version: '1.0.0',
      };

      const result = handler.applyTemplate(template, variables);
      expect(result).toBe('# My Project\n\nA great project\n\nVersion: 1.0.0');
    });

    it('should handle variables with whitespace', () => {
      const handler = new DocumentationOptionsHandler();
      const template = '{{ title }} - {{  description  }}';
      const variables = {
        title: 'Title',
        description: 'Description',
      };

      const result = handler.applyTemplate(template, variables);
      expect(result).toBe('Title - Description');
    });

    it('should leave unmatched variables unchanged', () => {
      const handler = new DocumentationOptionsHandler();
      const template = '{{title}} - {{missing}}';
      const variables = {
        title: 'Title',
      };

      const result = handler.applyTemplate(template, variables);
      expect(result).toBe('Title - {{missing}}');
    });
  });

  describe('Existing Documentation Handling', () => {
    it('should return generated content when merge is disabled', () => {
      const handler = new DocumentationOptionsHandler({
        mergeExisting: false,
      });

      const existing = '# Old Content';
      const generated = '# New Content';

      const result = handler.mergeDocumentation(existing, generated);
      expect(result).toBe('# New Content');
    });

    it('should merge content when merge is enabled', () => {
      const handler = new DocumentationOptionsHandler({
        mergeExisting: true,
      });

      const existing = '# Old Content';
      const generated = '# New Content';

      const result = handler.mergeDocumentation(existing, generated);
      expect(result).toContain('# Old Content');
      expect(result).toContain('# New Content');
      expect(result).toContain('---');
    });

    it('should report merge setting correctly', () => {
      const mergeHandler = new DocumentationOptionsHandler({ mergeExisting: true });
      expect(mergeHandler.shouldMergeExisting()).toBe(true);

      const replaceHandler = new DocumentationOptionsHandler({ mergeExisting: false });
      expect(replaceHandler.shouldMergeExisting()).toBe(false);
    });
  });

  describe('Integration', () => {
    it('should handle complex configuration', () => {
      const templates = new Map([
        ['readme', '# {{title}}'],
        ['api', '## API\n{{content}}'],
      ]);

      const handler = new DocumentationOptionsHandler({
        types: ['readme', 'api'],
        depth: 'comprehensive',
        excludePaths: ['node_modules/**', '*.test.ts'],
        customTemplates: templates,
        mergeExisting: true,
      });

      expect(handler.shouldGenerateType('readme')).toBe(true);
      expect(handler.shouldGenerateType('api')).toBe(true);
      expect(handler.shouldGenerateType('architecture')).toBe(false);
      expect(handler.getDepthLevel()).toBe('comprehensive');
      expect(handler.shouldExclude('node_modules/pkg/file.js')).toBe(true);
      expect(handler.shouldMergeExisting()).toBe(true);
    });
  });
});
