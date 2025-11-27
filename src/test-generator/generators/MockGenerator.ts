// Mock Generator
// Generates mocks for external dependencies

import {
  Dependency,
  Mock,
  DatabaseCall,
  APICall,
  FileOperation,
  TestFramework,
} from '../types';

export interface IMockGenerator {
  generateMocks(dependencies: Dependency[]): Mock[];
  generateDatabaseMock(dbCalls: DatabaseCall[]): Mock;
  generateAPIMock(apiCalls: APICall[]): Mock;
  generateFileSystemMock(fileOps: FileOperation[]): Mock;
}

export class MockGenerator implements IMockGenerator {
  private framework: TestFramework;
  private language: string;

  constructor(framework: TestFramework = 'jest', language: string = 'typescript') {
    this.framework = framework;
    this.language = language;
  }

  generateMocks(dependencies: Dependency[]): Mock[] {
    const mocks: Mock[] = [];

    for (const dep of dependencies) {
      switch (dep.type) {
        case 'database':
          // Database dependencies will be handled by generateDatabaseMock
          break;
        case 'api':
          // API dependencies will be handled by generateAPIMock
          break;
        case 'filesystem':
          // Filesystem dependencies will be handled by generateFileSystemMock
          break;
        case 'module':
        case 'external':
          mocks.push(this.generateModuleMock(dep));
          break;
      }
    }

    return mocks;
  }

  generateDatabaseMock(dbCalls: DatabaseCall[]): Mock {
    const mockLibrary = this.selectMockLibrary();
    
    if (this.framework === 'jest') {
      return this.generateJestDatabaseMock(dbCalls, mockLibrary);
    } else if (this.framework === 'pytest') {
      return this.generatePytestDatabaseMock(dbCalls, mockLibrary);
    } else if (this.framework === 'junit') {
      return this.generateJUnitDatabaseMock(dbCalls, mockLibrary);
    } else if (this.framework === 'rspec') {
      return this.generateRSpecDatabaseMock(dbCalls, mockLibrary);
    }

    // Default fallback
    return this.generateJestDatabaseMock(dbCalls, mockLibrary);
  }

  generateAPIMock(apiCalls: APICall[]): Mock {
    const mockLibrary = this.selectMockLibrary();
    
    if (this.framework === 'jest') {
      return this.generateJestAPIMock(apiCalls, mockLibrary);
    } else if (this.framework === 'pytest') {
      return this.generatePytestAPIMock(apiCalls, mockLibrary);
    } else if (this.framework === 'junit') {
      return this.generateJUnitAPIMock(apiCalls, mockLibrary);
    } else if (this.framework === 'rspec') {
      return this.generateRSpecAPIMock(apiCalls, mockLibrary);
    }

    // Default fallback
    return this.generateJestAPIMock(apiCalls, mockLibrary);
  }

  generateFileSystemMock(fileOps: FileOperation[]): Mock {
    const mockLibrary = this.selectMockLibrary();
    
    if (this.framework === 'jest') {
      return this.generateJestFileSystemMock(fileOps, mockLibrary);
    } else if (this.framework === 'pytest') {
      return this.generatePytestFileSystemMock(fileOps, mockLibrary);
    } else if (this.framework === 'junit') {
      return this.generateJUnitFileSystemMock(fileOps, mockLibrary);
    } else if (this.framework === 'rspec') {
      return this.generateRSpecFileSystemMock(fileOps, mockLibrary);
    }

    // Default fallback
    return this.generateJestFileSystemMock(fileOps, mockLibrary);
  }

  private selectMockLibrary(): string {
    const libraryMap: Record<TestFramework, string> = {
      jest: 'jest',
      mocha: 'sinon',
      pytest: 'unittest.mock',
      junit: 'Mockito',
      rspec: 'rspec-mocks',
    };

    return libraryMap[this.framework] || 'jest';
  }

