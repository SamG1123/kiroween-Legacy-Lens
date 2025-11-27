import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { Project, ProjectStatus, SourceType } from '../../types';
import { getPool } from '../config';

export class ProjectModel {
  private pool: Pool;

  constructor(pool?: Pool) {
    this.pool = pool || getPool();
  }

  /**
   * Create a new project
   */
  async create(data: {
    name: string;
    sourceType: SourceType;
    sourceUrl?: string | null;
    status?: ProjectStatus;
  }): Promise<Project> {
    const id = uuidv4();
    const status = data.status || 'pending';
    const now = new Date();

    const query = `
      INSERT INTO projects (id, name, source_type, source_url, status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const values = [
      id,
      data.name,
      data.sourceType,
      data.sourceUrl || null,
      status,
      now,
      now,
    ];

    const result = await this.pool.query(query, values);
    return this.mapRowToProject(result.rows[0]);
  }

  /**
   * Find a project by ID
   */
  async findById(id: string): Promise<Project | null> {
    const query = 'SELECT * FROM projects WHERE id = $1';
    const result = await this.pool.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToProject(result.rows[0]);
  }

  /**
   * Update project status
   */
  async updateStatus(id: string, status: ProjectStatus): Promise<Project | null> {
    const query = `
      UPDATE projects
      SET status = $1, updated_at = $2
      WHERE id = $3
      RETURNING *
    `;

    const values = [status, new Date(), id];
    const result = await this.pool.query(query, values);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToProject(result.rows[0]);
  }

  /**
   * Update project
   */
  async update(id: string, data: Partial<Omit<Project, 'id' | 'createdAt'>>): Promise<Project | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(data.name);
    }

    if (data.sourceType !== undefined) {
      updates.push(`source_type = $${paramIndex++}`);
      values.push(data.sourceType);
    }

    if (data.sourceUrl !== undefined) {
      updates.push(`source_url = $${paramIndex++}`);
      values.push(data.sourceUrl);
    }

    if (data.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(data.status);
    }

    updates.push(`updated_at = $${paramIndex++}`);
    values.push(new Date());

    values.push(id);

    const query = `
      UPDATE projects
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await this.pool.query(query, values);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToProject(result.rows[0]);
  }

  /**
   * Delete a project
   */
  async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM projects WHERE id = $1';
    const result = await this.pool.query(query, [id]);
    return result.rowCount !== null && result.rowCount > 0;
  }

  /**
   * List all projects
   */
  async findAll(limit = 100, offset = 0): Promise<Project[]> {
    const query = `
      SELECT * FROM projects
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `;

    const result = await this.pool.query(query, [limit, offset]);
    return result.rows.map(row => this.mapRowToProject(row));
  }

  /**
   * Find projects by status
   */
  async findByStatus(status: ProjectStatus): Promise<Project[]> {
    const query = 'SELECT * FROM projects WHERE status = $1 ORDER BY created_at DESC';
    const result = await this.pool.query(query, [status]);
    return result.rows.map(row => this.mapRowToProject(row));
  }

  /**
   * Map database row to Project interface
   */
  private mapRowToProject(row: any): Project {
    return {
      id: row.id,
      name: row.name,
      sourceType: row.source_type,
      sourceUrl: row.source_url,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
