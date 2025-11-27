import { ContextBuilder } from './ContextBuilder';
import { AnalysisReport, LanguageDistribution, Framework, Dependency as AnalysisDependency, CodeMetrics as AnalysisCodeMetrics } from '../../types';
import { ProjectContext, FunctionInfo, FileContext } from '../types';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('ContextBuilder', () => {
  let contextBuilder: ContextBuilder;

  beforeEach(() => {
    contextBuilder = new ContextBuilder();
  });

  describe('buildProjectContext', () => {
    it('should build project context from analysis report', async () => {
      const mockAnalysisReport: AnalysisReport = {
        projectId: 'test-project',
        status: 'completed',
        startTime: new Date(),
        endTime: new Date(),
        languages: {
          languages: [
            { name: 'TypeScript', percentage: 80, lineCount: 1000 },
            { name: 'JavaScript', percentage: 20, lineCount: 250 }
          ]
        },
        frameworks: [
          { name: 'Express', version: '4.18.0', confidence: 0.9 }
        ],
        dependencies: [
          { name: 'express', version: '4.18.0', type: 'runtime' }
        ],
        metrics: {
          totalFiles: 10,
          totalLines: 1250,
          codeLines: 1000,
          commentLines: 150,
          blankLines: 100,
          averageComplexity: 5.2,
          maintainabilityIndex: 75
        },
        issues: []
      };

      const testDir = path.join(__dirname, '..', '..', '..');
      const projectContext = await contextBuilder.buildProjectContext(mockAnalysisReport, testDir);

      expect(projectContext).toBeDefined();
      expect(projectContext.name).toBeDefined();
      expect(projectContext.languages).toEqual(['TypeScript', 'JavaScript']);
      expect(projectContext.frameworks).toEqual(['Express']);
      expect(projectContext.dependencies).toHaveLength(1);
      expect(projectContext.dependencies[0].name).toBe('express');
      expect(projectContext.dependencies[0].type).toBe('production');
      expect(projectContext.metrics.totalLines).toBe(1250);
      expect(projectContext.metrics.complexity).toBe(5.2);
      expect(projectContext.structure).toBeDefined();
      expect(projectContext.structure.type).toBe('directory');
      expect(projectContext.mainEntryPoints).toBeDefined();
    });

    it('should handle empty analysis report', async () => {
      const emptyReport: AnalysisReport = {
        projectId: 'empty-project',
        status: 'completed',
        startTime: new Date(),
        endTime: new Date(),
        languages: { languages: [] },
        frameworks: [],
        dependencies: [],
        metrics: {
          totalFiles: 0,
          totalLines: 0,
          codeLines: 0,
          commentLines: 0,
          blankLines: 0,
          averageComplexity: 0,
          maintainabilityIndex: 0
        },
        issues: []
      };

      const testDir = path.join(__dirname, '..', '..', '..');
      const projectContext = await contextBuilder.buildProjectContext(emptyReport, testDir);

      expect(projectContext).toBeDefined();
      expect(projectContext.languages).toEqual([]);
      expect(projectContext.frameworks).toEqual([]);
      expect(projectContext.dependencies).toEqual([]);
    });
  });

  describe('buildFileContext', () => {
    it('should build file context for TypeScript file', async () => {
      const mockProjectContext: ProjectContext = {
        name: 'test-project',
        languages: ['TypeScript'],
        frameworks: [],
        dependencies: [],
        structure: { name: 'root', type: 'directory', path: '/', children: [] },
        metrics: { totalLines: 100, codeLines: 80, commentLines: 10, complexity: 5, maintainabilityIndex: 75 },
        mainEntryPoints: []
      };

      const testFilePath = path.join(__dirname, 'ContextBuilder.ts');
      const fileContext = await contextBuilder.buildFileContext(testFilePath, mockProjectContext);

      expect(fileContext).toBeDefined();
      expect(fileContext.filePath).toBe(testFilePath);
      expect(fileContext.purpose).toBeDefined();
      expect(fileContext.imports).toBeDefined();
      expect(Array.isArray(fileContext.imports)).toBe(true);
      expect(fileContext.exports).toBeDefined();
      expect(Array.isArray(fileContext.exports)).toBe(true);
      expect(fileContext.relatedFiles).toBeDefined();
      expect(Array.isArray(fileContext.relatedFiles)).toBe(true);
    });

    it('should infer file purpose from directory structure', async () => {
      const mockProjectContext: ProjectContext = {
        name: 'test-project',
        languages: ['TypeScript'],
        frameworks: [],
        dependencies: [],
        structure: { name: 'root', type: 'directory', path: '/', children: [] },
        metrics: { totalLines: 100, codeLines: 80, commentLines: 10, complexity: 5, maintainabilityIndex: 75 },
        mainEntryPoints: []
      };

      const testFilePath = path.join(__dirname, 'ContextBuilder.test.ts');
      const fileContext = await contextBuilder.buildFileContext(testFilePath, mockProjectContext);

      expect(fileContext.purpose).toBe('Test file');
    });
  });

  describe('buildFunctionContext', () => {
    it('should build function context with call graph information', async () => {
      const mockFunction: FunctionInfo = {
        name: 'testFunction',
        parameters: [
          { name: 'param1', type: 'string', optional: false },
          { name: 'param2', type: 'number', optional: true }
        ],
        returnType: 'boolean',
        body: 'const result = helperFunction(param1); console.log(result); return result > param2;',
        lineNumber: 10,
        docstring: 'Test function'
      };

      const mockFileContext: FileContext = {
        filePath: '/test/file.ts',
        purpose: 'Test file',
        imports: [],
        exports: [],
        relatedFiles: []
      };

      const functionContext = await contextBuilder.buildFunctionContext(mockFunction, mockFileContext);

      expect(functionContext).toBeDefined();
      expect(functionContext.function).toBe(mockFunction);
      expect(functionContext.callers).toBeDefined();
      expect(Array.isArray(functionContext.callers)).toBe(true);
      expect(functionContext.callees).toBeDefined();
      expect(Array.isArray(functionContext.callees)).toBe(true);
      expect(functionContext.callees).toContain('helperFunction');
      expect(functionContext.usedVariables).toBeDefined();
      expect(Array.isArray(functionContext.usedVariables)).toBe(true);
      expect(functionContext.sideEffects).toBeDefined();
      expect(Array.isArray(functionContext.sideEffects)).toBe(true);
      expect(functionContext.sideEffects).toContain('Console output');
    });

    it('should detect various side effects', async () => {
      const mockFunction: FunctionInfo = {
        name: 'sideEffectFunction',
        parameters: [],
        returnType: 'void',
        body: 'fetch("api.com"); fs.readFile("test.txt"); localStorage.setItem("key", "value"); document.getElementById("test");',
        lineNumber: 20
      };

      const mockFileContext: FileContext = {
        filePath: '/test/file.ts',
        purpose: 'Test file',
        imports: [],
        exports: [],
        relatedFiles: []
      };

      const functionContext = await contextBuilder.buildFunctionContext(mockFunction, mockFileContext);

      expect(functionContext.sideEffects).toContain('Network request');
      expect(functionContext.sideEffects).toContain('File system access');
      expect(functionContext.sideEffects).toContain('Local storage access');
      expect(functionContext.sideEffects).toContain('DOM manipulation');
    });
  });
});
