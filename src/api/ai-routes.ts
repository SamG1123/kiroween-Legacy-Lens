/**
 * AI Feature Routes
 * API endpoints for documentation, tests, modernization, and refactoring
 */

import { Router, Request, Response } from 'express';
import { AIOrchestrator } from '../services/AIOrchestrator';
import { DocumentationGenerator } from '../documentation/DocumentationGenerator';
import { TestGenerator } from '../test-generator/TestGenerator';
import { ModernizationAdvisor } from '../modernization/ModernizationAdvisor';
import { RefactoringEngine } from '../refactoring/RefactoringEngine';
import { logger } from '../utils/logger';
import { getPool } from '../database/config';

const router = Router();
const aiOrchestrator = new AIOrchestrator();

/**
 * POST /api/ai/full-analysis
 * Run complete AI analysis (docs, tests, modernization, refactoring)
 */
router.post('/full-analysis', async (req: Request, res: Response) => {
  try {
    const { projectId, options } = req.body;

    if (!projectId) {
      return res.status(400).json({ error: 'projectId is required' });
    }

    // Get project and analysis data
    const db = getPool();
    const project = await db.query(
      'SELECT * FROM projects WHERE id = $1',
      [projectId]
    );

    if (project.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const analysis = await db.query(
      'SELECT * FROM analyses WHERE project_id = $1 ORDER BY created_at DESC LIMIT 1',
      [projectId]
    );

    if (analysis.rows.length === 0) {
      return res.status(404).json({ error: 'No analysis found for project' });
    }

    const projectData = project.rows[0];
    const analysisData = analysis.rows[0].report;

    // Run full AI analysis
    const result = await aiOrchestrator.runFullAnalysis(
      projectData.workspace_path,
      analysisData,
      options
    );

    // Store results
    await db.query(
      `INSERT INTO ai_results (project_id, documentation, tests, modernization, refactoring, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [
        projectId,
        JSON.stringify(result.documentation),
        JSON.stringify(result.tests),
        JSON.stringify(result.modernization),
        JSON.stringify(result.refactoring),
      ]
    );

    res.json({
      success: true,
      result,
    });
  } catch (error: any) {
    logger.error('Full AI analysis failed', { error });
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/ai/documentation
 * Generate documentation only
 */
router.post('/documentation', async (req: Request, res: Response) => {
  try {
    const { projectId, options } = req.body;

    const db = getPool();
    const project = await db.query('SELECT * FROM projects WHERE id = $1', [projectId]);
    const analysis = await db.query(
      'SELECT * FROM analyses WHERE project_id = $1 ORDER BY created_at DESC LIMIT 1',
      [projectId]
    );

    const docGenerator = new DocumentationGenerator();
    const result = await docGenerator.generateDocumentation(
      project.rows[0].workspace_path,
      analysis.rows[0].report,
      options
    );

    res.json({ success: true, documentation: result });
  } catch (error: any) {
    logger.error('Documentation generation failed', { error });
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/ai/tests
 * Generate tests only
 */
router.post('/tests', async (req: Request, res: Response) => {
  try {
    const { projectId, options } = req.body;

    const db = getPool();
    const project = await db.query('SELECT * FROM projects WHERE id = $1', [projectId]);
    const analysis = await db.query(
      'SELECT * FROM analyses WHERE project_id = $1 ORDER BY created_at DESC LIMIT 1',
      [projectId]
    );

    const testGenerator = new TestGenerator();
    const result = await testGenerator.generateTests(
      project.rows[0].workspace_path,
      analysis.rows[0].report,
      options
    );

    res.json({ success: true, tests: result });
  } catch (error: any) {
    logger.error('Test generation failed', { error });
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/ai/modernization
 * Analyze for modernization opportunities
 */
router.post('/modernization', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.body;

    const db = getPool();
    const project = await db.query('SELECT * FROM projects WHERE id = $1', [projectId]);
    const analysis = await db.query(
      'SELECT * FROM analyses WHERE project_id = $1 ORDER BY created_at DESC LIMIT 1',
      [projectId]
    );

    const modernizationAdvisor = new ModernizationAdvisor();
    const result = await modernizationAdvisor.analyzeForModernization(
      project.rows[0].workspace_path,
      analysis.rows[0].report
    );

    res.json({ success: true, modernization: result });
  } catch (error: any) {
    logger.error('Modernization analysis failed', { error });
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/ai/refactoring
 * Suggest refactorings
 */
router.post('/refactoring', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.body;

    const db = getPool();
    const project = await db.query('SELECT * FROM projects WHERE id = $1', [projectId]);
    const analysis = await db.query(
      'SELECT * FROM analyses WHERE project_id = $1 ORDER BY created_at DESC LIMIT 1',
      [projectId]
    );

    const refactoringEngine = new RefactoringEngine();
    const result = await refactoringEngine.analyzeForRefactoring(
      project.rows[0].workspace_path,
      analysis.rows[0].report
    );

    res.json({ success: true, refactoring: result });
  } catch (error: any) {
    logger.error('Refactoring analysis failed', { error });
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/ai/refactoring/apply
 * Apply a specific refactoring
 */
router.post('/refactoring/apply', async (req: Request, res: Response) => {
  try {
    const { suggestion, dryRun = true } = req.body;

    const refactoringEngine = new RefactoringEngine();
    const result = await refactoringEngine.applyRefactoring(suggestion, dryRun);

    res.json({ success: result.success, diff: result.diff });
  } catch (error: any) {
    logger.error('Refactoring application failed', { error });
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/ai/results/:projectId
 * Get all AI results for a project
 */
router.get('/results/:projectId', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;

    const db = getPool();
    const results = await db.query(
      'SELECT * FROM ai_results WHERE project_id = $1 ORDER BY created_at DESC LIMIT 1',
      [projectId]
    );

    if (results.rows.length === 0) {
      return res.status(404).json({ error: 'No AI results found' });
    }

    res.json({ success: true, results: results.rows[0] });
  } catch (error: any) {
    logger.error('Failed to fetch AI results', { error });
    res.status(500).json({ error: error.message });
  }
});

export default router;
