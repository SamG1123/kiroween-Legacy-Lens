import { RefactoringSuggester } from './RefactoringSuggester';
import {
  LongMethodSmell,
  DuplicationSmell,
  ConditionalSmell,
  NamingSmell,
  SOLIDSmell,
  Location,
} from '../types';

describe('RefactoringSuggester', () => {
  let suggester: RefactoringSuggester;

  beforeEach(() => {
    suggester = new RefactoringSuggester();
  });

  const createLocation = (): Location => ({
    file: 'test.ts',
    startLine: 1,
    endLine: 10,
    startColumn: 0,
    endColumn: 50,
  });

  describe('suggestExtractMethod', () => {
    it('should generate extract method suggestion for long method', () => {
      const smell: LongMethodSmell = {
        type: 'long_method',
        methodName: 'processData',
        lineCount: 60,
        extractableBlocks: [
          {
            code: 'const x = 1;\nconst y = 2;\nconst z = x + y;\nreturn z;',
            location: createLocation(),
          },
        ],
        location: createLocation(),
        severity: 'high',
        description: 'Method is too long',
      };

      const suggestion = suggester.suggestExtractMethod(smell);

      expect(suggestion.type).toBe('extract_method');
      expect(suggestion.title).toContain('processData');
      expect(suggestion.beforeCode).toBeDefined();
      expect(suggestion.afterCode).toBeDefined();
      expect(suggestion.diff).toBeDefined();
      expect(suggestion.benefits).toHaveLength(4);
      expect(suggestion.riskLevel).toBe('low');
      expect(suggestion.methodName).toBeDefined();
      expect(suggestion.parameters).toBeDefined();
      expect(suggestion.returnType).toBeDefined();
    });
  });

  describe('suggestRemoveDuplication', () => {
    it('should generate duplication removal suggestion', () => {
      const smell: DuplicationSmell = {
        type: 'duplication',
        instances: [createLocation(), createLocation()],
        similarity: 0.95,
        extractionCandidate: 'console.log("test");\nreturn true;',
        location: createLocation(),
        severity: 'high',
        description: 'Duplicate code detected',
      };

      const suggestion = suggester.suggestRemoveDuplication(smell);

      expect(suggestion.type).toBe('remove_duplication');
      expect(suggestion.beforeCode).toBeDefined();
      expect(suggestion.afterCode).toBeDefined();
      expect(suggestion.diff).toBeDefined();
      expect(suggestion.benefits).toHaveLength(4);
      expect(suggestion.sharedMethodName).toBeDefined();
      expect(suggestion.instances).toHaveLength(2);
    });
  });

  describe('suggestSimplifyConditional', () => {
    it('should generate conditional simplification suggestion', () => {
      const smell: ConditionalSmell = {
        type: 'complex_conditional',
        complexity: 15,
        nestingLevel: 5,
        location: createLocation(),
        severity: 'high',
        description: 'Complex conditional',
      };

      const suggestion = suggester.suggestSimplifyConditional(smell);

      expect(suggestion.type).toBe('simplify_conditional');
      expect(suggestion.beforeCode).toBeDefined();
      expect(suggestion.afterCode).toBeDefined();
      expect(suggestion.diff).toBeDefined();
      expect(suggestion.benefits.length).toBeGreaterThan(0);
      expect(suggestion.simplificationType).toMatch(/guard_clause|extract_variable|consolidate/);
    });
  });

  describe('suggestRename', () => {
    it('should generate rename suggestion for variable', () => {
      const smell: NamingSmell = {
        type: 'poor_naming',
        identifierName: 'data',
        identifierType: 'variable',
        location: createLocation(),
        severity: 'low',
        description: 'Poor variable name',
      };

      const suggestion = suggester.suggestRename(smell);

      expect(suggestion.type).toBe('rename');
      expect(suggestion.oldName).toBe('data');
      expect(suggestion.newName).toBeDefined();
      expect(suggestion.newName).not.toBe('data');
      expect(suggestion.beforeCode).toBeDefined();
      expect(suggestion.afterCode).toBeDefined();
      expect(suggestion.diff).toBeDefined();
      expect(suggestion.benefits).toHaveLength(4);
      expect(suggestion.scope).toBeDefined();
    });

    it('should generate rename suggestion for method', () => {
      const smell: NamingSmell = {
        type: 'poor_naming',
        identifierName: 'doStuff',
        identifierType: 'method',
        location: createLocation(),
        severity: 'low',
        description: 'Poor method name',
      };

      const suggestion = suggester.suggestRename(smell);

      expect(suggestion.type).toBe('rename');
      expect(suggestion.oldName).toBe('doStuff');
      expect(suggestion.newName).toBe('processData');
    });
  });

  describe('suggestSOLIDRefactorings', () => {
    it('should generate SRP refactoring suggestion', () => {
      const smell: SOLIDSmell = {
        type: 'solid_violation',
        principle: 'SRP',
        violationType: 'Too many responsibilities',
        location: createLocation(),
        severity: 'high',
        description: 'Class violates SRP',
      };

      const suggestions = suggester.suggestSOLIDRefactorings(smell);

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].type).toBe('split_class');
      expect(suggestions[0].title).toContain('Single Responsibility');
      expect(suggestions[0].benefits).toHaveLength(4);
      expect(suggestions[0].riskLevel).toBe('high');
      expect(suggestions[0].estimatedEffort).toBe('high');
    });

    it('should generate DIP refactoring suggestion', () => {
      const smell: SOLIDSmell = {
        type: 'solid_violation',
        principle: 'DIP',
        violationType: 'Tight coupling',
        location: createLocation(),
        severity: 'medium',
        description: 'Class violates DIP',
      };

      const suggestions = suggester.suggestSOLIDRefactorings(smell);

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].type).toBe('introduce_interface');
      expect(suggestions[0].title).toContain('Dependency Inversion');
      expect(suggestions[0].benefits).toHaveLength(4);
      expect(suggestions[0].riskLevel).toBe('medium');
    });

    it('should generate ISP refactoring suggestion', () => {
      const smell: SOLIDSmell = {
        type: 'solid_violation',
        principle: 'ISP',
        violationType: 'Interface too large',
        location: createLocation(),
        severity: 'medium',
        description: 'Class violates ISP',
      };

      const suggestions = suggester.suggestSOLIDRefactorings(smell);

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].type).toBe('split_class');
      expect(suggestions[0].title).toContain('Interface Segregation');
      expect(suggestions[0].benefits).toHaveLength(4);
    });
  });

  describe('suggestRefactorings', () => {
    it('should generate suggestions for multiple smells', () => {
      const smells = [
        {
          type: 'long_method',
          methodName: 'test',
          lineCount: 60,
          extractableBlocks: [
            {
              code: 'const x = 1;\nreturn x;',
              location: createLocation(),
            },
          ],
          location: createLocation(),
          severity: 'high' as const,
          description: 'Long method',
        },
        {
          type: 'poor_naming',
          identifierName: 'data',
          identifierType: 'variable' as const,
          location: createLocation(),
          severity: 'low' as const,
          description: 'Poor naming',
        },
      ];

      const suggestions = suggester.suggestRefactorings(smells);

      expect(suggestions).toHaveLength(2);
      expect(suggestions[0].priority).toBeGreaterThanOrEqual(suggestions[1].priority);
    });

    it('should handle empty smell list', () => {
      const suggestions = suggester.suggestRefactorings([]);
      expect(suggestions).toHaveLength(0);
    });

    it('should prioritize suggestions correctly', () => {
      const smells = [
        {
          type: 'poor_naming',
          identifierName: 'x',
          identifierType: 'variable' as const,
          location: createLocation(),
          severity: 'low' as const,
          description: 'Poor naming',
        },
        {
          type: 'long_method',
          methodName: 'test',
          lineCount: 100,
          extractableBlocks: [
            {
              code: 'const x = 1;\nreturn x;',
              location: createLocation(),
            },
          ],
          location: createLocation(),
          severity: 'high' as const,
          description: 'Long method',
        },
      ];

      const suggestions = suggester.suggestRefactorings(smells);

      // High severity should be prioritized
      expect(suggestions[0].type).toBe('extract_method');
      expect(suggestions[1].type).toBe('rename');
    });
  });
});
