import express, { Request, Response, NextFunction } from 'express';
import { AnalysisOrchestrator } from '../services/AnalysisOrchestrator';
import { UploadHandler } from '../services/UploadHandler';
import { ProjectModel } from '../database/models/Project';
import { AnalysisModel } from '../database/models/Analysis';
import { SourceType } from '../types';
import { JobQueue } from '../queue';
import { logger } from '../utils/logger';
import { metricsCollector } from '../utils/metrics';
import { testConnection } from '../database/config';
import { READMEGenerator } from '../documentation/generators/READMEGenerator';
import { APIDocGenerator } from '../documentation/generators/APIDocGenerator';
import { ArchitectureGenerator } from '../documentation/generators/ArchitectureGenerator';
import { DocumentationPackager } from '../documentation/packagers/DocumentationPackager';
import { ResilientDocumentationGenerator } from '../documentation/utils/ResilientDocumentationGenerator';
import { DocumentationOptionsHandler } from '../documentation/utils/DocumentationOptionsHandler';
import { DocumentationSet, DocumentationOptions, ProjectContext } from '../documentation/types';
import { DependencyAnalyzer } from '../modernization/analyzers/DependencyAnalyzer';
import { FrameworkAnalyzer } from '../modernization/analyzers/FrameworkAnalyzer';
import { PatternAnalyzer } from '../modernization/analyzers/PatternAnalyzer';
import { RecommendationEngine } from '../modernization/engines/RecommendationEngine';
import { PriorityRanker } from '../modernization/engines/PriorityRanker';
import { CompatibilityChecker } from '../modernization/engines/CompatibilityChecker';
import { RoadmapGenerator } from '../modernization/generators/RoadmapGenerator';
import { ModernizationReportGenerator } from '../modernization/generators/ModernizationReportGenerator';
import { Dependency, Framework } from '../modernization/types';
import { RefactoringOrchestrator } from '../refactoring/orchestrators/RefactoringOrchestrator';
import { RefactoringSuggestion } from '../refactoring/types';
import { TestGenerationOrchestrator } from '../test-generator/orchestrators/TestGenerationOrchestrator';
import { AITestGenerationClient } from '../test-generator/ai/AITestGenerationClient';
import { FunctionInfo, ClassInfo, TestFramework, CodeStyle } from '../test-generator/types';
import aiRoutes from './ai-routes';

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mount AI routes
app.use('/api/ai', aiRoutes);

// Initialize services
const uploadHandler = new UploadHandler();
const orchestrator = new AnalysisOrchestrator();
const projectModel = new ProjectModel();
const analysisModel = new AnalysisModel();
const jobQueue = new JobQueue();

// Initialize documentation services
const readmeGenerator = new READMEGenerator();
const apiDocGenerator = new APIDocGenerator();
const architectureGenerator = new ArchitectureGenerator();
const documentationPackager = new DocumentationPackager();
const resilientDocGenerator = new ResilientDocumentationGenerator();
const optionsHandler = new DocumentationOptionsHandler();

// Initialize modernization services
const dependencyAnalyzer = new DependencyAnalyzer();
const frameworkAnalyzer = new FrameworkAnalyzer();
const patternAnalyzer = new PatternAnalyzer();
const recommendationEngine = new RecommendationEngine();
const priorityRanker = new PriorityRanker();
const compatibilityChecker = new CompatibilityChecker();
const roadmapGenerator = new RoadmapGenerator();
const modernizationReportGenerator = new ModernizationReportGenerator();

// Initialize refactoring services
const refactoringOrchestrator = new RefactoringOrchestrator();

// Initialize test generator services (lazy initialization to avoid requiring API keys at startup)
let testGenerationOrchestrator: TestGenerationOrchestrator | null = null;

function getTestGenerationOrchestrator(): TestGenerationOrchestrator {
  if (!testGenerationOrchestrator) {
    const aiTestClient = new AITestGenerationClient({
      provider: process.env.AI_PROVIDER === 'anthropic' ? 'anthropic' : 'openai',
      model: process.env.AI_MODEL,
      temperature: 0.7,
      maxTokens: 2000,
    });
    testGenerationOrchestrator = new TestGenerationOrchestrator(aiTestClient);
  }
  return testGenerationOrchestrator;
}

// Initialize job queue (optional - will fail gracefully if Redis is not available)
let jobQueueAvailable = false;
jobQueue.initialize()
  .then(() => {
    jobQueueAvailable = true;
    logger.info('Job queue initialized successfully');
  })
  .catch(error => {
    logger.warn('Job queue not available - falling back to direct execution', {}, error);
  });

/**
 * GET /health
 * Health check endpoint
 * Returns system health status and metrics
 */
app.get('/health', async (req: Request, res: Response) => {
  try {
    // Check database connection
    const dbHealthy = await testConnection();
    
    // Get aggregated metrics
    const metrics = metricsCollector.getAggregatedMetrics();
    
    // Determine overall health status
    const healthy = dbHealthy;
    const status = healthy ? 'healthy' : 'unhealthy';
    const statusCode = healthy ? 200 : 503;
    
    return res.status(statusCode).json({
      status,
      timestamp: new Date().toISOString(),
      uptime: metrics.uptime,
      services: {
        database: dbHealthy ? 'healthy' : 'unhealthy',
        jobQueue: jobQueueAvailable ? 'healthy' : 'unavailable',
      },
      metrics: {
        analysisCount: metrics.analysisCount,
        analysisSuccessCount: metrics.analysisSuccessCount,
        analysisFailureCount: metrics.analysisFailureCount,
        averageAnalysisDuration: Math.round(metrics.averageAnalysisDuration),
        totalFilesProcessed: metrics.totalFilesProcessed,
        totalLinesProcessed: metrics.totalLinesProcessed,
        averageComplexity: Math.round(metrics.averageComplexity * 100) / 100,
        codeSmellsDetected: metrics.codeSmellsDetected,
      },
    });
  } catch (error) {
    logger.error('Health check failed', {}, error as Error);
    return res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Health check failed',
    });
  }
});

