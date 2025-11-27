import { PatternAnalyzer } from './PatternAnalyzer';
import { PatternMatch, PatternAnalysis } from '../types';

describe('PatternAnalyzer', () => {
  let analyzer: PatternAnalyzer;

  beforeEach(() => {
    analyzer = new PatternAnalyzer();
  });

  describe('detectCallbackPatterns', () => {
    it('should detect fs callback patterns', async () => {
      const code = `
        const fs = require('fs');
        fs.readFile('test.txt', (err, data) => {
          if (err) throw err;
          console.log(data);
        });
      `;

      const matches = await analyzer.detectCallbackPatterns(code, 'test.js');
      
      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].patternType).toBe('callback-pattern');
      expect(matches[0].file).toBe('test.js');
    });

    it('should detect nested callback patterns', async () => {
      const code = `
        getData((err, data) => {
          processData(data, (err, result) => {
            saveResult(result, (err) => {
              console.log('done');
            });
          });
        });
      `;

      const matches = await analyzer.detectCallbackPatterns(code, 'test.js');
      
      expect(matches.length).toBeGreaterThan(0);
    });

    it('should return empty array for code without callbacks', async () => {
      const code = `
        const data = await fs.promises.readFile('test.txt');
        console.log(data);
      `;

      const matches = await analyzer.detectCallbackPatterns(code, 'test.js');
      
      expect(matches).toEqual([]);
    });
  });

  describe('detectVarDeclarations', () => {
    it('should detect var declarations', async () => {
      const code = `
        var count = 0;
        var name = 'test';
        for (var i = 0; i < 10; i++) {
          var temp = i * 2;
        }
      `;

      const matches = await analyzer.detectVarDeclarations(code, 'test.js');
      
      expect(matches.length).toBe(4);
      expect(matches.every(m => m.patternType === 'var-declaration')).toBe(true);
    });

    it('should not detect let or const', async () => {
      const code = `
        let count = 0;
        const name = 'test';
        for (let i = 0; i < 10; i++) {
          const temp = i * 2;
        }
      `;

      const matches = await analyzer.detectVarDeclarations(code, 'test.js');
      
      expect(matches).toEqual([]);
    });
  });

  describe('detectClassComponents', () => {
    it('should detect React class components', async () => {
      const code = `
        import React from 'react';
        
        class MyComponent extends React.Component {
          render() {
            return <div>Hello</div>;
          }
        }
      `;

      const matches = await analyzer.detectClassComponents(code, 'MyComponent.tsx');
      
      expect(matches.length).toBe(1);
      expect(matches[0].patternType).toBe('class-component');
    });

    it('should detect Component without React prefix', async () => {
      const code = `
        import React, { Component } from 'react';
        
        class MyComponent extends Component {
          render() {
            return <div>Hello</div>;
          }
        }
      `;

      const matches = await analyzer.detectClassComponents(code, 'MyComponent.tsx');
      
      expect(matches.length).toBe(1);
    });

    it('should detect PureComponent', async () => {
      const code = `
        import React, { PureComponent } from 'react';
        
        class MyComponent extends PureComponent {
          render() {
            return <div>Hello</div>;
          }
        }
      `;

      const matches = await analyzer.detectClassComponents(code, 'MyComponent.tsx');
      
      expect(matches.length).toBe(1);
    });

    it('should not detect non-React classes', async () => {
      const code = `
        class MyClass {
          constructor() {
            this.value = 0;
          }
        }
      `;

      const matches = await analyzer.detectClassComponents(code, 'MyClass.ts');
      
      expect(matches).toEqual([]);
    });

    it('should not detect in non-React files', async () => {
      const code = `
        class MyComponent extends Component {
          render() {
            return 'hello';
          }
        }
      `;

      const matches = await analyzer.detectClassComponents(code, 'MyComponent.ts');
      
      expect(matches).toEqual([]);
    });
  });

  describe('detectDeprecatedFeatures', () => {
    it('should detect arguments object usage', async () => {
      const code = `
        function sum() {
          return Array.from(arguments).reduce((a, b) => a + b);
        }
      `;

      const matches = await analyzer.detectDeprecatedFeatures(code, 'test.js', 'javascript');
      
      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].patternType).toBe('deprecated-feature');
    });

    it('should detect substr usage', async () => {
      const code = `
        const str = 'hello world';
        const sub = str.substr(1, 3);
      `;

      const matches = await analyzer.detectDeprecatedFeatures(code, 'test.js', 'javascript');
      
      expect(matches.length).toBeGreaterThan(0);
    });

    it('should return empty for modern code', async () => {
      const code = `
        function sum(...numbers) {
          return numbers.reduce((a, b) => a + b);
        }
        const sub = str.substring(1, 4);
      `;

      const matches = await analyzer.detectDeprecatedFeatures(code, 'test.js', 'javascript');
      
      expect(matches).toEqual([]);
    });
  });

  describe('suggestModernAlternative', () => {
    it('should suggest async/await for callbacks', () => {
      const pattern: PatternMatch = {
        file: 'test.js',
        line: 1,
        code: 'fs.readFile(...)',
        patternType: 'callback-pattern',
      };

      const suggestion = analyzer.suggestModernAlternative(pattern);
      
      expect(suggestion.description).toContain('async/await');
      expect(suggestion.beforeCode).toBeTruthy();
      expect(suggestion.afterCode).toBeTruthy();
      expect(suggestion.benefits.length).toBeGreaterThan(0);
    });

    it('should suggest let/const for var', () => {
      const pattern: PatternMatch = {
        file: 'test.js',
        line: 1,
        code: 'var x = 1;',
        patternType: 'var-declaration',
      };

      const suggestion = analyzer.suggestModernAlternative(pattern);
      
      expect(suggestion.description).toContain('let or const');
      expect(suggestion.benefits.length).toBeGreaterThan(0);
    });

    it('should suggest hooks for class components', () => {
      const pattern: PatternMatch = {
        file: 'test.tsx',
        line: 1,
        code: 'class MyComponent extends React.Component',
        patternType: 'class-component',
      };

      const suggestion = analyzer.suggestModernAlternative(pattern);
      
      expect(suggestion.description).toContain('hooks');
      expect(suggestion.benefits.length).toBeGreaterThan(0);
    });
  });

  describe('analyzePatterns', () => {
    it('should analyze multiple files and group patterns', async () => {
      const codebase = new Map<string, string>([
        ['file1.js', `
          var x = 1;
          var y = 2;
        `],
        ['file2.js', `
          var z = 3;
          fs.readFile('test.txt', (err, data) => {});
        `],
        ['Component.tsx', `
          import React from 'react';
          class MyComponent extends React.Component {
            render() { return <div>Hi</div>; }
          }
        `],
      ]);

      const analyses = await analyzer.analyzePatterns(codebase);
      
      expect(analyses.length).toBeGreaterThan(0);
      
      // Should have var-declaration analysis
      const varAnalysis = analyses.find(a => a.pattern === 'var-declaration');
      expect(varAnalysis).toBeDefined();
      expect(varAnalysis!.occurrences.length).toBe(3);
      
      // Should have callback-pattern analysis
      const callbackAnalysis = analyses.find(a => a.pattern === 'callback-pattern');
      expect(callbackAnalysis).toBeDefined();
      
      // Should have class-component analysis
      const classAnalysis = analyses.find(a => a.pattern === 'class-component');
      expect(classAnalysis).toBeDefined();
    });

    it('should handle empty codebase', async () => {
      const codebase = new Map<string, string>();

      const analyses = await analyzer.analyzePatterns(codebase);
      
      expect(analyses).toEqual([]);
    });

    it('should skip unparseable files', async () => {
      const codebase = new Map<string, string>([
        ['valid.js', 'const x = 1;'],
        ['invalid.js', 'this is not valid javascript {{{'],
      ]);

      const analyses = await analyzer.analyzePatterns(codebase);
      
      // Should not throw, just skip invalid files
      expect(analyses).toBeDefined();
    });

    it('should estimate complexity based on pattern type and occurrences', async () => {
      const codebase = new Map<string, string>([
        ['file.js', Array(60).fill('var x = 1;').join('\n')],
      ]);

      const analyses = await analyzer.analyzePatterns(codebase);
      
      const varAnalysis = analyses.find(a => a.pattern === 'var-declaration');
      expect(varAnalysis).toBeDefined();
      // Many occurrences should increase complexity
      expect(['medium', 'high']).toContain(varAnalysis!.migrationComplexity);
    });
  });
});
