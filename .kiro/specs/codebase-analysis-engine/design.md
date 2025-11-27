# Design Document

## Overview

The Codebase Analysis Engine is a modular system that ingests legacy codebases from multiple sources, performs comprehensive static analysis, and generates structured reports. The engine follows a pipeline architecture where each stage processes the codebase and enriches the analysis report. The design emphasizes extensibility, fault tolerance, and performance to handle diverse codebases efficiently.

## Architecture

The system follows a pipeline architecture with the following stages:

```mermaid
graph LR
    A[Upload Handler] --> B[Source Processor]
    B --> C[Language Detector]
    C --> D[Dependency Analyzer]
    D --> E[Metrics Calculator]
    E --> F[Code Smell Detector]
    F --> G[Report Generator]
    G --> H[Database Storage]
```

### Key Architectural Decisions

1. **Pipeline Architecture**: Each analysis stage is independent and can be extended or replaced without affecting others
2. **Streaming Processing**: Large codebases are processed in chunks to manage memory efficiently
3. **Async Processing**: Analysis runs asynchronously to avoid blocking API requests
4. **Isolated Execution**: Each analysis runs in isolation to prevent cross-contamination
5. **Incremental Reporting**: Partial results are saved at each stage to enable recovery from failures

## Components and Interfaces

### 1. Upload Handler

**Responsibility**: Accept codebase uploads from multiple sources and validate inputs

**Interface**:
```typescript
interface UploadHandler {
  handleGitHubUpload(url: string): Promise<UploadResult>
  handleZipUpload(file: Buffer): Promise<UploadResult>
  validateSize(path: string): Promise<boolean>
  validateContent(path: string): Promise<boolean>
}

interface UploadResult {
  projectId: string
  workingDirectory: string
  sourceType: 'github' | 'zip'
  status: 'success' | 'error'
  error?: string
}
```

### 2. Source Processor

**Responsibility**: Prepare uploaded content for analysis by extracting and organizing files

**Interface**:
```typescript
interface SourceProcessor {
  extractZip(zipPath: string, targetDir: string): Promise<void>
  cloneRepository(url: string, targetDir: string): Promise<void>
  listSourceFiles(directory: string): Promise<string[]>
  filterNonCodeFiles(files: string[]): string[]
}
```

### 3. Language Detector

**Responsibility**: Identify programming languages in the codebase

**Interface**:
```typescript
interface LanguageDetector {
  detectLanguages(files: string[]): Promise<LanguageDistribution>
  detectByExtension(file: string): string | null
  detectByContent(file: string): Promise<string | null>
}

interface LanguageDistribution {
  languages: Array<{
    name: string
    percentage: number
    lineCount: number
  }>
}
```

### 4. Dependency Analyzer

**Responsibility**: Extract and identify dependencies and frameworks

**Interface**:
```typescript
interface DependencyAnalyzer {
  analyzeDependencies(directory: string): Promise<DependencyReport>
  parsePackageJson(path: string): Promise<Dependency[]>
  parsePythonRequirements(path: string): Promise<Dependency[]>
  parseJavaDependencies(path: string): Promise<Dependency[]>
  detectFrameworks(files: string[]): Promise<Framework[]>
}

interface Dependency {
  name: string
  version: string
  type: 'runtime' | 'dev'
}

interface Framework {
  name: string
  version: string | null
  confidence: number
}
```

### 5. Metrics Calculator

**Responsibility**: Calculate code metrics including LOC, complexity, and maintainability

**Interface**:
```typescript
interface MetricsCalculator {
  calculateMetrics(files: string[]): Promise<CodeMetrics>
  countLOC(file: string): Promise<LOCCount>
  calculateComplexity(file: string): Promise<ComplexityMetrics>
  calculateMaintainability(metrics: ComplexityMetrics): number
}

interface CodeMetrics {
  totalFiles: number
  totalLines: number
  codeLines: number
  commentLines: number
  blankLines: number
  averageComplexity: number
  maintainabilityIndex: number
}

interface ComplexityMetrics {
  functions: Array<{
    name: string
    complexity: number
    lineCount: number
  }>
  averageComplexity: number
}
```

### 6. Code Smell Detector