/**
 * GET /metrics
 * Metrics endpoint
 * Returns detailed performance metrics
 */
app.get('/metrics', (req: Request, res: Response) => {
  try {
    const aggregated = metricsCollector.getAggregatedMetrics();
    const recent = metricsCollector.getRecentMetrics(100);
    
    return res.status(200).json({
      aggregated,
      recent,
    });
  } catch (error) {
    logger.error('Failed to retrieve metrics', {}, error as Error);
    return res.status(500).json({
      error: {
        code: 'METRICS_ERROR',
        message: error instanceof Error ? error.message : 'Failed to retrieve metrics',
      },
    });
  }
});

/**
 * POST /api/analyze
 * Start a new codebase analysis
 * 
 * Request body:
 * - sourceType: 'github' | 'zip'
 * - sourceUrl: string (for GitHub)
 * - file: Buffer (for ZIP, sent as multipart/form-data)
 * - name: string (optional project name)
 */
app.post('/api/analyze', async (req: Request, res: Response) => {
  try {
    const { sourceType, sourceUrl, name } = req.body;

    // Validate source type
    if (!sourceType || !['github', 'zip'].includes(sourceType)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_SOURCE_TYPE',
          message: 'Source type must be either "github" or "zip"',
        },
      });
    }

    // Handle GitHub upload
    if (sourceType === 'github') {
      if (!sourceUrl) {
        return res.status(400).json({
          error: {
            code: 'MISSING_SOURCE_URL',
            message: 'Source URL is required for GitHub uploads',
          },
        });
      }

      const uploadResult = await uploadHandler.handleGitHubUpload(sourceUrl);

      if (uploadResult.status === 'error') {
        return res.status(400).json({
          error: {
            code: 'UPLOAD_FAILED',
            message: uploadResult.error || 'Failed to upload from GitHub',
          },
        });
      }

      // Create project record
      const project = await projectModel.create({
        name: name || `GitHub: ${sourceUrl}`,
        sourceType: 'github' as SourceType,
        sourceUrl,
        status: 'pending',
      });

      // Enqueue analysis job or fall back to direct execution
      if (jobQueueAvailable) {
        const jobId = await jobQueue.enqueueJob(project.id, uploadResult.workingDirectory);
        return res.status(202).json({
          projectId: project.id,
          jobId,
          status: project.status,
          message: 'Analysis queued',
        });
      } else {
        // Fall back to direct execution
        orchestrator.startAnalysis(project.id, uploadResult.workingDirectory)
          .catch(error => {
            logger.error('Analysis failed', { projectId: project.id }, error);
          });
        return res.status(202).json({
          projectId: project.id,
          status: project.status,
          message: 'Analysis started',
        });
      }
    }

    // Handle ZIP upload
    if (sourceType === 'zip') {
      // For ZIP uploads, we expect the file to be sent as raw body or multipart
      // For simplicity, we'll handle raw buffer in body
      const fileBuffer = req.body.file;

      if (!fileBuffer) {
        return res.status(400).json({
          error: {
            code: 'MISSING_FILE',
            message: 'File buffer is required for ZIP uploads',
          },
        });
      }

      const uploadResult = await uploadHandler.handleZipUpload(
        Buffer.isBuffer(fileBuffer) ? fileBuffer : Buffer.from(fileBuffer)
      );

      if (uploadResult.status === 'error') {
        return res.status(400).json({
          error: {
            code: 'UPLOAD_FAILED',
            message: uploadResult.error || 'Failed to upload ZIP file',
          },
        });
      }

      // Create project record
      const project = await projectModel.create({
        name: name || 'ZIP Upload',
        sourceType: 'zip' as SourceType,
        status: 'pending',
      });

      // Enqueue analysis job or fall back to direct execution
      if (jobQueueAvailable) {
        const jobId = await jobQueue.enqueueJob(project.id, uploadResult.workingDirectory);
        return res.status(202).json({
          projectId: project.id,
          jobId,
          status: project.status,
          message: 'Analysis queued',
        });
      } else {
        // Fall back to direct execution
        orchestrator.startAnalysis(project.id, uploadResult.workingDirectory)
          .catch(error => {
            logger.error('Analysis failed', { projectId: project.id }, error);
          });
        return res.status(202).json({
          projectId: project.id,
          status: project.status,
          message: 'Analysis started',
        });
      }
    }
  } catch (error) {
    logger.error('Error in /api/analyze', {}, error as Error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
    });
  }
});

/**
 * GET /api/analysis/:id
 * Get the status and details of an analysis
 */
app.get('/api/analysis/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Validate ID format (basic UUID validation)
    if (!id || !isValidUUID(id)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_ID',
          message: 'Invalid project ID format',
        },
      });
    }

    // Find project
    const project = await projectModel.findById(id);

    if (!project) {
      return res.status(404).json({
        error: {
          code: 'PROJECT_NOT_FOUND',
          message: `Project with ID ${id} not found`,
        },
      });
    }

    // Find latest analysis for this project
    const analysis = await analysisModel.findLatestByProjectId(id);

    // Get job status if available
    let job = null;
    if (jobQueueAvailable) {
      try {
        job = await jobQueue.getJobByProjectId(id);
      } catch (error) {
        logger.warn('Failed to get job status', { projectId: id }, error as Error);
      }
    }

    return res.status(200).json({
      projectId: project.id,
      name: project.name,
      sourceType: project.sourceType,
      sourceUrl: project.sourceUrl,
      status: project.status,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      job: job ? {
        id: job.id,
        status: job.status,
        progress: job.progress,
        error: job.error,
        createdAt: job.createdAt,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
      } : null,
      analysis: analysis ? {
        id: analysis.id,
        agentType: analysis.agentType,
        createdAt: analysis.createdAt,
        hasResults: !!analysis.result,
      } : null,
    });
  } catch (error) {
    logger.error('Error in /api/analysis/:id', { projectId: req.params.id }, error as Error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
    });
  }
});

