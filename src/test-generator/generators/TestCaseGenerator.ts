// Test Case Generator
// Generates specific test cases using AI

import {
  FunctionAnalysis,
  ClassAnalysis,
  TestCase,
  ParameterInfo,
} from '../types';
import { AITestGenerationClient } from '../ai/AITestGenerationClient';

export interface ITestCaseGenerator {
  generateHappyPathTests(func: FunctionAnalysis): Promise<TestCase[]>;
  generateEdgeCaseTests(func: FunctionAnalysis): Promise<TestCase[]>;
  generateErrorTests(func: FunctionAnalysis): Promise<TestCase[]>;
  generateClassTests(cls: ClassAnalysis): Promise<TestCase[]>;
}

export class TestCaseGenerator implements ITestCaseGenerator {
  private aiClient: AITestGenerationClient;

  constructor(aiClient: AITestGenerationClient) {
    this.aiClient = aiClient;
  }

  async generateHappyPathTests(func: FunctionAnalysis): Promise<TestCase[]> {
    try {
      const prompt = this.buildHappyPathPrompt(func);
      const response = await this.aiClient.suggestTestCases(prompt);
      const testCases = this.parseTestCasesFromResponse(response, 'happy_path');
      
      // Fallback to template if AI generation fails
      if (testCases.length === 0) {
        return this.generateFallbackHappyPathTests(func);
      }
      
      return testCases;
    } catch (error) {
      console.error('Happy path test generation failed, using fallback:', error);
      return this.generateFallbackHappyPathTests(func);
    }
  }

  async generateEdgeCaseTests(func: FunctionAnalysis): Promise<TestCase[]> {
    try {
      const prompt = this.buildEdgeCasePrompt(func);
      const response = await this.aiClient.suggestTestCases(prompt);
      const testCases = this.parseTestCasesFromResponse(response, 'edge_case');
      
      // Fallback to template if AI generation fails
      if (testCases.length === 0) {
        return this.generateFallbackEdgeCaseTests(func);
      }
      
      return testCases;
    } catch (error) {
      console.error('Edge case test generation failed, using fallback:', error);
      return this.generateFallbackEdgeCaseTests(func);
    }
  }

  async generateErrorTests(func: FunctionAnalysis): Promise<TestCase[]> {
    try {
      const prompt = this.buildErrorTestPrompt(func);
      const response = await this.aiClient.suggestTestCases(prompt);
      const testCases = this.parseTestCasesFromResponse(response, 'error_case');
      
      // Fallback to template if AI generation fails or no error handling detected
      if (testCases.length === 0 && func.hasErrorHandling) {
        return this.generateFallbackErrorTests(func);
      }
      
      return testCases;
    } catch (error) {
      console.error('Error test generation failed, using fallback:', error);
      return func.hasErrorHandling ? this.generateFallbackErrorTests(func) : [];
    }
  }

  async generateClassTests(cls: ClassAnalysis): Promise<TestCase[]> {
    try {
      const prompt = this.buildClassTestPrompt(cls);
      const response = await this.aiClient.suggestTestCases(prompt);
      const testCases = this.parseTestCasesFromResponse(response, 'happy_path');
      
      // Fallback to template if AI generation fails
      if (testCases.length === 0) {
        return this.generateFallbackClassTests(cls);
      }
      
      return testCases;
    } catch (error) {
      console.error('Class test generation failed, using fallback:', error);
      return this.generateFallbackClassTests(cls);
    }
  }

  private buildHappyPathPrompt(func: FunctionAnalysis): string {
    const params = func.parameters.map(p => `${p.name}: ${p.type || 'any'}`).join(', ');
    
    return `Generate happy path test cases for the following function:

Function: ${func.name}
Parameters: ${params}
Return Type: ${func.returnType || 'void'}
Complexity: ${func.complexity}

Requirements:
- Generate at least one test case for the typical/expected usage
- Include varied input values that represent normal operation
- Specify expected outputs based on the inputs
- Focus on the main functionality

Return the test cases in JSON format as an array:
[
  {
    "name": "descriptive test name",
    "description": "what this test verifies",
    "inputs": [value1, value2, ...],
    "expectedOutput": expected_result
  }
]`;
  }

