import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { Analysis, AnalysisReport } from '../../types';
import { getPool } from '../config';

export class AnalysisModel {
  private pool: Pool;

  constructor(pool?: Pool) {
    this.pool = pool || getPool();
  }

  /**
   * Create a new analysis
   */
  async create(data: {
    projectId: string;
    agentType: string;
    result: AnalysisReport;
  }): Promise<Analysis> {
    const id = uuidv4();
    const now = new Date();

    const query = `
      INSERT INTO analyses (id, project_id, agent_type, result, created_at)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const values = [
      id,
      data.projectId,
      data.agentType,
      JSON.stringify(data.result),
      now,
    ];

    const result = await this.pool.query(query, values);
    return this.mapRowToAnalysis(result.rows[0]);
  }

  /**
   * Find an analysis by ID
   */
  async findById(id: string): Promise<Analysis | null> {
    const query = 'SELECT * FROM analyses WHERE id = $1';
    const result = await this.pool.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToAnalysis(result.rows[0]);
  }

  /**
   * Find analyses by project ID
   */
  async findByProjectId(projectId: string): Promise<Analysis[]> {
    const query = `
      SELECT * FROM analyses
      WHERE project_id = $1
      ORDER BY created_at DESC
    `;

    const result = await this.pool.query(query, [projectId]);
    return result.rows.map(row => this.mapRowToAnalysis(row));
  }

  /**
   * Find the latest analysis for a project
   */
  async findLatestByProjectId(projectId: string): Promise<Analysis | null> {
    const query = `
      SELECT * FROM analyses
      WHERE project_id = $1
      ORDER BY created_at DESC
      LIMIT 1
    `;

    const result = await this.pool.query(query, [projectId]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToAnalysis(result.rows[0]);
  }

  /**
   * Find analyses by agent type
   */
  async findByAgentType(agentType: string): Promise<Analysis[]> {
    const query = `
      SELECT * FROM analyses
      WHERE agent_type = $1
      ORDER BY created_at DESC
    `;

    const result = await this.pool.query(query, [agentType]);
    return result.rows.map(row => this.mapRowToAnalysis(row));
  }

  /**
   * Update analysis result
   */
  async updateResult(id: string, result: AnalysisReport): Promise<Analysis | null> {
    const query = `
      UPDATE analyses
      SET result = $1
      WHERE id = $2
      RETURNING *
    `;

    const values = [JSON.stringify(result), id];
    const result_query = await this.pool.query(query, values);

    if (result_query.rows.length === 0) {
      return null;
    }

    return this.mapRowToAnalysis(result_query.rows[0]);
  }

  /**
   * Delete an analysis
   */
  async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM analyses WHERE id = $1';
    const result = await this.pool.query(query, [id]);
    return result.rowCount !== null && result.rowCount > 0;
  }

  /**
   * Delete all analyses for a project
   */
  async deleteByProjectId(projectId: string): Promise<number> {
    const query = 'DELETE FROM analyses WHERE project_id = $1';
    const result = await this.pool.query(query, [projectId]);
    return result.rowCount || 0;
  }

  /**
   * List all analyses
   */
  async findAll(limit = 100, offset = 0): Promise<Analysis[]> {
    const query = `
      SELECT * FROM analyses
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `;

    const result = await this.pool.query(query, [limit, offset]);
    return result.rows.map(row => this.mapRowToAnalysis(row));
  }

  /**
   * Map database row to Analysis interface
   */
  private mapRowToAnalysis(row: any): Analysis {
    return {
      id: row.id,
      projectId: row.project_id,
      agentType: row.agent_type,
      result: typeof row.result === 'string' ? JSON.parse(row.result) : row.result,
      createdAt: row.created_at,
    };
  }
}