/**
 * GET /api/report/:id
 * Get the full analysis report for a project
 */
app.get('/api/report/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Validate ID format
    if (!id || !isValidUUID(id)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_ID',
          message: 'Invalid project ID format',
        },
      });
    }

    // Find project
    const project = await projectModel.findById(id);

    if (!project) {
      return res.status(404).json({
        error: {
          code: 'PROJECT_NOT_FOUND',
          message: `Project with ID ${id} not found`,
        },
      });
    }

    // Check if analysis is complete
    if (project.status === 'pending' || project.status === 'analyzing') {
      return res.status(202).json({
        projectId: project.id,
        status: project.status,
        message: 'Analysis is still in progress',
      });
    }

    // Find latest analysis
    const analysis = await analysisModel.findLatestByProjectId(id);

    if (!analysis) {
      return res.status(404).json({
        error: {
          code: 'REPORT_NOT_FOUND',
          message: `No analysis report found for project ${id}`,
        },
      });
    }

    // Return full report
    return res.status(200).json({
      projectId: project.id,
      name: project.name,
      sourceType: project.sourceType,
      sourceUrl: project.sourceUrl,
      status: project.status,
      report: analysis.result,
    });
  } catch (error) {
    logger.error('Error in /api/report/:id', { projectId: req.params.id }, error as Error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
    });
  }
});

/**
 * POST /api/generate-docs/:projectId
 * Generate documentation for a project
 * 
 * Request body:
 * - options: DocumentationOptions (optional)
 *   - types: array of 'readme' | 'api' | 'architecture' | 'comments'
 *   - depth: 'minimal' | 'standard' | 'comprehensive'
 *   - excludePaths: string[]
 *   - mergeExisting: boolean
 */
app.post('/api/generate-docs/:projectId', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;

    // Validate project ID format
    if (!projectId || !isValidUUID(projectId)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_ID',
          message: 'Invalid project ID format',
        },
      });
    }

    // Find project
    const project = await projectModel.findById(projectId);

    if (!project) {
      return res.status(404).json({
        error: {
          code: 'PROJECT_NOT_FOUND',
          message: `Project with ID ${projectId} not found`,
        },
      });
    }

    // Check if analysis is complete
    if (project.status !== 'completed') {
      return res.status(400).json({
        error: {
          code: 'ANALYSIS_NOT_COMPLETE',
          message: 'Project analysis must be completed before generating documentation',
        },
      });
    }

    // Get analysis report
    const analysis = await analysisModel.findLatestByProjectId(projectId);

    if (!analysis || !analysis.result) {
      return res.status(404).json({
        error: {
          code: 'ANALYSIS_NOT_FOUND',
          message: `No analysis report found for project ${projectId}`,
        },
      });
    }

    // Parse and validate options
    const rawOptions = req.body.options || {};
    const validationResult = optionsHandler.validateOptions(rawOptions);

    if (!validationResult.valid) {
      return res.status(400).json({
        error: {
          code: 'INVALID_OPTIONS',
          message: 'Invalid documentation options',
          details: validationResult.errors,
        },
      });
    }

    const options = optionsHandler.applyDefaults(rawOptions);

    // Build project context from analysis report
    const projectContext: ProjectContext = {
      name: project.name,
      languages: analysis.result.languages?.languages?.map((l: any) => l.name) || [],
      frameworks: analysis.result.frameworks?.map((f: any) => f.name) || [],
      dependencies: analysis.result.dependencies?.map((d: any) => ({
        name: d.name,
        version: d.version || 'unknown',
        type: d.type || 'production',
      })) || [],
      structure: analysis.result.structure || {
        name: project.name,
        type: 'directory',
        path: '/',
        children: [],
      },
      metrics: {
        totalLines: analysis.result.metrics?.totalLines || 0,
        codeLines: analysis.result.metrics?.codeLines || 0,
        commentLines: analysis.result.metrics?.commentLines || 0,
        complexity: analysis.result.metrics?.averageComplexity || 0,
        maintainabilityIndex: analysis.result.metrics?.maintainabilityIndex,
      },
      mainEntryPoints: analysis.result.entryPoints || [],
    };

    // Generate documentation based on requested types
    const documentationSet: DocumentationSet = {
      readme: '',
      api: undefined,
      architecture: undefined,
      comments: new Map(),
      metadata: {
        projectId,
        generatedAt: new Date(),
        generator: 'legacy-code-revival-ai',
        version: '1.0.0',
        options,
        statistics: {
          filesDocumented: 0,
          functionsDocumented: 0,
          classesDocumented: 0,
          apiEndpointsDocumented: 0,
        },
      },
    };

    // Generate README if requested
    if (options.types.includes('readme')) {
      resilientDocGenerator.getProgressTracker().startStage(
        'generating',
        1,
        'Generating README'
      );
      documentationSet.readme = await readmeGenerator.generate(projectContext);
      resilientDocGenerator.getProgressTracker().incrementProgress('README generated');
    }

    // Generate API documentation if requested
    if (options.types.includes('api')) {
      const endpoints = analysis.result.apiEndpoints || [];
      if (endpoints.length > 0) {
        resilientDocGenerator.getProgressTracker().startStage(
          'generating',
          1,
          'Generating API documentation'
        );
        documentationSet.api = await apiDocGenerator.generate(endpoints);
        documentationSet.metadata.statistics.apiEndpointsDocumented = endpoints.length;
        resilientDocGenerator.getProgressTracker().incrementProgress('API documentation generated');
      }
    }

    // Generate architecture documentation if requested
    if (options.types.includes('architecture')) {
      resilientDocGenerator.getProgressTracker().startStage(
        'generating',
        1,
        'Generating architecture documentation'
      );
      const architectureDoc = await architectureGenerator.generate(projectContext);
      
      // Format architecture documentation as markdown
      const archSections: string[] = [];
      archSections.push('# Architecture Documentation');
      archSections.push('');
      archSections.push('## Overview');
      archSections.push('');
      archSections.push(architectureDoc.overview);
      archSections.push('');
      
      if (architectureDoc.components.length > 0) {
        archSections.push('## Components');
        archSections.push('');
        architectureDoc.components.forEach(comp => {
          archSections.push(`### ${comp.component.name}`);
          archSections.push('');
          archSections.push(`**Type:** ${comp.component.type}`);
          archSections.push('');
          archSections.push(`**Description:** ${comp.description}`);
          archSections.push('');
          if (comp.component.responsibilities.length > 0) {
            archSections.push('**Responsibilities:**');
            comp.component.responsibilities.forEach(resp => {
              archSections.push(`- ${resp}`);
            });
            archSections.push('');
          }
        });
      }
      
      archSections.push('## Component Diagram');
      archSections.push('');
      archSections.push(architectureDoc.diagrams.component);
      archSections.push('');
      
      archSections.push('## Data Flow Diagram');
      archSections.push('');
      archSections.push(architectureDoc.diagrams.dataFlow);
      archSections.push('');
      
      if (architectureDoc.patterns.length > 0) {
        archSections.push('## Architectural Patterns');
        archSections.push('');
        architectureDoc.patterns.forEach(pattern => {
          archSections.push(`- ${pattern}`);
        });
        archSections.push('');
      }
      
      documentationSet.architecture = archSections.join('\n');
      resilientDocGenerator.getProgressTracker().incrementProgress('Architecture documentation generated');
    }

    // Store documentation in analysis model (extend the result)
    analysis.result.documentation = {
      readme: documentationSet.readme,
      api: documentationSet.api,
      architecture: documentationSet.architecture,
      metadata: {
        ...documentationSet.metadata,
        generatedAt: documentationSet.metadata.generatedAt.toISOString(),
      },
    };

    await analysisModel.updateResult(analysis.id, analysis.result);

    return res.status(200).json({
      projectId,
      status: 'completed',
      message: 'Documentation generated successfully',
      metadata: {
        ...documentationSet.metadata,
        generatedAt: documentationSet.metadata.generatedAt.toISOString(),
      },
    });
  } catch (error) {
    logger.error('Error in /api/generate-docs/:projectId', { projectId: req.params.projectId }, error as Error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
    });
  }
});

