// Test Writer
// Writes test code in the appropriate framework

import {
  TestStrategy,
  TestCase,
  TestFramework,
  CodeStyle,
} from '../types';

export interface ITestWriter {
  writeTestSuite(strategy: TestStrategy, framework: TestFramework): string;
  writeTestCase(testCase: TestCase, framework: TestFramework): string;
  writeSetup(setup: string[], framework: TestFramework): string;
  writeTeardown(teardown: string[], framework: TestFramework): string;
  formatTest(code: string, style: CodeStyle): string;
}

export class TestWriter implements ITestWriter {
  writeTestSuite(strategy: TestStrategy, framework: TestFramework): string {
    const setup = this.writeSetup(strategy.setupRequired, framework);
    const teardown = this.writeTeardown(strategy.teardownRequired, framework);
    const testCases = strategy.testCases
      .map(tc => this.writeTestCase(tc, framework))
      .join('\n\n');

    switch (framework) {
      case 'jest':
        return this.writeJestSuite(strategy.targetCode, setup, testCases, teardown);
      case 'mocha':
        return this.writeMochaSuite(strategy.targetCode, setup, testCases, teardown);
      case 'pytest':
        return this.writePytestSuite(strategy.targetCode, setup, testCases, teardown);
      case 'junit':
        return this.writeJUnitSuite(strategy.targetCode, setup, testCases, teardown);
      case 'rspec':
        return this.writeRSpecSuite(strategy.targetCode, setup, testCases, teardown);
      default:
        throw new Error(`Unsupported framework: ${framework}`);
    }
  }

  writeTestCase(testCase: TestCase, framework: TestFramework): string {
    switch (framework) {
      case 'jest':
        return this.writeJestTestCase(testCase);
      case 'mocha':
        return this.writeMochaTestCase(testCase);
      case 'pytest':
        return this.writePytestTestCase(testCase);
      case 'junit':
        return this.writeJUnitTestCase(testCase);
      case 'rspec':
        return this.writeRSpecTestCase(testCase);
      default:
        throw new Error(`Unsupported framework: ${framework}`);
    }
  }

  writeSetup(setup: string[], framework: TestFramework): string {
    if (setup.length === 0) return '';

    switch (framework) {
      case 'jest':
      case 'mocha':
        return `beforeEach(() => {\n${setup.map(s => `  ${s};`).join('\n')}\n});`;
      case 'pytest':
        return `@pytest.fixture\ndef setup():\n${setup.map(s => `    ${s}`).join('\n')}\n    yield`;
      case 'junit':
        return `@Before\npublic void setUp() {\n${setup.map(s => `    ${s};`).join('\n')}\n}`;
      case 'rspec':
        return `before do\n${setup.map(s => `  ${s}`).join('\n')}\nend`;
      default:
        throw new Error(`Unsupported framework: ${framework}`);
    }
  }

  writeTeardown(teardown: string[], framework: TestFramework): string {
    if (teardown.length === 0) return '';

    switch (framework) {
      case 'jest':
      case 'mocha':
        return `afterEach(() => {\n${teardown.map(t => `  ${t};`).join('\n')}\n});`;
      case 'pytest':
        return `@pytest.fixture\ndef teardown():\n    yield\n${teardown.map(t => `    ${t}`).join('\n')}`;
      case 'junit':
        return `@After\npublic void tearDown() {\n${teardown.map(t => `    ${t};`).join('\n')}\n}`;
      case 'rspec':
        return `after do\n${teardown.map(t => `  ${t}`).join('\n')}\nend`;
      default:
        throw new Error(`Unsupported framework: ${framework}`);
    }
  }

