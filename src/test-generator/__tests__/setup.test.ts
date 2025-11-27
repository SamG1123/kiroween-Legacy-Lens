// Setup verification test for test-generator module

describe('Test Generator Setup', () => {
  it('should have the test environment configured correctly', () => {
    expect(true).toBe(true);
  });

  it('should be able to import types module', () => {
    const types = require('../types');
    expect(types).toBeDefined();
  });

  it('should be able to import analyzers', () => {
    const { CodeAnalyzer, CoverageAnalyzer } = require('../analyzers');
    expect(CodeAnalyzer).toBeDefined();
    expect(CoverageAnalyzer).toBeDefined();
  });

  it('should be able to import generators', () => {
    const {
      TestStrategyPlanner,
      TestCaseGenerator,
      MockGenerator,
      TestWriter,
    } = require('../generators');
    expect(TestStrategyPlanner).toBeDefined();
    expect(TestCaseGenerator).toBeDefined();
    expect(MockGenerator).toBeDefined();
    expect(TestWriter).toBeDefined();
  });

  it('should be able to import validators', () => {
    const { TestValidator } = require('../validators');
    expect(TestValidator).toBeDefined();
  });

  it('should be able to import AI client', () => {
    const { AITestGenerationClient } = require('../ai');
    expect(AITestGenerationClient).toBeDefined();
  });
});