/**
 * GET /api/docs/:projectId
 * Retrieve generated documentation for a project
 */
app.get('/api/docs/:projectId', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;

    // Validate project ID format
    if (!projectId || !isValidUUID(projectId)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_ID',
          message: 'Invalid project ID format',
        },
      });
    }

    // Find project
    const project = await projectModel.findById(projectId);

    if (!project) {
      return res.status(404).json({
        error: {
          code: 'PROJECT_NOT_FOUND',
          message: `Project with ID ${projectId} not found`,
        },
      });
    }

    // Get analysis with documentation
    const analysis = await analysisModel.findLatestByProjectId(projectId);

    if (!analysis || !analysis.result) {
      return res.status(404).json({
        error: {
          code: 'ANALYSIS_NOT_FOUND',
          message: `No analysis found for project ${projectId}`,
        },
      });
    }

    // Check if documentation exists
    if (!analysis.result.documentation) {
      return res.status(404).json({
        error: {
          code: 'DOCUMENTATION_NOT_FOUND',
          message: `No documentation found for project ${projectId}. Generate documentation first.`,
        },
      });
    }

    return res.status(200).json({
      projectId,
      name: project.name,
      documentation: analysis.result.documentation,
    });
  } catch (error) {
    logger.error('Error in /api/docs/:projectId', { projectId: req.params.projectId }, error as Error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
    });
  }
});

/**
 * GET /api/docs/:projectId/download
 * Download documentation as a ZIP archive
 */
app.get('/api/docs/:projectId/download', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;

    // Validate project ID format
    if (!projectId || !isValidUUID(projectId)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_ID',
          message: 'Invalid project ID format',
        },
      });
    }

    // Find project
    const project = await projectModel.findById(projectId);

    if (!project) {
      return res.status(404).json({
        error: {
          code: 'PROJECT_NOT_FOUND',
          message: `Project with ID ${projectId} not found`,
        },
      });
    }

    // Get analysis with documentation
    const analysis = await analysisModel.findLatestByProjectId(projectId);

    if (!analysis || !analysis.result || !analysis.result.documentation) {
      return res.status(404).json({
        error: {
          code: 'DOCUMENTATION_NOT_FOUND',
          message: `No documentation found for project ${projectId}. Generate documentation first.`,
        },
      });
    }

    const doc = analysis.result.documentation;

    // Reconstruct DocumentationSet from stored data
    const documentationSet: DocumentationSet = {
      readme: doc.readme || '',
      api: doc.api,
      architecture: doc.architecture,
      comments: new Map(),
      metadata: {
        projectId: doc.metadata.projectId,
        generatedAt: new Date(doc.metadata.generatedAt),
        generator: doc.metadata.generator,
        version: doc.metadata.version,
        options: doc.metadata.options,
        statistics: doc.metadata.statistics,
      },
    };

    // Package documentation
    const packagedDocs = await documentationPackager.package(documentationSet);

    // Set response headers for file download
    const filename = `${project.name.replace(/[^a-z0-9]/gi, '-')}-documentation.zip`;
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', packagedDocs.archive.length);

    // Send the archive
    return res.status(200).send(packagedDocs.archive);
  } catch (error) {
    logger.error('Error in /api/docs/:projectId/download', { projectId: req.params.projectId }, error as Error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
    });
  }
});

/**
 * POST /api/modernize/:projectId
 * Analyze a project and generate modernization recommendations
 * 
 * Request body:
 * - dependencies: Dependency[] (optional - extracted from project if not provided)
 * - frameworks: Framework[] (optional - extracted from project if not provided)
 * - codebasePath: string (optional - path to codebase for pattern analysis)
 */