  formatTest(code: string, style: CodeStyle): string {
    let formatted = code;

    // Apply indentation
    const indentStr = ' '.repeat(style.indentation);
    formatted = formatted.split('\n').map(line => {
      const leadingSpaces = line.match(/^\s*/)?.[0].length || 0;
      const indentLevel = Math.floor(leadingSpaces / 2);
      return indentStr.repeat(indentLevel) + line.trim();
    }).join('\n');

    // Apply quote style
    if (style.quotes === 'single') {
      formatted = formatted.replace(/"([^"]*)"/g, "'$1'");
    } else {
      formatted = formatted.replace(/'([^']*)'/g, '"$1"');
    }

    // Apply semicolon style
    if (!style.semicolons) {
      formatted = formatted.replace(/;$/gm, '');
    } else if (style.semicolons) {
      formatted = formatted.split('\n').map(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.endsWith(';') && !trimmed.endsWith('{') && !trimmed.endsWith('}')) {
          return line + ';';
        }
        return line;
      }).join('\n');
    }

    return formatted;
  }

  // Jest-specific methods
  private writeJestSuite(targetCode: string, setup: string, testCases: string, teardown: string): string {
    return `describe('${targetCode}', () => {
${setup ? '  ' + setup.split('\n').join('\n  ') + '\n\n' : ''}${testCases.split('\n').map(line => '  ' + line).join('\n')}
${teardown ? '\n  ' + teardown.split('\n').join('\n  ') : ''}
});`;
  }

  private writeJestTestCase(testCase: TestCase): string {
    const testName = testCase.name || testCase.description;
    const inputsStr = testCase.inputs.map(i => JSON.stringify(i)).join(', ');
    
    if (testCase.type === 'error_case') {
      return `it('${testName}', () => {
  expect(() => {
    // Test code here
  }).toThrow();
});`;
    }

    return `it('${testName}', () => {
  // ${testCase.description}
  const result = targetFunction(${inputsStr});
  expect(result).toBe(${JSON.stringify(testCase.expectedOutput)});
});`;
  }

  // Mocha-specific methods
  private writeMochaSuite(targetCode: string, setup: string, testCases: string, teardown: string): string {
    return `describe('${targetCode}', function() {
${setup ? '  ' + setup.split('\n').join('\n  ') + '\n\n' : ''}${testCases.split('\n').map(line => '  ' + line).join('\n')}
${teardown ? '\n  ' + teardown.split('\n').join('\n  ') : ''}
});`;
  }

  private writeMochaTestCase(testCase: TestCase): string {
    const testName = testCase.name || testCase.description;
    const inputsStr = testCase.inputs.map(i => JSON.stringify(i)).join(', ');
    
    if (testCase.type === 'error_case') {
      return `it('${testName}', function() {
  expect(() => {
    // Test code here
  }).to.throw();
});`;
    }

    return `it('${testName}', function() {
  // ${testCase.description}
  const result = targetFunction(${inputsStr});
  expect(result).to.equal(${JSON.stringify(testCase.expectedOutput)});
});`;
  }

  // Pytest-specific methods
  private writePytestSuite(targetCode: string, setup: string, testCases: string, teardown: string): string {
    return `"""Tests for ${targetCode}"""
${setup ? setup + '\n\n' : ''}${testCases}
${teardown ? '\n' + teardown : ''}`;
  }

  private writePytestTestCase(testCase: TestCase): string {
    const testName = testCase.name.replace(/\s+/g, '_').toLowerCase();
    const inputsStr = testCase.inputs.map(i => JSON.stringify(i)).join(', ');
    
    if (testCase.type === 'error_case') {
      return `def test_${testName}():
    """${testCase.description}"""
    with pytest.raises(Exception):
        # Test code here
        pass`;
    }

    return `def test_${testName}():
    """${testCase.description}"""
    result = target_function(${inputsStr})
    assert result == ${JSON.stringify(testCase.expectedOutput)}`;
  }

  // JUnit-specific methods
  private writeJUnitSuite(targetCode: string, setup: string, testCases: string, teardown: string): string {
    const className = targetCode.replace(/[^a-zA-Z0-9]/g, '') + 'Test';
    return `public class ${className} {
${setup ? '    ' + setup.split('\n').join('\n    ') + '\n\n' : ''}${testCases.split('\n').map(line => '    ' + line).join('\n')}
${teardown ? '\n    ' + teardown.split('\n').join('\n    ') : ''}
}`;
  }

  private writeJUnitTestCase(testCase: TestCase): string {
    const testName = testCase.name.replace(/\s+/g, '');
    const inputsStr = testCase.inputs.map(i => JSON.stringify(i)).join(', ');
    
    if (testCase.type === 'error_case') {
      return `@Test(expected = Exception.class)
public void test${testName}() {
    // ${testCase.description}
    // Test code here
}`;
    }

    return `@Test
public void test${testName}() {
    // ${testCase.description}
    Object result = targetFunction(${inputsStr});
    assertEquals(${JSON.stringify(testCase.expectedOutput)}, result);
}`;
  }

  // RSpec-specific methods
  private writeRSpecSuite(targetCode: string, setup: string, testCases: string, teardown: string): string {
    return `describe '${targetCode}' do
${setup ? '  ' + setup.split('\n').join('\n  ') + '\n\n' : ''}${testCases.split('\n').map(line => '  ' + line).join('\n')}
${teardown ? '\n  ' + teardown.split('\n').join('\n  ') : ''}
end`;
  }

  private writeRSpecTestCase(testCase: TestCase): string {
    const testName = testCase.name || testCase.description;
    const inputsStr = testCase.inputs.map(i => JSON.stringify(i)).join(', ');
    
    if (testCase.type === 'error_case') {
      return `it '${testName}' do
  # ${testCase.description}
  expect { target_function(${inputsStr}) }.to raise_error
end`;
    }

    return `it '${testName}' do
  # ${testCase.description}
  result = target_function(${inputsStr})
  expect(result).to eq(${JSON.stringify(testCase.expectedOutput)})
end`;
  }
}
