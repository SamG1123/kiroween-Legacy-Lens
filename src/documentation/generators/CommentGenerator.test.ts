import { CommentGenerator } from './CommentGenerator';
import { AIDocumentationEngine } from '../ai/AIDocumentationEngine';
import { FunctionInfo, ClassInfo, Parameter } from '../types';

// Mock the AI engine
jest.mock('../ai/AIDocumentationEngine');

describe('CommentGenerator', () => {
  let generator: CommentGenerator;
  let mockAIEngine: jest.Mocked<AIDocumentationEngine>;

  beforeEach(() => {
    mockAIEngine = new AIDocumentationEngine() as jest.Mocked<AIDocumentationEngine>;
    generator = new CommentGenerator(mockAIEngine);
  });

  describe('generateFunctionComment', () => {
    it('should generate a comment for a function', async () => {
      const func: FunctionInfo = {
        name: 'calculateSum',
        parameters: [
          { name: 'a', type: 'number' },
          { name: 'b', type: 'number' },
        ],
        returnType: 'number',
        body: 'return a + b;',
        lineNumber: 1,
      };

      mockAIEngine.generateDescription = jest.fn().mockResolvedValue(
        'Calculates the sum of two numbers.'
      );

      const comment = await generator.generateFunctionComment(func);

      expect(comment).toBe('Calculates the sum of two numbers.');
      expect(mockAIEngine.generateDescription).toHaveBeenCalledWith(
        func,
        'function'
      );
    });

    it('should handle functions with no parameters', async () => {
      const func: FunctionInfo = {
        name: 'getCurrentTime',
        parameters: [],
        returnType: 'Date',
        body: 'return new Date();',
        lineNumber: 5,
      };

      mockAIEngine.generateDescription = jest.fn().mockResolvedValue(
        'Returns the current date and time.'
      );

      const comment = await generator.generateFunctionComment(func);

      expect(comment).toBe('Returns the current date and time.');
    });

    it('should throw error when AI generation fails', async () => {
      const func: FunctionInfo = {
        name: 'testFunc',
        parameters: [],
        returnType: 'void',
        body: '',
        lineNumber: 1,
      };

      mockAIEngine.generateDescription = jest.fn().mockRejectedValue(
        new Error('AI service unavailable')
      );

      await expect(generator.generateFunctionComment(func)).rejects.toThrow(
        'Failed to generate function comment for testFunc'
      );
    });
  });

  describe('generateClassComment', () => {
    it('should generate a comment for a class', async () => {
      const cls: ClassInfo = {
        name: 'Calculator',
        methods: [
          {
            name: 'add',
            parameters: [
              { name: 'a', type: 'number' },
              { name: 'b', type: 'number' },
            ],
            returnType: 'number',
            body: 'return a + b;',
            lineNumber: 2,
          },
        ],
        properties: [],
        extends: null,
        implements: [],
      };

      mockAIEngine.generateDescription = jest.fn().mockResolvedValue(
        'A calculator class for basic arithmetic operations.'
      );

      const comment = await generator.generateClassComment(cls);

      expect(comment).toBe('A calculator class for basic arithmetic operations.');
      expect(mockAIEngine.generateDescription).toHaveBeenCalledWith(cls, 'class');
    });

    it('should throw error when AI generation fails', async () => {
      const cls: ClassInfo = {
        name: 'TestClass',
        methods: [],
        properties: [],
        extends: null,
        implements: [],
      };

      mockAIEngine.generateDescription = jest.fn().mockRejectedValue(
        new Error('AI service unavailable')
      );

      await expect(generator.generateClassComment(cls)).rejects.toThrow(
        'Failed to generate class comment for TestClass'
      );
    });
  });

  describe('formatComment', () => {
    const simpleComment = 'This is a test function';

    describe('JavaScript/TypeScript (JSDoc)', () => {
      it('should format a simple comment as JSDoc', () => {
        const formatted = generator.formatComment(simpleComment, 'javascript');
        
        expect(formatted).toContain('/**');
        expect(formatted).toContain(' * This is a test function');
        expect(formatted).toContain(' */');
      });

      it('should format function comment with parameters', () => {
        const func: FunctionInfo = {
          name: 'add',
          parameters: [
            { name: 'a', type: 'number', description: 'First number' },
            { name: 'b', type: 'number', description: 'Second number' },
          ],
          returnType: 'number',
          body: '',
          lineNumber: 1,
        };

        const formatted = generator.formatComment(simpleComment, 'typescript', func);

        expect(formatted).toContain('@param {number} a First number');
        expect(formatted).toContain('@param {number} b Second number');
        expect(formatted).toContain('@returns {number}');
      });

      it('should handle optional parameters', () => {
        const func: FunctionInfo = {
          name: 'greet',
          parameters: [
            { name: 'name', type: 'string', optional: true },
          ],
          returnType: 'string',
          body: '',
          lineNumber: 1,
        };

        const formatted = generator.formatComment(simpleComment, 'javascript', func);

        expect(formatted).toContain('@param {string} =name');
      });
    });

    describe('Python (docstring)', () => {
      it('should format a simple comment as Python docstring', () => {
        const formatted = generator.formatComment(simpleComment, 'python');
        
        expect(formatted).toContain('"""');
        expect(formatted).toContain('This is a test function');
      });

      it('should format function comment with parameters', () => {
        const func: FunctionInfo = {
          name: 'add',
          parameters: [
            { name: 'a', type: 'int', description: 'First number' },
            { name: 'b', type: 'int', description: 'Second number' },
          ],
          returnType: 'int',
          body: '',
          lineNumber: 1,
        };

        const formatted = generator.formatComment(simpleComment, 'python', func);

        expect(formatted).toContain('Args:');
        expect(formatted).toContain('a (int): First number');
        expect(formatted).toContain('b (int): Second number');
        expect(formatted).toContain('Returns:');
        expect(formatted).toContain('int');
      });
    });

    describe('Java (JavaDoc)', () => {
      it('should format a simple comment as JavaDoc', () => {
        const formatted = generator.formatComment(simpleComment, 'java');
        
        expect(formatted).toContain('/**');
        expect(formatted).toContain(' * This is a test function');
        expect(formatted).toContain(' */');
      });

      it('should format function comment with parameters', () => {
        const func: FunctionInfo = {
          name: 'add',
          parameters: [
            { name: 'a', type: 'int', description: 'First number' },
            { name: 'b', type: 'int', description: 'Second number' },
          ],
          returnType: 'int',
          body: '',
          lineNumber: 1,
        };

        const formatted = generator.formatComment(simpleComment, 'java', func);

        expect(formatted).toContain('@param a First number');
        expect(formatted).toContain('@param b Second number');
        expect(formatted).toContain('@return int');
      });
    });

    describe('C# (XML comments)', () => {
      it('should format a simple comment as XML', () => {
        const formatted = generator.formatComment(simpleComment, 'csharp');
        
        expect(formatted).toContain('///');
        expect(formatted).toContain('<summary>');
        expect(formatted).toContain('This is a test function');
        expect(formatted).toContain('</summary>');
      });

      it('should format function comment with parameters', () => {
        const func: FunctionInfo = {
          name: 'Add',
          parameters: [
            { name: 'a', type: 'int', description: 'First number' },
            { name: 'b', type: 'int', description: 'Second number' },
          ],
          returnType: 'int',
          body: '',
          lineNumber: 1,
        };

        const formatted = generator.formatComment(simpleComment, 'csharp', func);

        expect(formatted).toContain('<param name="a">First number</param>');
        expect(formatted).toContain('<param name="b">Second number</param>');
        expect(formatted).toContain('<returns>int</returns>');
      });
    });

    describe('Go', () => {
      it('should format a simple comment for Go', () => {
        const formatted = generator.formatComment(simpleComment, 'go');
        
        expect(formatted).toContain('// This is a test function');
      });

      it('should format function comment starting with function name', () => {
        const func: FunctionInfo = {
          name: 'Add',
          parameters: [],
          returnType: 'int',
          body: '',
          lineNumber: 1,
        };

        const formatted = generator.formatComment('adds two numbers', 'go', func);

        expect(formatted).toContain('// Add adds two numbers');
      });
    });

    describe('Rust', () => {
      it('should format a simple comment for Rust', () => {
        const formatted = generator.formatComment(simpleComment, 'rust');
        
        expect(formatted).toContain('/// This is a test function');
      });

      it('should format function comment with arguments section', () => {
        const func: FunctionInfo = {
          name: 'add',
          parameters: [
            { name: 'a', type: 'i32', description: 'First number' },
            { name: 'b', type: 'i32', description: 'Second number' },
          ],
          returnType: 'i32',
          body: '',
          lineNumber: 1,
        };

        const formatted = generator.formatComment(simpleComment, 'rust', func);

        expect(formatted).toContain('/// # Arguments');
        expect(formatted).toContain('/// * `a` - First number');
        expect(formatted).toContain('/// * `b` - Second number');
        expect(formatted).toContain('/// # Returns');
      });
    });

    describe('PHP (PHPDoc)', () => {
      it('should format a simple comment as PHPDoc', () => {
        const formatted = generator.formatComment(simpleComment, 'php');
        
        expect(formatted).toContain('/**');
        expect(formatted).toContain(' * This is a test function');
        expect(formatted).toContain(' */');
      });

      it('should format function comment with parameters', () => {
        const func: FunctionInfo = {
          name: 'add',
          parameters: [
            { name: 'a', type: 'int', description: 'First number' },
            { name: 'b', type: 'int', description: 'Second number' },
          ],
          returnType: 'int',
          body: '',
          lineNumber: 1,
        };

        const formatted = generator.formatComment(simpleComment, 'php', func);

        expect(formatted).toContain('@param int $a First number');
        expect(formatted).toContain('@param int $b Second number');
        expect(formatted).toContain('@return int');
      });
    });

    describe('Ruby', () => {
      it('should format a simple comment for Ruby', () => {
        const formatted = generator.formatComment(simpleComment, 'ruby');
        
        expect(formatted).toContain('# This is a test function');
      });

      it('should format function comment with parameters', () => {
        const func: FunctionInfo = {
          name: 'add',
          parameters: [
            { name: 'a', type: 'Integer', description: 'First number' },
            { name: 'b', type: 'Integer', description: 'Second number' },
          ],
          returnType: 'Integer',
          body: '',
          lineNumber: 1,
        };

        const formatted = generator.formatComment(simpleComment, 'ruby', func);

        expect(formatted).toContain('# @param [Integer] a First number');
        expect(formatted).toContain('# @param [Integer] b Second number');
        expect(formatted).toContain('# @return [Integer]');
      });
    });

    describe('Multi-line comments', () => {
      it('should handle multi-line comments in JSDoc', () => {
        const multiLineComment = 'This is a test function\nIt does something important\nAnd returns a value';
        const formatted = generator.formatComment(multiLineComment, 'javascript');

        expect(formatted).toContain(' * This is a test function');
        expect(formatted).toContain(' * It does something important');
        expect(formatted).toContain(' * And returns a value');
      });

      it('should handle multi-line comments in Python', () => {
        const multiLineComment = 'This is a test function\nIt does something important';
        const formatted = generator.formatComment(multiLineComment, 'python');

        expect(formatted).toContain('This is a test function\nIt does something important');
      });
    });
  });

  describe('generateInlineComments', () => {
    it('should return original code without annotations (placeholder)', async () => {
      const code = 'function test() { return 42; }';
      const result = await generator.generateInlineComments(code, 'javascript');

      expect(result.originalCode).toBe(code);
      expect(result.annotatedCode).toBe(code);
      expect(result.comments).toEqual([]);
    });
  });
});