app.post('/api/modernize/:projectId', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;

    // Validate project ID format
    if (!projectId || !isValidUUID(projectId)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_ID',
          message: 'Invalid project ID format',
        },
      });
    }

    // Find project
    const project = await projectModel.findById(projectId);

    if (!project) {
      return res.status(404).json({
        error: {
          code: 'PROJECT_NOT_FOUND',
          message: `Project with ID ${projectId} not found`,
        },
      });
    }

    // Check if analysis is complete
    if (project.status !== 'completed') {
      return res.status(400).json({
        error: {
          code: 'ANALYSIS_NOT_COMPLETE',
          message: 'Project analysis must be completed before generating modernization recommendations',
        },
      });
    }

    // Get analysis report
    const analysis = await analysisModel.findLatestByProjectId(projectId);

    if (!analysis || !analysis.result) {
      return res.status(404).json({
        error: {
          code: 'ANALYSIS_NOT_FOUND',
          message: `No analysis report found for project ${projectId}`,
        },
      });
    }

    // Extract dependencies and frameworks from request body or analysis report
    let dependencies: Dependency[] = req.body.dependencies || [];
    let frameworks: Framework[] = req.body.frameworks || [];

    // If not provided in request, extract from analysis report
    if (dependencies.length === 0 && analysis.result.dependencies) {
      dependencies = analysis.result.dependencies.map((dep: any) => ({
        name: dep.name,
        version: dep.version || 'unknown',
        type: dep.type === 'dev' ? 'development' : 'production',
        ecosystem: dep.ecosystem || 'npm',
      }));
    }

    if (frameworks.length === 0 && analysis.result.frameworks) {
      frameworks = analysis.result.frameworks.map((fw: any) => ({
        name: fw.name,
        version: fw.version || 'unknown',
        type: fw.type || 'backend',
      }));
    }

    // Validate that we have something to analyze
    if (dependencies.length === 0 && frameworks.length === 0) {
      return res.status(400).json({
        error: {
          code: 'NO_DATA_TO_ANALYZE',
          message: 'No dependencies or frameworks found to analyze. Provide them in the request body or ensure the project analysis includes dependency information.',
        },
      });
    }

    logger.info('Starting modernization analysis', {
      projectId,
      dependencyCount: dependencies.length,
      frameworkCount: frameworks.length,
    });

    // Run analyzers
    const dependencyAnalysis = dependencies.length > 0
      ? await dependencyAnalyzer.analyzeDependencies(dependencies)
      : [];

    const frameworkAnalysis = frameworks.length > 0
      ? await frameworkAnalyzer.analyzeFrameworks(frameworks)
      : [];

    // Pattern analysis is optional and requires codebase path
    const patternAnalysis = req.body.codebasePath
      ? await patternAnalyzer.analyzePatterns(req.body.codebasePath)
      : [];

    // Generate recommendations
    const recommendations = recommendationEngine.generateRecommendations(
      dependencyAnalysis,
      frameworkAnalysis,
      patternAnalysis
    );

    // Rank recommendations by priority
    const rankedRecommendations = priorityRanker.rankRecommendations(recommendations);

    // Check compatibility
    const compatibilityReport = await compatibilityChecker.checkCompatibility(rankedRecommendations);

    // Generate roadmap
    const roadmap = roadmapGenerator.generateRoadmap(rankedRecommendations);

    // Generate final report
    const modernizationReport = modernizationReportGenerator.generateReport(
      roadmap,
      rankedRecommendations,
      compatibilityReport
    );

    // Store modernization report in analysis model
    const modernizationAnalysis = await analysisModel.create({
      projectId,
      agentType: 'modernization',
      result: modernizationReport as any,
    });

    logger.info('Modernization analysis completed', {
      projectId,
      analysisId: modernizationAnalysis.id,
      recommendationCount: rankedRecommendations.length,
    });

    return res.status(200).json({
      projectId,
      analysisId: modernizationAnalysis.id,
      status: 'completed',
      message: 'Modernization analysis completed successfully',
      summary: modernizationReport.summary,
      statistics: modernizationReport.statistics,
    });
  } catch (error) {
    logger.error('Error in /api/modernize/:projectId', { projectId: req.params.projectId }, error as Error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
    });
  }
});

/**
 * GET /api/modernization/:projectId
 * Retrieve modernization recommendations for a project
 */
app.get('/api/modernization/:projectId', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;

    // Validate project ID format
    if (!projectId || !isValidUUID(projectId)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_ID',
          message: 'Invalid project ID format',
        },
      });
    }

    // Find project
    const project = await projectModel.findById(projectId);

    if (!project) {
      return res.status(404).json({
        error: {
          code: 'PROJECT_NOT_FOUND',
          message: `Project with ID ${projectId} not found`,
        },
      });
    }

    // Find modernization analysis for this project
    const analyses = await analysisModel.findByProjectId(projectId);
    const modernizationAnalysis = analyses.find(a => a.agentType === 'modernization');

    if (!modernizationAnalysis) {
      return res.status(404).json({
        error: {
          code: 'MODERNIZATION_NOT_FOUND',
          message: `No modernization analysis found for project ${projectId}. Run POST /api/modernize/${projectId} first.`,
        },
      });
    }

    // Return the full modernization report
    return res.status(200).json({
      projectId,
      analysisId: modernizationAnalysis.id,
      name: project.name,
      report: modernizationAnalysis.result,
    });
  } catch (error) {
    logger.error('Error in /api/modernization/:projectId', { projectId: req.params.projectId }, error as Error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
    });
  }
});

/**
 * POST /api/refactor/:projectId
 * Analyze code and generate refactoring suggestions
 * 
 * Request body:
 * - code: string (source code to analyze)
 * - filename: string (name of the file being analyzed)
 * - codebasePath?: string (path to codebase for context)
 */
