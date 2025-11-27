import { LanguageDetector } from './LanguageDetector';
import * as fs from 'fs/promises';
import * as path from 'path';
import { existsSync } from 'fs';

describe('LanguageDetector', () => {
  let detector: LanguageDetector;
  let testDir: string;

  beforeEach(() => {
    detector = new LanguageDetector();
    testDir = path.join(__dirname, '../../test-workspace', `test-${Date.now()}`);
  });

  afterEach(async () => {
    // Cleanup test directory
    if (existsSync(testDir)) {
      await fs.rm(testDir, { recursive: true, force: true });
    }
  });

  describe('detectByExtension', () => {
    it('should detect Python files', () => {
      expect(detector.detectByExtension('script.py')).toBe('Python');
      expect(detector.detectByExtension('module.pyw')).toBe('Python');
    });

    it('should detect JavaScript files', () => {
      expect(detector.detectByExtension('app.js')).toBe('JavaScript');
      expect(detector.detectByExtension('component.jsx')).toBe('JavaScript');
    });

    it('should detect TypeScript files', () => {
      expect(detector.detectByExtension('app.ts')).toBe('TypeScript');
      expect(detector.detectByExtension('component.tsx')).toBe('TypeScript');
    });

    it('should detect Java files', () => {
      expect(detector.detectByExtension('Main.java')).toBe('Java');
    });

    it('should detect C# files', () => {
      expect(detector.detectByExtension('Program.cs')).toBe('C#');
    });

    it('should detect Ruby files', () => {
      expect(detector.detectByExtension('app.rb')).toBe('Ruby');
      expect(detector.detectByExtension('Rakefile.rake')).toBe('Ruby');
    });

    it('should detect PHP files', () => {
      expect(detector.detectByExtension('index.php')).toBe('PHP');
    });

    it('should detect Go files', () => {
      expect(detector.detectByExtension('main.go')).toBe('Go');
    });

    it('should return null for unknown extensions', () => {
      expect(detector.detectByExtension('file.unknown')).toBeNull();
      expect(detector.detectByExtension('README.md')).toBeNull();
    });

    it('should be case-insensitive', () => {
      expect(detector.detectByExtension('script.PY')).toBe('Python');
      expect(detector.detectByExtension('app.JS')).toBe('JavaScript');
    });
  });

  describe('detectByContent', () => {
    beforeEach(async () => {
      await fs.mkdir(testDir, { recursive: true });
    });

    it('should detect Python by content', async () => {
      const filePath = path.join(testDir, 'script');
      await fs.writeFile(filePath, 'import os\ndef main():\n    pass\n');
      
      const result = await detector.detectByContent(filePath);
      expect(result).toBe('Python');
    });

    it('should detect JavaScript by content', async () => {
      const filePath = path.join(testDir, 'script');
      await fs.writeFile(filePath, 'const x = 10;\nfunction test() {\n  return x;\n}\n');
      
      const result = await detector.detectByContent(filePath);
      expect(result).toBe('JavaScript');
    });

    it('should detect TypeScript by content', async () => {
      const filePath = path.join(testDir, 'script');
      await fs.writeFile(filePath, 'interface User {\n  name: string;\n  age: number;\n}\n');
      
      const result = await detector.detectByContent(filePath);
      expect(result).toBe('TypeScript');
    });

    it('should detect Java by content', async () => {
      const filePath = path.join(testDir, 'script');
      await fs.writeFile(filePath, 'package com.example;\npublic class Main {\n  public static void main(String[] args) {}\n}\n');
      
      const result = await detector.detectByContent(filePath);
      expect(result).toBe('Java');
    });

    it('should detect C# by content', async () => {
      const filePath = path.join(testDir, 'script');
      await fs.writeFile(filePath, 'using System;\nnamespace MyApp {\n  public class Program {}\n}\n');
      
      const result = await detector.detectByContent(filePath);
      expect(result).toBe('C#');
    });

    it('should detect Ruby by content', async () => {
      const filePath = path.join(testDir, 'script');
      await fs.writeFile(filePath, 'class MyClass\n  def initialize\n  end\nend\n');
      
      const result = await detector.detectByContent(filePath);
      expect(result).toBe('Ruby');
    });

    it('should detect PHP by content', async () => {
      const filePath = path.join(testDir, 'script');
      await fs.writeFile(filePath, '<?php\n$var = "test";\necho $var;\n?>');
      
      const result = await detector.detectByContent(filePath);
      expect(result).toBe('PHP');
    });

    it('should detect Go by content', async () => {
      const filePath = path.join(testDir, 'script');
      await fs.writeFile(filePath, 'package main\nimport "fmt"\nfunc main() {\n  fmt.Println("Hello")\n}\n');
      
      const result = await detector.detectByContent(filePath);
      expect(result).toBe('Go');
    });

    it('should return null for unrecognizable content', async () => {
      const filePath = path.join(testDir, 'data.txt');
      await fs.writeFile(filePath, 'This is just plain text\nwith no code patterns\n');
      
      const result = await detector.detectByContent(filePath);
      expect(result).toBeNull();
    });

    it('should return null for non-existent files', async () => {
      const result = await detector.detectByContent('/non/existent/file');
      expect(result).toBeNull();
    });
  });

  describe('detectLanguages', () => {
    beforeEach(async () => {
      await fs.mkdir(testDir, { recursive: true });
    });

    it('should detect multiple languages and calculate distribution', async () => {
      // Create test files
      const pyFile = path.join(testDir, 'script.py');
      const jsFile = path.join(testDir, 'app.js');
      const tsFile = path.join(testDir, 'main.ts');

      await fs.writeFile(pyFile, 'line1\nline2\nline3\n'); // 3 lines
      await fs.writeFile(jsFile, 'line1\nline2\n'); // 2 lines
      await fs.writeFile(tsFile, 'line1\nline2\nline3\nline4\nline5\n'); // 5 lines

      const result = await detector.detectLanguages([pyFile, jsFile, tsFile]);

      expect(result.languages).toHaveLength(3);
      
      // Find each language
      const python = result.languages.find(l => l.name === 'Python');
      const javascript = result.languages.find(l => l.name === 'JavaScript');
      const typescript = result.languages.find(l => l.name === 'TypeScript');

      expect(python).toBeDefined();
      expect(javascript).toBeDefined();
      expect(typescript).toBeDefined();

      expect(python!.lineCount).toBe(3);
      expect(javascript!.lineCount).toBe(2);
      expect(typescript!.lineCount).toBe(5);

      // Total is 10 lines
      expect(python!.percentage).toBeCloseTo(30, 1);
      expect(javascript!.percentage).toBeCloseTo(20, 1);
      expect(typescript!.percentage).toBeCloseTo(50, 1);
    });

    it('should sort languages by line count descending', async () => {
      const pyFile = path.join(testDir, 'script.py');
      const jsFile = path.join(testDir, 'app.js');

      await fs.writeFile(pyFile, 'line1\nline2\n'); // 2 lines
      await fs.writeFile(jsFile, 'line1\nline2\nline3\nline4\nline5\n'); // 5 lines

      const result = await detector.detectLanguages([pyFile, jsFile]);

      expect(result.languages[0].name).toBe('JavaScript');
      expect(result.languages[1].name).toBe('Python');
    });

    it('should handle empty file list', async () => {
      const result = await detector.detectLanguages([]);
      expect(result.languages).toHaveLength(0);
    });

    it('should skip non-existent files', async () => {
      const pyFile = path.join(testDir, 'script.py');
      await fs.writeFile(pyFile, 'line1\nline2\n');

      const result = await detector.detectLanguages([
        pyFile,
        '/non/existent/file.js'
      ]);

      expect(result.languages).toHaveLength(1);
      expect(result.languages[0].name).toBe('Python');
    });

    it('should use content-based detection for files without extensions', async () => {
      const pyFile = path.join(testDir, 'script');
      await fs.writeFile(pyFile, 'import os\ndef main():\n    pass\n');

      const result = await detector.detectLanguages([pyFile]);

      expect(result.languages).toHaveLength(1);
      expect(result.languages[0].name).toBe('Python');
    });

    it('should handle all required languages', async () => {
      // Ensure test directory exists
      await fs.mkdir(testDir, { recursive: true });
      
      // Create files for all required languages
      const files = [
        { name: 'script.py', content: 'print("Python")\n' },
        { name: 'app.js', content: 'console.log("JS")\n' },
        { name: 'main.ts', content: 'const x: string = "TS"\n' },
        { name: 'Main.java', content: 'public class Main {}\n' },
        { name: 'Program.cs', content: 'using System;\n' },
        { name: 'app.rb', content: 'puts "Ruby"\n' },
        { name: 'index.php', content: '<?php echo "PHP"; ?>\n' },
        { name: 'main.go', content: 'package main\n' },
      ];

      const filePaths: string[] = [];
      for (const file of files) {
        const filePath = path.join(testDir, file.name);
        await fs.writeFile(filePath, file.content, { encoding: 'utf-8' });
        filePaths.push(filePath);
      }

      const result = await detector.detectLanguages(filePaths);

      expect(result.languages).toHaveLength(8);
      
      const languageNames = result.languages.map(l => l.name);
      expect(languageNames).toContain('Python');
      expect(languageNames).toContain('JavaScript');
      expect(languageNames).toContain('TypeScript');
      expect(languageNames).toContain('Java');
      expect(languageNames).toContain('C#');
      expect(languageNames).toContain('Ruby');
      expect(languageNames).toContain('PHP');
      expect(languageNames).toContain('Go');
    });
  });
});