**Responsibility**: Identify code smells and quality issues

**Interface**:
```typescript
interface CodeSmellDetector {
  detectSmells(files: string[]): Promise<CodeSmell[]>
  detectLongFunctions(file: string): Promise<CodeSmell[]>
  detectComplexFunctions(file: string): Promise<CodeSmell[]>
  detectDuplication(files: string[]): Promise<CodeSmell[]>
  detectDeepNesting(file: string): Promise<CodeSmell[]>
}

interface CodeSmell {
  type: 'long_function' | 'too_complex' | 'duplication' | 'deep_nesting'
  severity: 'low' | 'medium' | 'high'
  file: string
  line: number
  description: string
  metadata?: Record<string, any>
}
```

### 7. Report Generator

**Responsibility**: Aggregate analysis results into a structured report

**Interface**:
```typescript
interface ReportGenerator {
  generateReport(analysisData: AnalysisData): AnalysisReport
  saveReport(projectId: string, report: AnalysisReport): Promise<void>
  generatePartialReport(analysisData: Partial<AnalysisData>, error: Error): AnalysisReport
}

interface AnalysisReport {
  projectId: string
  status: 'completed' | 'failed' | 'partial'
  startTime: Date
  endTime: Date
  languages: LanguageDistribution
  frameworks: Framework[]
  dependencies: Dependency[]
  metrics: CodeMetrics
  issues: CodeSmell[]
  error?: string
}
```

### 8. Analysis Orchestrator

**Responsibility**: Coordinate the analysis pipeline and manage state transitions

**Interface**:
```typescript
interface AnalysisOrchestrator {
  startAnalysis(projectId: string, workingDir: string): Promise<void>
  updateStatus(projectId: string, status: ProjectStatus): Promise<void>
  handleError(projectId: string, error: Error, stage: string): Promise<void>
  cleanupWorkspace(workingDir: string): Promise<void>
}

type ProjectStatus = 'pending' | 'analyzing' | 'completed' | 'failed'
```

## Data Models

### Project Model
```typescript
interface Project {
  id: string // UUID
  name: string
  sourceType: 'github' | 'zip' | 'local'
  sourceUrl: string | null
  status: ProjectStatus
  createdAt: Date
  updatedAt: Date
}
```