app.post('/api/refactor/:projectId', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { code, filename, codebasePath } = req.body;

    // Validate project ID format
    if (!projectId || !isValidUUID(projectId)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_ID',
          message: 'Invalid project ID format',
        },
      });
    }

    // Validate required fields
    if (!code || typeof code !== 'string') {
      return res.status(400).json({
        error: {
          code: 'MISSING_CODE',
          message: 'Code is required and must be a string',
        },
      });
    }

    if (!filename || typeof filename !== 'string') {
      return res.status(400).json({
        error: {
          code: 'MISSING_FILENAME',
          message: 'Filename is required and must be a string',
        },
      });
    }

    // Find project to ensure it exists
    const project = await projectModel.findById(projectId);

    if (!project) {
      return res.status(404).json({
        error: {
          code: 'PROJECT_NOT_FOUND',
          message: `Project with ID ${projectId} not found`,
        },
      });
    }

    logger.info('Starting refactoring analysis', {
      projectId,
      filename,
      codeLength: code.length,
    });

    // Analyze code and generate suggestions
    const suggestions = await refactoringOrchestrator.analyzeAndSuggest(
      code,
      filename,
      projectId
    );

    logger.info('Refactoring analysis completed', {
      projectId,
      suggestionCount: suggestions.length,
    });

    return res.status(200).json({
      projectId,
      filename,
      status: 'completed',
      message: 'Refactoring suggestions generated successfully',
      suggestions,
      statistics: {
        totalSuggestions: suggestions.length,
        lowRisk: suggestions.filter(s => s.riskLevel === 'low').length,
        mediumRisk: suggestions.filter(s => s.riskLevel === 'medium').length,
        highRisk: suggestions.filter(s => s.riskLevel === 'high').length,
        byType: suggestions.reduce((acc, s) => {
          acc[s.type] = (acc[s.type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      },
    });
  } catch (error) {
    logger.error('Error in /api/refactor/:projectId', { projectId: req.params.projectId }, error as Error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
    });
  }
});

/**
 * POST /api/refactor/:projectId/apply
 * Apply refactoring suggestions to code
 * 
 * Request body:
 * - code: string (source code to refactor)
 * - suggestions: RefactoringSuggestion[] (refactorings to apply)
 * - codebasePath: string (path to codebase for testing)
 * - atomic?: boolean (whether to apply all or none, defaults to false)
 */
app.post('/api/refactor/:projectId/apply', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { code, suggestions, codebasePath, atomic = false } = req.body;

    // Validate project ID format
    if (!projectId || !isValidUUID(projectId)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_ID',
          message: 'Invalid project ID format',
        },
      });
    }

    // Validate required fields
    if (!code || typeof code !== 'string') {
      return res.status(400).json({
        error: {
          code: 'MISSING_CODE',
          message: 'Code is required and must be a string',
        },
      });
    }

    if (!suggestions || !Array.isArray(suggestions) || suggestions.length === 0) {
      return res.status(400).json({
        error: {
          code: 'MISSING_SUGGESTIONS',
          message: 'Suggestions are required and must be a non-empty array',
        },
      });
    }

    if (!codebasePath || typeof codebasePath !== 'string') {
      return res.status(400).json({
        error: {
          code: 'MISSING_CODEBASE_PATH',
          message: 'Codebase path is required for testing',
        },
      });
    }

    // Find project to ensure it exists
    const project = await projectModel.findById(projectId);

    if (!project) {
      return res.status(404).json({
        error: {
          code: 'PROJECT_NOT_FOUND',
          message: `Project with ID ${projectId} not found`,
        },
      });
    }

    logger.info('Starting refactoring application', {
      projectId,
      suggestionCount: suggestions.length,
      atomic,
    });

    // Apply refactorings
    const result = await refactoringOrchestrator.applyRefactorings(
      code,
      suggestions,
      projectId,
      codebasePath
    );

    logger.info('Refactoring application completed', {
      projectId,
      success: result.success,
      appliedCount: result.appliedRefactorings.length,
      failedCount: result.failedRefactorings.length,
    });

    const statusCode = result.success ? 200 : 207; // 207 Multi-Status for partial success

    return res.status(statusCode).json({
      projectId,
      status: result.success ? 'completed' : 'partial',
      message: result.success 
        ? 'All refactorings applied successfully'
        : 'Some refactorings failed or were skipped',
      result: {
        success: result.success,
        appliedRefactorings: result.appliedRefactorings,
        failedRefactorings: result.failedRefactorings,
        skippedRefactorings: result.skippedRefactorings,
        errors: result.errors,
        warnings: result.warnings,
        detailedErrors: result.detailedErrors,
        detailedWarnings: result.detailedWarnings,
        errorReport: result.errorReport,
      },
      statistics: {
        totalRequested: suggestions.length,
        applied: result.appliedRefactorings.length,
        failed: result.failedRefactorings.length,
        skipped: result.skippedRefactorings.length,
      },
    });
  } catch (error) {
    logger.error('Error in /api/refactor/:projectId/apply', { projectId: req.params.projectId }, error as Error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
    });
  }
});

/**
 * POST /api/refactor/:projectId/undo
 * Undo refactorings for a project
 * 
 * Request body:
 * - action: 'last' | 'all' (what to undo)
 */