  private buildEdgeCasePrompt(func: FunctionAnalysis): string {
    const params = func.parameters.map(p => `${p.name}: ${p.type || 'any'}`).join(', ');
    
    return `Generate edge case test cases for the following function:

Function: ${func.name}
Parameters: ${params}
Return Type: ${func.returnType || 'void'}

Requirements:
- For number parameters: test zero, negative values, and boundary values
- For string parameters: test empty strings and special characters
- For array parameters: test empty arrays and single-element arrays
- For nullable parameters: test null and undefined
- Test maximum and minimum valid input values

Return the test cases in JSON format as an array:
[
  {
    "name": "descriptive test name",
    "description": "what edge case this tests",
    "inputs": [value1, value2, ...],
    "expectedOutput": expected_result
  }
]`;
  }

  private buildErrorTestPrompt(func: FunctionAnalysis): string {
    const params = func.parameters.map(p => `${p.name}: ${p.type || 'any'}`).join(', ');
    const errorPaths = func.errorPaths.map(ep => 
      `- Condition: ${ep.condition}, Exception: ${ep.exceptionType || 'unknown'}, Message: ${ep.errorMessage || 'N/A'}`
    ).join('\n');
    
    return `Generate error case test cases for the following function:

Function: ${func.name}
Parameters: ${params}
Return Type: ${func.returnType || 'void'}
Has Error Handling: ${func.hasErrorHandling}
Error Paths:
${errorPaths || 'None detected'}

Requirements:
- Generate tests that trigger error paths
- Test with invalid inputs
- Verify that expected exceptions are thrown
- Test both success and failure paths in try-catch blocks
- Verify error messages are descriptive

Return the test cases in JSON format as an array:
[
  {
    "name": "descriptive test name",
    "description": "what error condition this tests",
    "inputs": [value1, value2, ...],
    "expectedOutput": "error" or error object
  }
]`;
  }

  private buildClassTestPrompt(cls: ClassAnalysis): string {
    const methods = cls.publicMethods.map(m => 
      `${m.name}(${m.parameters.map(p => `${p.name}: ${p.type || 'any'}`).join(', ')})`
    ).join(', ');
    
    const properties = cls.properties.map(p => 
      `${p.name}: ${p.type || 'any'} (${p.visibility})`
    ).join(', ');
    
    return `Generate test cases for the following class:

Class: ${cls.name}
Constructor: ${cls.constructor ? 'Yes' : 'No'}
Public Methods: ${methods || 'None'}
Properties: ${properties || 'None'}
Has State: ${cls.hasState}
Inheritance: ${cls.inheritance || 'None'}

Requirements:
- Generate tests for all public methods
- Test constructor initialization if present
- Test state changes if the class has state
- Test inherited behavior if applicable
- Include setup and teardown considerations

Return the test cases in JSON format as an array:
[
  {
    "name": "descriptive test name",
    "description": "what this test verifies",
    "inputs": [value1, value2, ...],
    "expectedOutput": expected_result
  }
]`;
  }

