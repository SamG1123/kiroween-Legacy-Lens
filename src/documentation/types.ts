// Core data structures for documentation generation

export interface Parameter {
  name: string;
  type: string | null;
  description?: string;
  optional?: boolean;
}

export interface PropertyInfo {
  name: string;
  type: string | null;
  visibility: 'public' | 'private' | 'protected';
  static?: boolean;
}

export interface FunctionInfo {
  name: string;
  parameters: Parameter[];
  returnType: string | null;
  body: string;
  lineNumber: number;
  docstring?: string;
}

export interface ClassInfo {
  name: string;
  methods: FunctionInfo[];
  properties: PropertyInfo[];
  extends: string | null;
  implements: string[];
}

export interface APIEndpoint {
  method: string;
  path: string;
  handler: string;
  parameters: Parameter[];
  requestBody?: SchemaInfo;
  responses: ResponseInfo[];
}

export interface SchemaInfo {
  type: string;
  properties: Record<string, any>;
  required?: string[];
}

export interface ResponseInfo {
  statusCode: number;
  description: string;
  schema?: SchemaInfo;
}

export interface ParsedCode {
  ast: any;
  language: string;
  filePath: string;
}

export interface ImportInfo {
  source: string;
  imports: string[];
  isDefault?: boolean;
}

export interface ExportInfo {
  name: string;
  type: 'function' | 'class' | 'variable' | 'type';
}

export interface Dependency {
  name: string;
  version: string;
  type: 'production' | 'development';
}

export interface DirectoryTree {
  name: string;
  type: 'file' | 'directory';
  path: string;
  children?: DirectoryTree[];
}

export interface CodeMetrics {
  totalLines: number;
  codeLines: number;
  commentLines: number;
  complexity: number;
  maintainabilityIndex?: number;
}

export interface ProjectContext {
  name: string;
  languages: string[];
  frameworks: string[];
  dependencies: Dependency[];
  structure: DirectoryTree;
  metrics: CodeMetrics;
  mainEntryPoints: string[];
}

export interface FileContext {
  filePath: string;
  purpose: string;
  imports: ImportInfo[];
  exports: ExportInfo[];
  relatedFiles: string[];
}

export interface FunctionContext {
  function: FunctionInfo;
  callers: string[];
  callees: string[];
  usedVariables: string[];
  sideEffects: string[];
}

export interface Component {
  name: string;
  type: 'service' | 'controller' | 'model' | 'utility';
  files: string[];
  dependencies: string[];
  responsibilities: string[];
}

export interface ComponentDescription {
  component: Component;
  description: string;
}

export interface ArchitectureDoc {
  overview: string;
  components: ComponentDescription[];
  diagrams: {
    component: string;
    dataFlow: string;
  };
  patterns: string[];
}

export interface AnnotatedCode {
  originalCode: string;
  annotatedCode: string;
  comments: Array<{
    line: number;
    comment: string;
  }>;
}

export interface DocumentationMetadata {
  projectId: string;
  generatedAt: Date;
  generator: string;
  version: string;
  options: DocumentationOptions;
  statistics: {
    filesDocumented: number;
    functionsDocumented: number;
    classesDocumented: number;
    apiEndpointsDocumented: number;
  };
}

export interface DocumentationOptions {
  types: ('readme' | 'api' | 'architecture' | 'comments')[];
  depth: 'minimal' | 'standard' | 'comprehensive';
  excludePaths: string[];
  customTemplates?: Map<string, string>;
  mergeExisting: boolean;
}

export interface DocumentationSet {
  readme: string;
  api?: string;
  architecture?: string;
  comments: Map<string, AnnotatedCode>;
  metadata: DocumentationMetadata;
}

export interface Manifest {
  files: string[];
  generatedAt: Date;
  projectId: string;
  version: string;
}

export interface HTMLDocs {
  files: Map<string, string>;
}

export interface PackagedDocs {
  archive: Buffer;
  manifest: Manifest;
  htmlVersion: HTMLDocs;
}

// Progress tracking types
export interface ProgressEvent {
  stage: 'parsing' | 'analyzing' | 'generating' | 'validating' | 'packaging';
  current: number;
  total: number;
  message: string;
  timestamp: Date;
}

export type ProgressCallback = (event: ProgressEvent) => void;

// Error handling types
export interface DocumentationError {
  filePath?: string;
  stage: string;
  error: Error;
  timestamp: Date;
  recoverable: boolean;
}

export interface GenerationResult<T> {
  success: boolean;
  data?: T;
  error?: DocumentationError;
  warnings?: string[];
}

// Caching types
export interface CacheEntry<T> {
  data: T;
  timestamp: Date;
  hash: string;
}

export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum cache size in entries
}