app.post('/api/refactor/:projectId/undo', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { action = 'last' } = req.body;

    // Validate project ID format
    if (!projectId || !isValidUUID(projectId)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_ID',
          message: 'Invalid project ID format',
        },
      });
    }

    // Validate action
    if (!['last', 'all'].includes(action)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_ACTION',
          message: 'Action must be either "last" or "all"',
        },
      });
    }

    // Find project to ensure it exists
    const project = await projectModel.findById(projectId);

    if (!project) {
      return res.status(404).json({
        error: {
          code: 'PROJECT_NOT_FOUND',
          message: `Project with ID ${projectId} not found`,
        },
      });
    }

    logger.info('Starting refactoring undo', {
      projectId,
      action,
    });

    let undoResult;

    if (action === 'last') {
      undoResult = await refactoringOrchestrator.undoLastRefactoring(projectId);
      
      if (!undoResult.success) {
        return res.status(404).json({
          error: {
            code: 'NOTHING_TO_UNDO',
            message: undoResult.error || 'No refactorings to undo',
          },
        });
      }

      logger.info('Last refactoring undone', {
        projectId,
        refactoringId: undoResult.refactoring?.id,
      });

      return res.status(200).json({
        projectId,
        status: 'completed',
        message: 'Last refactoring undone successfully',
        undoneRefactoring: undoResult.refactoring,
      });
    } else {
      // action === 'all'
      const undoAllResult = await refactoringOrchestrator.undoAllRefactorings(projectId);

      logger.info('All refactorings undone', {
        projectId,
        count: undoAllResult.count,
      });

      return res.status(200).json({
        projectId,
        status: 'completed',
        message: `${undoAllResult.count} refactorings undone successfully`,
        undoneCount: undoAllResult.count,
      });
    }
  } catch (error) {
    logger.error('Error in /api/refactor/:projectId/undo', { projectId: req.params.projectId }, error as Error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
    });
  }
});

/**
 * GET /api/refactor/:projectId/history
 * Get refactoring history for a project
 */
app.get('/api/refactor/:projectId/history', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;

    // Validate project ID format
    if (!projectId || !isValidUUID(projectId)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_ID',
          message: 'Invalid project ID format',
        },
      });
    }

    // Find project to ensure it exists
    const project = await projectModel.findById(projectId);

    if (!project) {
      return res.status(404).json({
        error: {
          code: 'PROJECT_NOT_FOUND',
          message: `Project with ID ${projectId} not found`,
        },
      });
    }

    // Get refactoring history
    const history = refactoringOrchestrator.getRefactoringHistory(projectId);

    return res.status(200).json({
      projectId,
      name: project.name,
      history,
      statistics: {
        total: history.length,
        applied: history.filter(r => r.status === 'applied').length,
        reverted: history.filter(r => r.status === 'reverted').length,
        failed: history.filter(r => r.status === 'failed').length,
        byType: history.reduce((acc, r) => {
          acc[r.type] = (acc[r.type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      },
    });
  } catch (error) {
    logger.error('Error in /api/refactor/:projectId/history', { projectId: req.params.projectId }, error as Error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
    });
  }
});

/**
 * POST /api/generate-tests/:projectId
 * Generate tests for a function or class
 * 
 * Request body:
 * - targetType: 'function' | 'class'
 * - targetCode: FunctionInfo | ClassInfo (the code to generate tests for)
 * - framework: TestFramework (jest, mocha, pytest, junit, rspec)
 * - language: string (e.g., 'typescript', 'javascript', 'python')
 * - codeStyle?: CodeStyle (optional code style preferences)
 * - maxRetries?: number (optional, defaults to 3)
 */
app.post('/api/generate-tests/:projectId', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { targetType, targetCode, framework, language, codeStyle, maxRetries } = req.body;

    // Validate project ID format
    if (!projectId || !isValidUUID(projectId)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_ID',
          message: 'Invalid project ID format',
        },
      });
    }

    // Validate required fields
    if (!targetType || !['function', 'class'].includes(targetType)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_TARGET_TYPE',
          message: 'Target type must be either "function" or "class"',
        },
      });
    }

    if (!targetCode) {
      return res.status(400).json({
        error: {
          code: 'MISSING_TARGET_CODE',
          message: 'Target code is required',
        },
      });
    }

    if (!framework || !['jest', 'mocha', 'pytest', 'junit', 'rspec'].includes(framework)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_FRAMEWORK',
          message: 'Framework must be one of: jest, mocha, pytest, junit, rspec',
        },
      });
    }

    if (!language || typeof language !== 'string') {
      return res.status(400).json({
        error: {
          code: 'MISSING_LANGUAGE',
          message: 'Language is required and must be a string',
        },
      });
    }

    // Find project to ensure it exists
    const project = await projectModel.findById(projectId);

    if (!project) {
      return res.status(404).json({
        error: {
          code: 'PROJECT_NOT_FOUND',
          message: `Project with ID ${projectId} not found`,
        },
      });
    }

    logger.info('Starting test generation', {
      projectId,
      targetType,
      framework,
      language,
    });

    // Generate tests based on target type
    const options = {
      framework: framework as TestFramework,
      language,
      codeStyle,
      maxRetries: maxRetries || 3,
      enableProgressTracking: true,
    };

    let result;
    const orchestrator = getTestGenerationOrchestrator();

    if (targetType === 'function') {
      result = await orchestrator.generateTestsForFunction(
        targetCode as FunctionInfo,
        projectId,
        options
      );
    } else {
      result = await orchestrator.generateTestsForClass(
        targetCode as ClassInfo,
        projectId,
        options
      );
    }

    if (!result.success) {
      logger.error('Test generation failed', {
        projectId,
        errors: result.errors,
      });

      return res.status(500).json({
        error: {
          code: 'TEST_GENERATION_FAILED',
          message: 'Failed to generate tests',
          details: result.errors,
        },
        warnings: result.warnings,
        progress: result.progress,
      });
    }

    // Store test suite in analysis model
    const testAnalysis = await analysisModel.create({
      projectId,
      agentType: 'test-generator',
      result: {
        testSuite: result.testSuite,
        progress: result.progress,
        warnings: result.warnings,
      } as any,
    });

    logger.info('Test generation completed', {
      projectId,
      analysisId: testAnalysis.id,
      testCaseCount: result.testSuite?.testCases.length || 0,
      status: result.testSuite?.status,
    });

    return res.status(200).json({
      projectId,
      analysisId: testAnalysis.id,
      status: 'completed',
      message: 'Tests generated successfully',
      testSuite: result.testSuite,
      warnings: result.warnings,
      progress: result.progress,
    });
  } catch (error) {
    logger.error('Error in /api/generate-tests/:projectId', { projectId: req.params.projectId }, error as Error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
    });
  }
});

/**
 * GET /api/tests/:projectId
 * Retrieve generated tests for a project
 * 
 * Query parameters:
 * - targetFile?: string (optional filter by target file)
 */