  private parseTestCasesFromResponse(
    response: string,
    type: 'happy_path' | 'edge_case' | 'error_case'
  ): TestCase[] {
    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        console.warn('No JSON array found in AI response');
        return [];
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      if (!Array.isArray(parsed)) {
        console.warn('Parsed response is not an array');
        return [];
      }

      return parsed.map((tc: any) => ({
        name: tc.name || 'Unnamed test',
        description: tc.description || '',
        inputs: Array.isArray(tc.inputs) ? tc.inputs : [],
        expectedOutput: tc.expectedOutput,
        type,
      }));
    } catch (error) {
      console.error('Failed to parse test cases from AI response:', error);
      return [];
    }
  }

  /**
   * Generates fallback happy path tests using templates
   */
  private generateFallbackHappyPathTests(func: FunctionAnalysis): TestCase[] {
    const testCases: TestCase[] = [];
    
    // Generate a basic happy path test
    const inputs = func.parameters.map(p => this.getDefaultValue(p.type));
    
    testCases.push({
      name: `should execute ${func.name} successfully`,
      description: `Tests that ${func.name} executes without errors with valid inputs`,
      inputs,
      expectedOutput: this.getDefaultValue(func.returnType),
      type: 'happy_path',
    });

    return testCases;
  }

  /**
   * Generates fallback edge case tests using templates
   */
  private generateFallbackEdgeCaseTests(func: FunctionAnalysis): TestCase[] {
    const testCases: TestCase[] = [];
    
    for (const param of func.parameters) {
      const edgeValues = this.getEdgeValues(param.type);
      
      for (const edgeValue of edgeValues) {
        const inputs = func.parameters.map(p => 
          p.name === param.name ? edgeValue.value : this.getDefaultValue(p.type)
        );
        
        testCases.push({
          name: `should handle ${param.name} with ${edgeValue.description}`,
          description: `Tests ${func.name} with ${param.name} = ${edgeValue.description}`,
          inputs,
          expectedOutput: this.getDefaultValue(func.returnType),
          type: 'edge_case',
        });
      }
    }

    return testCases;
  }

  /**
   * Generates fallback error tests using templates
   */
  private generateFallbackErrorTests(func: FunctionAnalysis): TestCase[] {
    const testCases: TestCase[] = [];
    
    // Generate tests for invalid inputs
    for (const param of func.parameters) {
      const invalidValues = this.getInvalidValues(param.type);
      
      for (const invalidValue of invalidValues) {
        const inputs = func.parameters.map(p => 
          p.name === param.name ? invalidValue.value : this.getDefaultValue(p.type)
        );
        
        testCases.push({
          name: `should throw error for invalid ${param.name}`,
          description: `Tests that ${func.name} throws error with ${invalidValue.description}`,
          inputs,
          expectedOutput: 'error',
          type: 'error_case',
        });
      }
    }

    return testCases;
  }

  /**
   * Generates fallback class tests using templates
   */
  private generateFallbackClassTests(cls: ClassAnalysis): TestCase[] {
    const testCases: TestCase[] = [];
    
    // Test constructor if present
    if (cls.constructor) {
      const inputs = cls.constructor.parameters.map(p => this.getDefaultValue(p.type));
      testCases.push({
        name: `should create ${cls.name} instance`,
        description: `Tests that ${cls.name} can be instantiated`,
        inputs,
        expectedOutput: 'instance',
        type: 'happy_path',
      });
    }

    // Test each public method
    for (const method of cls.publicMethods) {
      const inputs = method.parameters.map(p => this.getDefaultValue(p.type));
      testCases.push({
        name: `should call ${method.name} successfully`,
        description: `Tests that ${method.name} executes without errors`,
        inputs,
        expectedOutput: this.getDefaultValue(method.returnType),
        type: 'happy_path',
      });
    }

    return testCases;
  }

  /**
   * Gets a default value for a given type
   */
  private getDefaultValue(type: string | null): any {
    if (!type) return null;
    
    const lowerType = type.toLowerCase();
    
    if (lowerType.includes('string')) return 'test';
    if (lowerType.includes('number') || lowerType.includes('int')) return 1;
    if (lowerType.includes('boolean') || lowerType.includes('bool')) return true;
    if (lowerType.includes('array') || lowerType.includes('[]')) return [];
    if (lowerType.includes('object')) return {};
    if (lowerType === 'void') return undefined;
    
    return null;
  }

  /**
   * Gets edge values for a given type
   */
  private getEdgeValues(type: string | null): Array<{ value: any; description: string }> {
    if (!type) return [];
    
    const lowerType = type.toLowerCase();
    
    if (lowerType.includes('string')) {
      return [
        { value: '', description: 'empty string' },
        { value: ' ', description: 'whitespace' },
        { value: 'a'.repeat(1000), description: 'very long string' },
      ];
    }
    
    if (lowerType.includes('number') || lowerType.includes('int')) {
      return [
        { value: 0, description: 'zero' },
        { value: -1, description: 'negative' },
        { value: Number.MAX_SAFE_INTEGER, description: 'maximum value' },
      ];
    }
    
    if (lowerType.includes('array') || lowerType.includes('[]')) {
      return [
        { value: [], description: 'empty array' },
        { value: [1], description: 'single element' },
      ];
    }
    
    return [];
  }

  /**
   * Gets invalid values for a given type
   */
  private getInvalidValues(type: string | null): Array<{ value: any; description: string }> {
    if (!type) return [];
    
    const lowerType = type.toLowerCase();
    
    if (lowerType.includes('string')) {
      return [
        { value: null, description: 'null' },
        { value: undefined, description: 'undefined' },
      ];
    }
    
    if (lowerType.includes('number') || lowerType.includes('int')) {
      return [
        { value: NaN, description: 'NaN' },
        { value: null, description: 'null' },
      ];
    }
    
    if (lowerType.includes('array') || lowerType.includes('[]')) {
      return [
        { value: null, description: 'null' },
        { value: 'not an array', description: 'wrong type' },
      ];
    }
    
    return [
      { value: null, description: 'null' },
      { value: undefined, description: 'undefined' },
    ];
  }
}