  private generateModuleMock(dep: Dependency): Mock {
    const mockLibrary = this.selectMockLibrary();

    if (this.framework === 'jest') {
      return {
        target: dep.name,
        mockCode: `jest.mock('${dep.source}');`,
        mockLibrary,
        setupCode: `const mock${this.capitalize(dep.name)} = require('${dep.source}');`,
      };
    } else if (this.framework === 'pytest') {
      return {
        target: dep.name,
        mockCode: `@patch('${dep.source}')`,
        mockLibrary,
        setupCode: `from unittest.mock import patch, MagicMock`,
      };
    } else if (this.framework === 'junit') {
      return {
        target: dep.name,
        mockCode: `@Mock\nprivate ${this.capitalize(dep.name)} ${dep.name};`,
        mockLibrary,
        setupCode: `import static org.mockito.Mockito.*;`,
      };
    } else if (this.framework === 'rspec') {
      return {
        target: dep.name,
        mockCode: `allow(${this.capitalize(dep.name)}).to receive(:method_name)`,
        mockLibrary,
        setupCode: `let(:${dep.name}) { double('${dep.name}') }`,
      };
    }

    // Default
    return {
      target: dep.name,
      mockCode: `jest.mock('${dep.source}');`,
      mockLibrary,
      setupCode: `const mock${this.capitalize(dep.name)} = require('${dep.source}');`,
    };
  }

  private generateJestDatabaseMock(dbCalls: DatabaseCall[], mockLibrary: string): Mock {
    const operations = dbCalls.map(call => {
      const table = call.table || 'table';
      return `  ${call.operation}: jest.fn().mockResolvedValue({ success: true })`;
    }).join(',\n');

    return {
      target: 'database',
      mockCode: `const mockDb = {\n${operations}\n};`,
      mockLibrary,
      setupCode: `jest.mock('./database', () => mockDb);`,
    };
  }

  private generatePytestDatabaseMock(dbCalls: DatabaseCall[], mockLibrary: string): Mock {
    const operations = dbCalls.map(call => {
      return `mock_db.${call.operation}.return_value = {'success': True}`;
    }).join('\n');

    return {
      target: 'database',
      mockCode: `mock_db = MagicMock()\n${operations}`,
      mockLibrary,
      setupCode: `from unittest.mock import MagicMock, patch`,
    };
  }

  private generateJUnitDatabaseMock(dbCalls: DatabaseCall[], mockLibrary: string): Mock {
    const operations = dbCalls.map(call => {
      const methodName = call.operation;
      return `when(mockDb.${methodName}()).thenReturn(new Result(true));`;
    }).join('\n');

    return {
      target: 'database',
      mockCode: `@Mock\nprivate Database mockDb;\n\n${operations}`,
      mockLibrary,
      setupCode: `import static org.mockito.Mockito.*;`,
    };
  }

  private generateRSpecDatabaseMock(dbCalls: DatabaseCall[], mockLibrary: string): Mock {
    const operations = dbCalls.map(call => {
      return `allow(mock_db).to receive(:${call.operation}).and_return({ success: true })`;
    }).join('\n');

    return {
      target: 'database',
      mockCode: `let(:mock_db) { double('Database') }\n${operations}`,
      mockLibrary,
      setupCode: ``,
    };
  }

  private generateJestAPIMock(apiCalls: APICall[], mockLibrary: string): Mock {
    const endpoints = apiCalls.map(call => {
      const response = call.expectedResponse || { status: 200, data: {} };
      return `  ${call.method.toLowerCase()}: jest.fn().mockResolvedValue(${JSON.stringify(response)})`;
    }).join(',\n');

    return {
      target: 'api',
      mockCode: `const mockApi = {\n${endpoints}\n};`,
      mockLibrary,
      setupCode: `jest.mock('./api', () => mockApi);`,
    };
  }

  private generatePytestAPIMock(apiCalls: APICall[], mockLibrary: string): Mock {
    const endpoints = apiCalls.map(call => {
      const response = call.expectedResponse || { 'status': 200, 'data': {} };
      return `mock_api.${call.method.toLowerCase()}.return_value = ${JSON.stringify(response).replace(/"/g, "'")}`;
    }).join('\n');

    return {
      target: 'api',
      mockCode: `mock_api = MagicMock()\n${endpoints}`,
      mockLibrary,
      setupCode: `from unittest.mock import MagicMock, patch`,
    };
  }