### Analysis Model
```typescript
interface Analysis {
  id: string // UUID
  projectId: string
  agentType: string // 'analyzer', 'documentation', etc.
  result: AnalysisReport
  createdAt: Date
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property Reflection

After reviewing all testable properties, several can be consolidated:
- Properties 1.1 and 1.2 (GitHub clone and ZIP extraction) both test upload preparation and can be combined into a single property about upload success
- Properties 3.1, 3.2, 3.3 (dependency extraction for different languages) all test the same parsing behavior and can be combined
- Properties 7.1, 7.2, 7.3, 7.4 (status transitions) test the state machine and can be combined into a single state transition property
- Properties 2.2 and 4.1 both involve counting and can ensure consistency between language distribution and total LOC

### Property 1: Upload preparation success
*For any* valid codebase source (GitHub URL or ZIP file), uploading and preparing it for analysis should result in a working directory containing accessible source files.
**Validates: Requirements 1.1, 1.2**

### Property 2: Upload validation
*For any* uploaded content, the validation process should correctly identify whether at least one recognizable source code file is present.
**Validates: Requirements 1.5**

### Property 3: Error stability
*For any* upload failure scenario, the system should remain stable, not crash, and return a descriptive error message.
**Validates: Requirements 1.4**

### Property 4: Language detection completeness
*For any* codebase containing multiple programming languages, all languages present should be identified and included in the analysis report.
**Validates: Requirements 2.1, 2.5**

### Property 5: Language distribution accuracy
*For any* codebase with known line counts per language, the reported percentage distribution should accurately reflect the actual distribution within a reasonable tolerance.
**Validates: Requirements 2.2**

### Property 6: Content-based detection fallback
*For any* file with an unknown extension but recognizable language content, the content-based detection should correctly identify the language.
**Validates: Requirements 2.3**

### Property 7: Dependency extraction completeness
*For any* dependency manifest file (package.json, requirements.txt, pom.xml, etc.), all listed dependencies should be extracted with their names and versions.
**Validates: Requirements 3.1, 3.2, 3.3, 3.5**

### Property 8: Framework detection
*For any* codebase containing framework-specific files or patterns, the framework type should be correctly identified.
**Validates: Requirements 3.4**

### Property 9: File and LOC counting accuracy
*For any* codebase with a known number of files and lines, the reported counts should match the actual counts.
**Validates: Requirements 4.1**

### Property 10: Complexity calculation correctness
*For any* function with known cyclomatic complexity, the calculated complexity should match the expected value.
**Validates: Requirements 4.2**

### Property 11: Maintainability index bounds
*For any* codebase, the computed maintainability index should always be within the valid range of 0-100.
**Validates: Requirements 4.3**

### Property 12: Comment and blank line exclusion
*For any* file containing comments and blank lines, the code LOC count should exclude these non-code lines.
**Validates: Requirements 4.4**

### Property 13: Long function detection
*For any* function, if its line count exceeds 50, it should be flagged as a "long function" code smell.
**Validates: Requirements 5.1**

### Property 14: Complex function detection
*For any* function, if its cyclomatic complexity exceeds 10, it should be flagged as "too complex".
**Validates: Requirements 5.2**

### Property 15: Code duplication detection
*For any* codebase containing duplicate code blocks, the duplications should be detected and flagged with correct location references for both instances.
**Validates: Requirements 5.3**

### Property 16: Deep nesting detection
*For any* code with conditional nesting, if the nesting level exceeds 4, it should be flagged as "excessive nesting".
**Validates: Requirements 5.4**

### Property 17: Severity assignment completeness
*For any* detected code smell, it should have a valid severity level assigned (low, medium, or high).
**Validates: Requirements 5.5**

### Property 18: Report serialization round-trip
*For any* analysis report, serializing to JSON and then deserializing should produce an equivalent report structure.
**Validates: Requirements 6.1**

### Property 19: Report completeness
*For any* completed analysis, the report should contain all required sections: languages, frameworks, metrics, and issues.
**Validates: Requirements 6.2**

### Property 20: Report persistence round-trip
*For any* analysis report, storing it in the database and then retrieving it by project ID should return an equivalent report.
**Validates: Requirements 6.3**

### Property 21: Partial report generation on failure
*For any* analysis that fails at any stage, a partial report should be generated containing error information and all completed sections up to the failure point.
**Validates: Requirements 6.4**

### Property 22: Report timestamp presence
*For any* analysis report, it should contain valid start and end timestamps.
**Validates: Requirements 6.5**

### Property 23: Status state machine correctness
*For any* project, the status transitions should follow the valid state machine: pending → analyzing → (completed | failed), and no other transitions should be possible.
**Validates: Requirements 7.1, 7.2, 7.3, 7.4**

### Property 24: Status query availability
*For any* project at any point in its lifecycle, querying the status by project ID should return the current status.
**Validates: Requirements 7.5**

### Property 25: Error logging completeness
*For any* unexpected error during analysis, the error should be logged with full context including project ID, stage, and error details.
**Validates: Requirements 8.1**

### Property 26: Parse failure resilience
*For any* codebase containing some unparseable files, the analysis should skip those files and successfully complete analysis of the remaining parseable files.
**Validates: Requirements 8.2**

### Property 27: Analysis isolation
*For any* two concurrent analyses, modifications or errors in one analysis should not affect the results or execution of the other analysis.
**Validates: Requirements 8.4**

## Error Handling

### Error Categories

1. **Upload Errors**
   - Invalid GitHub URL
   - Inaccessible repository
   - Corrupted ZIP file
   - Size limit exceeded
   - No source files found

2. **Processing Errors**
   - File parsing failures
   - Unsupported file formats
   - Memory exhaustion
   - Timeout exceeded

3. **System Errors**
   - Database connection failures
   - Disk space exhausted
   - Network failures

### Error Handling Strategy

1. **Graceful Degradation**: When a component fails, save partial results and continue with remaining components
2. **Detailed Logging**: Log all errors with context (project ID, file path, stage, stack trace)
3. **User-Friendly Messages**: Return descriptive error messages that help users understand what went wrong
4. **Automatic Cleanup**: Clean up temporary files and resources even when errors occur
5. **Timeout Protection**: Implement timeouts at each stage to prevent indefinite hangs

### Error Response Format

```typescript
interface ErrorResponse {
  projectId: string
  status: 'failed'
  stage: string // Which stage failed
  error: {
    code: string
    message: string
    details?: any
  }
  partialResults?: Partial<AnalysisReport>
}
```

## Testing Strategy

### Unit Testing

The system will use Jest for unit testing with the following focus areas:

1. **Component Testing**: Test each pipeline component in isolation
   - Upload handler with mocked file system
   - Language detector with sample files
   - Dependency parser with various manifest formats
   - Metrics calculator with known code samples
   - Code smell detector with crafted examples

2. **Edge Cases**: Test boundary conditions
   - Empty codebases
   - Single-file projects
   - Maximum size codebases (100MB)
   - Files with no extension
   - Malformed dependency files

3. **Error Scenarios**: Test error handling
   - Invalid inputs
   - Missing files
   - Corrupted data
   - Timeout scenarios

### Property-Based Testing

The system will use fast-check (for TypeScript/JavaScript) for property-based testing. Each property test will run a minimum of 100 iterations.

**Property Test Requirements**:
- Each property-based test must be tagged with a comment referencing the design document property
- Tag format: `// Feature: codebase-analysis-engine, Property X: [property description]`
- Each correctness property must be implemented by a single property-based test
- Tests should use smart generators that constrain inputs to valid ranges