app.get('/api/tests/:projectId', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { targetFile } = req.query;

    // Validate project ID format
    if (!projectId || !isValidUUID(projectId)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_ID',
          message: 'Invalid project ID format',
        },
      });
    }

    // Find project
    const project = await projectModel.findById(projectId);

    if (!project) {
      return res.status(404).json({
        error: {
          code: 'PROJECT_NOT_FOUND',
          message: `Project with ID ${projectId} not found`,
        },
      });
    }

    // Find all test generation analyses for this project
    const analyses = await analysisModel.findByProjectId(projectId);
    const testAnalyses = analyses.filter(a => a.agentType === 'test-generator');

    if (testAnalyses.length === 0) {
      return res.status(404).json({
        error: {
          code: 'TESTS_NOT_FOUND',
          message: `No generated tests found for project ${projectId}. Generate tests first using POST /api/generate-tests/${projectId}`,
        },
      });
    }

    // Extract test suites from analyses
    let testSuites = testAnalyses
      .map(a => (a.result as any)?.testSuite)
      .filter(ts => ts !== undefined && ts !== null);

    // Filter by target file if specified
    if (targetFile && typeof targetFile === 'string') {
      testSuites = testSuites.filter(ts => ts.targetFile === targetFile);
    }

    // Calculate statistics
    const statistics = {
      totalTestSuites: testSuites.length,
      totalTestCases: testSuites.reduce((sum, ts) => sum + (ts.testCases?.length || 0), 0),
      byFramework: testSuites.reduce((acc, ts) => {
        acc[ts.framework] = (acc[ts.framework] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      byStatus: testSuites.reduce((acc, ts) => {
        acc[ts.status] = (acc[ts.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      averageCoverageImprovement: testSuites.length > 0
        ? testSuites.reduce((sum, ts) => sum + (ts.coverageImprovement || 0), 0) / testSuites.length
        : 0,
    };

    return res.status(200).json({
      projectId,
      name: project.name,
      testSuites,
      statistics,
    });
  } catch (error) {
    logger.error('Error in /api/tests/:projectId', { projectId: req.params.projectId }, error as Error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
    });
  }
});

/**
 * GET /api/coverage/:projectId
 * Analyze test coverage for a project
 * 
 * Request body (optional):
 * - codebasePath?: string (path to codebase for coverage analysis)
 */
app.get('/api/coverage/:projectId', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;

    // Validate project ID format
    if (!projectId || !isValidUUID(projectId)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_ID',
          message: 'Invalid project ID format',
        },
      });
    }

    // Find project
    const project = await projectModel.findById(projectId);

    if (!project) {
      return res.status(404).json({
        error: {
          code: 'PROJECT_NOT_FOUND',
          message: `Project with ID ${projectId} not found`,
        },
      });
    }

    // Get analysis report to extract codebase information
    const analysis = await analysisModel.findLatestByProjectId(projectId);

    if (!analysis || !analysis.result) {
      return res.status(404).json({
        error: {
          code: 'ANALYSIS_NOT_FOUND',
          message: `No analysis found for project ${projectId}. Run analysis first.`,
        },
      });
    }

    // Find test generation analyses
    const analyses = await analysisModel.findByProjectId(projectId);
    const testAnalyses = analyses.filter(a => a.agentType === 'test-generator');

    // Extract test suites
    const testSuites = testAnalyses
      .map(a => (a.result as any)?.testSuite)
      .filter(ts => ts !== undefined && ts !== null);

    // Calculate coverage metrics
    const totalFiles = analysis.result.metrics?.totalFiles || 0;
    const filesWithTests = new Set(testSuites.map(ts => ts.targetFile)).size;
    const coveragePercentage = totalFiles > 0 ? (filesWithTests / totalFiles) * 100 : 0;

    // Identify untested code
    const testedFiles = new Set(testSuites.map(ts => ts.targetFile));
    const allFiles = analysis.result.structure?.children?.map((f: any) => f.path) || [];
    const untestedFiles = allFiles.filter((f: string) => !testedFiles.has(f));

    // Calculate estimated coverage improvement
    const totalCoverageImprovement = testSuites.reduce(
      (sum, ts) => sum + (ts.coverageImprovement || 0),
      0
    );
    const averageCoverageImprovement = testSuites.length > 0
      ? totalCoverageImprovement / testSuites.length
      : 0;

    const coverageReport = {
      projectId,
      name: project.name,
      overallPercentage: Math.round(coveragePercentage * 100) / 100,
      byFile: testSuites.reduce((acc, ts) => {
        acc[ts.targetFile] = ts.coverageImprovement || 0;
        return acc;
      }, {} as Record<string, number>),
      untestedFiles,
      statistics: {
        totalFiles,
        filesWithTests,
        filesWithoutTests: untestedFiles.length,
        totalTestSuites: testSuites.length,
        totalTestCases: testSuites.reduce((sum, ts) => sum + (ts.testCases?.length || 0), 0),
        averageCoverageImprovement: Math.round(averageCoverageImprovement * 100) / 100,
      },
      recommendations: untestedFiles.length > 0 ? [
        `${untestedFiles.length} files have no test coverage`,
        'Consider generating tests for high-priority untested files',
        'Focus on critical paths and complex functions first',
      ] : [
        'All files have test coverage',
        'Consider reviewing test quality and edge case coverage',
      ],
    };

    logger.info('Coverage analysis completed', {
      projectId,
      coveragePercentage: coverageReport.overallPercentage,
      filesWithTests,
      totalFiles,
    });

    return res.status(200).json(coverageReport);
  } catch (error) {
    logger.error('Error in /api/coverage/:projectId', { projectId: req.params.projectId }, error as Error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
    });
  }
});

/**
 * Error handling middleware
 */
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  logger.error('Unhandled error', { path: req.path, method: req.method }, err);
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
  });
});

/**
 * Helper function to validate UUID format
 */
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

export default app;