  private generateJUnitAPIMock(apiCalls: APICall[], mockLibrary: string): Mock {
    const endpoints = apiCalls.map(call => {
      const methodName = call.method.toLowerCase();
      return `when(mockApi.${methodName}(anyString())).thenReturn(new Response(200, "{}"));`;
    }).join('\n');

    return {
      target: 'api',
      mockCode: `@Mock\nprivate ApiClient mockApi;\n\n${endpoints}`,
      mockLibrary,
      setupCode: `import static org.mockito.Mockito.*;`,
    };
  }

  private generateRSpecAPIMock(apiCalls: APICall[], mockLibrary: string): Mock {
    const endpoints = apiCalls.map(call => {
      const response = call.expectedResponse || { status: 200, data: {} };
      return `allow(mock_api).to receive(:${call.method.toLowerCase()}).and_return(${JSON.stringify(response)})`;
    }).join('\n');

    return {
      target: 'api',
      mockCode: `let(:mock_api) { double('ApiClient') }\n${endpoints}`,
      mockLibrary,
      setupCode: ``,
    };
  }

  private generateJestFileSystemMock(fileOps: FileOperation[], mockLibrary: string): Mock {
    const operations = fileOps.map(op => {
      switch (op.operation) {
        case 'read':
          return `  readFile: jest.fn().mockResolvedValue('file content')`;
        case 'write':
          return `  writeFile: jest.fn().mockResolvedValue(undefined)`;
        case 'delete':
          return `  unlink: jest.fn().mockResolvedValue(undefined)`;
        case 'exists':
          return `  existsSync: jest.fn().mockReturnValue(true)`;
        default:
          return `  ${op.operation}: jest.fn()`;
      }
    }).join(',\n');

    return {
      target: 'filesystem',
      mockCode: `const mockFs = {\n${operations}\n};`,
      mockLibrary,
      setupCode: `jest.mock('fs', () => mockFs);`,
    };
  }

  private generatePytestFileSystemMock(fileOps: FileOperation[], mockLibrary: string): Mock {
    const operations = fileOps.map(op => {
      switch (op.operation) {
        case 'read':
          return `mock_open.return_value.read.return_value = 'file content'`;
        case 'write':
          return `mock_open.return_value.write.return_value = None`;
        case 'exists':
          return `mock_path.exists.return_value = True`;
        default:
          return `# ${op.operation} mock`;
      }
    }).join('\n');

    return {
      target: 'filesystem',
      mockCode: `mock_open = MagicMock()\nmock_path = MagicMock()\n${operations}`,
      mockLibrary,
      setupCode: `from unittest.mock import MagicMock, patch, mock_open`,
    };
  }

  private generateJUnitFileSystemMock(fileOps: FileOperation[], mockLibrary: string): Mock {
    const operations = fileOps.map(op => {
      switch (op.operation) {
        case 'read':
          return `when(mockFile.read()).thenReturn("file content");`;
        case 'write':
          return `when(mockFile.write(anyString())).thenReturn(true);`;
        case 'exists':
          return `when(mockFile.exists()).thenReturn(true);`;
        default:
          return `// ${op.operation} mock`;
      }
    }).join('\n');

    return {
      target: 'filesystem',
      mockCode: `@Mock\nprivate FileSystem mockFile;\n\n${operations}`,
      mockLibrary,
      setupCode: `import static org.mockito.Mockito.*;`,
    };
  }

  private generateRSpecFileSystemMock(fileOps: FileOperation[], mockLibrary: string): Mock {
    const operations = fileOps.map(op => {
      switch (op.operation) {
        case 'read':
          return `allow(File).to receive(:read).and_return('file content')`;
        case 'write':
          return `allow(File).to receive(:write).and_return(true)`;
        case 'exists':
          return `allow(File).to receive(:exist?).and_return(true)`;
        default:
          return `# ${op.operation} mock`;
      }
    }).join('\n');

    return {
      target: 'filesystem',
      mockCode: operations,
      mockLibrary,
      setupCode: ``,
    };
  }

  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}