**Key Property Tests**:
1. Upload and preparation properties (Properties 1-3)
2. Language detection properties (Properties 4-6)
3. Dependency analysis properties (Properties 7-8)
4. Metrics calculation properties (Properties 9-12)
5. Code smell detection properties (Properties 13-17)
6. Report generation properties (Properties 18-22)
7. State management properties (Properties 23-24)
8. Error handling properties (Properties 25-27)

### Integration Testing

1. **End-to-End Pipeline**: Test complete analysis flow from upload to report generation
2. **Database Integration**: Test persistence and retrieval of projects and analyses
3. **Concurrent Analysis**: Test multiple simultaneous analyses for isolation
4. **Real Codebases**: Test with actual open-source projects of varying sizes

### Performance Testing

1. **Baseline Performance**: Verify 10,000 LOC analyzed in < 2 minutes
2. **Scalability**: Test with codebases of varying sizes (1K, 10K, 50K, 100K LOC)
3. **Memory Usage**: Monitor memory consumption during analysis
4. **Concurrent Load**: Test system with multiple concurrent analyses

## Implementation Notes

### Technology Stack

- **Runtime**: Node.js with TypeScript
- **Database**: PostgreSQL for structured data storage
- **Queue**: Redis for async job processing
- **Testing**: Jest for unit tests, fast-check for property-based tests
- **Language Detection**: Use `linguist` or similar library
- **Complexity Calculation**: Use `escomplex` for JavaScript, `radon` for Python, etc.
- **Code Parsing**: Use language-specific AST parsers (e.g., `@babel/parser`, `ast` for Python)

### Performance Optimizations

1. **Parallel Processing**: Analyze multiple files concurrently using worker threads
2. **Caching**: Cache parsed ASTs to avoid re-parsing
3. **Streaming**: Process large files in chunks rather than loading entirely into memory
4. **Lazy Loading**: Only load and parse files needed for each analysis stage
5. **Incremental Analysis**: Save intermediate results to enable resume on failure

### Security Considerations

1. **Input Validation**: Sanitize all user inputs (URLs, file names)
2. **Sandbox Execution**: Run analysis in isolated containers or VMs
3. **Resource Limits**: Enforce CPU, memory, and time limits per analysis
4. **Access Control**: Validate user permissions before allowing project access
5. **Secure Storage**: Encrypt sensitive data in database and temporary storage

### Extensibility

The pipeline architecture allows easy extension:

1. **New Languages**: Add language-specific parsers by implementing the parser interface
2. **New Code Smells**: Add detectors by implementing the CodeSmellDetector interface
3. **New Metrics**: Extend MetricsCalculator with additional metric calculations
4. **Custom Rules**: Allow users to configure thresholds and rules via configuration files
